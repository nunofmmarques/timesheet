<?php

namespace App\Actions;

use App\Models\Holiday;
use Illuminate\Http\RedirectResponse;

class DeleteHoliday
{
    public function __invoke(Holiday $holiday): RedirectResponse
    {
        $holiday->delete();

        return back()->with('status', 'Removed the holiday.');
    }
}
