# BlackPick — Task Manifest (durable, survives `/clear`)

> **Purpose**: Claude's in-session `TaskList` tool is volatile — `/clear` wipes it. This file is the git-tracked source of truth for the full Phase 0–7 roadmap. Session-start protocol lives in [CLAUDE.md](CLAUDE.md). Update on every task transition (immediately, not at session end).
>
> **Two-level model** — full roadmap here; `TaskList` tool carries only actionable-this-session sub-tasks of the current branch.

_Last updated: 2026-04-14 — PR #28 `feature/streak-ux` squash-merged; Phase 1 at 9/9 with only Branch 9 (verification-only) remaining._

---

## Current focus

**Phase 1 — 9/9 done.** Only Branch 9 (`fix/verify-all-predicted-toast`) remaining — verification-only, Sean runs DevPanel test. After Phase 1 closes → Phase 2 (email infra + Gmail feedback relay + Sentry + admin consolidation).

### Next session resume

1. `git checkout develop && git pull` — main tip `20ffbd6`
2. **Sean manual TODO**: Supabase Dashboard → Email Templates → Send Test Email for `confirm_signup` + `reset_password`; validate rendering in Gmail / iOS Mail / Outlook
3. **Branch 9 test flow** — DevPanel → Actions → `Reset "all predicted" toast lock` → save picks on every fight in an event with `has_saved_picks=false` → verify toast fires on transition + no re-fire on reload. If broken: investigate `AllPredictedToast.tsx` transition detection (`previousCountRef` L55, `reachedAllThisTick` L66–67); may need `router.refresh()` post-save
4. **Review gate** — blackpick profile via `second-opinion-reviewer` subagent + file-based dialogue. Transcripts under `reviews/BlackPick/<YYYY-MM-DD>_<topic>_dialog/`. Pattern + rubric in [`Docs/review-tier-rubric.md`](Docs/review-tier-rubric.md)
5. **Phase 2 starts** after Branch 9. First active branch: `feature/feedback-email-relay` — blocked by Sean executing `Docs/email-setup.md` (Cloudflare + Resend + Gmail Send As, ~30 min manual)

### Reference lessons (from shipped branches)

- **Spec-phase review is cheaper than impl-phase re-review** (Branch 8 validation): catching state-machine design flaws at spec cost ~0 rework vs. ~60-line rewrite post-HEAD. Use for non-trivial detection logic or new localStorage schemas.
- **Multi-round file-based dialogue catches what single-round misses** (Branch 6 validation): 3 blockers + 1 pre-existing bug only surfaced across rounds 2–3 via systemic sweep. Use for branches with potential defect-class patterns.
- **Drop unverifiable external-tool claims from permanent docs** (Branch 5 Part 1): when two reviewers contradict on external behavior, the canonical approach is not making the claim — keep only SQL-engine-level truths.

Full per-branch narrative + review trails live in `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/`.

---

## Recently shipped

