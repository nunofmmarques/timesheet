<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Models\ConstantTaskSkip;
use Illuminate\Http\RedirectResponse;

class RestoreConstantDay
{
    public function __invoke(ConstantTask $constant, string $date): RedirectResponse
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            abort(404);
        }

        ConstantTaskSkip::query()
            ->where('constant_task_id', $constant->id)
            ->whereDate('date', $date)
            ->delete();

        return back();
    }
}
