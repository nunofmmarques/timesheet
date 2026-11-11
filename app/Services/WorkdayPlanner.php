<?php

namespace App\Services;

use Carbon\CarbonImmutable;

class WorkdayPlanner
{
    private const STEP_MINUTES = 15;

    /**
     * Group commits by day and project, then split the working day across those projects.
     *
     * Monday to Thursday is 09:00–13:00 and 14:00–18:00. Friday is 09:00–13:00.
     * A larger share goes to the project whose commits span more of the day.
     *
     * @param  list<GitCommit>  $commits
     * @return list<array{
     *     date: string,
     *     label: string,
     *     capacityMinutes: int,
     *     windows: list<array{start: string, end: string}>,
     *     blocks: list<array{repository: string, start: string, end: string, minutes: int}>,
     *     projects: list<array{
     *         repository: string,
     *         repositoryPath: string,
     *         minutes: int,
     *         spentMinutes: int,
     *         commits: list<array{hash: string, shortHash: string, subject: string, time: string, authorName: string, branch: string}>
     *     }>
     * }>
     */
    public function plan(array $commits, string $timezone): array
    {
        /** @var array<string, array<string, list<GitCommit>>> $buckets */
        $buckets = [];

        foreach ($commits as $commit) {
            $local = $commit->committedAt->timezone($timezone);
            $buckets[$local->toDateString()][$commit->repositoryPath][] = $commit;
        }

        krsort($buckets);

        $days = [];

        foreach ($buckets as $date => $byRepository) {
            $day = CarbonImmutable::parse($date, $timezone)->startOfDay();
            $schedule = $this->schedule($day);
            $projects = $this->projects($byRepository, $timezone);
            $shares = $this->share(
                array_map(fn (array $project): int => $project['weight'], $projects),
                $schedule['capacityMinutes'],
            );

            foreach ($projects as $index => $project) {
                $projects[$index]['minutes'] = $shares[$index] ?? 0;
            }

            $days[] = [
                'date' => $date,
                'label' => $day->format('D j M'),
                'capacityMinutes' => $schedule['capacityMinutes'],
                'windows' => $schedule['windows'],
                'blocks' => $this->blocks($projects, $schedule['windows']),
                'projects' => array_map(fn (array $project): array => [
                    'repository' => $project['repository'],
                    'repositoryPath' => $project['repositoryPath'],
                    'minutes' => $project['minutes'],
                    'spentMinutes' => $project['spentMinutes'],
                    'commits' => $project['commits'],
                ], $projects),
            ];
        }

        return $days;
    }

    /**
     * A day in the range that has Teamwork time but no commits.
     *
     * @return array{
     *     date: string,
     *     label: string,
     *     capacityMinutes: int,
     *     windows: list<array{start: string, end: string}>,
     *     blocks: list<empty>,
     *     projects: list<empty>
     * }
     */
    public function blankDay(string $date, string $timezone): array
    {
        $day = CarbonImmutable::parse($date, $timezone)->startOfDay();
        $schedule = $this->schedule($day);

        return [
            'date' => $date,
            'label' => $day->format('D j M'),
            'capacityMinutes' => $schedule['capacityMinutes'],
            'windows' => $schedule['windows'],
            'blocks' => [],
            'projects' => [],
        ];
    }

    /**
     * @return array{capacityMinutes: int, windows: list<array{start: string, end: string}>}
     */
    private function schedule(CarbonImmutable $day): array
    {
        if ($day->isWeekend()) {
            return ['capacityMinutes' => 0, 'windows' => []];
        }

        if ($day->isFriday()) {
            return [
                'capacityMinutes' => 4 * 60,
                'windows' => [['start' => '09:00', 'end' => '13:00']],
            ];
        }

        return [
            'capacityMinutes' => 8 * 60,
            'windows' => [
                ['start' => '09:00', 'end' => '13:00'],
                ['start' => '14:00', 'end' => '18:00'],
            ],
        ];
    }

