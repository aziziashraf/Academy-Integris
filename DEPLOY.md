# Deploying Integris Academy (GitHub Actions → Hostinger)

Same setup as **Maysville-HRMS**: every push to `main` runs `.github/workflows/deploy.yml`, which

1. runs the tests (nothing deploys if a test fails),
2. installs production packages with Composer,
3. rsyncs the app into `~/domains/academy.integris.my/public_html` over SSH,
4. on the server: creates `academy.env` the first time, generates the app key once, runs migrations and rebuilds the caches,
5. checks that https://academy.integris.my/up answers.

Hostinger's own Git panel is **not** used (it doesn't run Composer).

## One-time setup

### 1. Hostinger
- **Advanced → PHP Configuration:** PHP 8.3
- **Databases:** database + user `u175799808_academy` (the names are set in the workflow's `env:` block; change them there if yours differ)
- **Advanced → Git:** if a repository is connected, open ⋮ → **Disconnect** (already-deployed files stay; Actions takes over)

### 2. Deploy key
On your PC (PowerShell):

```powershell
ssh-keygen -t ed25519 -C academy-deploy -f $HOME\.ssh\academy_deploy -N '""'
Get-Content $HOME\.ssh\academy_deploy.pub | Set-Clipboard
```
hPanel → **Advanced → SSH Access → SSH keys → Add SSH key** → name `Academy - Deploy` → paste → Save.

```powershell
Get-Content $HOME\.ssh\academy_deploy -Raw | Set-Clipboard
```
This copies the **private** key for the next step. Don't share it anywhere else.

### 3. GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `SSH_PRIVATE_KEY` | paste the private key (whole text, including the BEGIN/END lines) |
| `SSH_HOST` | `37.44.245.42` |
| `SSH_PORT` | `65002` |
| `SSH_USER` | `u175799808` |
| `DB_PASSWORD` | the database user's password |

### 4. Deploy
Repo → **Actions → Test and deploy → Run workflow** (or push to `main`). When it's green, open https://academy.integris.my.
If the CDN still shows "Coming soon", hPanel → **Dashboard → Clear cache**.

## Changing settings later
`~/domains/academy.integris.my/academy.env` is created once and never overwritten. To change a setting (e.g. add the mailbox for password-reset emails: `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`), edit that file in **File Manager**, then re-run the workflow so the config cache is rebuilt.

## Troubleshooting

| Problem | Fix |
|---|---|
| Run fails at **Check deploy secrets** | Add the secrets it lists (step 3). |
| **Permission denied (publickey)** | The public key isn't in hPanel's SSH keys, or `SSH_PRIVATE_KEY` was pasted incompletely. |
| **Access denied for user** during migrate | DB name/user in the workflow `env:` or `DB_PASSWORD` doesn't match hPanel. Fix `academy.env` in File Manager and re-run. |
| **/opt/alt/php83/usr/bin/php: No such file** | PHP 8.3 isn't enabled for the site (step 1), or change `REMOTE_PHP` in the workflow. |
| Error details | `~/domains/academy.integris.my/public_html/storage/logs/laravel.log` |
