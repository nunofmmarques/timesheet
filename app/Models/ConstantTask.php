<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $weekday
 * @property string $start_time
 * @property string $end_time
 * @property int $teamwork_project_id
 * @property string $teamwork_project_name
 * @property int $teamwork_task_id
 * @property string $teamwork_task_name
 * @property bool $billable
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'weekday',
    'start_time',
    'end_time',
    'teamwork_project_id',
    'teamwork_project_name',
    'teamwork_task_id',
    'teamwork_task_name',
    'billable',
])]
class ConstantTask extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
            'teamwork_project_id' => 'integer',
            'teamwork_task_id' => 'integer',
            'billable' => 'boolean',
        ];
    }
}
