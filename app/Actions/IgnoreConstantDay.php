<?php

namespace App\Actions;

use App\Models\ConstantTask;
use App\Models\ConstantTaskSkip;
use App\Support\Clock;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class IgnoreConstantDay
{
    public function __invoke(Request $request, ConstantTask $constant): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = (string) $data['date'];
        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, Clock::timezone());

        if (! $day instanceof CarbonImmutable || $day->dayOfWeekIso !== $constant->weekday) {
            throw ValidationException::withMessages([
                'date' => 'That date is not the weekday for this constant task.',
            ]);
        }

        ConstantTaskSkip::query()->firstOrCreate([
            'constant_task_id' => $constant->id,
            'date' => $date,
        ]);

        return back();
    }
}
