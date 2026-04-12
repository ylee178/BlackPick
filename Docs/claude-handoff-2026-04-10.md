# Claude Handoff - 2026-04-10

## Source of Truth

- Working baseline: `feature/i18n-migration`
- Current HEAD: `8bdadae` (`test: Phase 1 — Silicon Valley grade test foundation`)
- Remote status: `origin/feature/i18n-migration` is in sync with local HEAD
- Treat the current checked-out tree and this branch as the authoritative base
- Do **not** treat `feature/fighter-image-management` as a merge target without re-review

## What Has Already Been Verified

### Auth and OAuth

- Safe internal-only redirect handling is in place via [src/lib/auth-next.ts](/Users/uxersean/Desktop/BlackPick/src/lib/auth-next.ts)
- OAuth callback uses the shared safe-next path handling in [src/app/api/auth/callback/route.ts](/Users/uxersean/Desktop/BlackPick/src/app/api/auth/callback/route.ts)
- Login and signup preserve `next` correctly:
  - [src/app/[locale]/(main)/login/page.tsx](/Users/uxersean/Desktop/BlackPick/src/app/[locale]/(main)/login/page.tsx)
  - [src/app/[locale]/(main)/signup/page.tsx](/Users/uxersean/Desktop/BlackPick/src/app/[locale]/(main)/signup/page.tsx)
- Social auth buttons exist and are wired for `google` and `facebook`:
  - [src/components/auth/SocialAuthButtons.tsx](/Users/uxersean/Desktop/BlackPick/src/components/auth/SocialAuthButtons.tsx)
  - Note: live Google/Facebook login still depends on Supabase provider configuration

### Submit-Button Loading UX

- Shared loading helpers exist:
  - [src/components/ui/LoadingButtonContent.tsx](/Users/uxersean/Desktop/BlackPick/src/components/ui/LoadingButtonContent.tsx)
  - [src/components/ui/PendingSubmitButton.tsx](/Users/uxersean/Desktop/BlackPick/src/components/ui/PendingSubmitButton.tsx)
- Spinner/loading feedback is already applied across major submit flows:
  - auth forms
  - social auth buttons
  - onboarding/profile actions
  - predictions and MVP vote
  - comments and replies
  - admin event/result forms
  - dev seed/dev panel actions
  - fighter image manager

### Security and Admin Hardening

- Admin gating now depends on `admin_users`, not env-based email allowlists
- `/fighters/manage` is admin-only and the admin entry point is intended to live in the profile dropdown
- API hardening already present in current tree includes:
  - shared rate limit utility in [src/lib/rate-limit.ts](/Users/uxersean/Desktop/BlackPick/src/lib/rate-limit.ts)
  - rate limits on comments, fighter comments, predictions, and fighter-avatar generation
  - safe fighter-avatar path handling and UUID validation
- SEO and metadata plumbing already exist:
  - [src/app/layout.tsx](/Users/uxersean/Desktop/BlackPick/src/app/layout.tsx)
  - [src/app/robots.ts](/Users/uxersean/Desktop/BlackPick/src/app/robots.ts)
  - [src/app/sitemap.ts](/Users/uxersean/Desktop/BlackPick/src/app/sitemap.ts)

### Legal / Public Pages

- Locale-aware terms and privacy pages already exist in the current app structure:
  - [src/app/[locale]/(main)/terms/page.tsx](/Users/uxersean/Desktop/BlackPick/src/app/[locale]/(main)/terms/page.tsx)
  - [src/app/[locale]/(main)/privacy/page.tsx](/Users/uxersean/Desktop/BlackPick/src/app/[locale]/(main)/privacy/page.tsx)

### Dev Seed Direction

- `Dev Seed` is intended to use current real events rather than creating fake `Black Cup 7/8/9`
- The current implementation direction is in [src/app/api/dev/seed/route.ts](/Users/uxersean/Desktop/BlackPick/src/app/api/dev/seed/route.ts)
- One nuance to re-check: cleanup paths still touch `comment_likes` in a less-defensive way than the comment GET path

## Verified Commands

These were re-run on `2026-04-10` and passed locally:

```bash
npx tsc --noEmit
npx vitest run --project unit src/components/auth/SocialAuthButtons.test.tsx src/lib/auth/oauth-redirect.test.ts
npm run build
```

## Branch / PR Reality

- `feature/i18n-migration`
  - authoritative active branch
  - pushed and synced with origin
- `feature/fighter-image-management`
  - local branch is ahead of origin by 1 commit: `aa42f4f`
  - this is a large omnibus commit against older app structure
  - it includes outdated `src/app/(main)` and `src/middleware.ts` assumptions
  - do **not** merge or push blindly
- `codex/workflow-fix-main`
  - pushed
  - merged as PR #2
- PR #1 (`Harden admin flows and refresh app shell`)
  - already merged
- `codex/fix-crawl-accuracy`
  - branch name is not on origin
  - the relevant commit content is already contained in `origin/main`

## What Claude Should Treat As Already Resolved

- open-redirect protection for auth callback and `next`
- locale-aware OAuth callback handling
- Google/Facebook button wiring in the UI
- common submit-button spinner pattern
- current-tree rate-limit utility and its integrations
- locale-aware terms/privacy pages
- robots/sitemap/current metadata baseline

## What Claude Should Review Carefully

1. Confirm whether the admin-only profile dropdown link for `/fighters/manage` is fully present in the current tree and consistent with the latest layout/menu structure.
2. Confirm whether the `Dev Seed` cleanup path should defensively ignore missing `comment_likes` the same way the comment read path does.
3. Check if any high-value ideas from `aa42f4f` are still missing in the current tree.
4. If `feature/fighter-image-management` is now fully superseded, recommend whether it should simply be archived/ignored.
5. Update or replace session summary docs only if needed, but do not disturb the user's in-progress `CURRENT_STATE.md` edits.

## Explicit Non-Goals

- Do not revert unrelated local changes
- Do not revive `src/middleware.ts` if current routing is based on [src/proxy.ts](/Users/uxersean/Desktop/BlackPick/src/proxy.ts)
- Do not reintroduce old `src/app/(main)`-based assumptions where the app now uses [src/app/[locale]/(main)](/Users/uxersean/Desktop/BlackPick/src/app/[locale]/(main))

## Paste-Ready Prompt For Claude

```text
Please use /Users/uxersean/Desktop/BlackPick/Docs/claude-handoff-2026-04-10.md as the primary handoff note.

Context:
- The current source of truth is branch feature/i18n-migration at commit 8bdadae.
- Treat the current checked-out tree as authoritative.
- Do not assume feature/fighter-image-management should be merged; it contains a large older omnibus commit and may be stale against the current locale/proxy architecture.

What I want from you:
1. Verify the handoff note against the current codebase.
2. Tell me what is already solid and what still needs cleanup.
3. Specifically confirm whether the admin-only /fighters/manage entry is properly hidden under the logged-in admin profile menu in the current tree.
4. Check whether Dev Seed cleanup still has any missing-table fragility around comment_likes or similar tables.
5. Identify any still-useful ideas from aa42f4f that are not already present in the current app.
6. Give me a concise action plan that is safe for the current branch structure.

Constraints:
- Prefer the current [locale] app structure and src/proxy.ts routing.
- Do not suggest reviving old src/app/(main) or src/middleware.ts patterns unless you can prove the current tree is missing something critical.
- Do not overwrite unrelated local edits.
```
