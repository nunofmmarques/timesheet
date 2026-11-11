<?php

namespace App\Services;

use Carbon\CarbonImmutable;

final readonly class GitCommit
{
    public function __construct(
        public string $hash,
        public CarbonImmutable $committedAt,
        public string $authorName,
        public string $authorEmail,
        public string $subject,
        public string $repository,
        public string $repositoryPath,
        public string $branch = '',
    ) {}
}
