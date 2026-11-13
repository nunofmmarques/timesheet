<?php

namespace App\Actions;

use App\Models\Holiday;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UpdateHoliday
{
    public function __invoke(Request $request, Holiday $holiday, PersistHoliday $persist): RedirectResponse
    {
        $persist($request, $holiday);

        return back()->with('status', 'Updated the holiday.');
    }
}
