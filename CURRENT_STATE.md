# BlackPick — Current State

_Snapshot only. Durable roadmap lives in [`TASKS.md`](TASKS.md). Per-branch narrative lives in `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/`. Commit history: `git log`._

_Last refreshed: 2026-04-17 (Codex integrity branch applied to DEV + PROD; predeploy green)._

## Branch
`develop` tip `1c11e30` — cleanup commit (`5f7ad41`) + Codex branch registration (`22297cf`) + parallel-queue split (`1c11e30`) shipped 2026-04-17. PR #28 `feature/streak-ux` squash-merged as `8ad4ac7` on 2026-04-14. Phase 1 = 9/9; only Branch 9 `fix/verify-all-predicted-toast` remaining (verification-only, Sean runs via DevPanel). Codex remediation branch `db/codex-integrity-atomicity` is approved/applied but not merged yet.

### Two agents active — parallel, non-overlapping file sets
- **Codex CLI** owns branch `db/codex-integrity-atomicity` (11/11 review findings folded, 3-round Claude review approved). Migrations `202604170001_integrity_atomicity.sql`, `202604170002_comment_likes.sql`, and `202604170003_user_events_api_only.sql` are applied to **DEV + PROD** and recorded in `supabase_migrations.schema_migrations`. Branch still needs final commit/PR merge.
- **Claude Code** active on `feature/admin-surface-consolidation` (Phase 2). UI-only scope, zero overlap with Codex file set.
- Coordination protocol + hands-off file list in [TASKS.md §Parallel-agent discipline](TASKS.md#parallel-agent-discipline).

## Production
- **URL**: https://blackpick.io
- **main tip**: `20ffbd6` (bp-logo-email.png cherry-pick, 2026-04-13). Prior baseline `5b51afc` bundled PRs #3–#11.
- **Develop → main release pending**: PRs #17–#28 (Phase 1) + PR #25 (Phase 3 partial) bundle at Phase 6 launch gate.
- **Scoring v3**: applied on DEV (`202604140001_scoring_v3_winner_only_2pts.sql`, winner-only returns 2). PROD still on v2; applied with Phase 6 bundle.
- **Integrity/atomicity bundle**: `202604170001` + `170002` + `170003` applied on DEV + PROD. `check:schema-drift` clean on DEV + PROD, `verify-remote-schema` OK, and `npm run predeploy` passes with `SUPABASE_ACCESS_TOKEN` present.
- **Email assets on PROD**: `/email/{bp-logo-email.png, icon-shield, icon-key}` → all 200.
- **Supabase email templates**: saved in dashboard for `confirm_signup` + `reset_password`. **Sean TODO**: Send Test Email + validate rendering in Gmail / iOS Mail / Outlook.

## Schema (PROD)

| Table | Cols | Notes |
|---|---|---|
| `users` | 11 | index `users_ring_name_lower_unique` on `lower(ring_name)` |
| `admin_users` | 2 | |
| `events` | 10 | includes `completed_at` |
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
| vitest (unit + component) | 11 | 168 | ~1.5s |
| schema drift (`scripts/check-schema-drift.mjs`) | — | 14 tables | ~2s |
| i18n integrity (`scripts/check-i18n-keys.mjs`) | — | 7 locales × 372 keys | <1s |
| prod smoke (`scripts/smoke-prod.mjs`) | — | 13 checks | ~5s |

`npm run test:fast` 168/168 · `SUPABASE_ACCESS_TOKEN=... npm run predeploy` (i18n + drift + tests + build) · `npm run deploy` = predeploy + `vercel --prod` + smoke (requires fresh `vercel login`; currently stale — use GitHub Actions push-to-main instead).

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
