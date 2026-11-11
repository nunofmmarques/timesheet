<?php

namespace App\Services;

use App\Models\Repository;
use Carbon\CarbonImmutable;
use RuntimeException;
use Symfony\Component\Process\Process;

class GitCommitReader
{
    /**
     * @return list<GitCommit>
     */
    public function read(Repository $repository, CarbonImmutable $since, CarbonImmutable $until, ?string $authorEmail): array
    {
        if (! is_dir($repository->path)) {
            throw new RuntimeException('Folder not found.');
        }

        if (! $this->isGitRepository($repository->path)) {
            throw new RuntimeException('Not a Git repository.');
        }

        $command = [
            'git',
            '-C',
            $repository->path,
            'log',
            '--branches',
            '--remotes',
            '--no-merges',
            '--since',
            $since->toIso8601String(),
            '--until',
            $until->toIso8601String(),
            '--date-order',
            '--source',
            '--pretty=format:%H%x1f%aI%x1f%an%x1f%ae%x1f%S%x1f%s%x1e',
        ];

        if ($authorEmail !== null && $authorEmail !== '') {
            $command[] = '--author='.preg_quote($authorEmail, '/');
        }

        $process = new Process($command);
        $process->setTimeout(30);
        $process->run();

        if (! $process->isSuccessful()) {
            $error = trim($process->getErrorOutput());

            throw new RuntimeException($error !== '' ? $error : 'Git log failed.');
        }

        return $this->parse($process->getOutput(), $repository, $authorEmail);
    }

    public function isGitRepository(string $path): bool
    {
        return is_dir($path) && (is_dir($path.'/.git') || is_file($path.'/.git'));
    }

    /**
     * @return list<GitCommit>
     */
    private function parse(string $output, Repository $repository, ?string $authorEmail): array
    {
        $commits = [];

        foreach (explode("\x1e", $output) as $record) {
            $record = trim($record);

            if ($record === '') {
                continue;
            }

            $parts = explode("\x1f", $record);

            if (count($parts) < 6) {
                continue;
            }

            $hash = array_shift($parts);
            $committedAt = array_shift($parts);
            $authorName = array_shift($parts);
            $email = array_shift($parts);
            $branch = $this->branch(array_shift($parts) ?? '');
            $subject = trim(implode("\x1f", $parts));

            if ($authorEmail !== null && $authorEmail !== '' && strcasecmp($email, $authorEmail) !== 0) {
                continue;
            }

            $commits[] = new GitCommit(
                hash: $hash,
                committedAt: CarbonImmutable::parse($committedAt),
                authorName: $authorName,
                authorEmail: $email,
                subject: $subject,
                repository: $repository->name,
                repositoryPath: $repository->path,
                branch: $branch,
            );
        }

        return $commits;
    }

    private function branch(string $source): string
    {
        $source = trim($source);

        if (str_starts_with($source, 'refs/heads/')) {
            return substr($source, strlen('refs/heads/'));
        }

        if (str_starts_with($source, 'refs/remotes/')) {
            $remote = substr($source, strlen('refs/remotes/'));
            $slash = strpos($remote, '/');

            return $slash === false ? $remote : substr($remote, $slash + 1);
        }

        return $source;
    }
}