| PR | Branch | Commit | Phase | Summary |
|---|---|---|---|---|
| #28 | `feature/streak-ux` | `8ad4ac7` | **P1 branch 8 ✅** | Profile streak tiles + `StreakPrToast` (baseline + strict-increase) + share CTA wire-up + DevPanel v3 sandbox. 372×7 i18n, 166/166 tests. First spec-phase review round in BlackPick. Wiki: `2026-04-14-branch8-iterations-and-devpanel-v3.md` |
| — | main direct | `20ffbd6` | Hotfix | `bp-logo-email.png` cherry-pick to unblock Supabase test-email |
| #27 | `feature/onboarding-first-time-flow` | `cc7bbc7` | **P1 branch 7 ✅** | 3 dismissible prompts (ring-name modal opt-in, anon CTA, first-pick hint) via `useOnboardingDismissal`. Wiki: `2026-04-13-branch7-onboarding-first-time-flow.md` |
| #26 | `fix/hardcoded-korean-leaks` | `b24057a` | **P1 branch 6 ✅** | i18n leak sweep + caps-lock chips → `t()`. First 3-round file-based dialogue. Wiki: `2026-04-13-branch6-korean-leaks-plus-dialogue-pattern.md` |
| #25 | `feature/supabase-email-templates` | `992fb9e` | **P3 partial ✅** | Dark-theme confirm + reset HTML, WCAG AA, lucide icon ImageResponse routes. `magic_link` + `invite` still pending. Wiki: `2026-04-13-email-templates-pivot.md` |
| #24 | `feature/title-fight-badge` | `b2a9dea` | **P1 branch 5p2 ✅** | TITLE FIGHT + MAIN CARD chips + DevPanel Content Flags preview. Wiki: `2026-04-13-title-fight-flag-migration.md` |
| #23 | `db/title-fight-flag` | `84857f1` | **P1 branch 5p1 ✅** | Migration: `is_title_fight` + `is_main_card` BOOLEAN NOT NULL DEFAULT false |
| #22 | `fix/prediction-pick-label-consistency` | `f8f9016` | P1 hotfix ✅ | FightCard "Your Pick" chip aligned with picker |
| #21 | `feature/fighter-page-sort` | `08582ef` | **P1 branch 4 ✅** | `/fighters` sort + country filter, URL state + localStorage persist, 39 new unit tests |
| #20 | `chore/move-wiki-out-of-repo` | `bf6f50e` | Chore | Session logs moved to `~/Desktop/Wiki_Sean/BlackPick/` external |
| #19 | `fix/ui-polish-batch` | `d5d03b2` | **P1 branch 3 ✅** | Avatar glow drop, placeholder contrast, name+flag wrap |
| #18 | `fix/share-cta-visibility` | `5ee064d` | **P1 branch 2 ✅** | `EventShareCta` 6-variant state machine |
| #17 | `fix/prediction-lock-state` | `93b2d9e` | **P1 branch 1 ✅** | `LockTransitionWatcher` + live state "Your Pick" chip. Added Quality-Maximizing Path meta-rule |
| #16 | `chore/tasks-manifest-session-structure` | — | Planning | Two-level roadmap model |
| #15 | `chore/gpt-api-review-fallback` | `ac5b6e4` | Tooling | `gpt-review.sh` fallback |
| #14 | `dev-ui/panel-v2-switches` | `304920e` | **P0 ✅** | DevPanel v2 switches + server actions |
| #13 | `chore/plan-reconcile` | `9952dd3` | Planning | 7-phase manifest |
| #12 | `release/2026-04-12` | `5b51afc` (main) | **Launch #1** | `develop → main` bundled PRs #3–#11 |
| #9–#11 | various | in #12 | Prior | Signup focus trap + ring_name unique index + `useSyncExternalStore` migration |

## Phase 0 completion record (closed 2026-04-12 · PR #14)

| Outcome | Detail |
|---|---|
| Tests | 84/84 vitest pass (`npm run test:fast`) |
| Build | `npm run build` clean |
| Lint | 0 errors, 19 pre-existing warnings |
| Key artifacts | `src/components/DevPanel.tsx` (rewritten), `src/app/api/dev/seed/route.ts` (+4 new actions), base-ui `Switch` primitive |
| Review | Self-reviewed (dev-only code) |
| Deferred to Phase 4 | MVP voting open switch, result_pending switch — require schema columns landing in Phase 4 `db/mvp-voting-timer` |

---

## Phase 1 — UX bugs + onboarding + streak UX

_Goal: fix every visible bug on the shipped feature set, add missing first-time user flows, surface streak data. Heaviest phase._

- Branch 1: `fix/prediction-lock-state` ✅ PR #17
- Branch 2: `fix/share-cta-visibility` ✅ PR #18 (mobile sticky bar deferred — approach in wiki)
- Branch 3: `fix/ui-polish-batch` ✅ PR #19
- Branch 4: `feature/fighter-page-sort` ✅ PR #21
- Branch 4-extra: `fix/prediction-pick-label-consistency` ✅ PR #22
- Branch 5 Part 1: `db/title-fight-flag` ✅ PR #23 (DEV + PROD both migrated)
- Branch 5 Part 2: `feature/title-fight-badge` ✅ PR #24
- Branch 6: `fix/hardcoded-korean-leaks` ✅ PR #26
- Branch 7: `feature/onboarding-first-time-flow` ✅ PR #27
- Branch 8: `feature/streak-ux` ✅ PR #28

### Branch 9: `fix/verify-all-predicted-toast` (blackpick review)
- [ ] Sean verifies `AllPredictedToast` fires on correct transition via DevPanel reset-toast-lock action
- [ ] If broken: investigate transition detection in `AllPredictedToast.tsx` (`previousCountRef` + `reachedAllThisTick`); may need `router.refresh()` after save

