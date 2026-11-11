<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Services\TeamworkProjects;
use App\Services\TeamworkTasks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StoreConstantTask
{
    public function __invoke(Request $request, TeamworkProjects $projects, TeamworkTasks $tasks, PersistConstantTask $persist): RedirectResponse
    {
        $persist($request, $projects, $tasks, new ConstantTask);

        return back()->with('status', 'Saved the constant task.');
    }
}
