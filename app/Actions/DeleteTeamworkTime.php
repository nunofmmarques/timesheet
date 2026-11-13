<?php

namespace App\Actions;

use App\Services\TeamworkTimelogs;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

class DeleteTeamworkTime
{
    public function __invoke(int $timelog, TeamworkTimelogs $timelogs): RedirectResponse
    {
        try {
            $timelogs->delete($timelog);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'task_id' => $exception->getMessage() !== ''
                    ? $exception->getMessage()
                    : 'Teamwork could not delete this time.',
            ]);
        }

        return back()->with('status', 'Removed the time from Teamwork.');
    }
}