---

## Phase 2 — Email infrastructure + feedback relay + Sentry + admin consolidation

_Goal: zero-cost PIPA-compliant email stack; route user feedback through Gmail (not a custom DB ticket system); Sentry with native email alerts; consolidate admin surfaces._

**2026-04-14 scope correction**: original 5-branch plan (DB `feedback_tickets` + custom admin dashboard + Sentry webhook bridge) replaced with Gmail + Sentry native email alerts — 200+ fewer lines, stronger PIPA defensibility, zero DB migration risk. Deferred DB spec at `Docs/specs/2026-04-14-feedback-tickets.md` (revive threshold: ~500 users / ~50 tickets/week). **Monthly cost: $0**.

### Branch: `docs/email-setup` — **SHIPPED 2026-04-14**
- [x] `Docs/email-setup.md` — full Cloudflare Email Routing + Resend + Gmail Send As guide. 4 addresses (`noreply@`, `support@`, `admin@`, `privacy@`). Architecture, step-by-step, troubleshooting, PIPA 처리방침 language, $0 cost projection
- [ ] **Sean runs the guide async** (~30 min manual: Cloudflare + Resend + Gmail). **Blocks `feature/feedback-email-relay`**

### Branch: `feature/feedback-email-relay` (blackpick review) — **next session**
Blocked by: `docs/email-setup` execution (Resend domain verified, `RESEND_API_KEY` + `FEEDBACK_RECIPIENT_EMAIL` in Vercel env).

- [ ] `POST /api/feedback` route handler:
  - **Auth-optional**: `getUser()` can return null. **Login-error users MUST be able to submit feedback** — Sean 2026-04-14 insight: "로그인 필수면 로그인 못 하는 에러 나는 유저가 피드백을 못 주자나"
  - Input validation: category allowlist (Bug / UX / Question / Other), body 1–8000 chars, optional `contactEmail` for anon
  - Rate limit: in-memory Map keyed by `user_id` (authed) or SHA-256(IP + day-salt) (anon), 5-min TTL, max 5/window. No persistence
  - Vercel BotID for anon spam mitigation
  - For authed users: server reads `public.users` (ring_name/score/wins/losses/current_streak) + `auth.users.email` — enriches payload, never returned to client
  - Email payload (Resend SDK):
    - Subject: `[BP Feedback] [{Category}] {ringname or 익명} — {first 40 chars}`
    - From: `noreply@blackpick.io`, To: `FEEDBACK_RECIPIENT_EMAIL`
    - **Reply-To: user's email** (authed auth.email OR anon's contactEmail). Gmail "Reply" → straight to user, no copy-paste
    - Body: category, ringname + stats, email, page URL, user-agent, timestamp, feedback
  - 200 on success, 503 on Resend failure (UI retries once then shows error)
- [ ] `FeedbackButton` component — DevPanel bottom-right slot in `NODE_ENV === 'production'` (mutually exclusive with DevPanel). Always available regardless of auth state
- [ ] `FeedbackModal` component — retro-styled: category dropdown, body textarea (1-8000 char counter), conditional `contactEmail` when `!authUser`, submit with loading/error state
- [ ] Pure validator `src/lib/feedback-validation.ts` + `.test.ts` (~15 cases — 166 → ~181 tests)
- [ ] i18n: ~14 new keys × 7 locales (`feedback.button`, `feedback.modalTitle`, category label + 4 options, body label, contactEmail label, submitCta, success/error/rate-limit toasts, authOptionalHint). Target: 372 → ~386 × 7
- [ ] Integration smoke (local dev): submit → verify Gmail Reply-To → reply → confirm user receives. Both authed + anon paths
- [ ] Privacy policy update — PIPA 처리위탁 section listing Resend / Cloudflare / Gmail. Content pre-drafted in `Docs/email-setup.md § PIPA 처리방침`

### Branch: `feature/sentry-setup` (blackpick review) — **next session, parallel-safe**
Blocked by: Sentry account + project created, `SENTRY_DSN` in Vercel env.

