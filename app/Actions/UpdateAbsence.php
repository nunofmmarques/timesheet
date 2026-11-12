<?php

namespace App\Actions;

use App\Models\Absence;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UpdateAbsence
{
    public function __invoke(Request $request, Absence $absence, PersistAbsence $persist): RedirectResponse
    {
        $persist($request, $absence);

        return back()->with('status', 'Updated the time off.');
    }
}
