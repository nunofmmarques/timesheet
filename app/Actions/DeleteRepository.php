<?php

namespace App\Actions;

use App\Models\Repository;
use Illuminate\Http\RedirectResponse;

class DeleteRepository
{
    public function __invoke(Repository $repository): RedirectResponse
    {
        $repository->delete();

        return back();
    }
}
