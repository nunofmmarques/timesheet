<?php

namespace App\Actions;

use App\Models\ConstantTask;
use Illuminate\Http\RedirectResponse;

class DeleteConstantTask
{
    public function __invoke(ConstantTask $constant): RedirectResponse
    {
        $constant->delete();

        return back()->with('status', 'Removed the constant task.');
    }
}
