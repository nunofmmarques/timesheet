<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class PortugalHolidays
{
    /**
     * National public holidays for mainland Portugal.
     *
     * @return list<array{date: string, name: string}>
     */
    public static function year(int $year): array
    {
        $easter = self::easter($year);
        $dates = [
            $year.'-01-01' => 'Ano Novo',
            $easter->subDays(2)->toDateString() => 'Sexta-feira Santa',
            $easter->toDateString() => 'Páscoa',
            $year.'-04-25' => 'Dia da Liberdade',
            $year.'-05-01' => 'Dia do Trabalhador',
            $easter->addDays(60)->toDateString() => 'Corpo de Deus',
            $year.'-06-10' => 'Dia de Portugal',
            $year.'-08-15' => 'Assunção de Nossa Senhora',
            $year.'-10-05' => 'Implantação da República',
            $year.'-11-01' => 'Todos os Santos',
            $year.'-12-01' => 'Restauração da Independência',
            $year.'-12-08' => 'Imaculada Conceição',
            $year.'-12-25' => 'Natal',
        ];

        ksort($dates);

        $holidays = [];

        foreach ($dates as $date => $name) {
            $holidays[] = ['date' => $date, 'name' => $name];
        }

        return $holidays;
    }

    public static function easter(int $year): CarbonImmutable
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return CarbonImmutable::parse(sprintf('%04d-%02d-%02d', $year, $month, $day));
    }
}
