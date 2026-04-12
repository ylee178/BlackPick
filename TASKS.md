# BlackPick — Task Manifest

> **Purpose**: Living task list that survives session clears. Update freely — do not inline this content into `CLAUDE.md`. For the historical snapshot of what just shipped, see `CURRENT_STATE.md`. For session-by-session notes, see `Wiki_Sean/BlackPick/<date>-*.md`.

_Last updated: 2026-04-12_

---

## How to use this file

- Check boxes as things land (`[ ]` → `[x]`).
- Add new items under the right priority bucket as they come up.
- When a task ships, move it into `CURRENT_STATE.md`'s "Completed" section and remove the box here (or leave crossed out with a commit SHA if you want a breadcrumb).
- Dates go under each bucket so stale priorities are obvious.
- If a task has blockers or dependencies, note them inline — don't create ghost rows in another section.

---

## P0 — Launch blockers (must land before public launch)

_As of 2026-04-12_

- [ ] **Facebook OAuth** — Meta console app setup + Supabase provider wire-in. Google pattern verified, same template applies. Gated by `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN` env flag in the login page smoke assertion.
- [ ] **Manual OAuth e2e across locales** — Sean confirmed Google login + ring-name save work on en/ko. Still need to pass-through all 7 locales (en, ko, ja, zh-CN, mn, es, pt-BR) with a real browser to catch locale-specific redirect drift.

## P1 — Launch nice-to-have (polish before wide launch)

_As of 2026-04-12_

- [ ] **Sentry production DSN** — package installed, `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` ready, just need to set `NEXT_PUBLIC_SENTRY_DSN` in Vercel prod env and verify events flow.
- [ ] **OG image asset** — `public/og/default.png` (1200x630) still missing. Share page metadata falls back to the generated `/opengraph-image` route; the default asset is for non-share pages.
- [ ] **Supabase migration history sync** — PROD schema is correct but `supabase_migrations.schema_migrations` tracking table is missing records for `202604090001/2/3`. Cosmetic only; `IF NOT EXISTS` guards mean re-running the migrations is safe. Fix by inserting the missing rows directly or by replaying the migrations via `supabase db push` once we set that up.
- [ ] **Refresh local Vercel CLI auth** — `vercel whoami` is currently failing with "token not valid". Run `vercel login` at session start so `npm run deploy` works directly from the CLI. Current fallback is letting the GitHub Actions push-to-main workflow deploy.
- [ ] **Upgrade Vercel CLI** — globally outdated (`50.42.0 → 50.44.0`). `npm i -g vercel@latest`.
- [ ] **Agent-skills plugin install** — `/plugin marketplace add addyosmani/agent-skills` + `/plugin install agent-skills@addy-agent-skills`. Slash commands, Sean runs at next session start.

## P2 — Test infrastructure (Phase 2)

_As of 2026-04-12 — not started_

- [ ] Create a fresh `BlackPick_Test` Supabase project (~5 min) so tests can hit a real DB without polluting DEV.
- [ ] Real DB integration test for the ring-name route that exercises the new `users_ring_name_lower_unique` index + `escapeIlikePattern()` escape (covers Bug 3 class directly).
- [ ] Test data factories with `@faker-js/faker` for the 7 critical tables.
- [ ] `supabase gen types` automation + diff against the committed `database.ts` so schema drift fails CI, not a nightly script.
- [ ] Direct unit tests for `middleware/proxy.ts` (auth gate, redirect rules, locale normalization).
- [ ] lefthook pre-commit hook: `eslint --cache` + `tsc --noEmit` + `test:fast` + `check:i18n`. Fast enough to run on every commit.
- [ ] Coverage measurement on `test:fast` (no thresholds yet — just surface what's uncovered so we can set them later).

## P3 — Test infrastructure (Phase 3)

_As of 2026-04-12 — blocked by P2_

- [ ] Route handler unit tests for auth/admin critical paths: `api/auth/callback`, `api/profile/delete-account`, `api/profile/ring-name`, `api/profile/language`, admin bootstrap/lockdown routes.
- [ ] Playwright OAuth stub flow so we can exercise the login journey in CI without hitting real Google. Use the Supabase admin client to pre-create the session and bypass the OAuth redirect.
- [ ] Coverage thresholds for `src/lib/auth/**` (80%+ — the highest-risk surface).
- [ ] BC scraper isolation test suite (`scripts/crawler*.ts`) with mocked fetch so changes to the BellaCorp site don't break CI.

## Idea backlog (P4+)

_No deadline — pull when a related area is already being touched_

- [ ] Share page enumeration opt-out — add a `profile.is_public` flag on `users` and gate `loadSharePageData()` on it. Currently the share page is public-by-design; this would let users turn it off.
- [ ] Notification store: dedupe identical snapshots in `use-notifications.ts` so re-polls that return the same data don't trigger re-renders. Low priority — current behavior matches the pre-refactor version.
- [ ] Timezone storage event filter: also ignore storage events with `event.newValue === event.oldValue` to avoid redundant invalidations. Functionally fine today.
- [ ] Storybook stories for the new `useSyncExternalStore` helpers (`useIsMounted`, `useClockTick`) + the notification store.
- [ ] CODEOWNERS file + branch protection on `main` so nothing bypasses develop again.

---

## Process notes (do not delete — they anchor the workflow)

- **Review gate**: every commit/PR goes through `scripts/codex-review.sh`. Profile table + escalation rules live in `Docs/codex-review.md`. **Never** call the OpenAI API directly for reviews.
- **Session-end ritual**: before wrapping any BlackPick session, update `CURRENT_STATE.md` + create a new `Wiki_Sean/BlackPick/<YYYY-MM-DD>-<slug>.md` + commit as `chore(docs):`. Also sweep this file for items that landed so the manifest stays current.
- **Lead engineer mode**: make best-practice decisions autonomously. Don't present 2-3 option menus on every step. Warn before destructive operations (force-push, drop table, etc).
- **Act on merges to main via CI**: local `vercel --prod` is the intended path (via `npm run deploy`) but requires `vercel login`. The GitHub Actions workflow on push to `main` is the fallback.
