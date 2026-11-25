# Deploying Integris Academy (GitHub → Hostinger)

**How it works**

1. You push code to the `main` branch on GitHub.
2. GitHub Actions (free) runs the tests, installs Laravel's packages and publishes a ready-to-serve copy to the `deploy` branch.
3. Hostinger's Git integration pulls the `deploy` branch into the website folder automatically.

Hostinger's Git deployment does **not** run `composer install`, and it replaces the folder's files on every deploy. That's why the packages are built on GitHub, and why the settings file (`academy.env`) lives *outside* the deploy folder.

You need a Hostinger plan with **SSH access** (Web Premium, Web Business or Cloud) and **PHP 8.3 or newer**.

---

## 1. Put the code on GitHub

1. On github.com create a **private** repository named `integris-academy` (no README, no .gitignore).
2. In the project folder run:

```bash
git remote add origin git@github.com:YOUR-GITHUB-USER/integris-academy.git
git push -u origin main
```

3. Open the repository's **Actions** tab. The run **"Test & build for Hostinger"** should turn green in about 2 minutes. When it does, a new branch called **`deploy`** appears.
   - If it fails, open the run to see which test failed; nothing is published until tests pass.
   - If it fails with a permissions error, go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**.

## 2. Create the website on Hostinger

1. **hPanel → Websites → Add website** and use the subdomain **academy.integris.my**. If you create it under **Domains → Subdomains** of integris.my instead, see the note at the end of step 5.
2. **DNS:** if integris.my's DNS is managed elsewhere (e.g. Cloudflare), add an **A record** `academy` pointing to the website IP shown in hPanel.
3. In the new website's dashboard: **Advanced → PHP Configuration → PHP 8.3** (or newer).
4. Open **File Manager** and delete any default files in the website folder (e.g. `default.php`), so the folder is empty.

## 3. Create the database

**Databases → MySQL Databases** → create a database and user. Write down the **full** names Hostinger shows (they look like `u123456789_academy`) and the password.

## 4. Connect GitHub (auto-deploy)

1. Website dashboard → **Advanced → Git** → **Continue with GitHub**.
2. When GitHub asks, install the Hostinger app and give it access to **integris-academy** only.
3. Choose the repository, branch **`deploy`**, and the website's root folder (`public_html`). Deploy.
4. From now on, every push to `main` → tests → `deploy` branch → Hostinger deploys it.

## 5. Settings file + first-time setup (SSH, once)

Website dashboard → **Advanced → SSH Access** shows the host, port (usually `65002`) and username. Connect, then run:

```bash
cd ~/domains/academy.integris.my          # the folder that CONTAINS public_html
cp public_html/.env.example academy.env
nano academy.env
```

In `academy.env` fill in:

| Setting | Value |
|---|---|
| `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | From step 3 |
| `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` | A mailbox from **Emails** (e.g. no-reply@integris.my) — used for "Forgot password" emails |

Save (Ctrl+O, Enter, Ctrl+X). Then:

```bash
cd public_html
php -v                               # must say 8.3 or higher (see Troubleshooting if not)
php artisan key:generate --force     # writes APP_KEY into academy.env
php artisan migrate --force          # creates the tables
php artisan about | head -20         # should show Environment: production
```

> **Folder note:** the app looks for `academy.env` in the folders above the project (up to three levels), but never inside `public_html`. If your site was created as a subfolder of the main site (e.g. `~/domains/integris.my/public_html/academy`), put `academy.env` in `~/domains/integris.my/` instead.

## 6. HTTPS

**Security → SSL** → make sure a certificate is active for academy.integris.my and turn on **Force HTTPS**.

## 7. Check it works

- [ ] https://academy.integris.my opens the Journey page
- [ ] Tap 🔊 on a word: the recorded voice plays
- [ ] **Create account**: you're signed in and the header shows your name
- [ ] Finish Day 1, then sign in on another device or browser: Day 1 shows as done
- [ ] **Me → Log out**, then sign in again
- [ ] **Forgot password** sends an email (needs the MAIL_* settings)

---

## Updating the site later

Commit and push to `main`. GitHub builds the `deploy` branch, and Hostinger deploys it within a minute or two.
If an update adds a database migration (a new file in `database/migrations`), run once over SSH:

```bash
cd ~/domains/academy.integris.my/public_html && php artisan migrate --force
```

## Troubleshooting

| Problem | Fix |
|---|---|
| **500 error / "No application encryption key"** | `academy.env` isn't being found or has no APP_KEY. Check its location (step 5) and run `php artisan key:generate --force`. |
| **`php -v` shows below 8.3 over SSH** | Run commands with Hostinger's PHP 8.3 binary, usually `/opt/alt/php83/usr/bin/php artisan …`. |
| **"SQLSTATE[HY000] [1045] Access denied"** | Database name/user/password in `academy.env` don't match step 3. |
| **Page shows a file list or Laravel's `public/` in the URL** | The root `.htaccess` sends requests to `public/`. Make sure it was deployed and that the site's folder is the project root. |
| **Hostinger's Git page won't let you pick the `deploy` branch** | Use the legacy SSH Git flow on the same page (Generate SSH key → add it as a Deploy key in GitHub → repo URL `git@github.com:…/integris-academy.git`, branch `deploy`). |
| **Error details** | `~/domains/academy.integris.my/public_html/storage/logs/laravel.log` |
