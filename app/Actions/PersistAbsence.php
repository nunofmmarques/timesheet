<?php

namespace App\Actions;

use App\Models\Absence;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PersistAbsence
{
    public function __invoke(Request $request, Absence $absence): void
    {
        $data = $request->validate([
            'kind' => ['required', 'string', Rule::in(array_keys(Absence::KINDS))],
            'part' => ['required', 'string', Rule::in(array_keys(Absence::PARTS))],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'note' => ['nullable', 'string', 'max:80', Rule::requiredIf($request->string('kind')->toString() === 'other')],
        ], [
            'note.required' => 'Name this time off.',
            'ends_on.after_or_equal' => 'End must be on or after the start.',
        ]);

        $startsOn = (string) $data['starts_on'];
        $endsOn = (string) $data['ends_on'];
        $part = (string) $data['part'];
        $overlap = Absence::query()
            ->when($absence->exists, fn ($query) => $query->whereKeyNot($absence->id))
            ->whereDate('starts_on', '<=', $endsOn)
            ->whereDate('ends_on', '>=', $startsOn)
            ->get()
            ->contains(fn (Absence $other): bool => $part === 'day' || $other->part === 'day' || $other->part === $part);

        if ($overlap) {
            throw ValidationException::withMessages([
                'starts_on' => 'These dates overlap another time off.',
            ]);
        }

        $note = trim((string) ($data['note'] ?? ''));

        $absence->fill([
            'kind' => $data['kind'],
            'part' => $part,
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'note' => $note === '' ? null : $note,
        ])->save();
    }
}
