<?php

namespace App\Actions;

use App\Models\Holiday;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StoreHoliday
{
    public function __invoke(Request $request, PersistHoliday $persist): RedirectResponse
    {
        $persist($request, new Holiday);

        return back()->with('status', 'Saved the holiday.');
    }
}
