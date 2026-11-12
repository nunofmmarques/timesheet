<?php

namespace App\Actions;

use App\Models\Absence;
use Illuminate\Http\RedirectResponse;

class DeleteAbsence
{
    public function __invoke(Absence $absence): RedirectResponse
    {
        $absence->delete();

        return back()->with('status', 'Removed the time off.');
    }
}
