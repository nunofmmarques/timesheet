<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $entry_key
 * @property int|null $minutes
 * @property string|null $description
 * @property bool $included
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['entry_key', 'minutes', 'description', 'included'])]
class TimesheetOverride extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'included' => 'boolean',
        ];
    }
}
