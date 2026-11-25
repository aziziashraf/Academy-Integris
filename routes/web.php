<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProgressController;
use Illuminate\Support\Facades\Route;

// The learning app (works for guests; progress syncs when signed in)
Route::view('/', 'academy')->name('home');

// Accounts
Route::middleware('guest')->group(function () {
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');

    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');

    Route::get('/forgot-password', [AuthController::class, 'showForgot'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])->middleware('throttle:5,1')->name('password.email');
    Route::get('/reset-password/{token}', [AuthController::class, 'showReset'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1')->name('password.store');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Progress sync (JSON, session-authenticated, CSRF-protected)
Route::middleware(['auth', 'throttle:120,1'])->group(function () {
    Route::get('/progress', [ProgressController::class, 'show'])->name('progress.show');
    Route::put('/progress', [ProgressController::class, 'update'])->name('progress.update');
});