- [ ] `npm install @sentry/nextjs` + `npx @sentry/wizard@latest -i nextjs`
- [ ] `sentry.{client,server,edge}.config.ts` — `tracesSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`, scrub `ring_name` / `email` / `user_id` via `beforeSend`
- [ ] `instrumentation.ts` — Next.js 16 server-side hook
- [ ] Source map upload in CI: `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` env vars
- [ ] Dashboard config (Sean manual): Alerts → Issue Alerts → new rule "When a new issue is created" → Send email to `admin@blackpick.io`. Optional `level=fatal` → email + Slack. Configure retention + PII scrubbing
- [ ] Smoke: `/api/_sentry-test` route that throws → Sentry captures → email lands within 2 min → **delete test route before merge**
- [ ] **No custom webhook bridge, no Notion, no DB writes** — Sentry dashboard IS the error ticket store

### Branch: `feature/admin-surface-consolidation` (blackpick review) — **independent**
- [ ] Port `/[locale]/(main)/fighters/manage` → `/admin/fighters` (list, search, CRUD, pixel avatar upload, country/weight/record edit)
- [ ] Restyle all `/admin/*` pages with retro CSS tokens; drop `gray-900` / `amber-400` Tailwind literals
- [ ] Unified `/admin` index with sidebar: Dashboard / Events / Fighters / Results. **No Tickets / Feedback tab** (Gmail + Sentry dashboard)
- [ ] Flip `AccountDropdown` admin link from `/fighters/manage` to `/admin`
- [ ] Delete old `/[locale]/(main)/fighters/manage` route after parity confirmed
- [ ] Admin UI stays English-only — intentional, note in layout header

---

## Phase 3 — Supabase email templates (HTML only) — ✅ **CLOSED 2026-04-17**

_Goal: ship Supabase auth email templates for BlackPick's active auth paths (email/password signup + password reset). `magic_link` + `invite` dropped as confusion-only — no `signInWithOtp` / `inviteUserByEmail` call exists in `src/`, so those templates would never render._

### Branch: `feature/supabase-email-templates` — ✅ **shipped PR #25**
- [x] `confirm-signup.html` — dark + WCAG AA + MSO bulletproof + 24h expiry
- [x] `reset-password.html` — same base + `{{ .Email }}` + 1h expiry + keyhole `currentColor` fix
- [x] `README.md` — asset map, WCAG audit, email-client compatibility, Supabase deploy guide
- [x] `src/types/lucide-icons.d.ts` + `bp-logo-email.png` + `package.json` lucide pin `~1.7.0`
- [ ] **Sean's post-merge deploy** — preview URLs 200 → Supabase Dashboard → Auth → URL Config (Site URL = blackpick.io) → Email Templates → paste + test (Gmail / iOS Mail / Outlook rendering validation)

**Not shipping** (verified unused 2026-04-17, grep `signInWithOtp|magic_?link|inviteUserByEmail` → 0 hits):
- ~~`magic_link.html`~~ — BlackPick uses email+password, not OTP/magic-link auth
- ~~`invite.html`~~ — no programmatic invite flow exists

---

## Phase 4 — Auth, comments, MVP timer, Codex security remediation

_Goal: close remaining feature gaps before launch. Facebook OAuth, comment edit/delete, MVP timer replaces Sean's manual workflow. Plus absorb the 2026-04-11 Codex review P0/P1 findings via a dedicated branch owned by Codex CLI._

### Branch: `db/codex-integrity-atomicity` — **OWNED BY CODEX CLI** (token-blocked as of 2026-04-17)

Codex CLI has an uncommitted worktree implementing 6 of 11 items from the 2026-04-11 + 2026-04-17 review rounds. **Do not touch these files in parallel branches** — merge conflict risk high, and Codex owns the mental model. Original guide: `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/2026-04-11-codex-review-remediation-guide.md`.

**Codex-owned files (hands off)**:
- `supabase/migrations/202604170001_integrity_atomicity.sql` (206 lines, unapplied)
- `src/lib/mvp-vote-window.{ts,test.ts}`
- `src/types/database.ts`
- `src/app/api/{admin/results,comments,fighter-comments,mvp-vote,profile/delete-account,profile/reset-record}/route.ts`

