<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UpdateConstantTask
{
    public function __invoke(Request $request, ConstantTask $constant, TeamworkProjects $projects, TeamworkTasks $tasks, PersistConstantTask $persist): RedirectResponse
    {
        $persist($request, $projects, $tasks, $constant);

        return back()->with('status', 'Updated the constant task.');
    }
}
