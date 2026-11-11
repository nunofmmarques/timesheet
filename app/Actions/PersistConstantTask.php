<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use App\Support\Clock;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class PersistConstantTask
{
    public function __invoke(Request $request, TeamworkProjects $projects, TeamworkTasks $tasks, ConstantTask $constant): void
    {
        $data = $request->validate([
            'weekday' => ['required', 'integer', 'between:1,7'],
            'start' => ['required', 'date_format:H:i'],
            'end' => ['required', 'date_format:H:i'],
            'project_id' => ['required', 'integer'],
            'task_id' => ['required', 'integer'],
            'billable' => ['required', 'boolean'],
        ]);

        $minutes = Clock::minutesBetween((string) $data['start'], (string) $data['end']);

        if ($minutes < 1 || $minutes > 1440) {
            throw ValidationException::withMessages([
                'end' => 'End must be after the start.',
            ]);
        }

        $project = $projects->find((int) $data['project_id']);

        if ($project === null) {
            throw ValidationException::withMessages([
                'project_id' => 'That Teamwork project is not available.',
            ]);
        }

        try {
            $task = $this->taskOnProject($tasks, $project['id'], (int) $data['task_id']);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'task_id' => 'Teamwork tasks could not be loaded.',
            ]);
        }

        if ($task === null) {
            throw ValidationException::withMessages([
                'task_id' => 'That task is not on the project.',
            ]);
        }

        $constant->weekday = (int) $data['weekday'];
        $constant->start_time = (string) $data['start'];
        $constant->end_time = (string) $data['end'];
        $constant->teamwork_project_id = $project['id'];
        $constant->teamwork_project_name = $project['name'];
        $constant->teamwork_task_id = $task['id'];
        $constant->teamwork_task_name = $task['name'];
        $constant->billable = $request->boolean('billable');
        $constant->save();
    }

    /**
     * @return array{id: int, name: string, tasklist: string, ancestors: list<string>}|null
     */
    private function taskOnProject(TeamworkTasks $tasks, int $projectId, int $taskId): ?array
    {
        foreach ($tasks->forProject($projectId) as $task) {
            if ($task['id'] === $taskId) {
                return $task;
            }
        }

        return null;
    }
}
