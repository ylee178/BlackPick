# BlackPick — Task Manifest

> **Purpose**: Living task list that survives session clears. Update freely — do not inline this content into `CLAUDE.md`. For the historical snapshot of what just shipped, see `CURRENT_STATE.md`. For session-by-session notes, see `Wiki_Sean/BlackPick/<date>-*.md`. For the reasoning behind the current phase order, see `Wiki_Sean/BlackPick/2026-04-12-plan-review-and-reconcile.md`.

_Last updated: 2026-04-12 (post-reconcile)_

---

## How to use this file

- Check boxes as things land (`[ ]` → `[x]`).
- Add new items under the right phase as they come up.
- When a task ships, move it into `CURRENT_STATE.md`'s "Completed" section and remove the box here (or leave crossed out with a commit SHA if you want a breadcrumb).
- If a task has blockers or dependencies, note them inline — don't create ghost rows in another section.
- **Phase gate rule**: do not start a phase until the prior phase is fully merged. Parallel work within a phase is fine across independent branches.

---

## Phase 0 — DevPanel v2 (test harness first)

_Goal: give Sean a switch-based dev tool to reach every edge-case UI state before we touch the UI itself. Everything after depends on being able to verify in dev._

**Branch: `dev-ui/panel-v2-switches`**

- [ ] Rebuild DevPanel UI as grouped switches (label + gold-active switch, no tab colors). Sections:
  - **Event State** (radio-in-section): Upcoming / Live / Completed / Cancelled
  - **MVP Voting**: Opened switch
  - **Prediction Lock**: Locked switch (auto-on when Live/Completed)
  - **Result**: Pending switch (result_pending boolean sim)
  - **User State**: Anonymous / Has ring name / Has saved picks
  - **Content State**: Show 404 / Empty events
  - **Actions** (one-shot buttons): Seed / Empty / Reset "all predicted" toast lock
