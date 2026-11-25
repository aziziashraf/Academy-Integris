# Integris Academy — Mandarin in 60 Days

Laravel 13 web app served at **https://academy.integris.my**.

- 60-day guided journey: pinyin and tones, 15 chapters, daily recap tests, week tests and a final exam
- 399 recorded audio clips (`public/audio`), with a male/female voice pair for dialogues
- Pronunciation scoring through the browser's speech recognition (Chrome, Edge, Safari)
- Free accounts: register, sign in, reset password; progress syncs to the database
- Guests can learn without an account. Their progress is merged into the account when they register or sign in.

## Structure

| Path | What it is |
|---|---|
| `routes/web.php` | App, account and progress routes |
| `app/Http/Controllers/Auth/AuthController.php` | Register, sign in, sign out, password reset |
| `app/Http/Controllers/ProgressController.php` | `GET/PUT /progress` (JSON, signed-in users only) |
| `app/Models/LearningProgress.php` | One row per learner (journey state + days done + XP) |
| `resources/views/academy.blade.php` | The learning app page |
| `resources/views/auth/*` | Sign-in, register and password pages |
| `public/js/academy.js` | App logic (lessons, quizzes, scoring, sync) |
| `public/js/academy-data.js` | Course content: chapters, words, sentences, readings |
| `public/js/audio-manifest.js` | Maps each phrase to its audio file |

No Node/Vite build is needed: CSS and JS are plain files in `public/`.

## Local development

```bash
composer install
cp .env.example .env   # then set APP_ENV=local, APP_DEBUG=true, DB_* for your local MySQL
php artisan key:generate
php artisan migrate
php artisan serve
php artisan test       # account + progress tests
```

## Deploying

See **[DEPLOY.md](DEPLOY.md)** for the GitHub → Hostinger steps.

## Audio licence

The voice recordings were generated with a model trained on the DataBaker Mandarin dataset, which is licensed for **non-commercial use only**. Regenerate the clips with a commercially licensed voice before any paid or commercial use.
