<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Hostinger serves sites behind its own proxy/CDN; trust it so HTTPS URLs are generated correctly.
        $middleware->trustProxies(at: '*');
        // Signed-in users who open /login or /register go back to the app.
        $middleware->redirectUsersTo('/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

/*
 * Secrets live outside the deploy folder.
 * Hostinger's Git deployment replaces the folder's files on every push, so a .env inside it
 * could be lost. If there is no .env here, look up to three folders above the project
 * (never inside public_html) for a file called academy.env and use that instead.
 */
if (! is_file($app->basePath('.env'))) {
    $dir = dirname($app->basePath());
    for ($i = 0; $i < 3 && $dir !== dirname($dir); $i++, $dir = dirname($dir)) {
        if (! str_contains($dir, 'public_html') && @is_file($dir.'/academy.env')) {
            $app->useEnvironmentPath($dir)->loadEnvironmentFrom('academy.env');
            break;
        }
    }
}

return $app;