- [ ] Verify `/api/dev/seed` server-side `NODE_ENV !== 'production'` guard is present on every action (already there at line 1047, double-check the new actions).
- [ ] Add local-origin guard: `X-Dev-Panel-Token` header (random value in `.env.local`) — only Sean's machine can toggle. Hardens against a malicious browser extension in dev.
- [ ] Reset "all predicted" lock action clears the `allPredictedToast:v1:${userId}:${eventId}` localStorage key so Sean can actually see the toast fire (#6 from the shipped list that he hasn't witnessed).
- [ ] Sean manually verifies: all DevPanel switches produce the expected UI state on dev.

---

## Phase 1 — UX bugs + onboarding + streak UX

_Goal: fix every visible bug on the shipped feature set, add the missing first-time user flows, add the missing streak surface area. This is the heaviest phase._

### Branch: `fix/prediction-lock-state` (blackpick review)
- [ ] Timer hits 0 but fight status label still reads "upcoming" — bug. Subscribe to a 1s tick derived from `useClockTick` and flip the label to "live"/"locked" when `now >= start_time`.
- [ ] Confirm predictions cannot be edited after lock — verify the `/api/predictions` POST handler rejects mutations when `fight.status !== 'upcoming'` at the DB level, not just UI. Add integration test.
- [ ] Post-lock: show "Prediction Locked" label in the sub-header (where the timer used to live).
- [ ] Post-lock: FightCardPicker continues to display the user's saved pick in read-only mode (not dropped / not hidden).

### Branch: `fix/share-cta-visibility` (blackpick review)
- [ ] Move ShareMenu CTA into the hero card, not between hero and fight list. Explicit label ("Share your picks").
- [ ] **State-driven trigger copy** (per GPT review — avoid static label):
  - Default (has picks, card not complete): `Share your card`
  - All picks saved on an upcoming event: `{n}/{n} locked in — share your card`
  - Post-result with positive record: `{wins}-{losses} this card — share your streak`
  - Post-result with streak ≥ 3: `🔥 {streak} in a row — share`
- [ ] Disabled state with hint when condition not met:
  - No ring name: "Set a ring name first →" linking to profile
  - No picks: "Save a pick to unlock sharing"
- [ ] Mobile: sticky bottom-bar button when scrolled past the hero.

### Branch: `fix/ui-polish-batch` (lite review — simple CSS/copy)
- [ ] FightCardPicker: remove the golden glow ring on selected state. Replace with a 2px gold border + `Check` icon overlay. Keeps selection visible without the "radiating halo" effect.
- [ ] Search fighter input placeholder: bump opacity from default muted to `rgba(255,255,255,0.5)`.
- [ ] Mobile fight card: name + flag must not truncate. Use `flex-wrap` on the header line or switch to stacked layout below 380px.

### Branch: `feature/fighter-page-sort` (blackpick review)
- [ ] Add sort dropdown to the fighters page: Name (A-Z) / Win rate / Weight class.
- [ ] URL param `?sort=winrate&wc=lightweight` for shareability.
- [ ] Persist last sort choice in localStorage so revisits remember.

### Branch: `db/title-fight-flag` + `feature/title-fight-badge` (max review for the migration)
- [ ] Migration: `fights.is_title_fight boolean not null default false`. Separate from `is_cup_match`.
- [ ] Champion badge on fight history cards + gold border when `is_title_fight`.
- [ ] Admin can set the flag manually via DevPanel action "Mark fight as title fight" (since the crawler can't infer it reliably).

### Branch: `fix/hardcoded-korean-leaks` (blackpick review)
- [ ] `grep -rn "[ㄱ-ㅎ가-힣]" src/components src/app --include="*.tsx" --include="*.ts"` — every match that isn't in a comment or a `ko.json` key is a leak.
- [ ] Fix each by moving the string to `src/messages/*.json` and `t(key)`.
- [ ] This is a BUG class, not an i18n improvement. The comprehensive tone review happens in Phase 5.

### Branch: `feature/onboarding-first-time-flow` (blackpick review)
- [ ] First-time authed users without a `ring_name`: prompt on `/` landing — modal or sticky top banner "Pick your ring name to start predicting".
- [ ] Empty state on events list for anonymous viewers: "Pick your first fight →" linking to the featured event.
- [ ] Dismissible hint card on fight detail for users who haven't saved a single pick yet: "Tap a fighter to make your first prediction".
- [ ] Do NOT build multi-step wizards or tooltip tours. Single prompt per state, dismissible, no re-show for 30 days.

### Branch: `feature/streak-ux` (blackpick review)
- [ ] Profile page: current streak + best streak displayed prominently with flame icon (already have the data in `users.current_streak` / `users.best_streak`).
- [ ] Streak toast: when a user's correct pick pushes their current_streak to a new personal record, fire a success toast on page load "🔥 {streak} in a row".
- [ ] Share CTA copy in `fix/share-cta-visibility` uses streak value when available.

### Branch: `fix/verify-all-predicted-toast` (blackpick review)
- [ ] Verify AllPredictedToast actually fires for Sean. Current condition (transition detection + localStorage lock) means re-mounts with complete state don't fire. DevPanel v2 "Reset toast lock" action lets Sean test.
- [ ] If mount-with-complete-state should also fire once ever (cross-session), flip the localStorage check order: read first, fire if not set, then set. Already the case — so this ticket is just about Sean actually seeing it via DevPanel reset.

---

## Phase 2 — Feedback widget + ticket system

_Goal: replace the DevPanel position in prod with a user-facing feedback button, and build the central ticket table that feedback + Sentry + (future) analytics anomalies all flow into._

### Branch: `db/feedback-tickets` (max review)
- [ ] Migration creates `feedback_tickets`:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid nullable references users(id)` (nullable for anonymous feedback)
  - `source enum('user_feedback', 'sentry_error', 'claude_autofix_failed', 'analytics_anomaly')` — **all four slots reserved now** per GPT review, even though anomaly detection lands in Phase 7
  - `status enum('open', 'triaged', 'in_progress', 'resolved', 'wontfix')`
  - `priority enum('p0', 'p1', 'p2', 'p3')`
  - `title text not null`
  - `body text not null`
  - `metadata jsonb not null default '{}'` — stores source-specific data (Sentry event id, page URL, user agent, screenshot URL, anomaly metric name+value, etc.)
  - `github_issue_url text nullable` — populated after GH API mirror succeeds
  - `cluster_key text nullable` — for future feedback clustering (Phase 7)
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()` — trigger-updated
  - `resolved_at timestamptz nullable`
- [ ] RLS: anon/authed users can insert with `source = 'user_feedback'` only; only admin service_role can insert other sources; only admin can select/update/delete.
- [ ] Seed a ticket count index: `create index on feedback_tickets (status, priority, created_at desc)` for admin dashboard queries.

### Branch: `feature/feedback-widget` (blackpick review)
- [ ] New `FeedbackButton` component. Renders in the same position (bottom-right, above mobile nav) as DevPanel — but only in **production** (`NODE_ENV === 'production'`). DevPanel and FeedbackButton are mutually exclusive by env.
- [ ] Modal UI: category dropdown (Bug / UX suggestion / Question / Other), title + body, optional screenshot paste area (uses `navigator.clipboard` read if available).
- [ ] POST `/api/feedback` — inserts to `feedback_tickets` with `source='user_feedback'`, then fire-and-forget mirrors to GitHub Issues via `gh api` using a PAT stored in Vercel env (`FEEDBACK_GH_PAT`, scoped to repo:write on a dedicated issues-only bot account if possible).
- [ ] GH issue body includes a link back to `/admin/tickets/{id}`.
- [ ] If GH API mirror fails, the ticket is still safely in Supabase — the UI returns 200 either way.

### Branch: `feature/sentry-webhook-ingest` (max review)
- [ ] `POST /api/feedback/sentry-webhook` — accepts Sentry's issue.created webhook payload, verifies HMAC signature via `SENTRY_WEBHOOK_SECRET`, normalizes into a `feedback_tickets` row with `source='sentry_error'`.
- [ ] Auto-priority mapping: `level=fatal → p0`, `level=error → p1`, else `p2`.
- [ ] Dedupe by Sentry `issue.id` stored in `metadata` — reopening or recurrence just bumps `updated_at` and reopens the ticket if it was resolved.

### Branch: `feature/admin-tickets-dashboard` (blackpick review)
- [ ] New page `/admin/tickets` (admin-only via existing admin_users check).
- [ ] Filterable list: status, priority, source, created_at range.
- [ ] Click into ticket shows full body, metadata, GH issue link, status transition buttons.
- [ ] No advanced features (no assignment, no SLA tracking, no comment thread) — just enough for Sean to triage.

### Branch: `feature/admin-surface-consolidation` (blackpick review)
_Goal: the current codebase has TWO admin surfaces — `/admin/*` (separate route group, has Events + Fighters + Results, but uses gray-900/amber-400 instead of the retro CSS tokens, no i18n, not linked from account dropdown) and `/[locale]/(main)/fighters/manage` (linked from account dropdown but only manages fighters). Consolidate into one `/admin/*` surface linked from the account dropdown for admins only._

- [ ] Keep `/admin/*` as the canonical admin route group (already outside the `[locale]` tree — correct for admin-only since we don't need to localize admin UI).
- [ ] Port every feature from `/[locale]/(main)/fighters/manage` into `/admin/fighters`:
  - List + search + filter
  - Create / edit / delete fighter
  - Pixel avatar upload + generation
  - Country flag, weight class, record editing
- [ ] Restyle all `/admin/*` pages with the retro CSS tokens (`--bp-ink`, `--bp-card`, `--bp-accent`, `retroButtonClassName`, `retroPanelClassName`) to match the main app design system. Drop the `gray-900` / `amber-400` Tailwind literals.
- [ ] Unified `/admin/` dashboard index with sections: **Dashboard** (stats), **Events**, **Fighters**, **Results**, **Tickets** (added in the previous branch), **Feedback** (alias for user_feedback filter on Tickets).
- [ ] Sidebar navigation inside admin layout — sticky left panel on desktop, sheet on mobile.
- [ ] AccountDropdown admin link flips from `/fighters/manage` to `/admin` (just swap the href — gated still by `isAdmin`).
- [ ] Delete the old `/[locale]/(main)/fighters/manage` route once parity is confirmed.
- [ ] Update any `admin_users` RLS policies / middleware checks to continue gating the `/admin/*` tree — verify `requireAdminPage()` / `/api/admin/*` auth middleware still covers everything after the move.
- [ ] i18n: admin UI stays English-only (intentional — Sean is the only admin, no value in localizing). Add a note in the admin layout header: "Admin UI is intentionally English-only".

---

## Phase 3 — Email infra

_Goal: unblock every "send an email" task (Supabase auth emails, launch notifications, feedback confirmations) with a zero-operating-cost stack. Docs first so Sean can execute the DNS/provider setup in parallel with other work._

### Branch: `docs/email-setup`
- [ ] New `Docs/email-setup.md` with step-by-step:
  - Stack decision: **Cloudflare Email Routing** (receive, free) + **Resend** (send, 3000/mo free)
  - Alternative comparison table (SendGrid, Postmark, AWS SES) — why Resend wins for this scale
  - DNS record list (copy-paste values Sean enters into Cloudflare dashboard): SPF TXT, DKIM CNAME ×3, DMARC TXT, MX ×2
  - Step-by-step: domain → Cloudflare nameservers → enable Email Routing → create `admin@`, `support@`, `noreply@` → Resend sign-up → domain verify → Supabase Custom SMTP switch-over
  - Smoke test: send one email through Resend to verify deliverability (check Gmail, Naver, Daum inbox not spam)
  - Monthly cost: $0 (domain excluded)

### Branch: `feature/supabase-email-templates` (lite review — HTML templates only)
- [ ] `supabase/email-templates/` folder with 4 BlackPick-branded HTML files:
  - `confirm_signup.html`
  - `reset_password.html`
  - `magic_link.html`
  - `invite.html`
- [ ] Use inline CSS only (email client support), black background + gold accent matching the app theme, Pretendard fallback stack.
- [ ] Doc in `Docs/email-setup.md`: "how to paste these into Supabase Dashboard → Authentication → Email Templates" (manual step, Supabase API doesn't expose templates).

---

## Phase 4 — Auth, comments, MVP timer

_Goal: close the remaining feature gaps before launch. Facebook OAuth was already scoped, comment edit/delete is a UX necessity, MVP timer replaces Sean's manual workflow._

### Branch: `docs/facebook-oauth-setup`
- [ ] New `Docs/facebook-oauth-setup.md` with Meta App creation, App Review lite requirements, redirect URIs for dev + prod, Supabase provider setup — Sean runs these steps.

### Branch: `feature/facebook-oauth-wire-in` (blackpick review — after Sean completes the doc steps)
- [ ] Flip `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true` in Vercel prod env.
- [ ] `SocialAuthButtons` already has the Facebook variant gated — just verify after the flag flip.
- [ ] Smoke test from each locale.

### Branch: `db/fighter-comments-edit-delete` + `feature/comment-edit-delete` (max review for migration)
- [ ] Migration: `fighter_comments.edited_at timestamptz nullable`, `deleted_at timestamptz nullable`, `deleted_by uuid nullable references users(id)`.
- [ ] Keep `body` column but add `deleted_body text nullable` — when deleting, copy body into deleted_body so admins can still see it, then null the body.
- [ ] UI: edit button on own comments, "edited" badge if `edited_at is not null`.
- [ ] Delete renders in the same position as "[Deleted by {ring_name}]" so the thread structure is preserved (parent_id chain intact).
- [ ] PUT / DELETE endpoints on `/api/fighter-comments/{id}` — owner or admin only.

### Branch: `db/mvp-voting-timer` + `feature/mvp-timer-admin` (max review)
- [ ] Migration: `events.mvp_voting_opens_at timestamptz nullable`, `fights.result_pending boolean not null default false`.
- [ ] MVP vote insert CHECK constraint: `fight.status = 'completed'` **AND** (`mvp_voting_opens_at is not null AND now() >= mvp_voting_opens_at`).
- [ ] **Primary mechanism**: admin "Open MVP Voting" button on `/admin/events/{id}` — sets `mvp_voting_opens_at = now()`. Sean uses this when official results come in.
- [ ] **Fallback mechanism**: on any page load checking MVP status, if `mvp_voting_opens_at is null AND now() >= event.date + 8h`, lazily set `mvp_voting_opens_at = event.date + 8h`. No cron needed. 8h is a sane default for "Sean forgot".
- [ ] UI: while `mvp_voting_opens_at is null`, show "결과 집계 중 — MVP 투표는 곧 열립니다" banner with target time.
- [ ] Once opened, show the MVP voting UI as before.

---

## Phase 5 — i18n comprehensive tone review

_Goal: the "proper" pass Sean wanted. Comes last because it benefits from all the copy in the other phases being finalized first. This is the final gate before launch._

### Branch: `i18n/comprehensive-tone-review` (max review by locale)
- [ ] Audit all 7 locales (en, ko, ja, zh-CN, mn, es, pt-BR) key-by-key against the English canonical.
- [ ] Each locale gets a native-voice review pass. Criteria:
  - Natural phrasing, not Google Translate output
  - BlackPick tone: retro boxing, short + punchy, no corporate softeners
  - Technical accuracy (e.g. "knockout" translated consistently)
  - Length parity — no strings 3x longer than English (breaks mobile layouts)
- [ ] Use DeepL as first pass, then max-profile codex review per locale for tone, then I patch and commit.
- [ ] **pt-BR gets priority attention** per GPT review (Brazil is the likely early-growth market).
- [ ] Cross-check: no hardcoded Korean leaks (Phase 1 already fixed the bugs, this double-checks).

---

## Phase 6 — LAUNCH GATE

_Goal: ship what we have. Do not add features here. Only polish bugs found in launch-eve verification._

- [ ] Full end-to-end smoke on dev: every DevPanel state, OAuth via Google + Facebook, feedback submission, email receipt test.
- [ ] `develop → main` PR, bundle all Phase 1-5 work.
- [ ] `npm run deploy` (requires `vercel login` refreshed per the launch-nice-to-have list).
- [ ] Post-deploy prod smoke via `npm run smoke:prod`.
- [ ] Soft launch: announce to the first wave of Korean users via existing channels (Sean's pick — Kakao open chat, small Discord, etc).
- [ ] Monitor `/admin/tickets` + Sentry for first 48h. Fix P0/P1 immediately on fix branches.

---

## Phase 7 — Post-launch automation

_Goal: add the cron / anomaly / clustering / hot-fight features that only make sense with real user data. **Do not touch until Phase 6 has real users for at least a week.**_

### Branch: `feature/crawler-automation` + `docs/crawler-stability`
- [ ] Document current crawler (`src/scripts/crawler*.ts`, `scripts/sync-bc-event-card.ts`) — every code path, every side effect, every edge case (fight rename, fighter swap, cancel, add).
- [ ] Anchor crawler on BC source fight ID — never reshuffle by position.
- [ ] `status` transitions tracked in new `fight_state_events` table for audit.
- [ ] GitHub Actions cron `*/30 * * * *` (NOT `*/10` per GPT review) → `/api/cron/fight-state-sync` → compares crawler output to DB → writes events + triggers live-transition notifications.

### Branch: `feature/live-transition-notifications`
- [ ] On `upcoming → live` transition detected by the cron, insert a row in `fight_state_events` and fire:
  - Client toast via realtime subscribe (users currently on the event page)
  - Email to opted-in subscribers via Resend (`user_notification_prefs.live_start_email = true`)
- [ ] New `user_notification_prefs` table: `user_id`, `live_start_email`, `mvp_open_email`, `result_email`.

### Branch: `feature/mvp-open-email-notifications`
- [ ] When `mvp_voting_opens_at` flips from null → not null (admin or lazy fallback), fire email to `mvp_open_email=true` subscribers.

### Branch: `feature/analytics-anomaly-detection`
- [ ] Nightly cron inspects `user_events` table for anomalies:
  - `abandon_rate > 40%` on signup gate modal
  - `prediction_save_error_rate > 5%`
  - Day-over-day DAU drop > 20%
- [ ] Each anomaly → insert into `feedback_tickets` with `source='analytics_anomaly'`, `priority='p1'`, metadata contains the metric name + value + threshold.
- [ ] Auto-mirror to GH issues as usual.

### Branch: `feature/feedback-clustering`
- [ ] Nightly job groups open `user_feedback` tickets by `cluster_key` (simple substring match on title first, upgrade to embedding similarity if needed).
- [ ] Clusters with ≥5 members get collapsed into a parent ticket; child tickets get `metadata.parent_cluster_id`.
- [ ] Admin dashboard shows clusters as primary view.

### Branch: `feature/hot-fight-detection`
- [ ] Track prediction save rate per fight in a rolling 1h window.
- [ ] Fights with sudden surges (>3x the average of other fights on the same card) get flagged in DB (`fights.is_hot boolean`).
- [ ] UI: `🔥 Hot` badge in the fight list.

---

## Backlog / Idea Pool

_No phase assigned — pull when a related area is already being touched._

- [ ] Share page enumeration opt-out — `users.is_public` flag, gate `loadSharePageData`
- [ ] Notification store snapshot dedupe (`use-notifications.ts`)
- [ ] Timezone storage event filter with `oldValue === newValue` short-circuit
- [ ] Storybook stories for `useIsMounted`, `useClockTick`, notification store
- [ ] CODEOWNERS + branch protection on main
- [ ] Replace the GitHub Actions `push-to-main` deploy with a manual approval gate (Vercel Deployment Protection)
- [ ] Refresh local Vercel CLI auth (`vercel login`) so `npm run deploy` works locally
- [ ] Upgrade Vercel CLI (`npm i -g vercel@latest`, currently 50.42.0 → 50.44.0)
- [ ] Agent-skills plugin install (slash command, Sean runs)
- [ ] Supabase migration history sync (cosmetic — missing rows for 202604090001/2/3)
- [ ] OG image asset `public/og/default.png` (1200x630) still missing
- [ ] Sentry production DSN
- [ ] Phase 2 test infrastructure (BlackPick_Test Supabase project, real DB integration tests, lefthook pre-commit, coverage measurement)
- [ ] Phase 3 test infrastructure (route handler unit tests, Playwright OAuth stub, coverage thresholds, BC scraper isolation)

---

## Process notes (do not delete — they anchor the workflow)

- **Review gate**: every commit/PR goes through `scripts/codex-review.sh`. Profile table + escalation rules live in `Docs/codex-review.md`. **Never** call the OpenAI API directly for reviews. If Codex CLI is blocked on a given day, **pause code changes** and ask Sean; do not silently ship code without a second-opinion pass. Docs-only changes (TASKS.md, wiki, design docs) are the only exception — self-review is fine.
- **Session-end ritual**: before wrapping any BlackPick session, update `CURRENT_STATE.md` + create a new `Wiki_Sean/BlackPick/<YYYY-MM-DD>-<slug>.md` + commit as `chore(docs):`. Sweep this file for items that landed so the manifest stays current.
- **Lead engineer mode**: make best-practice decisions autonomously. Don't present 2-3 option menus on every step. Warn before destructive operations (force-push, drop table, etc).
- **Branch discipline**: every phase task = new branch following the naming convention (`feature/`, `fix/`, `refactor/`, `db/`, `a11y/`, `i18n/`, `chore/`, `dev-ui/`). One PR per branch against `develop`. No stacking.
- **Phase gates**: finish a phase completely before starting the next. Parallel work within a phase is fine across independent branches, but a branch in Phase N never depends on a branch in Phase N+1.
- **GPT plan review incorporated**: this manifest is the output of Sean + Claude + an external GPT plan review on 2026-04-12. See `Wiki_Sean/BlackPick/2026-04-12-plan-review-and-reconcile.md` for the reasoning behind the phase order, scoped-down items, and deferred features.
