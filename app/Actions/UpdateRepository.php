<?php

namespace App\Actions;

use App\Models\Repository;
use App\Services\TeamworkProjects;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UpdateRepository
{
    public function __invoke(Request $request, Repository $repository, TeamworkProjects $teamwork): RedirectResponse
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
}
