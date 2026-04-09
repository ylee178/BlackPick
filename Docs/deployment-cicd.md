# BlackPick Vercel CI/CD

This project now expects a two-stage release flow:

1. Push or merge into `develop`
2. GitHub Actions verifies the app and deploys the branch to `https://dev.blackpick.io`
3. QA the dev site
4. Merge `develop` into `main`
5. GitHub Actions verifies again and deploys production to `https://blackpick.io`

## What was added

- `.github/workflows/vercel-cicd.yml`
- `vercel.json`
- `.gitignore` now ignores `.vercel/`

## Why this shape

- Next.js 16 can be deployed as a full Node.js app and Vercel is a verified Next.js deployment platform.
- Vercel supports branch-based staging flows, including a staging domain on a non-production branch.
- GitHub Actions gives you an explicit CI gate before each deployment.

## Branch strategy

- `feature/*` -> open PR into `develop`
- `develop` -> always represents the current dev environment
- `main` -> only receives changes that are ready for production

If you do not already have a `develop` branch, create it from the commit you want to use as the dev baseline. In most teams that is `main`.

## One-time setup

### 1. Create or link the Vercel project

Run this once locally:

```bash
npx vercel login
npx vercel link
cat .vercel/project.json
```

Take the `orgId` and `projectId` values from `.vercel/project.json`.

### 2. Add GitHub repository secrets

In GitHub repository settings, add these secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

You can create `VERCEL_TOKEN` in the Vercel account settings.

### 3. Configure domains in Vercel

Add these domains to the project:

- `blackpick.io`
- `www.blackpick.io`
- `dev.blackpick.io`

Recommended mapping:

- `blackpick.io` -> production
- `www.blackpick.io` -> redirect to `blackpick.io`
- `dev.blackpick.io` -> `develop` branch

Important: when you add `dev.blackpick.io`, Vercel may first attach it to the default production branch. Edit the domain assignment immediately and move it to `develop`.

### DNS checklist for `blackpick.io`

If your registrar DNS is staying outside Vercel, the typical setup is:

- Apex `blackpick.io` -> `A` record to the Vercel IP shown in the dashboard
- `www.blackpick.io` -> `CNAME` to the Vercel target shown in the dashboard
- `dev.blackpick.io` -> `CNAME` to the Vercel target shown in the dashboard

At the time this guide was written, Vercel's official custom-domain guide shows apex domains using an `A` record and subdomains using a `CNAME` record. Vercel's general-purpose apex value is commonly `76.76.21.21`, but use the exact value shown in your Vercel project when possible.

If your registrar supports nameserver delegation and you want the simplest setup, you can instead move the domain nameservers to Vercel and manage DNS from there.

### HTTP and HTTPS behavior

- Users typing `http://blackpick.io` should end up on `https://blackpick.io`
- After the domain verifies, Vercel provisions TLS automatically
- Add both `blackpick.io` and `www.blackpick.io` so you can control the redirect cleanly and avoid duplicate-content issues

### Suggested final domain behavior

- `https://blackpick.io` -> primary production site
- `https://www.blackpick.io` -> redirect to `https://blackpick.io`
- `https://dev.blackpick.io` -> dev environment
- `http://blackpick.io` -> automatic redirect to `https://blackpick.io`

### Quick local commands once Vercel is linked

```bash
npx vercel login
npx vercel link
npx vercel domains add blackpick.io
npx vercel domains inspect blackpick.io
```

If Vercel asks for domain verification because the domain is attached elsewhere, it will ask you to add a temporary `TXT` record first.

### 4. Set Vercel environment variables

Set the required app variables in Vercel for both Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `CORS_ALLOW_ORIGIN`

Suggested values:

Preview:

```txt
NEXT_PUBLIC_SITE_URL=https://dev.blackpick.io
CORS_ALLOW_ORIGIN=https://dev.blackpick.io,https://blackpick.io
```

Production:

```txt
NEXT_PUBLIC_SITE_URL=https://blackpick.io
CORS_ALLOW_ORIGIN=https://blackpick.io,https://dev.blackpick.io
```

Add optional variables such as Sentry or Gemini keys only in the environments that need them.

### 5. Protect the production release

In GitHub, create an environment named `production` and add required reviewers. The workflow already targets that environment, so production deployments can wait for manual approval before they run.

You can also create a `development` environment in GitHub for cleaner visibility, though it is optional.

## Release process

### Dev release

1. Merge a PR into `develop`
2. Wait for the `Vercel CI/CD` workflow to pass
3. Check `https://dev.blackpick.io`

### Production release

1. Open a PR from `develop` into `main`
2. Review the diff after dev QA is complete
3. Merge into `main`
4. Approve the GitHub `production` environment if you enabled reviewers
5. Confirm `https://blackpick.io`

## Promotion model

The workflow added in this repository uses branch promotion:

- `develop` is the verified dev branch
- `main` is the production branch
- merging `develop` into `main` triggers a fresh production build from the same git state

That is the simplest stable setup and works well even without paid Vercel features.

If you later want to promote the exact already-built deployment instead of rebuilding on `main`, Vercel also supports staged production deployments and `vercel promote`. That is a good second step after this branch-based flow is running smoothly.

## Notes about the current checks

The workflow currently gates deployment on:

- `npx tsc --noEmit`
- `npm run test:unit`
- `npm run build`

`eslint` is intentionally not part of the blocking gate yet because the current branch already has unrelated lint failures. Once those are cleaned up, add a lint step back into the `verify` job.

## Useful local commands

```bash
npx vercel env pull .env.local
npx vercel deploy
npx vercel deploy --prod
```
