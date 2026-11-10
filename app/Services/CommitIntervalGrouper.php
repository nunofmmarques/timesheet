<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use LogicException;

class CommitIntervalGrouper
{
    /**
     * Group commits into one timesheet line per project per quiet gap.
     *
     * @param  list<GitCommit>  $commits
     * @return list<array{
     *     date: string,
     *     label: string,
     *     sessions: list<array{
     *         key: string,
     *         repository: string,
     *         repositoryPath: string,
     *         startedAt: string,
     *         endedAt: string,
     *         estimatedMinutes: int,
     *         minutes: int,
     *         description: string,
     *         generatedDescription: string,
     *         included: bool,
     *         commits: list<array{hash: string, shortHash: string, subject: string, time: string, authorName: string}>
     *     }>
     * }>
     */
    public function group(array $commits, TimesheetInterval $interval): array
    {
        /** @var array<string, array<string, list<GitCommit>>> $buckets */
        $buckets = [];

        foreach ($commits as $commit) {
            $local = $commit->committedAt->timezone($interval->timezone);
            $buckets[$local->toDateString()][$commit->repositoryPath][] = $commit;
        }

        krsort($buckets);

        $days = [];

        foreach ($buckets as $date => $byRepository) {
            $sessions = [];

            foreach ($byRepository as $path => $repositoryCommits) {
                usort(
                    $repositoryCommits,
                    fn (GitCommit $left, GitCommit $right): int => $left->committedAt <=> $right->committedAt,
                );

                foreach ($this->splitByGap($repositoryCommits, $interval->idleGapMinutes) as $session) {
                    $first = $session[0];
                    $last = $this->last($session);
                    $description = $this->description($session);
                    $minutes = $this->estimateMinutes($session, $interval);

                    $sessions[] = [
                        'key' => hash('sha256', $date.'|'.$path.'|'.implode(',', array_map(
                            fn (GitCommit $commit): string => $commit->hash,
                            $session,
                        ))),
                        'repository' => $first->repository,
                        'repositoryPath' => $path,
                        'startedAt' => $first->committedAt->timezone($interval->timezone)->format('H:i'),
                        'endedAt' => $last->committedAt->timezone($interval->timezone)->format('H:i'),
                        'estimatedMinutes' => $minutes,
                        'minutes' => $minutes,
                        'description' => $description,
                        'generatedDescription' => $description,
                        'included' => true,
                        'commits' => array_map(
                            fn (GitCommit $commit): array => [
                                'hash' => $commit->hash,
                                'shortHash' => substr($commit->hash, 0, 7),
                                'subject' => $commit->subject,
                                'time' => $commit->committedAt->timezone($interval->timezone)->format('H:i'),
                                'authorName' => $commit->authorName,
                            ],
                            $session,
                        ),
                    ];
                }
            }

            usort(
                $sessions,
                fn (array $left, array $right): int => [$left['startedAt'], $left['repository']] <=> [$right['startedAt'], $right['repository']],
            );

            $days[] = [
                'date' => $date,
                'label' => CarbonImmutable::parse($date, $interval->timezone)->format('D j M'),
                'sessions' => $sessions,
            ];
        }

        return $days;
    }

    /**
     * @param  list<GitCommit>  $commits
     * @return list<non-empty-list<GitCommit>>
     */
    private function splitByGap(array $commits, int $idleGapMinutes): array
    {
        /** @var list<non-empty-list<GitCommit>> $sessions */
        $sessions = [];
        /** @var list<GitCommit> $current */
        $current = [];

        foreach ($commits as $commit) {
            if ($current !== []) {
                $previous = $this->last($current);
                $gapSeconds = $commit->committedAt->getTimestamp() - $previous->committedAt->getTimestamp();

                if ($gapSeconds > $idleGapMinutes * 60) {
                    $sessions[] = $current;
                    $current = [];
                }
            }

            $current[] = $commit;
        }

        if ($current !== []) {
            $sessions[] = $current;
        }

        return $sessions;
    }

    /**
     * @param  non-empty-list<GitCommit>  $session
     */
    private function description(array $session): string
    {
        $lines = [];

        foreach ($session as $commit) {
            $subject = trim($commit->subject);

            if ($subject === '' || in_array($subject, $lines, true)) {
                continue;
            }

            $lines[] = $subject;
        }

        return implode("\n", array_map(
            fn (string $line): string => '- '.$line,
            $lines,
        ));
    }

    /**
     * @param  non-empty-list<GitCommit>  $session
     */
    private function estimateMinutes(array $session, TimesheetInterval $interval): int
    {
        $first = $session[0]->committedAt;
        $last = $this->last($session)->committedAt;
        $span = (int) floor(($last->getTimestamp() - $first->getTimestamp()) / 60);
        $raw = min(24 * 60, max($interval->minimumMinutes, $span + $interval->paddingMinutes));

        return $this->roundMinutes($raw, $interval->roundToMinutes);
    }

    /**
     * @param  list<GitCommit>  $commits
     */
    private function last(array $commits): GitCommit
    {
        $index = array_key_last($commits);

        if ($index === null) {
            throw new LogicException('Expected at least one commit.');
        }

        return $commits[$index];
    }

    private function roundMinutes(int $minutes, int $roundTo): int
    {
        if ($roundTo <= 1) {
            return $minutes;
        }

        $rounded = (int) (round($minutes / $roundTo) * $roundTo);

        if ($minutes <= 0) {
            return 0;
        }

        return max($roundTo, $rounded);
    }
}
