<?php

namespace App\Actions;

use App\Models\Absence;
use App\Models\ConstantTask;
use App\Models\ConstantTaskSkip;
use App\Models\Repository;
use App\Services\GitCommitReader;
use App\Services\RepositoryCatalog;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTimelogs;
use App\Services\WorkdayPlanner;
use App\Support\Clock;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ShowTimesheet
{
    public function __invoke(
        Request $request,
        RepositoryCatalog $catalog,
        GitCommitReader $reader,
        WorkdayPlanner $planner,
        TeamworkProjects $teamwork,
        TeamworkTimelogs $timelogs,
    ): Response {
        set_time_limit(120);

        $setting = $catalog->ensureDefaults();
        [$from, $to, $preset] = $this->range($request);
        $timezone = Clock::timezone();

        $repositories = Repository::query()->orderBy('name')->get();
        $since = CarbonImmutable::parse($from, $timezone)->startOfDay();
        $until = CarbonImmutable::parse($to, $timezone)->addDay()->startOfDay();

        $commits = [];
        $problems = [];

        foreach ($repositories as $repository) {
            if (! $repository->enabled) {
                continue;
            }

            try {
                array_push($commits, ...$reader->read(
                    $repository,
                    $since,
                    $until,
                    $setting->author_email,
                ));
            } catch (Throwable $exception) {
                $problems[] = [
                    'repository' => $repository->name,
                    'message' => $exception->getMessage(),
                ];
            }
        }

        $days = $planner->plan($commits, $timezone);
        $loggedTime = $this->loggedTime($timelogs, $from, $to, $timezone);
        $days = $this->attachLoggedTime($days, $loggedTime['entries'], $planner, $timezone);
        $constants = ConstantTask::query()->orderBy('weekday')->orderBy('start_time')->get();
        /** @var Collection<int, ConstantTaskSkip> $skips */
        $skips = new Collection;

        if ($constants->isNotEmpty()) {
            $skips = ConstantTaskSkip::query()
                ->whereIn('constant_task_id', $constants->modelKeys())
                ->orderBy('date')
                ->get();
        }
        $days = $this->includeConstantDays($days, $constants, $this->skippedIdsByDate($skips), $from, $to, $planner, $timezone);
        $absences = Absence::query()->orderByDesc('starts_on')->orderByDesc('id')->get();
        $days = $this->attachAbsences($days, $absences, $from, $to, $planner, $timezone);

        $discoverRoots = $catalog->discoverRoots();
        $teamworkProjects = $this->teamworkProjects($teamwork);

        return Inertia::render('timesheet', [
            'from' => $from,
            'to' => $to,
            'preset' => $preset,
            'days' => $days,
            'problems' => $problems,
            'repositories' => $repositories->map(fn (Repository $repository): array => [
                'id' => $repository->id,
                'name' => $repository->name,
                'path' => $repository->path,
                'enabled' => $repository->enabled,
                'teamworkProjectId' => $repository->teamwork_project_id,
                'teamworkProjectName' => $repository->teamwork_project_name,
                'teamworkProjectUrl' => $teamwork->projectUrl($repository->teamwork_project_id),
            ])->values(),
            'teamworkProjects' => $teamworkProjects['projects'],
            'teamworkError' => $teamworkProjects['error'],
            'teamworkTimeError' => $loggedTime['error'],
            'teamworkConfigured' => $teamwork->configured(),
            'absences' => $absences->map(fn (Absence $absence): array => [
                'id' => $absence->id,
                'kind' => $absence->kind,
                'part' => $absence->part,
                'label' => $absence->label(),
                'note' => $absence->note ?? '',
                'startsOn' => $absence->starts_on->toDateString(),
                'endsOn' => $absence->ends_on->toDateString(),
            ])->values(),
            'constants' => $constants->map(fn (ConstantTask $constant): array => [
                'id' => $constant->id,
                'weekday' => $constant->weekday,
                'start' => $constant->start_time,
                'end' => $constant->end_time,
                'projectId' => $constant->teamwork_project_id,
                'projectName' => $constant->teamwork_project_name,
                'taskId' => $constant->teamwork_task_id,
                'taskName' => $constant->teamwork_task_name,
                'billable' => $constant->billable,
                'skippedDates' => $skips
                    ->where('constant_task_id', $constant->id)
                    ->map(fn (ConstantTaskSkip $skip): string => $skip->date->toDateString())
                    ->values(),
            ])->values(),
            'settings' => [
                'authorEmail' => $setting->author_email ?? '',
            ],
            'discoverRoot' => $discoverRoots[0] ?? (string) config('timesheet.discover_root'),
            'discoverRoots' => $discoverRoots,
        ]);
    }

    /**
     * @param  list<array{
     *     date: string,
     *     label: string,
     *     capacityMinutes: int,
     *     windows: list<array{start: string, end: string}>,
     *     blocks: list<array{repository: string, start: string, end: string, minutes: int}>,
     *     projects: list<array<string, mixed>>
     * }>  $days
     * @param  list<array{
     *     id: int,
     *     date: string,
     *     time: string|null,
     *     minutes: int,
     *     description: string,
     *     project: string,
     *     projectId: int|null,
     *     task: string,
     *     taskId: int|null,
     *     projectUrl: string|null,
     *     taskUrl: string|null,
     *     billable: bool
     * }>  $entries
     * @return list<array<string, mixed>>
     */
    private function attachLoggedTime(array $days, array $entries, WorkdayPlanner $planner, string $timezone): array
    {
        $byDate = [];

        foreach ($days as $day) {
            $byDate[$day['date']] = $day;
        }

        $grouped = [];

        foreach ($entries as $entry) {
            $grouped[$entry['date']][] = $entry;

            if (! isset($byDate[$entry['date']])) {
                $byDate[$entry['date']] = $planner->blankDay($entry['date'], $timezone);
            }
        }

        krsort($byDate);

        $result = [];

        foreach ($byDate as $date => $day) {
            $logs = $grouped[$date] ?? [];
            $day['logged'] = array_map(fn (array $log): array => [
                'id' => $log['id'],
                'time' => $log['time'],
                'minutes' => $log['minutes'],
                'description' => $log['description'],
                'project' => $log['project'],
                'projectId' => $log['projectId'],
                'task' => $log['task'],
                'taskId' => $log['taskId'],
                'projectUrl' => $log['projectUrl'],
                'taskUrl' => $log['taskUrl'],
                'billable' => $log['billable'],
            ], $logs);
            $day['loggedMinutes'] = array_sum(array_column($logs, 'minutes'));
            $result[] = $day;
        }

        return $result;
    }

    /**
     * @return array{entries: list<array<string, mixed>>, error: string|null}
     */
    private function loggedTime(TeamworkTimelogs $timelogs, string $from, string $to, string $timezone): array
    {
        try {
            return ['entries' => $timelogs->between($from, $to, $timezone), 'error' => null];
        } catch (Throwable $exception) {
            report($exception);

            return ['entries' => [], 'error' => 'Teamwork time could not be loaded.'];
        }
    }

    /**
     * @return array{projects: list<array{id: int, name: string}>, error: string|null}
     */
    private function teamworkProjects(TeamworkProjects $teamwork): array
    {
        if (! $teamwork->configured()) {
            return ['projects' => [], 'error' => null];
        }

        try {
            return ['projects' => $teamwork->all(), 'error' => null];
        } catch (Throwable $exception) {
            report($exception);

            return ['projects' => [], 'error' => 'Teamwork projects could not be loaded.'];
        }
    }

    /**
     * @return array{0: string, 1: string, 2: string}
     */
    private function range(Request $request): array
    {
        $timezone = Clock::timezone();
        $today = CarbonImmutable::now($timezone);
        $preset = $request->string('preset')->toString();

        $range = match ($preset) {
            'today' => [$today, $today],
            'last-week' => [
                $today->subWeek()->startOfWeek(),
                $today->subWeek()->endOfWeek(),
            ],
            'month' => [$today->startOfMonth(), $today->endOfMonth()],
            'last-month' => [
                $today->subMonthNoOverflow()->startOfMonth(),
                $today->subMonthNoOverflow()->endOfMonth(),
            ],
            'week' => [$today->startOfWeek(), $today->endOfWeek()],
            default => null,
        };

        if ($range !== null) {
            return [$range[0]->toDateString(), $range[1]->toDateString(), $preset];
        }

        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        if ($this->isDate($from) && $this->isDate($to)) {
            if ($from > $to) {
                [$from, $to] = [$to, $from];
            }

            return [$from, $to, 'custom'];
        }

        return [
            $today->startOfWeek()->toDateString(),
            $today->endOfWeek()->toDateString(),
            'week',
        ];
    }

    private function isDate(string $value): bool
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return false;
        }

        $parsed = CarbonImmutable::createFromFormat('Y-m-d', $value);

        return $parsed instanceof CarbonImmutable && $parsed->format('Y-m-d') === $value;
    }

    /**
     * @param  list<array<string, mixed>>  $days
     * @param  Collection<int, ConstantTask>  $constants
     * @param  array<string, list<int>>  $skippedIdsByDate
     * @return list<array<string, mixed>>
     */
    private function includeConstantDays(array $days, Collection $constants, array $skippedIdsByDate, string $from, string $to, WorkdayPlanner $planner, string $timezone): array
    {
        if ($constants->isEmpty()) {
            return $days;
        }

        $byDate = [];

        foreach ($days as $day) {
            if (is_string($day['date'] ?? null)) {
                $byDate[$day['date']] = $day;
            }
        }

        $cursor = CarbonImmutable::parse($from, $timezone)->startOfDay();
        $end = CarbonImmutable::parse($to, $timezone)->startOfDay();

        while ($cursor->lessThanOrEqualTo($end)) {
            $date = $cursor->toDateString();
            $matching = [];

            foreach ($constants as $constant) {
                if ($constant->weekday === $cursor->dayOfWeekIso) {
                    $matching[] = $constant->id;
                }
            }

            if ($matching !== [] && array_diff($matching, $skippedIdsByDate[$date] ?? []) !== [] && ! isset($byDate[$date])) {
                $day = $planner->blankDay($date, $timezone);
                $day['logged'] = [];
                $day['loggedMinutes'] = 0;
                $byDate[$date] = $day;
            }

            $cursor = $cursor->addDay();
        }

        krsort($byDate);

        return array_values($byDate);
    }

    /**
     * @param  Collection<int, ConstantTaskSkip>  $skips
     * @return array<string, list<int>>
     */
    private function skippedIdsByDate(Collection $skips): array
    {
        $byDate = [];

        foreach ($skips as $skip) {
            $byDate[$skip->date->toDateString()][] = $skip->constant_task_id;
        }

        return $byDate;
    }

    /**
     * @param  list<array<string, mixed>>  $days
     * @param  Collection<int, Absence>  $absences
     * @return list<array<string, mixed>>
     */
    private function attachAbsences(array $days, Collection $absences, string $from, string $to, WorkdayPlanner $planner, string $timezone): array
    {
        $byDate = [];

        foreach ($days as $day) {
            if (is_string($day['date'] ?? null)) {
                $byDate[$day['date']] = $day;
            }
        }

        $cursor = CarbonImmutable::parse($from, $timezone)->startOfDay();
        $end = CarbonImmutable::parse($to, $timezone)->startOfDay();

        while ($cursor->lessThanOrEqualTo($end)) {
            $date = $cursor->toDateString();
            $match = $absences->first(fn (Absence $absence): bool => $absence->starts_on->toDateString() <= $date && $absence->ends_on->toDateString() >= $date);

            if ($match instanceof Absence && ! isset($byDate[$date])) {
                $day = $planner->blankDay($date, $timezone);
                $day['logged'] = [];
                $day['loggedMinutes'] = 0;
                $byDate[$date] = $day;
            }

            if (isset($byDate[$date])) {
                $byDate[$date]['absence'] = $match instanceof Absence ? [
                    'id' => $match->id,
                    'kind' => $match->kind,
                    'part' => $match->part,
                    'label' => $match->label(),
                    'note' => $match->note ?? '',
                ] : null;
            }

            $cursor = $cursor->addDay();
        }

        krsort($byDate);

        return array_values($byDate);
    }
}