**Completed in Codex WIP (uncommitted, tests pass)**:
- [x] Account deletion cascade ordering (auth user delete → public.users CASCADE, not reverse)
- [x] `reset_user_record()` atomic RPC replacing multi-step client orchestration
- [x] `admin_process_fight_result()` atomic RPC with `FOR UPDATE` row lock — prevents duplicate scoring under concurrent admin submits
- [x] `fight_comments` parent-thread validation (API check + DB trigger `enforce_fight_comment_parent_match`)
- [x] `fighter_comments` parent-thread validation (API check + DB trigger `enforce_fighter_comment_parent_match`)
- [x] MVP vote deadline anchored to `events.completed_at` + `trg_events_completed_at` auto-sync trigger + legacy KST fallback in helper

**Pending in Codex queue (5 new issues surfaced 2026-04-17)**:
- [ ] `comment_likes` schema drift — DEV (`lqyzivuxznybmlnlexmq`) missing the table, PROD (`nxjwthpydynoecrvggih`) has it. `scripts/check-schema-drift.mjs:30` returns green despite divergence. Recovery migration + drift-check broadening required; affects `src/app/api/comments/like/route.ts:23` + `src/app/api/comments/route.ts:72`
- [ ] `src/app/api/fighter-avatar/ref/[id]/route.ts:6` — admin-only reference images currently public-accessible; conflicts with `src/lib/fighter-avatar.ts:15` intent. Lock to admin auth
- [ ] `supabase/migrations/202604100001_create_user_events.sql:34` — `user_events` RLS too permissive; DB-direct inserts bypass rate-limit in `src/app/api/analytics/event/route.ts:55`. Tighten policy
- [ ] `src/components/MvpVoteSection.tsx:50` — client still computes deadline in UTC; API (`src/app/api/mvp-vote/route.ts:64`) already moved to `completed_at` anchor. Screen drifts from server truth. Sync client
- [ ] `src/app/api/events/[id]/stats/route.ts:8` — RLS-scoped result cached with `public` cache-control; cache can cross-bleed pre-prediction data. Scope cache to session or strip caching

**Gate**: DB functions + columns are in the migration file only. **Not yet applied to DEV/PROD**. Tier C rubric applies (money-path + irreversible) — `second-opinion-reviewer` + external cross-family review before `supabase db push` to DEV, then again before PROD.

### Branch: `docs/facebook-oauth-setup`
- [ ] `Docs/facebook-oauth-setup.md` — Meta App creation, App Review lite, redirect URIs for dev + prod, Supabase provider setup. Sean runs these steps.

### Branch: `feature/facebook-oauth-wire-in` (blackpick review, after docs steps)
- [ ] Flip `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true` in Vercel prod
- [ ] `SocialAuthButtons` already has Facebook gated — verify after flip
- [ ] Smoke from each locale

### Branch: `db/fighter-comments-edit-delete` + `feature/comment-edit-delete` (max review for migration) — **SCHEDULE AFTER Codex branch merges**
Blocked by: `db/codex-integrity-atomicity` (modifies same route file `src/app/api/fighter-comments/route.ts`). Rebase on Codex branch once merged.

- [ ] Migration: `fighter_comments.edited_at timestamptz nullable`, `deleted_at timestamptz nullable`, `deleted_by uuid nullable references users(id)`, `deleted_body text nullable`
- [ ] UI: edit button on own comments (`edited` badge if `edited_at is not null`), delete renders as "[Deleted by {ring_name}]" so thread structure stays intact
- [ ] PUT / DELETE endpoints on `/api/fighter-comments/{id}` — owner or admin

