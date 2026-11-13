<?php

namespace App\Actions;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PersistHoliday
{
    public function __invoke(Request $request, Holiday $holiday): void
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'date' => [
                'required',
                'date_format:Y-m-d',
                Rule::unique('holidays', 'date')->ignore($holiday->id),
            ],
        ], [
            'date.unique' => 'That date already has a holiday.',
        ]);

        $holiday->fill([
            'name' => trim((string) $data['name']),
            'date' => $data['date'],
        ])->save();
    }
}
