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

- [ ] Confirm GitHub Actions secrets exist: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Create and protect `develop` branch for dev deployments
- [ ] Verify Vercel project linkage for both dev and prod deployment flows
- [ ] Verify `blackpick.io`, `www.blackpick.io`, and `dev.blackpick.io` domain mapping in Vercel
- [ ] Verify DNS records for apex, `www`, and `dev`
- [ ] Verify environment variables in Vercel Preview and Production
- [ ] Verify Supabase Auth site URL and redirect URL allowlist for dev + prod
- [ ] Run one full deploy to dev and one full deploy to prod

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

### Gaps Found

- there is currently no `develop` branch on the remote
- GitHub Actions repository secrets are currently empty via API:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- GitHub environments are currently empty via API:
  - `development`
  - `production`
- Vercel project environment variables are currently empty:
  - no preview vars
  - no production vars
- Vercel account currently has zero configured domains
- `blackpick.io` and `dev.blackpick.io` are not active Vercel deployments in the current account context
- domain, DNS, Vercel environment values, and Supabase Auth redirect allowlists still need live verification in their dashboards

## Task 1 Result: Deployment Bootstrap Is The Immediate Critical Path

Before user testing or social login work, the following must exist:

1. Vercel domains
2. Vercel environment variables
3. GitHub Actions secrets
4. `develop` branch
5. GitHub environments for deploy approvals and visibility

Without those, `dev.blackpick.io`, `blackpick.io`, and the documented CI/CD flow cannot work yet.

## Next Up

1. Bootstrap deployment infrastructure
2. Normalize the branch/release flow around `develop` and `main`
3. Verify Supabase Auth URLs against dev/prod domains
4. Then move to auth/social and UAT
