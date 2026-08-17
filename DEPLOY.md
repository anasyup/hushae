# Deploying HUSHAE

Push to `main` on GitHub. Vercel builds and aliases `hushae1.vercel.app`
automatically. Verified working.

---

## The bug that silently blocked deploys (fixed 17 Aug 2026)

For several hours, every push to `main` produced a deployment stuck in state
`BLOCKED`. The push succeeded, GitHub showed green, and production silently
stayed on an older build. Commits `4e86ea8`, `46bd50c`, `de8e6e7` were all
lost this way before anyone noticed.

### Root cause

Vercel resolves the **commit author** to a GitHub account and requires that
account to be a member of the Vercel team. There are TWO GitHub accounts in
play here, and that is the whole problem:

| GitHub account | ID | Notes |
|---|---|---|
| `anasyup` | 264846271 | owns the repo, **linked to the Vercel team** |
| `belo11hub` | 212035276 | owns the email `belomre9@gmail.com` |

The Vercel account's only registered email is `belomre9@gmail.com` — but on
GitHub that address belongs to `belo11hub`, not `anasyup`.

So both obvious configurations fail:

| Commit author email | GitHub resolves to | Result |
|---|---|---|
| `anasyup@users.noreply.github.com` | `anasyup` ✅ | was BLOCKED — email not on the Vercel account |
| `belomre9@gmail.com` | `belo11hub` ❌ | BLOCKED — "author does not have contributing access" |

Setting the email to `belomre9@gmail.com` looked like the fix and made things
worse in a more confusing way: the error text changed, which is what exposed
that the check is on the resolved GitHub *login*, not the raw email string.

### The fix

`anasyup@users.noreply.github.com` was added as a secondary email on the
Vercel account (via `POST /v3/user/emails`), so the address that GitHub maps
to `anasyup` is now recognised by Vercel. `gitForkProtection` was also
disabled on the project.

Correct git config, already applied here and in `~/.gitconfig`:

    git config --global user.email "anasyup@users.noreply.github.com"
    git config --global user.name  "anasyup"

**Do NOT "fix" this by switching to `belomre9@gmail.com`.** That address maps
to the wrong GitHub account and will re-break deploys.

---

## Verify before trusting a deploy

    git log -1 --format='%ae'     # must be anasyup@users.noreply.github.com

After pushing, confirm it actually reached READY rather than BLOCKED — a
blocked deploy gives no error on the git side:

    curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=prj_PT3qTxo3balj0naeCNlztIYrZO9G&limit=1" \
      | grep -o '"state":"[A-Z]*"'

`githubCommitAuthorLogin` in the deployment meta must read `anasyup`. If it
says `belo11hub`, the commit was authored with the wrong email.

## Repairing a commit already authored wrong

    git commit --amend --reset-author --no-edit
    git push --force-with-lease origin main

## Escape hatch — deploy without git

Bypasses the author check entirely; useful if the above ever regresses:

    npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"

The two deploy hooks on the project (`fix-deploy`, `fix-deploy-2`) only re-run
a build of the last commit. They do NOT bypass a BLOCKED author and cannot
rescue this failure.

## If you commit from GitHub's web UI

Turn OFF Settings → Emails → "Keep my email addresses private" on `anasyup`,
or verify web commits still attribute to `anasyup` before relying on them.

---

## Project facts

| | |
|---|---|
| Project ID | `prj_PT3qTxo3balj0naeCNlztIYrZO9G` |
| Team | `belo dv` (`team_xflCbnuImTRgpWp7bF3wu8IR`), Hobby |
| Repo | `anasyup/hushae`, production branch `main`, private |
| Build | `cd frontend && npm install && npm run build` → `frontend/dist` |
| Install | `cd backend && npm install` |
| API | `api/index.js` (serverless) wrapping the Express app in `backend/` |
| Aliases | `hushae1.vercel.app`, `hushae-belo-dv.vercel.app`, `hushae-git-main-belo-dv.vercel.app` |
| Env vars | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES`, `CLIENT_URL`, `PUBLIC_URL`, `PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_ON_START`, `PORT` |
| Concurrent builds | 1 (Hobby) — queued deploys are normal, not stuck |
