<?php

use App\Actions\DeleteAbsence;
use App\Actions\DeleteHoliday;
use App\Actions\DeleteConstantTask;
use App\Actions\DeleteRepository;
use App\Actions\DeleteTeamworkTime;
use App\Actions\IgnoreConstantDay;
use App\Actions\ListTeamworkTasks;
use App\Actions\LogConstantTask;
use App\Actions\LogTeamworkTime;
use App\Actions\RestoreConstantDay;
use App\Actions\ScanRepositories;
use App\Actions\ShowTimesheet;
use App\Actions\StoreAbsence;
use App\Actions\StoreHoliday;
use App\Actions\StoreConstantTask;
use App\Actions\UpdateAbsence;
use App\Actions\UpdateHoliday;
use App\Actions\UpdateConstantTask;
use App\Actions\UpdateRepository;
use App\Actions\UpdateTeamworkTime;
use App\Actions\UpdateTimesheetSettings;
use Illuminate\Support\Facades\Route;

Route::get('/', ShowTimesheet::class)->name('home');
Route::put('/settings', UpdateTimesheetSettings::class)->name('settings.update');
Route::post('/time-off', StoreAbsence::class)->name('time-off.store');
Route::put('/time-off/{absence}', UpdateAbsence::class)->name('time-off.update');
Route::delete('/time-off/{absence}', DeleteAbsence::class)->name('time-off.destroy');
Route::post('/holidays', StoreHoliday::class)->name('holidays.store');
Route::put('/holidays/{holiday}', UpdateHoliday::class)->name('holidays.update');
Route::delete('/holidays/{holiday}', DeleteHoliday::class)->name('holidays.destroy');
Route::post('/constants', StoreConstantTask::class)->name('constants.store');
Route::put('/constants/{constant}', UpdateConstantTask::class)->name('constants.update');
Route::delete('/constants/{constant}', DeleteConstantTask::class)->name('constants.destroy');
Route::post('/constants/{constant}/log', LogConstantTask::class)->name('constants.log');
Route::post('/constants/{constant}/skips', IgnoreConstantDay::class)->name('constants.skips.store');
Route::delete('/constants/{constant}/skips/{date}', RestoreConstantDay::class)
    ->where('date', '\d{4}-\d{2}-\d{2}')
    ->name('constants.skips.destroy');
Route::post('/repositories/scan', ScanRepositories::class)->name('repositories.scan');
Route::patch('/repositories/{repository}', UpdateRepository::class)->name('repositories.update');
Route::delete('/repositories/{repository}', DeleteRepository::class)->name('repositories.destroy');
Route::get('/teamwork/projects/{project}/tasks', ListTeamworkTasks::class)
    ->whereNumber('project')
    ->name('teamwork.tasks');
Route::post('/teamwork/time', LogTeamworkTime::class)->name('teamwork.time.store');
Route::put('/teamwork/time/{timelog}', UpdateTeamworkTime::class)
    ->whereNumber('timelog')
    ->name('teamwork.time.update');
Route::delete('/teamwork/time/{timelog}', DeleteTeamworkTime::class)
    ->whereNumber('timelog')
    ->name('teamwork.time.destroy');
