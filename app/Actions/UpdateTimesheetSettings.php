<?php

namespace App\Actions;

use App\Models\TimesheetSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UpdateTimesheetSettings
{
    public function __invoke(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'author_email' => ['nullable', 'email', 'max:255'],
        ]);

        $setting = TimesheetSetting::query()->first();

        if (! $setting instanceof TimesheetSetting) {
            $setting = new TimesheetSetting;
        }

        $setting->fill($data);
        $setting->save();

        return back();
    }
}
