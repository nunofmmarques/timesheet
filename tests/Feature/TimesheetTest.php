<?php

use App\Models\Repository;
use App\Models\TimesheetSetting;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\Process\Process;

function runGit(string $cwd, array $arguments, array $env = []): void
{
    $inherited = getenv();
    $process = new Process(
        ['git', '-C', $cwd, ...$arguments],
        null,
        array_merge(is_array($inherited) ? $inherited : [], $env),
    );
    $process->setTimeout(20);
    $process->mustRun();
}

function deleteDirectory(string $path): void
{
    if (! is_dir($path)) {
        return;
    }

    $items = scandir($path);

    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $target = $path.DIRECTORY_SEPARATOR.$item;

        if (is_dir($target)) {
            deleteDirectory($target);
        } else {
            unlink($target);
        }
    }

    rmdir($path);
}

test('the timesheet shows commits from the selected author', function () {
    $path = storage_path('framework/testing/timesheet-'.uniqid());

    try {
        mkdir($path, 0777, true);
        runGit($path, ['init', '-b', 'main']);
        runGit($path, ['config', 'user.email', 'test@example.com']);
        runGit($path, ['config', 'user.name', 'Test']);
        file_put_contents($path.'/notes.txt', "one\n");
        runGit($path, ['add', 'notes.txt']);
        runGit($path, ['commit', '-m', 'Log the homepage'], [
            'GIT_AUTHOR_DATE' => '2026-11-10T09:00:00+00:00',
            'GIT_COMMITTER_DATE' => '2026-11-10T09:00:00+00:00',
            'GIT_AUTHOR_EMAIL' => 'test@example.com',
            'GIT_COMMITTER_EMAIL' => 'test@example.com',
        ]);
        file_put_contents($path.'/notes.txt', "two\n");
        runGit($path, ['add', 'notes.txt']);
        runGit($path, ['commit', '-m', 'Ignore this'], [
            'GIT_AUTHOR_DATE' => '2026-11-10T10:00:00+00:00',
            'GIT_COMMITTER_DATE' => '2026-11-10T10:00:00+00:00',
            'GIT_AUTHOR_NAME' => 'Other',
            'GIT_AUTHOR_EMAIL' => 'other@example.com',
            'GIT_COMMITTER_NAME' => 'Other',
            'GIT_COMMITTER_EMAIL' => 'other@example.com',
        ]);
        file_put_contents($path.'/notes.txt', "stashed\n");
        runGit($path, ['stash', 'push', '-m', 'secret stash']);

        TimesheetSetting::query()->create([
            'author_email' => 'test@example.com',
            'idle_gap_minutes' => 60,
            'padding_minutes' => 15,
            'minimum_minutes' => 30,
            'round_to_minutes' => 15,
        ]);

        Repository::query()->create([
            'name' => 'notes',
            'path' => $path,
            'enabled' => true,
        ]);

        $this->get('/?preset=custom&from=2026-11-10&to=2026-11-10')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('timesheet')
                ->has('days', 1)
                ->has('days.0.sessions', 1)
                ->has('days.0.sessions.0.commits', 1)
                ->where('days.0.sessions.0.commits.0.subject', 'Log the homepage')
                ->where('days.0.sessions.0.minutes', 30)
                ->where('days.0.sessions.0.repository', 'notes'));
    } finally {
        deleteDirectory($path);
    }
});

test('adding a folder that is not a repository is rejected', function () {
    $this->from('/')
        ->post('/repositories', ['path' => storage_path('framework')])
        ->assertRedirect('/')
        ->assertSessionHasErrors('path');
});

test('previous month covers the whole previous calendar month', function () {
    $this->travelTo('2026-11-10');

    $this->get('/?preset=last-month')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('preset', 'last-month')
            ->where('from', '2026-10-01')
            ->where('to', '2026-10-31'));
});
