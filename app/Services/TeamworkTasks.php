<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TeamworkTasks
{
    public function __construct(private TeamworkProjects $projects) {}

    /**
     * Incomplete tasks on a Teamwork project.
     *
     * @return list<array{id: int, name: string, tasklist: string, ancestors: list<string>}>
     */
    public function forProject(int $projectId): array
    {
        if (! $this->projects->configured()) {
            throw new RuntimeException('Teamwork is not configured.');
        }

        /** @var array<int, array<array-key, mixed>> $records */
        $records = [];
        $tasklists = [];
        $visible = [];

        for ($page = 1; $page <= 10; $page++) {
            $response = Http::withBasicAuth($this->token(), 'x')
                ->acceptJson()
                ->timeout(20)
                ->get($this->url().'/projects/api/v3/projects/'.$projectId.'/tasks.json', [
                    'page' => $page,
                    'pageSize' => 100,
                    'include' => 'tasklists,parentTasks',
                    'nestSubTasks' => 'false',
                ])
                ->throw();

            $payload = $response->json();

            if (! is_array($payload) || ! is_array($payload['tasks'] ?? null)) {
                throw new RuntimeException('Teamwork did not return a task list.');
            }

            $included = is_array($payload['included'] ?? null) ? $payload['included'] : [];
            $tasklists += is_array($included['tasklists'] ?? null) ? $included['tasklists'] : [];
            $this->remember($records, is_array($included['tasks'] ?? null) ? $included['tasks'] : []);
            $this->remember($records, $payload['tasks']);

            foreach ($payload['tasks'] as $task) {
                if (is_array($task) && is_numeric($task['id'] ?? null)) {
                    $visible[] = (int) $task['id'];
                }
            }

            $meta = $payload['meta']['page'] ?? null;
            $hasMore = is_array($meta) && ($meta['hasMore'] ?? false) === true;

            if (! $hasMore || $payload['tasks'] === []) {
                break;
            }
        }

        $tasks = [];

        foreach (array_values(array_unique($visible)) as $id) {
            $entry = $this->task($records[$id] ?? null, $records, $tasklists);

            if ($entry !== null) {
                $tasks[] = $entry;
            }
        }

        usort($tasks, fn (array $left, array $right): int => [
            $left['tasklist'],
            implode("\0", $left['ancestors']),
            $left['name'],
        ] <=> [
            $right['tasklist'],
            implode("\0", $right['ancestors']),
            $right['name'],
        ]);

        return $tasks;
    }

    public function projectId(int $taskId): int
    {
        $response = Http::withBasicAuth($this->token(), 'x')
            ->acceptJson()
            ->timeout(20)
            ->get($this->url().'/projects/api/v3/tasks/'.$taskId.'.json', [
                'include' => 'tasklists',
            ]);

        if ($response->failed()) {
            throw new RuntimeException($this->failure($response));
        }

        $task = $response->json('task');
        $tasklistId = is_array($task) && is_numeric($task['tasklistId'] ?? null) ? (int) $task['tasklistId'] : null;
        $tasklists = $response->json('included.tasklists');
        $tasklist = $tasklistId !== null && is_array($tasklists) ? ($tasklists[$tasklistId] ?? null) : null;
        $projectId = is_array($tasklist) ? ($tasklist['projectId'] ?? null) : null;

        if (! is_numeric($projectId)) {
            throw new RuntimeException('Teamwork did not return the task project.');
        }

        return (int) $projectId;
    }

    /**
     * @param  array<int, array<array-key, mixed>>  $records
     * @param  array<array-key, mixed>  $tasks
     */
    private function remember(array &$records, array $tasks): void
    {
        foreach ($tasks as $task) {
            if (! is_array($task) || ! is_numeric($task['id'] ?? null)) {
                continue;
            }

            $records[(int) $task['id']] = $task;
        }
    }

    /**
     * @param  array<int, array<array-key, mixed>>  $records
     * @param  array<array-key, mixed>  $tasklists
     * @return array{id: int, name: string, tasklist: string, ancestors: list<string>}|null
     */
    private function task(mixed $task, array $records, array $tasklists): ?array
    {
        if (! is_array($task) || ! is_numeric($task['id'] ?? null) || ! is_string($task['name'] ?? null)) {
            return null;
        }

        if (($task['status'] ?? null) === 'completed' || ($task['deletedAt'] ?? null) !== null) {
            return null;
        }

        $id = (int) $task['id'];
        $tasklistId = is_numeric($task['tasklistId'] ?? null) ? (int) $task['tasklistId'] : null;
        $tasklist = $tasklistId !== null && is_array($tasklists[$tasklistId] ?? null) ? $tasklists[$tasklistId] : null;
        $tasklistName = is_array($tasklist) && is_string($tasklist['name'] ?? null) ? $this->plain($tasklist['name']) : '';

        return [
            'id' => $id,
            'name' => $this->plain($task['name']),
            'tasklist' => $tasklistName,
            'ancestors' => $this->ancestors($id, $records),
        ];
    }

    /**
     * @param  array<int, array<array-key, mixed>>  $records
     * @return list<string>
     */
    private function ancestors(int $id, array $records): array
    {
        $names = [];
        $seen = [$id => true];
        $parentId = $this->parentId($records[$id] ?? null);

        while ($parentId !== null && ! isset($seen[$parentId])) {
            $seen[$parentId] = true;
            $parent = $records[$parentId] ?? null;

            if (! is_array($parent) || ! is_string($parent['name'] ?? null)) {
                break;
            }

            $names[] = $this->plain($parent['name']);
            $parentId = $this->parentId($parent);
        }

        return array_reverse($names);
    }

    private function parentId(mixed $task): ?int
    {
        if (! is_array($task) || ! is_numeric($task['parentTaskId'] ?? null)) {
            return null;
        }

        $parentId = (int) $task['parentTaskId'];

        return $parentId > 0 ? $parentId : null;
    }

    private function plain(string $value): string
    {
        return html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function failure(Response $response): string
    {
        $errors = $response->json('errors');

        if (is_array($errors)) {
            foreach ($errors as $error) {
                if (is_array($error) && is_string($error['detail'] ?? null) && $error['detail'] !== '') {
                    return $error['detail'];
                }
            }
        }

        return 'Teamwork could not load that task.';
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
