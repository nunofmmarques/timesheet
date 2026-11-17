<?php

namespace App\Actions;

use App\Models\DayNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UpdateDayNote
{
    public function __invoke(Request $request, DayNote $note, PersistDayNote $persist): RedirectResponse
    {
        $persist($request, $note);

        return back()->with('status', 'Updated the note.');
    }
}
