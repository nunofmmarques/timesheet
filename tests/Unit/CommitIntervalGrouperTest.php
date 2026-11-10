<?php

use App\Services\CommitIntervalGrouper;
use App\Services\GitCommit;
use App\Services\TimesheetInterval;
use Carbon\CarbonImmutable;

function timesheetCommit(
    string $at,
    string $subject,
    string $repository = 'client',
    string $path = '/repos/client',
): GitCommit {
    return new GitCommit(
        hash: hash('sha256', $at.$subject.$path),
        committedAt: CarbonImmutable::parse($at),
        authorName: 'Nuno',
        authorEmail: 'nuno@example.com',
        subject: $subject,
        repository: $repository,
        repositoryPath: $path,
    );
}

function timesheetInterval(): TimesheetInterval
{
    return new TimesheetInterval(
        timezone: 'Europe/Lisbon',
        idleGapMinutes: 60,
        paddingMinutes: 15,
        minimumMinutes: 30,
        roundToMinutes: 15,
    );
}

test('commits inside the quiet gap stay on one timesheet line', function () {
    $days = (new CommitIntervalGrouper)->group([
        timesheetCommit('2026-11-10T09:00:00+00:00', 'Add the hero'),
        timesheetCommit('2026-11-10T09:50:00+00:00', 'Fix the nav'),
    ], timesheetInterval());

    expect($days)->toHaveCount(1)
        ->and($days[0]['sessions'])->toHaveCount(1)
        ->and($days[0]['sessions'][0]['minutes'])->toBe(60)
        ->and($days[0]['sessions'][0]['description'])->toBe("- Add the hero\n- Fix the nav");
});

test('a quiet gap starts a new interval', function () {
    $days = (new CommitIntervalGrouper)->group([
        timesheetCommit('2026-11-10T09:00:00+00:00', 'Morning work'),
        timesheetCommit('2026-11-10T11:30:00+00:00', 'Afternoon work'),
    ], timesheetInterval());

    expect($days[0]['sessions'])->toHaveCount(2)
        ->and($days[0]['sessions'][0]['startedAt'])->toBe('09:00')
        ->and($days[0]['sessions'][1]['startedAt'])->toBe('11:30')
        ->and($days[0]['sessions'][0]['minutes'])->toBe(30);
});

test('projects are logged separately even when the commits overlap', function () {
    $days = (new CommitIntervalGrouper)->group([
        timesheetCommit('2026-11-10T09:00:00+00:00', 'Client fix', 'client', '/repos/client'),
        timesheetCommit('2026-11-10T09:10:00+00:00', 'Site copy', 'site', '/repos/site'),
    ], timesheetInterval());

    expect($days[0]['sessions'])->toHaveCount(2);
});

test('a single commit uses the minimum rounded block', function () {
    $days = (new CommitIntervalGrouper)->group([
        timesheetCommit('2026-11-10T15:05:00+00:00', 'Quick fix'),
    ], timesheetInterval());

    expect($days[0]['label'])->toBe('Tue 10 Nov')
        ->and($days[0]['sessions'][0]['minutes'])->toBe(30)
        ->and($days[0]['sessions'][0]['startedAt'])->toBe('15:05');
});
