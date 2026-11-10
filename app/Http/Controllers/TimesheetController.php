<?php

namespace App\Http\Controllers;

use App\Models\Repository;
use App\Models\TimesheetSetting;
use App\Services\GitCommitReader;
use App\Services\RepositoryCatalog;
use App\Services\WorkdayPlanner;
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
        WorkdayPlanner $planner,
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
