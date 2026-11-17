<?php

namespace App\Actions;

use App\Models\DisabledTeamworkProject;
use App\Services\TeamworkProjects;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UpdateTeamworkProject
{
    public function __invoke(Request $request, int $project, TeamworkProjects $teamwork): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        if ($teamwork->find($project) === null) {
            throw ValidationException::withMessages([
                'enabled' => 'That Teamwork project is not available.',
            ]);
        }

        if ($data['enabled'] === true) {
            DisabledTeamworkProject::query()
                ->where('teamwork_project_id', $project)
                ->delete();
        } else {
            DisabledTeamworkProject::query()->firstOrCreate([
                'teamwork_project_id' => $project,
            ]);
        }

        return back();
    }
}
