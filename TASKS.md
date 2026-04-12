# BlackPick — Task Manifest (durable, survives `/clear`)

> **WHY THIS FILE EXISTS**: Claude's in-session `TaskList` tool is volatile — `/clear` wipes it. This file is the canonical, git-tracked source of truth. At session start (or after `/clear`), Claude must read this file and restore context from it before touching any task.
>
> **OWNER**: Sean + Claude. Update on **every task transition** (create, start, complete, delete, defer) — immediately, not at session end. Ending a session with a stale manifest is a process failure.
>
> **Two-level model** — this file carries the **full durable roadmap** (all phases 0–7). The in-session `TaskList` tool only carries **actionable-this-session** items (the sub-tasks of the current branch). Loading the full roadmap into the tool drowns current work.

_Last updated: 2026-04-12 (after PR #15 merge, Phase 0 complete, Phase 1 fix/prediction-lock-state in-progress)_

---

## Session start protocol (MANDATORY — run before any task work, including post-`/clear`)

1. **Read this file end-to-end.** You need the full phase map, not just the current item.
2. **Read `CURRENT_STATE.md`** — production snapshot. Flags schema state, branch status, launch blockers.
3. **Read `Docs/codex-review.md`** — review gate rules. Every code PR goes through `scripts/codex-review.sh` which auto-falls-back to `scripts/gpt-review.sh` when Codex is rate-limited.
4. **Read the latest wiki entry** in `Wiki_Sean/BlackPick/` — session-by-session decisions, context behind choices.
5. **Restore the TaskList tool** from §Current-focus actionable sub-tasks below via `TaskCreate` with stored `subject` / `description` / `activeForm`. Only restore the **current** branch's sub-tasks — not the full roadmap.
6. **Sanity check**: if `CURRENT_STATE.md` disagrees with this manifest (something marked done in one place, pending in the other), **flag to Sean**. Do not silently trust either side.
7. **Update this manifest immediately on every task transition** — not at session end. A trailing stale manifest is a process failure.

---

## Current focus

**Phase 1 — UX bugs + onboarding + streak** (started 2026-04-12 after PR #14 / Phase 0 merge).

**Active branch**: `fix/prediction-lock-state` (in-progress, uncommitted client component drafted, server-side lock already verified in place).

**Review gate**: Codex CLI is rate-limited through **2026-04-17** on Sean's account. `scripts/codex-review.sh` auto-falls-back to `scripts/gpt-review.sh` (OpenAI `/v1/responses`) transparently. Profile table + cost in `Docs/codex-review.md`. Cumulative GPT API cost so far: **$2.16 / $9.99** (per `~/.blackpick/gpt-review-log.jsonl`).

**Phase 0 done, Phase 2 gated on Phase 1 completion.** Do not start Phase 2 branches until every Phase 1 item is merged.

---

## Recently shipped (chronological, newest first)

| PR | Branch | Commit | Phase | What shipped |
|---|---|---|---|---|
| #15 | `chore/gpt-api-review-fallback` | `ac5b6e4` (squashed) | Tooling | `scripts/gpt-review.sh` + `codex-review.sh` auto-fallback wiring. 5 rounds of self-review hardened 19 issues (argv hygiene, nonce sentinels, prompt-injection defense, timeouts, env isolation, mutex selectors, etc). Untracks `tsconfig.tsbuildinfo` and adds `*.tsbuildinfo` to `.gitignore`. |
| #14 | `dev-ui/panel-v2-switches` | `304920e` | **Phase 0 ✅** | DevPanel v2: switch-based UI (gold active), Event State / User State / Content State / Actions sections, new server actions (`set-event-status`, `get-user-state`, `set-ring-name`, `clear-my-predictions`), `Reset "all predicted" toast lock` action, `Show 404` action. Dev-only env guards on both client and server. |
| #13 | `chore/plan-reconcile` | `9952dd3` | Planning | Full plan reconcile after GPT plan review: 7-phase manifest (Phase 0–7), wiki entry `2026-04-12-plan-review-and-reconcile.md` with decision log, scope-down of automation to Phase 7, `analytics_anomaly` enum slot reservation, onboarding + streak UX added to Phase 1, admin surface consolidation added to Phase 2, MVP timer changed to admin-trigger-primary + 8h lazy fallback. |
| #12 | `release/2026-04-12` | `5b51afc` (main) | **Launch #1** | `develop → main` release bundling PRs #3–#11. Prediction flow UX (#3 / #5 / #6 / #7), hooks migration (#9), ring_name unique index (#10), signup-gate focus trap (#11), codex-review wrapper hardening. GitHub Actions auto-deployed to blackpick.io. Prod smoke 13/13. |
| #11 | `a11y/signup-gate-modal-focus-trap` | included in #12 | Prior session | Signup gate Tab focus trap + codex-review wrapper hardening. |
| #10 | `db/ring-name-case-insensitive-unique` | included in #12 | Prior session | `lower(ring_name)` unique index + `escapeIlikePattern()` for ILIKE wildcard safety. Applied to DEV + PROD via management API. |
| #9 | `refactor/set-state-in-effect-migration` | included in #12 | Prior session | 7 components migrated to `useSyncExternalStore`, `react-hooks/set-state-in-effect` re-enabled globally. |

## Phase 0 completion record (closed 2026-04-12 · PR #14)

| Outcome | Detail |
|---|---|
| Tests | 84/84 vitest pass (`npm run test:fast`) |
| Build | `npm run build` clean |
| Lint | 0 errors, 19 pre-existing warnings |
| Key artifacts | `src/components/DevPanel.tsx` (rewritten), `src/app/api/dev/seed/route.ts` (+4 new actions), base-ui `Switch` primitive |
| Review | Self-reviewed (dev-only code, Codex still blocked at the time, gpt-review.sh wrapper not yet built) |
| Deferred to Phase 4 | MVP voting open switch, result_pending switch — these require schema columns landing in Phase 4 `db/mvp-voting-timer` branch. DevPanel will be extended there. |

---

## Phase 1 — UX bugs + onboarding + streak UX

_Goal: fix every visible bug on the shipped feature set, add the missing first-time user flows, surface streak data. Heaviest phase._

### Branch 1: `fix/prediction-lock-state` ← **in-progress**

Scope: 4 bugs around the "fight locks at start_time" transition.

**Current-focus actionable sub-tasks** (restore to TaskList tool at session start via `TaskCreate`):

| # | Subtask | Status |
|---|---|---|
| 1-1 | New client component `src/components/LockTransitionWatcher.tsx` that subscribes to `useClockTick` and calls `router.refresh()` once when any upcoming-fight `start_time` has been crossed. Dedups via ref. Draft exists untracked. | in-progress |
| 1-2 | Mount `LockTransitionWatcher` on the event page with `lockTimestamps = upcomingEntries.map(e => Date.parse(e.fight.start_time))`. Triggers server re-render so `hasStarted` flips. | pending |
| 1-3 | Event page hero: replace the `event.status === "upcoming" && earliestStart ? <FlipTimer /> : null` conditional with a 3-branch ternary — FlipTimer when upcoming + in future, "Prediction Locked" card when locked, null when completed. | pending |
| 1-4 | `FightCard` static mode: pass `userPickedFighterId` to `FighterSideStatic` and render a "MY PICK" chip on the user's saved fighter when live (no winner known yet). | pending |
| 1-5 | Server-side lock guard already present at `src/app/api/predictions/route.ts:60-73` (rejects `status != 'upcoming'` AND `startTime <= now`). **Verified, no change.** Add one-line comment linking to this file in the manifest as evidence the check exists. | verified |
| 1-6 | `npx eslint` + `npx tsc --noEmit` + `npm run test:fast` + `npm run build` clean | pending |
| 1-7 | `scripts/codex-review.sh review` (auto-falls-back to GPT API) — fix any findings → re-review until clean | pending |
| 1-8 | Update TASKS.md: mark branch 1 done, move to Recently shipped, start branch 2 | pending |

### Branch 2: `fix/share-cta-visibility` (blackpick review)
- [ ] Move ShareMenu CTA into the hero card, not between hero and fight list. Explicit label ("Share your picks").
- [ ] **State-driven trigger copy** (GPT review — dynamic, not static label):
  - Default (has picks, card not complete): `Share your card`
  - All picks saved on an upcoming event: `{n}/{n} locked in — share your card`
  - Post-result with positive record: `{wins}-{losses} this card — share your streak`
  - Post-result with streak ≥ 3: `🔥 {streak} in a row — share`
- [ ] Disabled state with hint when condition not met:
  - No ring name: "Set a ring name first →" linking to profile
  - No picks: "Save a pick to unlock sharing"
- [ ] Mobile: sticky bottom-bar button when scrolled past the hero.

### Branch 3: `fix/ui-polish-batch` (lite review — simple CSS/copy)
- [ ] FightCardPicker: remove golden glow ring on selected state. Replace with 2px gold border + `Check` icon overlay.
- [ ] Search fighter input placeholder: bump opacity from default muted to `rgba(255,255,255,0.5)`.
- [ ] Mobile fight card: name + flag must not truncate. Use `flex-wrap` or stacked layout below 380px.

### Branch 4: `feature/fighter-page-sort` (blackpick review)
- [ ] Add sort dropdown: Name (A-Z) / Win rate / Weight class.
- [ ] URL param `?sort=winrate&wc=lightweight` for shareability.
- [ ] Persist last sort choice in localStorage.

### Branch 5: `db/title-fight-flag` + `feature/title-fight-badge` (max review for migration)
- [ ] Migration: `fights.is_title_fight boolean not null default false` (separate from `is_cup_match`).
- [ ] Champion badge on fight history cards + gold border when `is_title_fight`.
- [ ] Admin sets the flag manually via DevPanel action "Mark fight as title fight" (crawler can't infer).

### Branch 6: `fix/hardcoded-korean-leaks` (blackpick review)
- [ ] `grep -rn "[ㄱ-ㅎ가-힣]" src/components src/app --include="*.tsx" --include="*.ts"` — every match not in a comment or a `ko.json` key is a leak.
- [ ] Fix each by moving the string to `src/messages/*.json` and `t(key)`.
- [ ] Bug class, not i18n improvement. Comprehensive tone review stays at Phase 5.

### Branch 7: `feature/onboarding-first-time-flow` (blackpick review)
- [ ] First-time authed users without a `ring_name`: prompt on `/` landing (modal or sticky top banner: "Pick your ring name to start predicting").
- [ ] Empty state on events list for anonymous viewers: "Pick your first fight →" linking to the featured event.
- [ ] Dismissible hint card on fight detail for users with zero saved picks: "Tap a fighter to make your first prediction".
- [ ] No multi-step wizards, no tooltip tours. Single prompt per state, dismissible, no re-show for 30 days.

### Branch 8: `feature/streak-ux` (blackpick review)
- [ ] Profile page: current + best streak displayed prominently with flame icon (data already in `users.current_streak` / `best_streak`).
- [ ] Streak toast: when correct pick pushes `current_streak` to a new personal record, fire a success toast on page load ("🔥 {streak} in a row").
- [ ] Share CTA copy in `fix/share-cta-visibility` uses streak value when available.

### Branch 9: `fix/verify-all-predicted-toast` (blackpick review)
- [ ] Verify AllPredictedToast actually fires for Sean. Current condition (transition detection + localStorage lock) means re-mounts with complete state don't fire. DevPanel v2 "Reset toast lock" action lets Sean test.
- [ ] Sean confirms via manual test after using the DevPanel action.

---

## Phase 2 — Feedback widget + ticket system + admin consolidation

_Goal: replace the DevPanel position in prod with a user-facing feedback button, build the ticket table that feedback + Sentry + (future) analytics anomalies all flow into, and consolidate the two admin surfaces into one._

### Branch: `db/feedback-tickets` (max review)
- [ ] Migration creates `feedback_tickets`:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid nullable references users(id)` (nullable for anonymous)
  - `source enum('user_feedback', 'sentry_error', 'claude_autofix_failed', 'analytics_anomaly')` — **all four reserved now** per GPT review, even though anomaly detection lands in Phase 7
  - `status enum('open', 'triaged', 'in_progress', 'resolved', 'wontfix')`
  - `priority enum('p0', 'p1', 'p2', 'p3')`
  - `title text not null`
  - `body text not null`
  - `metadata jsonb not null default '{}'` (Sentry event id, page URL, UA, screenshot URL, metric name+value, etc.)
  - `github_issue_url text nullable`
  - `cluster_key text nullable` (Phase 7 feedback clustering reserved slot)
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()` — trigger-updated
  - `resolved_at timestamptz nullable`
- [ ] RLS: anon/users can insert only with `source = 'user_feedback'`; only admin can insert other sources; only admin can select/update/delete.
- [ ] Index: `(status, priority, created_at desc)` for admin dashboard queries.

### Branch: `feature/feedback-widget` (blackpick review)
- [ ] New `FeedbackButton` component in the DevPanel bottom-right slot, but only when `NODE_ENV === 'production'`. DevPanel and FeedbackButton are mutually exclusive by env.
- [ ] Modal UI: category dropdown (Bug / UX / Question / Other), title + body, optional screenshot paste via `navigator.clipboard`.
- [ ] `POST /api/feedback` — inserts to `feedback_tickets` with `source='user_feedback'`, then fire-and-forget mirrors to GH Issues via `gh api` using a scoped PAT (`FEEDBACK_GH_PAT` in Vercel env).
- [ ] GH issue body includes a link back to `/admin/tickets/{id}`.
- [ ] If GH mirror fails, Supabase insert still wins — UI returns 200 either way.

### Branch: `feature/sentry-webhook-ingest` (max review)
- [ ] `POST /api/feedback/sentry-webhook` — accepts Sentry's issue.created webhook, verifies HMAC via `SENTRY_WEBHOOK_SECRET`, normalizes into `feedback_tickets` with `source='sentry_error'`.
- [ ] Auto-priority: `level=fatal → p0`, `level=error → p1`, else `p2`.
- [ ] Dedupe by Sentry `issue.id` in `metadata`.

### Branch: `feature/admin-tickets-dashboard` (blackpick review)
- [ ] New page `/admin/tickets` (admin-only via existing check).
- [ ] Filterable list: status, priority, source, date range.
- [ ] Click into ticket shows body, metadata, GH issue link, status transitions.
- [ ] No SLA tracking, no assignment, no comment thread. Triage only.

### Branch: `feature/admin-surface-consolidation` (blackpick review)
- [ ] Port everything from `/[locale]/(main)/fighters/manage` into `/admin/fighters` (list, search, create/edit/delete, pixel avatar upload, country/weight/record edit).
- [ ] Restyle all `/admin/*` pages with the retro CSS tokens; drop `gray-900` / `amber-400` Tailwind literals.
- [ ] Unified `/admin` index with sidebar: Dashboard / Events / Fighters / Results / Tickets / Feedback.
- [ ] Flip `AccountDropdown` admin link from `/fighters/manage` to `/admin`.
- [ ] Delete the old `/[locale]/(main)/fighters/manage` route after parity confirmed.
- [ ] Admin UI stays English-only — intentional, note it in the admin layout header.

---

## Phase 3 — Email infra

_Goal: unblock every "send an email" task with zero-operating-cost stack. Docs first so Sean can execute DNS/provider setup in parallel._

### Branch: `docs/email-setup`
- [ ] `Docs/email-setup.md`: Cloudflare Email Routing (receive, free) + Resend (send, 3000/mo free). DNS records Sean enters in Cloudflare: SPF TXT, DKIM CNAME ×3, DMARC TXT, MX ×2. Step-by-step: domain → nameservers → Email Routing (admin@/support@/noreply@) → Resend sign-up → verify → Supabase Custom SMTP switch-over → smoke test. Alternative comparison (SendGrid, Postmark, SES) — why Resend wins at this scale. Monthly cost: $0 (domain excluded).

### Branch: `feature/supabase-email-templates` (lite review — HTML only)
- [ ] `supabase/email-templates/` folder with 4 BlackPick-branded HTML files: `confirm_signup.html`, `reset_password.html`, `magic_link.html`, `invite.html`. Inline CSS, black + gold, Pretendard stack.
- [ ] `Docs/email-setup.md` — "how to paste these into Supabase Dashboard → Auth → Email Templates" (manual, Supabase API doesn't expose templates).

---

## Phase 4 — Auth, comments, MVP timer

_Goal: close the remaining feature gaps before launch. Facebook OAuth, comment edit/delete, MVP timer replaces Sean's manual workflow._

### Branch: `docs/facebook-oauth-setup`
- [ ] `Docs/facebook-oauth-setup.md` — Meta App creation, App Review lite, redirect URIs for dev + prod, Supabase provider setup. Sean runs these steps.

### Branch: `feature/facebook-oauth-wire-in` (blackpick review, after docs steps)
- [ ] Flip `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true` in Vercel prod.
- [ ] `SocialAuthButtons` already has Facebook gated — verify after flip.
- [ ] Smoke from each locale.

### Branch: `db/fighter-comments-edit-delete` + `feature/comment-edit-delete` (max review for migration)
- [ ] Migration: `fighter_comments.edited_at timestamptz nullable`, `deleted_at timestamptz nullable`, `deleted_by uuid nullable references users(id)`, `deleted_body text nullable`.
- [ ] UI: edit button on own comments (`edited` badge if `edited_at is not null`), delete renders as "[Deleted by {ring_name}]" so thread structure stays intact.
- [ ] PUT / DELETE endpoints on `/api/fighter-comments/{id}` — owner or admin.

### Branch: `db/mvp-voting-timer` + `feature/mvp-timer-admin` (max review)
- [ ] Migration: `events.mvp_voting_opens_at timestamptz nullable`, `fights.result_pending boolean not null default false`.
- [ ] MVP vote insert CHECK: `fight.status = 'completed'` **AND** (`mvp_voting_opens_at is not null AND now() >= mvp_voting_opens_at`).
- [ ] **Primary mechanism**: admin "Open MVP Voting" button on `/admin/events/{id}` → `mvp_voting_opens_at = now()`. Sean uses this when official results come in.
- [ ] **Fallback mechanism**: any page load checking MVP status — if `mvp_voting_opens_at is null AND now() >= event.date + 8h`, lazily set it. **No cron**; first-read triggers the lazy set.
- [ ] UI: `mvp_voting_opens_at is null` → "결과 집계 중 — MVP 투표는 곧 열립니다" banner with target time. Once opened, MVP voting UI as before.
- [ ] DevPanel: add MVP Voting Opened + Result Pending switches (extends Phase 0 DevPanel).

---

## Phase 5 — i18n comprehensive tone review

_Goal: the "proper" pass Sean wanted. Comes last because it benefits from all copy in Phase 1–4 being finalized first. Final gate before launch._

### Branch: `i18n/comprehensive-tone-review` (max review per locale)
- [ ] Audit all 7 locales (en, ko, ja, zh-CN, mn, es, pt-BR) key-by-key against the English canonical.
- [ ] Each locale gets a native-voice pass. Criteria:
  - Natural phrasing (not Google Translate output)
  - BlackPick tone: retro boxing, short + punchy, no corporate softeners
  - Technical accuracy (e.g. "knockout" consistent)
  - Length parity — no strings 3× longer than English (breaks mobile layouts)
- [ ] First-pass via DeepL, then max-profile review per locale for tone, then patch + commit.
- [ ] **pt-BR gets priority attention** per GPT review (Brazil is the early-growth market).
- [ ] Cross-check: no hardcoded Korean leaks (Phase 1 already fixed the bugs — this double-checks).

---

## Phase 6 — LAUNCH GATE

_Goal: ship what we have. No new features. Only polish bugs found in launch-eve verification._

- [ ] Full end-to-end smoke on dev: every DevPanel state, OAuth via Google + Facebook, feedback submission, email receipt test.
- [ ] `develop → main` PR, bundle all Phase 1–5 work.
- [ ] `npm run deploy` (requires `vercel login` refreshed per the backlog).
- [ ] Post-deploy prod smoke via `npm run smoke:prod`.
- [ ] Soft launch: announce to the first wave of Korean users via existing channels.
- [ ] Monitor `/admin/tickets` + Sentry for first 48h. Fix P0/P1 immediately on fix branches.

---

## Phase 7 — Post-launch automation

_Goal: add the cron / anomaly / clustering / hot-fight features that only make sense with real user data. **Do not touch until Phase 6 has real users for at least a week.**_

### Branch: `feature/crawler-automation` + `docs/crawler-stability`
- [ ] Document current crawler (`src/scripts/crawler*.ts`, `scripts/sync-bc-event-card.ts`) — every code path, every side effect, every edge case.
- [ ] Anchor crawler on BC source fight ID — never reshuffle by position.
- [ ] `status` transitions tracked in new `fight_state_events` table for audit.
- [ ] GitHub Actions cron `*/30 * * * *` (NOT `*/10` per GPT review) → `/api/cron/fight-state-sync` → compares crawler output to DB → writes events + triggers live-transition notifications.

### Branch: `feature/live-transition-notifications`
- [ ] On `upcoming → live` transition, insert `fight_state_events` row + fire client toast (realtime subscribe) + email to opted-in subscribers via Resend.
- [ ] New `user_notification_prefs` table.

### Branch: `feature/mvp-open-email-notifications`
- [ ] When `mvp_voting_opens_at` flips null → not null (admin or lazy fallback), email `mvp_open_email=true` subscribers.

### Branch: `feature/analytics-anomaly-detection`
- [ ] Nightly cron inspects `user_events` for anomalies: `abandon_rate > 40%` on signup-gate modal, `prediction_save_error_rate > 5%`, day-over-day DAU drop > 20%.
- [ ] Each anomaly → insert `feedback_tickets` with `source='analytics_anomaly'`, `priority='p1'`, metric in metadata. Auto-mirror to GH issues.

### Branch: `feature/feedback-clustering`
- [ ] Nightly job groups open `user_feedback` tickets by `cluster_key` (substring match → embedding similarity if needed). Clusters ≥5 collapse into a parent; children get `metadata.parent_cluster_id`. Admin dashboard shows clusters as primary view.

### Branch: `feature/hot-fight-detection`
- [ ] Track prediction save rate per fight in a rolling 1h window. Fights with >3× the average of the same card get flagged (`fights.is_hot boolean`). UI: `🔥 Hot` badge.

---

## Backlog / Idea Pool

_No phase assigned — pull when a related area is already being touched._

- [ ] Share page enumeration opt-out — `users.is_public` flag, gate `loadSharePageData`.
- [ ] Notification store snapshot dedupe (`use-notifications.ts`).
- [ ] Timezone storage event filter with `oldValue === newValue` short-circuit.
- [ ] Storybook stories for `useIsMounted`, `useClockTick`, notification store.
- [ ] CODEOWNERS + branch protection on main.
- [ ] Replace GitHub Actions `push-to-main` deploy with manual approval gate (Vercel Deployment Protection).
- [ ] Refresh local Vercel CLI auth (`vercel login`) so `npm run deploy` works locally.
- [ ] Upgrade Vercel CLI (`npm i -g vercel@latest`, currently 50.42.0 → 50.44.0).
- [ ] Agent-skills plugin install (`/plugin marketplace add addyosmani/agent-skills`, slash command, Sean runs).
- [ ] Supabase migration history sync (cosmetic — missing rows for 202604090001/2/3).
- [ ] OG image asset `public/og/default.png` (1200x630) still missing.
- [ ] Sentry production DSN.
- [ ] Phase 2 test infrastructure (BlackPick_Test Supabase project, real DB integration tests, lefthook pre-commit, coverage measurement).
- [ ] Phase 3 test infrastructure (route handler unit tests, Playwright OAuth stub, coverage thresholds, BC scraper isolation).

---

## Process notes (do not delete — they anchor the workflow)

- **Review gate**: every code PR goes through `scripts/codex-review.sh`, which auto-falls-back to `scripts/gpt-review.sh` when Codex is blocked. **Never** call the OpenAI API directly from anywhere else. Docs-only PRs (TASKS.md, wiki, Docs/) are explicitly exempt — self-review OK. See `Docs/codex-review.md`.
- **Every PR updates TASKS.md in the same commit** that ships its code. When a branch lands, its row moves from the active section to Recently shipped, and the next branch's sub-tasks are restored to the in-session TaskList.
- **Session-end ritual**: before wrapping, update `CURRENT_STATE.md` + create a new `Wiki_Sean/BlackPick/<YYYY-MM-DD>-<slug>.md` + commit as `chore(docs):`. Sweep this file for stale items.
- **Lead engineer mode**: make best-practice decisions autonomously. Don't present 2–3 option menus on every step. Warn before destructive operations (force-push, drop table, etc).
- **Branch discipline**: every phase task = new branch, naming convention (`feature/`, `fix/`, `refactor/`, `db/`, `a11y/`, `i18n/`, `chore/`, `dev-ui/`). One PR per branch against `develop`. No stacking.
- **Phase gates**: finish a phase completely before starting the next. Parallel work within a phase is fine, but a Phase N branch never depends on a Phase N+1 branch.
- **GPT plan review reconcile**: the phase order and scope decisions live in `Wiki_Sean/BlackPick/2026-04-12-plan-review-and-reconcile.md`. Read it if you're about to reorder or rescope anything.
