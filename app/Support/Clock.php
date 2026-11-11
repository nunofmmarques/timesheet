<?php

namespace App\Support;

final class Clock
{
    public static function timezone(): string
    {
        $timezone = config('app.timezone');

        return is_string($timezone) && $timezone !== '' ? $timezone : 'Europe/Lisbon';
    }

    public static function minutesBetween(string $start, string $end): int
    {
        return self::minutesFrom($end) - self::minutesFrom($start);
    }

    public static function minutesFrom(string $clock): int
    {
        [$hour, $minute] = array_map(intval(...), explode(':', $clock));

        return ($hour * 60) + $minute;
    }

    public static function label(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;

        if ($hours === 0) {
            return $rest.'m';
        }

        if ($rest === 0) {
            return $hours.'h';
        }

        return $hours.'h '.$rest.'m';
    }
}
