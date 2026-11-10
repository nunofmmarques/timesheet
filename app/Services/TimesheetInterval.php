<?php

namespace App\Services;

final readonly class TimesheetInterval
{
    public function __construct(
        public string $timezone,
        public int $idleGapMinutes,
        public int $paddingMinutes,
        public int $minimumMinutes,
        public int $roundToMinutes,
    ) {}
}
