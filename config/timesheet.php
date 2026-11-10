<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Discover root
    |--------------------------------------------------------------------------
    |
    | When the timesheet has no repositories yet, it looks one level inside
    | this folder for Git projects. Herd parks sites in the parent of this app.
    |
    */

    'discover_root' => env('TIMESHEET_DISCOVER_ROOT', dirname(base_path())),

    /*
    |--------------------------------------------------------------------------
    | Discover roots
    |--------------------------------------------------------------------------
    |
    | Folders scanned for Git projects. Herd sites live next to this app.
    | App projects live in Documents/_APPS_PROJECTS.
    |
    */

    'discover_roots' => array_values(array_filter([
        env('TIMESHEET_DISCOVER_ROOT', dirname(base_path())),
        env(
            'TIMESHEET_APPS_ROOT',
            rtrim((string) getenv('HOME'), '/').'/Documents/_APPS_PROJECTS',
        ),
    ], fn (mixed $path): bool => is_string($path) && $path !== '')),

];
