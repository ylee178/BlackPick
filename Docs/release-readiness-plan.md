# Release Readiness Plan

Branch: `codex/release-readiness`
Baseline: `origin/main` at `312c610` (`Harden admin flows and refresh app shell (#1)`)

## Goal

Ship a stable Black Pick release where:

- `blackpick.io` works as the production site
- `dev.blackpick.io` works as the dev/QA site
- admin-only surfaces stay hidden and blocked for non-admin users
- email auth and password recovery work on the real domain
- CI/CD is predictable and recoverable
- real user flows have been manually tested end to end
- Google login is connected, then additional social providers follow

## Phase 0: Baseline

- [x] Confirm the merged PR is on `origin/main`
- [x] Create a clean post-merge branch from latest `main`
- [x] Start a tracked release-readiness checklist

## Phase 1: Deployments, Domains, and Environment Wiring

- [x] Confirm GitHub Actions secrets exist: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [x] Create `develop` branch for dev deployments
- [x] Verify Vercel project linkage for both dev and prod deployment flows
- [x] Verify `blackpick.io`, `www.blackpick.io`, and `dev.blackpick.io` domain mapping in Vercel
- [ ] Fix DNS records for apex, `www`, and `dev`
- [x] Verify environment variables in Vercel Preview and Production
- [ ] Verify Supabase Auth site URL and redirect URL allowlist for dev + prod
- [x] Run one full deploy to dev
- [ ] Run one full deploy to prod

## Phase 2: Admin Access and Routing Safety

- [ ] Verify admin surfaces are not discoverable from normal navigation
- [ ] Verify non-admin direct access to `/admin` routes is blocked
- [ ] Verify non-admin direct access to fighter image management is blocked
- [ ] Verify admin users can still access required tools
- [ ] Add or tighten regression coverage for admin-only routes if needed

## Phase 3: Authentication and Social Login

- [ ] Verify email signup on dev
- [ ] Verify email signup on prod
- [ ] Verify login on dev
- [ ] Verify login on prod
- [ ] Verify forgot-password flow on dev
- [ ] Verify forgot-password flow on prod
- [ ] Verify update-password flow on dev
- [ ] Verify update-password flow on prod
- [ ] Connect Google login
- [ ] Verify Google login on dev + prod
- [ ] Decide next provider priority (`Facebook` vs `Apple` vs other)
- [ ] Connect the next provider

## Phase 4: CI/CD Reliability

- [ ] Verify `.github/workflows/vercel-cicd.yml` matches the real branch strategy
- [ ] Verify `develop -> dev.blackpick.io` path actually runs
- [ ] Verify `main -> blackpick.io` path actually runs
- [ ] Confirm production approval flow if GitHub environments are used
- [ ] Confirm rollback steps are documented and tested

## Phase 5: Manual UAT

- [ ] Create a fresh user account
- [ ] Complete onboarding / ring name flow
- [ ] Browse homepage, events, fighters, ranking, profile
- [ ] Submit predictions on an event
- [ ] Confirm saved picks appear in the right places
- [ ] Verify comments / likes / notifications flows that are intended to ship
- [ ] Verify locale switching across core pages
- [ ] Capture bugs, severity, and release blockers

## Phase 6: Release Decision

- [ ] Review all blockers
- [ ] Confirm production domain/auth/admin/CI all pass
- [ ] Approve release

## Audit Notes Captured Today

### Confirmed

- `origin/main` includes merge commit `312c610`
- `vercel.json` disables automatic Git-triggered Vercel deployments, so the GitHub Actions flow is the primary deploy path
- release docs already assume a `develop -> dev` and `main -> prod` promotion model
- local Vercel link exists:
  - project: `black-pick`
  - org: `team_q2hYuedldbZAA7Ja5ctgAQ5t`
  - project id: `prj_8Jj4c2yp7RyvpYcx8rRW1dvVic3n`
- Vercel CLI auth works for account `ylee178-7822`
- GitHub Actions secrets now exist:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- GitHub environments now exist:
  - `development`
  - `production`
- `develop` branch now exists on the remote
- Vercel environment variables now exist for:
  - `Preview (develop)`
  - `Production`
- Vercel project domains now exist and are verified:
  - `blackpick.io`
  - `www.blackpick.io`
  - `dev.blackpick.io`
- `www.blackpick.io` is configured to redirect to `blackpick.io`
- `dev.blackpick.io` is configured for `gitBranch: develop`
- GitHub Actions dev pipeline now runs successfully on `develop`
- workflow parser bug in `.github/workflows/vercel-cicd.yml` was fixed on `develop` and on `codex/release-readiness`

### Gaps Found

- DNS is still pointed at `185.53.179.128` via `ns1.dyna-ns.net` / `ns2.dyna-ns.net`, not Vercel
- Vercel reports all three domains as `misconfigured: true`
- `https://blackpick.io` and `https://www.blackpick.io` currently show an expired TLS certificate
- `https://dev.blackpick.io` currently only responds with `403` when TLS verification is bypassed, which is consistent with DNS not yet pointing at the intended Vercel edge
- `configVerifiedAt`, `txtVerifiedAt`, and `nsVerifiedAt` are still `null` on the Vercel domain object
- Supabase Auth site URL / redirect allowlist still needs live verification in the dashboard
- production deploy flow still needs a live run after the workflow fix lands on `main`
- GitHub Actions still emits a non-blocking Node 20 deprecation warning for `actions/checkout@v4` and `actions/setup-node@v4`

## Task 1 Result: Deployment Bootstrap Is The Immediate Critical Path

Before user testing or social login work, the following must exist:

1. Working DNS to Vercel
2. Supabase Auth URLs for dev + prod
3. Proven production deploy
4. Healthy TLS on custom domains

Without those, `dev.blackpick.io`, `blackpick.io`, and the documented CI/CD flow cannot work yet.

## Next Up

1. Update registrar DNS to Vercel
2. Verify `blackpick.io` and `dev.blackpick.io` resolve with healthy TLS
3. Mirror the workflow fix to `main` and run a production deployment
4. Verify Supabase Auth URLs against dev/prod domains
5. Then move to admin checks, auth/social, and UAT

## DNS Changes Required At Registrar

Current DNS provider:

- `ns1.dyna-ns.net`
- `ns2.dyna-ns.net`

Current live records:

- `blackpick.io` -> `A 185.53.179.128`
- `www.blackpick.io` -> `A 185.53.179.128`
- `dev.blackpick.io` -> `A 185.53.179.128`

Vercel recommended values:

- apex `blackpick.io`
  - `A 76.76.21.21`
- `www.blackpick.io`
  - `CNAME cname.vercel-dns.com.`
- `dev.blackpick.io`
  - `CNAME cname.vercel-dns.com.`

Alternative:

- move nameservers entirely to:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

After DNS propagates, re-check:

- `https://blackpick.io`
- `https://www.blackpick.io`
- `https://dev.blackpick.io`
