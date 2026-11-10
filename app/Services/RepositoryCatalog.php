<?php

namespace App\Services;

use App\Models\Repository;
use App\Models\TimesheetSetting;
use InvalidArgumentException;
use Symfony\Component\Process\Process;

class RepositoryCatalog
{
    public function __construct(private GitCommitReader $reader) {}

    public function ensureDefaults(): TimesheetSetting
    {
        $setting = TimesheetSetting::query()->first();

        if (! $setting instanceof TimesheetSetting) {
            $setting = TimesheetSetting::query()->create([
                'author_email' => $this->globalGitEmail(),
                'idle_gap_minutes' => 60,
                'padding_minutes' => 15,
                'minimum_minutes' => 30,
                'round_to_minutes' => 15,
            ]);
        }

        if (Repository::query()->doesntExist() && ! app()->runningUnitTests()) {
            foreach ($this->discoverRoots() as $root) {
                try {
                    $this->importDirectory($root);
                } catch (InvalidArgumentException) {
                    // A default folder is missing. The user can scan another one.
                }
            }
        }

        return $setting;
    }

    /**
     * @return list<string>
     */
    public function discoverRoots(): array
    {
        $configured = config('timesheet.discover_roots');

        if (! is_array($configured)) {
            $single = config('timesheet.discover_root');
            $configured = is_string($single) ? [$single] : [];
        }

        $roots = [];

        foreach ($configured as $root) {
            if (! is_string($root) || $root === '') {
                continue;
            }

            $real = realpath($root);

            if ($real !== false && is_dir($real)) {
                $roots[] = $real;
            }
        }

        return array_values(array_unique($roots));
    }

    public function importDirectory(string $directory): int
    {
        $added = 0;

        foreach ($this->discover($directory) as $path) {
            $repository = Repository::query()->firstOrCreate(
                ['path' => $path],
                ['name' => basename($path), 'enabled' => true],
            );

            if ($repository->wasRecentlyCreated) {
                $added++;
            }
        }

        return $added;
    }

    /**
     * @return list<string>
     */
    public function discover(string $directory): array
    {
        $root = realpath($directory);

        if ($root === false || ! is_dir($root)) {
            throw new InvalidArgumentException('Folder not found.');
        }

        $paths = [];

        if ($this->reader->isGitRepository($root)) {
            $paths[] = $root;
        }

        $entries = scandir($root);

        if ($entries === false) {
            return $paths;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..' || str_starts_with($entry, '.')) {
                continue;
            }

            $path = $root.DIRECTORY_SEPARATOR.$entry;

            if ($this->reader->isGitRepository($path)) {
                $paths[] = $path;
            }

            if (count($paths) >= 200) {
                break;
            }
        }

        sort($paths);

        return $paths;
    }

    public function addPath(string $path): Repository
    {
        $real = realpath($path);

        if ($real === false || ! $this->reader->isGitRepository($real)) {
            throw new InvalidArgumentException('That folder is not a Git repository.');
        }

        return Repository::query()->firstOrCreate(
            ['path' => $real],
            ['name' => basename($real), 'enabled' => true],
        );
    }

    private function globalGitEmail(): ?string
    {
        $process = new Process(['git', 'config', '--global', 'user.email']);
        $process->setTimeout(5);
        $process->run();

        if (! $process->isSuccessful()) {
            return null;
        }

        $email = trim($process->getOutput());

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }
}