    /**
     * @param  array<string, list<GitCommit>>  $byRepository
     * @return list<array{
     *     repository: string,
     *     repositoryPath: string,
     *     weight: int,
     *     minutes: int,
     *     spentMinutes: int,
     *     commits: list<array{hash: string, shortHash: string, subject: string, time: string, authorName: string, branch: string}>
     * }>
     */
    private function projects(array $byRepository, string $timezone): array
    {
        $projects = [];

        foreach ($byRepository as $path => $commits) {
            if ($commits === []) {
                continue;
            }

            usort(
                $commits,
                fn (GitCommit $left, GitCommit $right): int => $left->committedAt <=> $right->committedAt,
            );

            $first = $commits[0];
            $last = $commits[array_key_last($commits)];
            $span = (int) floor(($last->committedAt->getTimestamp() - $first->committedAt->getTimestamp()) / 60);

            $projects[] = [
                'repository' => $first->repository,
                'repositoryPath' => $path,
                'firstAt' => $first->committedAt,
                'weight' => $span + self::STEP_MINUTES,
                'minutes' => 0,
                'spentMinutes' => $span,
                'commits' => array_map(
                    fn (GitCommit $commit): array => [
                        'hash' => $commit->hash,
                        'shortHash' => substr($commit->hash, 0, 7),
                        'subject' => $commit->subject,
                        'time' => $commit->committedAt->timezone($timezone)->format('H:i'),
                        'authorName' => $commit->authorName,
                        'branch' => $commit->branch,
                    ],
                    $commits,
                ),
            ];
        }

        usort(
            $projects,
            fn (array $left, array $right): int => [$left['firstAt'], $left['repository']] <=> [$right['firstAt'], $right['repository']],
        );

        return $projects;
    }

    /**
     * @param  list<int>  $weights
     * @return list<int>
     */
    private function share(array $weights, int $capacity): array
    {
        $count = count($weights);

        if ($count === 0 || $capacity <= 0) {
            return array_fill(0, $count, 0);
        }

        $slots = intdiv($capacity, self::STEP_MINUTES);
        $total = array_sum($weights);
        $minimum = $count <= $slots ? 1 : 0;
        $remaining = $slots - ($minimum * $count);
        $exact = [];
        $extra = [];
        $used = 0;

        foreach ($weights as $index => $weight) {
            $exact[$index] = $total > 0 ? ($weight / $total) * $remaining : 0;
            $extra[$index] = (int) floor($exact[$index]);
            $used += $extra[$index];
        }

        $leftover = $remaining - $used;
        $order = array_keys($weights);
        usort($order, function (int $left, int $right) use ($exact, $extra): int {
            $fraction = ($exact[$right] - $extra[$right]) <=> ($exact[$left] - $extra[$left]);

            return $fraction !== 0 ? $fraction : $left <=> $right;
        });

        for ($step = 0; $step < $leftover; $step++) {
            $extra[$order[$step]]++;
        }

        $shares = [];

        foreach (array_keys($weights) as $index) {
            $shares[] = ($minimum + $extra[$index]) * self::STEP_MINUTES;
        }

        return $shares;
    }

    /**
     * @param  list<array{repository: string, minutes: int}>  $projects
     * @param  list<array{start: string, end: string}>  $windows
     * @return list<array{repository: string, start: string, end: string, minutes: int}>
     */
    private function blocks(array $projects, array $windows): array
    {
        if ($windows === []) {
            return [];
        }

        $parsed = array_map(
            fn (array $window): array => [
                $this->minutesFromClock($window['start']),
                $this->minutesFromClock($window['end']),
            ],
            $windows,
        );

        $windowIndex = 0;
        $cursor = $parsed[0][0];
        $blocks = [];

        foreach ($projects as $project) {
            $left = $project['minutes'];

            while ($left > 0) {
                if ($cursor >= $parsed[$windowIndex][1]) {
                    $windowIndex++;

                    if (! isset($parsed[$windowIndex])) {
                        break;
                    }

                    $cursor = $parsed[$windowIndex][0];
                }

                $take = min($left, $parsed[$windowIndex][1] - $cursor);
                $blocks[] = [
                    'repository' => $project['repository'],
                    'start' => $this->clock($cursor),
                    'end' => $this->clock($cursor + $take),
                    'minutes' => $take,
                ];
                $cursor += $take;
                $left -= $take;
            }
        }

        return $blocks;
    }

    private function minutesFromClock(string $clock): int
    {
        $parts = explode(':', $clock);

        return ((int) $parts[0]) * 60 + (int) ($parts[1] ?? 0);
    }

    private function clock(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
