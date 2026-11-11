<?php

namespace App\Actions;

use App\Services\RepositoryCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ScanRepositories
{
    public function __invoke(RepositoryCatalog $catalog): RedirectResponse
    {
        $roots = $catalog->discoverRoots();

        if ($roots === []) {
            throw ValidationException::withMessages([
                'directory' => 'No scan folders are configured.',
            ]);
        }

        $added = 0;

        foreach ($roots as $root) {
            try {
                $added += $catalog->importDirectory($root);
            } catch (InvalidArgumentException) {
                continue;
            }
        }

        return back()->with('status', $added === 1
            ? 'Added 1 repository.'
            : "Added {$added} repositories.");
    }
}
