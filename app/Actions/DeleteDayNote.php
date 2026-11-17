<?php

namespace App\Actions;

use App\Models\DayNote;
use Illuminate\Http\RedirectResponse;

class DeleteDayNote
{
    public function __invoke(DayNote $note): RedirectResponse
    {
        $note->delete();

        return back()->with('status', 'Removed the note.');
    }
}
