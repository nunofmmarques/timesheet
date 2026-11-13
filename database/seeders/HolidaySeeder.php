<?php

namespace Database\Seeders;

use App\Models\Holiday;
use App\Support\PortugalHolidays;
use Illuminate\Database\Seeder;

class HolidaySeeder extends Seeder
{
    /**
     * Seed Portugal's national holidays without overwriting later edits.
     */
    public function run(): void
    {
        foreach (range(2020, 2035) as $year) {
            foreach (PortugalHolidays::year($year) as $holiday) {
                Holiday::query()->firstOrCreate(
                    ['date' => $holiday['date']],
                    ['name' => $holiday['name']],
                );
            }
        }
    }
}
