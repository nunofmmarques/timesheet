<?php

use App\Http\Controllers\TimesheetController;
use Illuminate\Support\Facades\Route;

Route::get('/', [TimesheetController::class, 'index'])->name('home');
Route::put('/settings', [TimesheetController::class, 'updateSettings'])->name('settings.update');
Route::post('/repositories/scan', [TimesheetController::class, 'scan'])->name('repositories.scan');
Route::patch('/repositories/{repository}', [TimesheetController::class, 'updateRepository'])->name('repositories.update');
Route::delete('/repositories/{repository}', [TimesheetController::class, 'destroyRepository'])->name('repositories.destroy');
