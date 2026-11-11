<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TeamworkTimelogs
{
    public function __construct(private TeamworkProjects $projects) {}

    /**
     * Time already logged by the authenticated Teamwork user.
     *
     * @return list<array{
     *     id: int,
     *     date: string,
     *     time: string|null,
     *     minutes: int,
     *     description: string,
     *     project: string,
     *     projectId: int|null,
     *     task: string,
     *     taskId: int|null,
     *     projectUrl: string|null
     * }>
     */
    public function between(string $from, string $to, string $timezone): array
    {
        if (! $this->projects->configured()) {
            return [];
        }

        $userId = $this->userId();
        $includedProjects = [];
        $includedTasks = [];
        $entries = [];

        for ($page = 1; $page <= 20; $page++) {
            $response = Http::withBasicAuth($this->token(), 'x')
                ->acceptJson()
                ->timeout(20)
                ->get($this->url().'/projects/api/v3/time.json', [
                    'startDate' => $from,
                    'endDate' => $to,
                    'page' => $page,
                    'pageSize' => 100,
                    'orderBy' => 'date',
                    'orderMode' => 'asc',
                    'include' => 'projects,tasks',
                ])
                ->throw();

            $payload = $response->json();

            if (! is_array($payload) || ! is_array($payload['timelogs'] ?? null)) {
                throw new RuntimeException('Teamwork did not return time entries.');
            }

            $included = is_array($payload['included'] ?? null) ? $payload['included'] : [];
            $includedProjects += is_array($included['projects'] ?? null) ? $included['projects'] : [];
            $includedTasks += is_array($included['tasks'] ?? null) ? $included['tasks'] : [];

            foreach ($payload['timelogs'] as $log) {
                $entry = $this->entry($log, $userId, $includedProjects, $includedTasks, $timezone);

                if ($entry !== null) {
                    $entries[] = $entry;
                }
            }

            $meta = $payload['meta']['page'] ?? null;
            $hasMore = is_array($meta) && ($meta['hasMore'] ?? false) === true;

            if (! $hasMore || $payload['timelogs'] === []) {
                break;
            }
        }

        usort($entries, function (array $left, array $right): int {
            return [$left['date'], $left['time'] ?? '', $left['id']]
                <=> [$right['date'], $right['time'] ?? '', $right['id']];
        });

        return $entries;
    }

    public function create(int $taskId, string $date, string $time, int $minutes, bool $billable): void
    {
        $timelog = [
            'date' => $date,
            'time' => $time,
            'minutes' => $minutes,
            'isBillable' => $billable,
        ];

        $response = Http::withBasicAuth($this->token(), 'x')
            ->acceptJson()
            ->timeout(20)
            ->post($this->url().'/projects/api/v3/tasks/'.$taskId.'/time.json', [
                'timelog' => $timelog,
            ]);

        if ($response->failed()) {
            throw new RuntimeException($this->failure($response));
        }
    }

    /**
     * @param  array<mixed>  $log
     * @param  array<array-key, mixed>  $projects
     * @param  array<array-key, mixed>  $tasks
     * @return array{
     *     id: int,
     *     date: string,
     *     time: string|null,
     *     minutes: int,
     *     description: string,
     *     project: string,
     *     projectId: int|null,
     *     task: string,
     *     taskId: int|null,
     *     projectUrl: string|null
     * }|null
     */
    private function entry(mixed $log, int $userId, array $projects, array $tasks, string $timezone): ?array
    {
        if (! is_array($log) || ($log['deleted'] ?? false) === true) {
            return null;
        }

        if (! is_numeric($log['id'] ?? null) || ! is_numeric($log['userId'] ?? null) || (int) $log['userId'] !== $userId) {
            return null;
        }

        if (! is_numeric($log['minutes'] ?? null) || ! is_string($log['timeLogged'] ?? null)) {
            return null;
        }

        $loggedAt = CarbonImmutable::parse($log['timeLogged'])->timezone($timezone);
        $projectId = is_numeric($log['projectId'] ?? null) ? (int) $log['projectId'] : null;

        return [
            'id' => (int) $log['id'],
            'date' => $loggedAt->toDateString(),
            'time' => ($log['hasStartTime'] ?? false) ? $loggedAt->format('H:i') : null,
            'minutes' => (int) $log['minutes'],
            'description' => is_string($log['description'] ?? null) ? trim($log['description']) : '',
            'project' => $this->relatedName($projects, $projectId, $log['project'] ?? null),
            'projectId' => $projectId,
            'task' => $this->relatedName($tasks, is_numeric($log['taskId'] ?? null) ? (int) $log['taskId'] : null, $log['task'] ?? null),
            'taskId' => is_numeric($log['taskId'] ?? null) ? (int) $log['taskId'] : null,
            'projectUrl' => $this->projects->projectUrl($projectId),
        ];
    }

    /**
     * @param  array<array-key, mixed>  $included
     */
    private function relatedName(array $included, ?int $id, mixed $embedded): string
    {
        if ($id !== null && is_array($included[$id] ?? null) && is_string($included[$id]['name'] ?? null)) {
            return $included[$id]['name'];
        }

        if (is_array($embedded) && is_string($embedded['name'] ?? null)) {
            return $embedded['name'];
        }

        return '';
    }

    private function userId(): int
    {
        $id = Cache::remember('teamwork.user', now()->addMinutes(10), function (): int {
            $response = Http::withBasicAuth($this->token(), 'x')
                ->acceptJson()
                ->timeout(20)
                ->get($this->url().'/projects/api/v3/me.json')
                ->throw();

            $person = $response->json('person');

            if (! is_array($person) || ! is_numeric($person['id'] ?? null)) {
                throw new RuntimeException('Teamwork did not return the current user.');
            }

            return (int) $person['id'];
        });

        return is_int($id) ? $id : (int) $id;
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

        return 'Teamwork could not log this time.';
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
