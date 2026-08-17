# Deploying HUSHAE

## How production deploys happen

Push to `main` on GitHub. Vercel builds and aliases `hushae1.vercel.app`
automatically. Nothing else is required.

## The git author rule (this WILL bite you again if you forget it)

Vercel checks the **author email of the commit**, not who pushed it, and
requires that email to belong to a member of the Vercel team. On this project:

| | |
|---|---|
| Vercel team | `belo dv` (`team_xflCbnuImTRgpWp7bF3wu8IR`), Hobby plan |
| Only registered email | `belomre9@gmail.com` |
| Required commit author | `belomre9@gmail.com` |

If a commit is authored by anything else — notably GitHub's privacy address
`anasyup@users.noreply.github.com` — Vercel accepts the webhook, creates the
deployment, and immediately puts it in state `BLOCKED` with:

> Git author <email> must have access to the team belo dv on Vercel to create
> deployments.

The push succeeds, GitHub shows green, and the live site silently stays on the
previous build. Commits `4e86ea8`, `46bd50c` and `de8e6e7` were all lost this
way — production ran hours behind the repo with no visible error.

## The fix (already applied in this workspace)

    git config --global user.email "belomre9@gmail.com"
    git config --global user.name  "anasyup"

Set the same thing on any other machine you commit from. On GitHub also turn
OFF Settings → Emails → "Keep my email addresses private", or GitHub will
rewrite web-UI commits back to the noreply address.

## Verify before you trust a deploy

    git log -1 --format='%ae'        # must print belomre9@gmail.com

After pushing, confirm the deployment actually went READY rather than BLOCKED:

    curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=prj_PT3qTxo3balj0naeCNlztIYrZO9G&limit=1" \
      | grep -o '"state":"[A-Z]*"'

## Fixing a commit that was already authored wrong

    git commit --amend --reset-author --no-edit
    git push --force origin main

## Escape hatch: deploy without git

If a deployment is blocked and you need production updated now, the Vercel CLI
deploys the working tree directly and bypasses the author check:

    npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"

There are also two deploy hooks on the project (`fix-deploy`, `fix-deploy-2`).
Those only re-run a build of the last commit — they do NOT bypass a BLOCKED
author, so they cannot rescue this particular failure.

## Project facts

| | |
|---|---|
| Project ID | `prj_PT3qTxo3balj0naeCNlztIYrZO9G` |
| Repo | `anasyup/hushae`, production branch `main` |
| Build | `cd frontend && npm install && npm run build` → `frontend/dist` |
| API | `api/index.js` (serverless), Express app from `backend/` |
| Aliases | `hushae1.vercel.app`, `hushae-belo-dv.vercel.app` |
