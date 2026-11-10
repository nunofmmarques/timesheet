<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $author_email
 * @property int $idle_gap_minutes
 * @property int $padding_minutes
 * @property int $minimum_minutes
 * @property int $round_to_minutes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'author_email',
    'idle_gap_minutes',
    'padding_minutes',
    'minimum_minutes',
    'round_to_minutes',
])]
class TimesheetSetting extends Model
{
    //
}
