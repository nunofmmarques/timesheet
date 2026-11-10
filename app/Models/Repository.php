<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $path
 * @property bool $enabled
 * @property int|null $teamwork_project_id
 * @property string|null $teamwork_project_name
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'path', 'enabled', 'teamwork_project_id', 'teamwork_project_name'])]
class Repository extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'teamwork_project_id' => 'integer',
        ];
    }
}