### Branch: `feature/mvp-timer-admin` (max review) — **SCHEDULE AFTER Codex branch merges**
Blocked by: `db/codex-integrity-atomicity` (Codex's migration adds `events.completed_at` and anchors MVP window on it; this branch layers the admin-open control on top).

- [ ] Migration: `events.mvp_voting_opens_at timestamptz nullable`, `fights.result_pending boolean not null default false` (Codex's `completed_at` already landed in `202604170001`)
- [ ] MVP vote insert CHECK: `fight.status = 'completed'` AND (`mvp_voting_opens_at is not null AND now() >= mvp_voting_opens_at`)
- [ ] **Primary**: admin "Open MVP Voting" button on `/admin/events/{id}` → `mvp_voting_opens_at = now()`
- [ ] **Fallback**: any page load — if `mvp_voting_opens_at is null AND now() >= event.date + 8h`, lazily set it. No cron; first-read triggers
- [ ] UI: `mvp_voting_opens_at is null` → "결과 집계 중 — MVP 투표는 곧 열립니다" banner with target time
- [ ] DevPanel: MVP Voting Opened + Result Pending switches

---

## Phase 5 — i18n comprehensive tone review

_Goal: the "proper" pass Sean wanted. Comes last — benefits from all Phase 1–4 copy being finalized first. Final gate before launch._

### Branch: `i18n/comprehensive-tone-review` (max review per locale)
- [ ] Audit 7 locales (en, ko, ja, zh-CN, mn, es, pt-BR) key-by-key against English canonical
- [ ] Each locale native-voice pass: natural phrasing (not Google Translate), BlackPick tone (retro boxing, short + punchy, no corporate softeners), technical accuracy ("knockout" consistent), length parity (no 3× English length)
- [ ] First-pass via DeepL, then max-profile review per locale, patch + commit
- [ ] **pt-BR priority** per GPT review (Brazil early-growth market)
- [ ] Cross-check: no hardcoded Korean leaks (Phase 1 already fixed — double-check)

#### Perspective + tone sweep — Sean 2026-04-14 additional criteria

Sean surfaced a class of issues during Branch 8 DevPanel sandbox testing. Each locale must be swept for:

**(A) Perspective consistency** — every copy string has implicit POV. Two patterns must not mix within the same surface:
1. **1인칭 소유** — user's own label for their own thing (fight card chip showing saved pick: "마이픽" / "내 픽" / "My Pick"). Applied to artifacts the user OWNS
2. **2인칭 권유** — UI addressing the user ("당신의 픽을 친구들에게 공유해보세요" / "Share your picks with friends"). Applied to CTAs / banners / nudges

Sweep every string and classify POV explicitly.

**(B) Politeness register per culture**:
- **ko**: default polite "해보세요" for CTAs. Avoid "~자" / "~해" 반말 unless brand-intentional. Sean 2026-04-14: "너무 반말보다 해보세요 이런거 권유"
- **ja**: ですます for CTAs, casual 動詞原形 only for intentional energy
- **zh-CN**: default 你 for user-facing (avoid overly formal 您); "吧" for soft suggestion
- **es**: tú (LatAm, not Peninsular); "ustedes" for plural; no "vosotros"
- **pt-BR**: você, NOT tu. Brazilian casual. Avoid European PT forms
- **mn**: та polite, чи familiar only in intentional brand voice

**(C) Em-dash (`—`) purge** — Sean 2026-04-14 "글도 emdash쓰지말고". Replace with period + new sentence OR comma + conjunction

**(D) Emoji purge in i18n strings** — per DESIGN.md §Icons. No `🔥`, `🎯`, `✨`. Render via `lucide-react` at callsite. Exceptions: country flags, OS-level emoji user content

**(E) Count interpolation presence** — "N items saved" uses `{count}` via `i18n-provider.tsx:26-32` `{var}` handler, not fragment split

**(F) CTA verb strength** — active + concrete. "OK" / "Done" → action verb ("Save" / "Confirm"). "Continue" → specific ("Save your pick" / "See results"). Passive "~되었습니다" / "was saved" → active "saved" / "locked in"

**Deliverable**: 7-locale spreadsheet keyed by i18n path, columns: `current value` / `POV (1인칭/2인칭/3인칭/neutral)` / `register (formal/casual/brand)` / `has em-dash?` / `has emoji?` / `proposed rewrite`. Any row changing POV or register requires per-locale native-speaker check before commit.

**Dependencies**: run AFTER Phase 1–4 copy finalized. Confirm with Sean before starting.

---

## Phase 6 — LAUNCH GATE

_Goal: ship what we have. No new features. Only polish bugs found in launch-eve verification._

- [ ] Full end-to-end smoke on dev: every DevPanel state, OAuth via Google + Facebook, feedback submission, email receipt test
- [ ] `develop → main` PR, bundle all Phase 1–5 work
- [ ] `npm run deploy` (requires `vercel login` refreshed per backlog)
- [ ] Post-deploy prod smoke via `npm run smoke:prod`
- [ ] Soft launch: announce to the first wave of Korean users via existing channels
- [ ] Monitor Sentry + Gmail feedback for first 48h. Fix P0/P1 immediately on fix branches

---

## Phase 7 — Post-launch automation

_Goal: cron / anomaly / clustering / hot-fight features that only make sense with real user data. **Do not touch until Phase 6 has real users for at least a week.**_

### Branch: `feature/crawler-automation` + `docs/crawler-stability`
- [ ] Document current crawler (`src/scripts/crawler*.ts`, `scripts/sync-bc-event-card.ts`) — every code path, side effect, edge case
- [ ] Anchor crawler on BC source fight ID — never reshuffle by position
- [ ] `status` transitions tracked in new `fight_state_events` table for audit
- [ ] GitHub Actions cron `*/30 * * * *` → `/api/cron/fight-state-sync` → compares crawler output to DB → writes events + triggers live-transition notifications

### Branch: `feature/live-transition-notifications`
- [ ] On `upcoming → live` transition, insert `fight_state_events` row + fire client toast (realtime subscribe) + email to opted-in subscribers via Resend
- [ ] New `user_notification_prefs` table

### Branch: `feature/mvp-open-email-notifications`
- [ ] When `mvp_voting_opens_at` flips null → not null, email `mvp_open_email=true` subscribers

### Branch: `feature/analytics-anomaly-detection`
- [ ] Nightly cron inspects `user_events` for anomalies: `abandon_rate > 40%` on signup-gate modal, `prediction_save_error_rate > 5%`, day-over-day DAU drop > 20%
- [ ] Each anomaly → insert `feedback_tickets` with `source='analytics_anomaly'`, `priority='p1'`. Auto-mirror to GH issues

### Branch: `feature/feedback-clustering`
- [ ] Nightly job groups open `user_feedback` tickets by `cluster_key` (substring → embedding similarity). Clusters ≥5 collapse into a parent. Admin dashboard shows clusters as primary view

### Branch: `feature/hot-fight-detection`
- [ ] Track prediction save rate per fight in rolling 1h window. Fights with >3× card average get flagged (`fights.is_hot boolean`). UI: `🔥 Hot` badge

---

## Backlog / Idea Pool

_No phase assigned — pull when a related area is already being touched._

- [ ] Share page enumeration opt-out — `users.is_public` flag, gate `loadSharePageData`
- [ ] Notification store snapshot dedupe (`use-notifications.ts`)
- [ ] Timezone storage event filter with `oldValue === newValue` short-circuit
- [ ] Storybook stories for `useIsMounted`, `useClockTick`, notification store
- [ ] CODEOWNERS + branch protection on main
- [ ] Replace GitHub Actions `push-to-main` deploy with manual approval gate (Vercel Deployment Protection)
- [ ] Refresh local Vercel CLI auth (`vercel login`)
- [ ] Upgrade Vercel CLI
- [ ] Agent-skills plugin install (`/plugin marketplace add addyosmani/agent-skills`)
- [ ] Supabase migration history sync (cosmetic — missing rows for 202604090001/2/3)
- [ ] OG image asset `public/og/default.png` (1200×630)
- [ ] Sentry production DSN
- [ ] Phase 2 test infrastructure (BlackPick_Test Supabase project, real DB integration tests, lefthook pre-commit, coverage measurement)
- [ ] Phase 3 test infrastructure (route handler unit tests, Playwright OAuth stub, coverage thresholds, BC scraper isolation)

---

## Process notes (do not delete — they anchor the workflow)

- **Review gate** — primary + rubric in [CLAUDE.md](CLAUDE.md) and [`Docs/review-tier-rubric.md`](Docs/review-tier-rubric.md). Docs-only PRs (TASKS.md, wiki, Docs/) exempt
- **Every PR updates TASKS.md in the same commit** that ships its code. When a branch lands, its row moves to Recently shipped and the next branch's sub-tasks restore into the in-session TaskList
- **Session-end ritual**: update [CURRENT_STATE.md](CURRENT_STATE.md) (in-repo, `chore(docs):`) + write new session log to `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/<YYYY-MM-DD>-<slug>.md` (outside repo — see `.gitignore`). Sweep TASKS.md for stale items
- **Lead engineer mode**: make best-practice decisions autonomously. Don't present 2–3 option menus on every step. Warn before destructive operations
- **Branch discipline**: every phase task = new branch. Naming: `feature/` / `fix/` / `refactor/` / `db/` / `a11y/` / `i18n/` / `chore/` / `dev-ui/`. One PR per branch against `develop`. No stacking
