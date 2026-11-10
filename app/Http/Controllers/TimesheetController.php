<?php

namespace App\Http\Controllers;

use App\Models\Repository;
use App\Models\TimesheetOverride;
use App\Models\TimesheetSetting;
use App\Services\CommitIntervalGrouper;
use App\Services\GitCommitReader;
use App\Services\RepositoryCatalog;
use App\Services\TimesheetInterval;
use Carbon\CarbonImmutable;
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
        CommitIntervalGrouper $grouper,
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

        $days = $this->applyOverrides($grouper->group($commits, new TimesheetInterval(
            timezone: $timezone,
            idleGapMinutes: $setting->idle_gap_minutes,
            paddingMinutes: $setting->padding_minutes,
            minimumMinutes: $setting->minimum_minutes,
            roundToMinutes: $setting->round_to_minutes,
        )));

        $discoverRoots = $catalog->discoverRoots();

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
            ])->values(),
            'settings' => [
                'authorEmail' => $setting->author_email ?? '',
                'idleGapMinutes' => $setting->idle_gap_minutes,
                'paddingMinutes' => $setting->padding_minutes,
                'minimumMinutes' => $setting->minimum_minutes,
                'roundToMinutes' => $setting->round_to_minutes,
            ],
            'discoverRoot' => $discoverRoots[0] ?? (string) config('timesheet.discover_root'),
            'discoverRoots' => $discoverRoots,
            'commitCount' => count($commits),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'author_email' => ['nullable', 'email', 'max:255'],
            'idle_gap_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'padding_minutes' => ['required', 'integer', 'min:0', 'max:240'],
            'minimum_minutes' => ['required', 'integer', 'min:0', 'max:480'],
            'round_to_minutes' => ['required', 'integer', 'in:1,5,15,30,60'],
        ]);

        $setting = TimesheetSetting::query()->first();

        if (! $setting instanceof TimesheetSetting) {
            $setting = new TimesheetSetting;
        }

        $setting->fill($data);
        $setting->save();

        return back();
    }

    public function storeRepository(Request $request, RepositoryCatalog $catalog): RedirectResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:1000'],
        ]);

        try {
            $catalog->addPath($data['path']);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'path' => $exception->getMessage(),
            ]);
        }

        return back();
    }

    public function scan(Request $request, RepositoryCatalog $catalog): RedirectResponse
    {
        $data = $request->validate([
            'directory' => ['required', 'string', 'max:1000'],
        ]);

        try {
            $added = $catalog->importDirectory($data['directory']);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'directory' => $exception->getMessage(),
            ]);
        }

        return back()->with('status', $added === 1
            ? 'Added 1 repository.'
            : "Added {$added} repositories.");
    }

    public function updateRepository(Request $request, Repository $repository): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $repository->update($data);

        return back();
    }

    public function destroyRepository(Repository $repository): RedirectResponse
    {
        $repository->delete();

        return back();
    }

    public function updateEntry(Request $request, string $entryKey): RedirectResponse
    {
        $data = $request->validate([
            'minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'description' => ['nullable', 'string', 'max:5000'],
            'included' => ['required', 'boolean'],
        ]);

        TimesheetOverride::query()->updateOrCreate(
            ['entry_key' => $entryKey],
            $data,
        );

        return back();
    }

    /**
     * @param  list<array{date: string, label: string, sessions: list<array<string, mixed>>}>  $days
     * @return list<array{date: string, label: string, sessions: list<array<string, mixed>>}>
     */
    private function applyOverrides(array $days): array
    {
        $keys = [];

        foreach ($days as $day) {
            foreach ($day['sessions'] as $session) {
                if (is_string($session['key'] ?? null)) {
                    $keys[] = $session['key'];
                }
            }
        }

        $overrides = TimesheetOverride::query()
            ->whereIn('entry_key', $keys)
            ->get()
            ->keyBy('entry_key');

        foreach ($days as $dayIndex => $day) {
            foreach ($day['sessions'] as $sessionIndex => $session) {
                $key = $session['key'] ?? null;

                if (! is_string($key)) {
                    continue;
                }

                $override = $overrides->get($key);

                if (! $override instanceof TimesheetOverride) {
                    continue;
                }

                if ($override->minutes !== null) {
                    $session['minutes'] = $override->minutes;
                }

                if ($override->description !== null) {
                    $session['description'] = $override->description;
                }

                $session['included'] = $override->included;
                $days[$dayIndex]['sessions'][$sessionIndex] = $session;
            }
        }

        return $days;
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

    private function timezone(): string
    {
        $timezone = config('app.timezone');

        return is_string($timezone) && $timezone !== '' ? $timezone : 'Europe/Lisbon';
    }
}
