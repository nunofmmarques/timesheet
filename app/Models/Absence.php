<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $kind
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'kind',
    'starts_on',
    'ends_on',
    'note',
])]
class Absence extends Model
{
    public const KINDS = [
        'vacation' => 'Vacation',
        'paid_leave' => 'Paid leave',
        'parental' => 'Parental leave',
        'sick' => 'Sick leave',
        'other' => 'Other',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    public function label(): string
    {
        if ($this->kind === 'other') {
            $note = trim((string) $this->note);

            return $note !== '' ? $note : 'Other';
        }

        return self::KINDS[$this->kind] ?? 'Time off';
    }
}
