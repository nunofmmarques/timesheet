<?php

use App\Services\GitCommit;
use App\Services\WorkdayPlanner;
use Carbon\CarbonImmutable;

function plannerCommit(
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

test('one project fills both halves of an eight hour day', function () {
    $days = (new WorkdayPlanner)->plan([
        plannerCommit('2026-11-10T09:10:00+00:00', 'Add the hero'),
        plannerCommit('2026-11-10T10:40:00+00:00', 'Fix the nav'),
    ], 'Europe/Lisbon');

    expect($days)->toHaveCount(1)
        ->and($days[0]['label'])->toBe('Tue 10 Nov')
        ->and($days[0]['capacityMinutes'])->toBe(480)
        ->and($days[0]['projects'])->toHaveCount(1)
        ->and($days[0]['projects'][0]['commits'])->toHaveCount(2)
        ->and($days[0]['projects'][0]['commits'][0]['subject'])->toBe('Add the hero')
        ->and($days[0]['projects'][0]['minutes'])->toBe(480)
        ->and($days[0]['projects'][0]['spentMinutes'])->toBe(90)
        ->and($days[0]['blocks'])->toBe([
            ['repository' => 'client', 'start' => '09:00', 'end' => '13:00', 'minutes' => 240],
            ['repository' => 'client', 'start' => '14:00', 'end' => '18:00', 'minutes' => 240],
        ]);
});

test('projects share the day in proportion to how long their commits span', function () {
    $days = (new WorkdayPlanner)->plan([
        plannerCommit('2026-11-10T09:00:00+00:00', 'Morning', 'client', '/repos/client'),
        plannerCommit('2026-11-10T10:00:00+00:00', 'Still morning', 'client', '/repos/client'),
        plannerCommit('2026-11-10T16:00:00+00:00', 'Quick site fix', 'site', '/repos/site'),
    ], 'Europe/Lisbon');

    expect($days[0]['projects'][0]['repository'])->toBe('client')
        ->and($days[0]['projects'][0]['minutes'])->toBe(390)
        ->and($days[0]['projects'][1]['repository'])->toBe('site')
        ->and($days[0]['projects'][0]['spentMinutes'])->toBe(60)
        ->and($days[0]['projects'][1]['minutes'])->toBe(90)
        ->and($days[0]['projects'][1]['spentMinutes'])->toBe(0)
        ->and($days[0]['blocks'])->toBe([
            ['repository' => 'client', 'start' => '09:00', 'end' => '13:00', 'minutes' => 240],
            ['repository' => 'client', 'start' => '14:00', 'end' => '16:30', 'minutes' => 150],
            ['repository' => 'site', 'start' => '16:30', 'end' => '18:00', 'minutes' => 90],
        ]);
});

test('friday stops at 13:00', function () {
    $days = (new WorkdayPlanner)->plan([
        plannerCommit('2026-11-13T11:00:00+00:00', 'Friday note'),
    ], 'Europe/Lisbon');

    expect($days[0]['label'])->toBe('Fri 13 Nov')
        ->and($days[0]['capacityMinutes'])->toBe(240)
        ->and($days[0]['windows'])->toBe([
            ['start' => '09:00', 'end' => '13:00'],
        ])
        ->and($days[0]['blocks'])->toBe([
            ['repository' => 'client', 'start' => '09:00', 'end' => '13:00', 'minutes' => 240],
        ]);
});

test('a weekend lists the commits without scheduled hours', function () {
    $days = (new WorkdayPlanner)->plan([
        plannerCommit('2026-11-14T15:00:00+00:00', 'Saturday experiment'),
    ], 'Europe/Lisbon');

    expect($days[0]['label'])->toBe('Sat 14 Nov')
        ->and($days[0]['capacityMinutes'])->toBe(0)
        ->and($days[0]['windows'])->toBe([])
        ->and($days[0]['blocks'])->toBe([])
        ->and($days[0]['projects'][0]['commits'][0]['subject'])->toBe('Saturday experiment')
        ->and($days[0]['projects'][0]['minutes'])->toBe(0);
});
