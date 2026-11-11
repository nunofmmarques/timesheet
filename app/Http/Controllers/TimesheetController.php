<?php

namespace App\Http\Controllers;

use App\Models\Repository;
use App\Models\TimesheetSetting;
use App\Services\GitCommitReader;
use App\Services\RepositoryCatalog;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use App\Services\TeamworkTimelogs;
use App\Services\WorkdayPlanner;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Throwable;

class TimesheetController extends Controller
{
    public function index(
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
        $timezone = $this->timezone();

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
            'settings' => [
                'authorEmail' => $setting->author_email ?? '',
            ],
            'discoverRoot' => $discoverRoots[0] ?? (string) config('timesheet.discover_root'),
            'discoverRoots' => $discoverRoots,
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'author_email' => ['nullable', 'email', 'max:255'],
        ]);

        $setting = TimesheetSetting::query()->first();

        if (! $setting instanceof TimesheetSetting) {
            $setting = new TimesheetSetting;
        }

        $setting->fill($data);
        $setting->save();

        return back();
    }

    public function scan(RepositoryCatalog $catalog): RedirectResponse
    {
        $roots = $catalog->discoverRoots();

        if ($roots === []) {
            throw ValidationException::withMessages([
                'directory' => 'No scan folders are configured.',
            ]);
        }

        $added = 0;

        foreach ($roots as $root) {
            try {
                $added += $catalog->importDirectory($root);
            } catch (InvalidArgumentException) {
                continue;
            }
        }

        return back()->with('status', $added === 1
            ? 'Added 1 repository.'
            : "Added {$added} repositories.");
    }

    public function updateRepository(Request $request, Repository $repository, TeamworkProjects $teamwork): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'teamwork_project_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        if (array_key_exists('teamwork_project_id', $data)) {
            $projectId = $data['teamwork_project_id'];

            if ($projectId === null) {
                $repository->teamwork_project_id = null;
                $repository->teamwork_project_name = null;
            } else {
                $project = $teamwork->find($projectId);

                if ($project === null) {
                    throw ValidationException::withMessages([
                        'teamwork_project_id' => 'That Teamwork project is not available.',
                    ]);
                }

                $repository->teamwork_project_id = $project['id'];
                $repository->teamwork_project_name = $project['name'];
            }

            unset($data['teamwork_project_id']);
        }

        $repository->fill($data);
        $repository->save();

        return back();
    }

    public function destroyRepository(Repository $repository): RedirectResponse
    {
        $repository->delete();

        return back();
    }

    public function tasks(int $project, TeamworkTasks $tasks): JsonResponse
    {
        if (! Repository::query()->where('teamwork_project_id', $project)->exists()) {
            abort(404);
        }

        try {
            return response()->json([
                'tasks' => $tasks->forProject($project),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Teamwork tasks could not be loaded.',
            ], 422);
        }
    }

    public function storeTime(Request $request, TeamworkTasks $tasks, TeamworkTimelogs $timelogs): RedirectResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer'],
            'task_id' => ['required', 'integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'start' => ['required', 'date_format:H:i'],
            'end' => ['required', 'date_format:H:i'],
            'billable' => ['required', 'boolean'],
        ]);

        $projectId = (int) $data['project_id'];
        $taskId = (int) $data['task_id'];

        if (! Repository::query()->where('teamwork_project_id', $projectId)->exists()) {
            throw ValidationException::withMessages([
                'project_id' => 'Link this repository to a Teamwork project first.',
            ]);
        }

        $minutes = $this->minutesBetween((string) $data['start'], (string) $data['end']);

        if ($minutes < 1 || $minutes > 1440) {
            throw ValidationException::withMessages([
                'end' => 'End must be after the start.',
            ]);
        }

        try {
            if ($tasks->projectId($taskId) !== $projectId) {
                throw ValidationException::withMessages([
                    'task_id' => 'That task is not on the linked project.',
                ]);
            }

            $timelogs->create(
                $taskId,
                (string) $data['date'],
                ((string) $data['start']).':00',
                $minutes,
                $request->boolean('billable'),
            );
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'task_id' => $exception->getMessage() !== ''
                    ? $exception->getMessage()
                    : 'Teamwork could not log this time.',
            ]);
        }

        return back()->with('status', 'Logged '.$this->durationLabel($minutes).' in Teamwork.');
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
     *     task: string,
     *     projectUrl: string|null
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
                'task' => $log['task'],
                'projectUrl' => $log['projectUrl'],
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
        $timezone = $this->timezone();
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

    private function minutesBetween(string $start, string $end): int
    {
        [$startHour, $startMinute] = array_map(intval(...), explode(':', $start));
        [$endHour, $endMinute] = array_map(intval(...), explode(':', $end));

        return ($endHour * 60 + $endMinute) - ($startHour * 60 + $startMinute);
    }

    private function durationLabel(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;

        if ($hours === 0) {
            return $rest.'m';
        }

        if ($rest === 0) {
            return $hours.'h';
        }

        return $hours.'h '.$rest.'m';
    }

    private function timezone(): string
    {
        $timezone = config('app.timezone');

        return is_string($timezone) && $timezone !== '' ? $timezone : 'Europe/Lisbon';
    }
}
