<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Services\TeamworkTasks;
use App\Services\TeamworkTimelogs;
use App\Support\Clock;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class LogConstantTask
{
    public function __invoke(Request $request, ConstantTask $constant, TeamworkTasks $tasks, TeamworkTimelogs $timelogs): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = (string) $data['date'];
        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, Clock::timezone());

        if (! $day instanceof CarbonImmutable || $day->dayOfWeekIso !== $constant->weekday) {
            throw ValidationException::withMessages([
                'date' => 'That date is not the weekday for this constant task.',
            ]);
        }

        $minutes = Clock::minutesBetween($constant->start_time, $constant->end_time);

        if ($minutes < 1 || $minutes > 1440) {
            throw ValidationException::withMessages([
                'date' => 'End must be after the start.',
            ]);
        }

        try {
            if ($this->alreadyLogged($timelogs, $constant, $date)) {
                throw ValidationException::withMessages([
                    'date' => 'This constant task is already logged that day.',
                ]);
            }

            if ($tasks->projectId($constant->teamwork_task_id) !== $constant->teamwork_project_id) {
                throw ValidationException::withMessages([
                    'date' => 'That task is no longer on the Teamwork project.',
                ]);
            }

            $timelogs->create(
                $constant->teamwork_task_id,
                $date,
                $constant->start_time.':00',
                $minutes,
                $constant->billable,
            );
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'date' => $exception->getMessage() !== ''
                    ? $exception->getMessage()
                    : 'Teamwork could not log this time.',
            ]);
        }

        return back()->with('status', 'Logged '.Clock::label($minutes).' in Teamwork.');
    }

    private function alreadyLogged(TeamworkTimelogs $timelogs, ConstantTask $constant, string $date): bool
    {
        $start = Clock::minutesFrom($constant->start_time);
        $end = Clock::minutesFrom($constant->end_time);

        foreach ($timelogs->between($date, $date, Clock::timezone()) as $entry) {
            $time = $entry['time'];

            if ($entry['taskId'] !== $constant->teamwork_task_id || ! is_string($time)) {
                continue;
            }

            $otherStart = Clock::minutesFrom($time);
            $otherEnd = $otherStart + $entry['minutes'];

            if ($start < $otherEnd && $otherStart < $end) {
                return true;
            }
        }

        return false;
    }
}
