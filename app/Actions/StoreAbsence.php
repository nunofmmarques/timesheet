<?php

namespace App\Actions;

use App\Models\Absence;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StoreAbsence
{
    public function __invoke(Request $request, PersistAbsence $persist): RedirectResponse
    {
        $persist($request, new Absence);

        return back()->with('status', 'Saved the time off.');
    }
}
