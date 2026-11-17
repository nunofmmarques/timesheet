<?php

namespace App\Actions;

use App\Models\DayNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StoreDayNote
{
    public function __invoke(Request $request, PersistDayNote $persist): RedirectResponse
    {
        $persist($request, new DayNote);

        return back()->with('status', 'Saved the note.');
    }
}
