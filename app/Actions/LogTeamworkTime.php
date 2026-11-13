<?php

namespace App\Actions;

use App\Models\Repository;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use App\Services\TeamworkTimelogs;
use App\Support\Clock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class LogTeamworkTime
{
    public function __invoke(Request $request, TeamworkProjects $projects, TeamworkTasks $tasks, TeamworkTimelogs $timelogs): RedirectResponse
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

        $linked = Repository::query()->where('teamwork_project_id', $projectId)->exists();

        if (! $linked && $projects->find($projectId) === null) {
            throw ValidationException::withMessages([
                'project_id' => 'Choose a Teamwork project.',
            ]);
        }

        $minutes = Clock::minutesBetween((string) $data['start'], (string) $data['end']);

        if ($minutes < 1 || $minutes > 1440) {
            throw ValidationException::withMessages([
                'end' => 'End must be after the start.',
            ]);
        }

        try {
            if ($tasks->projectId($taskId) !== $projectId) {
                throw ValidationException::withMessages([
                    'task_id' => 'That task is not on this project.',
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

        return back()->with('status', 'Logged '.Clock::label($minutes).' in Teamwork.');
    }
}
