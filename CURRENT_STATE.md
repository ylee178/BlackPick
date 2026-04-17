# BlackPick — Current State

_Snapshot only. Durable roadmap lives in [`TASKS.md`](TASKS.md). Per-branch narrative lives in `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/`. Commit history: `git log`._

_Last refreshed: 2026-04-17 session 4 — PR #37 (scorecard UI, PR B) merged and also unbroke develop CI that had been red since PRs #34/#35/#36 due to a pre-existing `winnerSourceId` tsc error in `bc-scorecards.test.ts`. Scorecard feature fully live on develop (PR A plumbing + PR B UI)._

## Branch
`develop` tip `c59fdb5` (PR #37 squash-merge) — PR B wires the BC judges' scorecard into `FightCard` on home / event detail / fight detail for completed Decision fights. Develop CI back to green (Verify build health + lint + typecheck + unit + component + i18n both pass).

### Solo-agent era
Codex CLI branch `db/codex-integrity-atomicity` landed as PR #30. No active parallel Codex work. Codex CLI remains on call for **Tier C cross-family review** per the discipline memory (`feedback_review_tier_discipline.md`) but isn't owning files.

- **⚠ Known incident log (2026-04-17)**: main worktree's `HEAD` silently reverted from `feature/admin-surface-consolidation` → `db/codex-integrity-atomicity` three times mid-session (confirmed via git reflog). No custom hooks in `.git/hooks/` — cause was the background Codex CLI daemon competing for the main worktree's `HEAD`. **Mitigation adopted**: every `git commit` chains a `git branch --show-current` guard. Now that Codex daemon isn't running (integrity branch merged), this is dormant — but future parallel-agent sessions should either use `git worktree add` or pause the Codex daemon first.

## Production
- **URL**: https://blackpick.io
- **main tip**: `20ffbd6` (bp-logo-email.png cherry-pick, 2026-04-13). Prior baseline `5b51afc` bundled PRs #3–#11.
- **Develop → main release pending**: PRs #17–#37 (Phase 1 + 2 + admin + Codex + event-state + pre-Exodus + hotfix + crawler + scorecard plumbing + scorecard UI) bundle at Phase 6 launch gate.
- **Scoring v3**: applied on DEV. PROD still on v2; applied with Phase 6 bundle.
- **Integrity/atomicity bundle**: `202604170001` + `170002` + `170003` applied on DEV + PROD. `check:schema-drift` clean on DEV + PROD, `verify-remote-schema` OK, and `npm run predeploy` passes with `SUPABASE_ACCESS_TOKEN` present.
- **Email assets on PROD**: `/email/{bp-logo-email.png, icon-shield, icon-key}` → all 200.
- **Supabase email templates**: saved in dashboard for `confirm_signup` + `reset_password`. **Sean TODO**: Send Test Email + validate rendering in Gmail / iOS Mail / Outlook.
- **Pre-Exodus hide**: `EXODUS_ANCHOR_DATE = '2026-01-31'` — events dated earlier hidden from home featured / event lists / ranking By-Event / DevPanel picker. Direct URLs + my-record + dashboard + fighter records + share pages unaffected (data integrity preserved).

## Schema (PROD)

| Table | Cols | Notes |
|---|---|---|
| `users` | 11 | index `users_ring_name_lower_unique` on `lower(ring_name)` |
| `admin_users` | 2 | |
| `events` | 10 | includes `completed_at` (MVP window anchor) |
| `fights` | 14 | `is_title_fight` + `is_main_card` both `BOOLEAN NOT NULL DEFAULT false` |
| `predictions` | 12 | |
| `fighters` | 10 | |
| `comment_likes` | 3 | PK `(comment_id, user_id)` present on DEV + PROD |
| `fighter_comments` | 6 | |

## OAuth Clients

| Env | Google Client ID prefix | Supabase project |
|---|---|---|
| DEV | `312732011458-6dd753flhh...` | `lqyzivuxznybmlnlexmq` |
| PROD | `312732011458-ju6m9oe4s2b...` | `nxjwthpydynoecrvggih` |

Redirect URI pattern: `https://<project>.supabase.co/auth/v1/callback`.

## Test surface

| Layer | Files | Cases | Runtime |
|---|---|---|---|
| vitest (unit + component) | 16 | 247 | ~1.5s |
| schema drift (`scripts/check-schema-drift.mjs`) | — | 14 tables | ~2s |
| i18n integrity (`scripts/check-i18n-keys.mjs`) | — | 7 locales × 378 keys | <1s |
| prod smoke (`scripts/smoke-prod.mjs`) | — | 13 checks | ~5s |

`npm run test:fast` 247/247 · `SUPABASE_ACCESS_TOKEN=... npm run predeploy` (i18n + drift + tests + build) · `npm run deploy` = predeploy + `vercel --prod` + smoke (requires fresh `vercel login`; currently stale — use GitHub Actions push-to-main instead).

### New surfaces added session 3 + 4
- `src/lib/event-ui-state.ts` — single-source event facts + thin UI derivations (PR #31, 39 tests)
- `src/lib/event-visibility.ts` — `EXODUS_ANCHOR_DATE` gating (PR #32, 10 tests)
- `src/lib/bc-official.ts` — scorecard parser + cached fetch (PR #35, 11 tests)
- `src/lib/bc-scorecards.ts` — strict matcher + resolver (PR #35, 12 tests)
- `src/components/FightScoreCard.tsx` — 5-col judge-as-row server component (PR #37, 6 state-matrix tests)
- `src/scripts/sync-bc-event-results.ts` — winner-staging script (PR #34). Usage: `npm run sync:bc-results [-- --apply] [-- --event-id=<uuid>]`.
- i18n: new `scorecard.{title,judge,total,roundLabel,overtime}` keys × 7 locales (373 → 378 per PR #37).

## Dev tools
DevPanel (우하단 톱니, dev-only):
- Seed presets: Full Data / Complete / Empty
- Scenario presets: firstVisit / picksComplete / live / completed
- Timer presets: 30s / 5min / 1h / 3h / 1d
- Sandbox: capture-snapshot / restore-snapshot (auto-captured on event pick)
- Replays: onboarding, streak toast, all-predicted toast
- State: event status, user streak (current + best), ring name, content flags, `?dev_event={id}` override

## Fighter images
- 84 pixel-art portraits in `public/fighters/pixel/` (background `#2A2A2A`)
- 31 head-cut images — list in `Wiki_Sean/BlackPick/2026-04-08-session.md`
