<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TeamworkProjects
{
    /**
     * @return list<array{id: int, name: string}>
     */
    public function all(): array
    {
        if (! $this->configured()) {
            return [];
        }

        /** @var list<array{id: int, name: string}> $projects */
        $projects = Cache::remember('teamwork.projects', now()->addMinutes(10), function (): array {
            return $this->fetch();
        });

        return $projects;
    }

    /**
     * @return array{id: int, name: string}|null
     */
    public function find(int $id): ?array
    {
        foreach ($this->all() as $project) {
            if ($project['id'] === $id) {
                return $project;
            }
        }

        return null;
    }

    public function configured(): bool
    {
        return $this->url() !== '' && $this->token() !== '';
    }

    public function projectUrl(?int $id): ?string
    {
        if ($id === null || $this->url() === '') {
            return null;
        }

        return $this->url().'/app/projects/'.$id.'/overview';
    }

    public function taskUrl(?int $id): ?string
    {
        if ($id === null || $this->url() === '') {
            return null;
        }

        return $this->url().'/app/tasks/'.$id;
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function fetch(): array
    {
        $projects = [];

        for ($page = 1; $page <= 20; $page++) {
            $response = Http::withBasicAuth($this->token(), 'x')
                ->acceptJson()
                ->timeout(20)
                ->get($this->url().'/projects/api/v3/projects.json', [
                    'page' => $page,
                    'pageSize' => 100,
                    'orderBy' => 'name',
                    'projectType' => 'normal',
                ])
                ->throw();

            $payload = $response->json();

            if (! is_array($payload)) {
                throw new RuntimeException('Teamwork did not return a project list.');
            }

            $batch = $payload['projects'] ?? null;

            if (! is_array($batch)) {
                throw new RuntimeException('Teamwork did not return a project list.');
            }

            foreach ($batch as $project) {
                if (! is_array($project) || ! is_numeric($project['id'] ?? null) || ! is_string($project['name'] ?? null)) {
                    continue;
                }

                $projects[] = [
                    'id' => (int) $project['id'],
                    'name' => $project['name'],
                ];
            }

            $meta = $payload['meta']['page'] ?? null;
            $hasMore = is_array($meta) && ($meta['hasMore'] ?? false) === true;

            if (! $hasMore || $batch === []) {
                break;
            }
        }

        return $projects;
    }

    private function url(): string
    {
        $url = config('timesheet.teamwork.url');

        if (! is_string($url) || ! str_starts_with($url, 'https://')) {
            return '';
        }

        return rtrim($url, '/');
    }

    private function token(): string
    {
        $token = config('timesheet.teamwork.token');

        return is_string($token) ? $token : '';
    }
}
