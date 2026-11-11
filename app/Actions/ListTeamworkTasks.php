<?php

namespace App\Actions;

use App\Models\Repository;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use Illuminate\Http\JsonResponse;
use Throwable;

class ListTeamworkTasks
{
    public function __invoke(int $project, TeamworkProjects $projects, TeamworkTasks $tasks): JsonResponse
    {
        $linked = Repository::query()->where('teamwork_project_id', $project)->exists();

        if (! $linked && $projects->find($project) === null) {
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
}
