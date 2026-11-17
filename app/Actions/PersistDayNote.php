<?php

namespace App\Actions;

use App\Models\DayNote;
use Illuminate\Http\Request;

class PersistDayNote
{
    public function __invoke(Request $request, DayNote $note): void
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['nullable', 'date_format:H:i'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $time = isset($data['time']) ? trim((string) $data['time']) : '';

        $note->fill([
            'date' => $data['date'],
            'time' => $time !== '' ? $time : null,
            'body' => trim((string) $data['body']),
        ])->save();
    }
}
