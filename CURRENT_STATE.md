# BlackPick — Current State

_Snapshot only. Durable roadmap lives in [`TASKS.md`](TASKS.md). Per-branch narrative lives in `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/`. Commit history: `git log`._

_Last refreshed: 2026-04-17 session 2 (admin-consolidation 6/6 complete, awaiting review-gate + PR)._

## Branch
`develop` tip `1c11e30` — cleanup commit (`5f7ad41`) + Codex branch registration (`22297cf`) + parallel-queue split (`1c11e30`) shipped 2026-04-17. PR #28 `feature/streak-ux` squash-merged as `8ad4ac7` on 2026-04-14. Phase 1 = 9/9; only Branch 9 `fix/verify-all-predicted-toast` remaining (verification-only, Sean runs via DevPanel).

### Two agents active — parallel, non-overlapping file sets
- **Codex CLI** owns uncommitted worktree on branch `db/codex-integrity-atomicity` (11 items: 6 shipped 2026-04-17 session 1; in session 2 Codex expanded WIP with 3 more migrations — `202604170002_comment_likes.sql`, `202604170003_user_events_api_only.sql` + edits to `fighter-avatar/ref/[id]`, `analytics/event`, `events/[id]/stats`, `MvpVoteSection.tsx`, `scripts/check-schema-drift.mjs`, `scripts/ops/verify-remote-schema.mjs`). **Token-blocked as of 2026-04-17.** All three migrations unapplied to DEV/PROD.
- **Claude Code** shipped `feature/admin-surface-consolidation` 6/6 slices — tip `8a3417e`. UI-only scope, zero overlap with Codex file set. Awaiting `second-opinion-reviewer` gate → PR against develop.
- Coordination protocol + hands-off file list in [TASKS.md §Parallel-agent discipline](TASKS.md#parallel-agent-discipline).
- **⚠ Known incident this session**: main worktree's `HEAD` silently reverted from `feature/admin-surface-consolidation` → `db/codex-integrity-atomicity` at least once during Claude's Slice 2 commit (reflog line `HEAD@{1}: checkout: moving from feature/admin-surface-consolidation to db/codex-integrity-atomicity`). No custom hooks in `.git/hooks/`. Most likely cause: background Codex CLI process touching the same worktree. **Mitigation adopted**: every `git commit` now chains `git branch --show-current` guard. Future sessions should either use a separate `git worktree add` for Claude's branch, or pause Codex CLI daemons before starting Claude work.

## Production
- **URL**: https://blackpick.io
- **main tip**: `20ffbd6` (bp-logo-email.png cherry-pick, 2026-04-13). Prior baseline `5b51afc` bundled PRs #3–#11.
- **Develop → main release pending**: PRs #17–#28 (Phase 1) + PR #25 (Phase 3 partial) bundle at Phase 6 launch gate.
- **Scoring v3**: applied on DEV (`202604140001_scoring_v3_winner_only_2pts.sql`, winner-only returns 2). PROD still on v2; applied with Phase 6 bundle.
- **PROD migration `202604130001`**: applied (14 cols × 0 NULLs on `fights`). `check:schema-drift` clean on DEV + PROD.
- **Email assets on PROD**: `/email/{bp-logo-email.png, icon-shield, icon-key}` → all 200.
- **Supabase email templates**: saved in dashboard for `confirm_signup` + `reset_password`. **Sean TODO**: Send Test Email + validate rendering in Gmail / iOS Mail / Outlook.

## Schema (PROD)

| Table | Cols | Notes |
|---|---|---|
| `users` | 11 | index `users_ring_name_lower_unique` on `lower(ring_name)` |
| `admin_users` | 2 | |
| `events` | 9 | |
| `fights` | 14 | `is_title_fight` + `is_main_card` both `BOOLEAN NOT NULL DEFAULT false` |
| `predictions` | 12 | |
| `fighters` | 10 | |
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
| vitest (unit + component) | 11 | 166 | ~1.3s |
| schema drift (`scripts/check-schema-drift.mjs`) | — | 7 tables | ~2s |
| i18n integrity (`scripts/check-i18n-keys.mjs`) | — | 7 locales × 372 keys | <1s |
| prod smoke (`scripts/smoke-prod.mjs`) | — | 13 checks | ~5s |

`npm run test:fast` 166/166 · `npm run predeploy` (i18n + drift + tests + build) · `npm run deploy` = predeploy + `vercel --prod` + smoke (requires fresh `vercel login`; currently stale — use GitHub Actions push-to-main instead).

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
