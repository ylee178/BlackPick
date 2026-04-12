# BlackPick — Current State (2026-04-12, Hooks Migration + ring_name index + a11y)

## Branch
`develop` (all session work merged)

## Latest Commits (this session, on top of the prediction-flow PRs)
- `b326f32` merge: record main as ancestor of develop without absorbing its tree
- `e4937da` a11y(signup-gate): full Tab focus trap + codex-review wrapper hardening (#11)
- `ee1c377` db(users): case-insensitive unique on ring_name + escape ILIKE wildcards (#10)
- `5ed2710` refactor(hooks): migrate setState-in-effect to useSyncExternalStore stores (#9)
- `7199bd6` chore(docs): session wrap 2026-04-12 — prediction flow UX + share layer (#8)
- `f8db5ad` feat(share): public shareable predictions page + multi-channel share menu (#7)
- `88cfa01` feat(predictions): one-shot toast when all pickable fights are predicted (#6)
- `5ec5047` feat(auth): signup gate modal on first fighter click for anonymous viewers (#5)
- `c4e2b1b` feat(predictions): live opponent swap with per-fighter draft memory (#3)
- `3f726ca` chore(lint): fix pre-existing eslint errors blocking PR CI (#4)

## Production
- **URL**: https://blackpick.io
- **Latest production deploy**: PR #12 (`release: prediction flow UX + share layer + hooks migration + a11y`) — `develop → main` bundling all of the above plus the prior carryover, deployed via the GitHub Actions workflow on push to `main`. Two stale main-only commits (#1, #2 from 2026-04-09) were absorbed into develop via a `merge -s ours` so the parent chain reconnects without resurrecting dead code (NotFoundKof.tsx and friends) that develop intentionally removed in PR #4.

---

## Completed (this session — 2026-04-12 second pass)

### #9 — `react-hooks/set-state-in-effect` migration

Killed every flagged use of the legacy `useState(mounted) + useEffect(setMounted(true))` hydration pattern across 7 components (5 from CURRENT_STATE plus `CountdownTimer` and `LanguagePicker`).

- New `src/lib/use-sync-store.ts`: `useIsMounted()` (zero-cost SSR guard) + `useClockTick()` (single shared 1Hz wall-clock store; multiple countdown components now share one interval).
- New `src/lib/use-notifications.ts`: module-level notification poller with subscribe-counted lifecycle. `NotificationBell` no longer touches `useEffect` for data fetching.
- `src/lib/use-timezone.ts` rewritten as a real `useSyncExternalStore` with cached snapshot identity, in-memory `sessionOverride` for private-browsing fallback, and a `storage`-event handler that filters by key and clears the override so cross-tab writes win.
- `FlipCard` switches to the "adjusting state during render" pattern with a `flipId` discriminator so the 600ms reset timer restarts on every value change even mid-flip.
- `LanguagePicker` first-visit hint is rendered from state and persisted in the timeout effect (no `localStorage.setItem` in render under Strict Mode).
- `eslint.config.mjs` override removed; `react-hooks/set-state-in-effect` is now enforced globally.
- 84/84 unit tests still passing. Build clean.

### #10 — `users.ring_name` case-insensitive unique index + ILIKE escape

- New `supabase/migrations/202604120001_ring_name_case_insensitive_unique.sql` with a pre-flight DO block that aborts loudly on duplicates and `CREATE UNIQUE INDEX IF NOT EXISTS users_ring_name_lower_unique ON users (lower(ring_name))`.
- Verified 0 duplicates in DEV and PROD via the management API; applied to both. Collision test confirmed (`UPDATE blackPicker → blackPicker` → 23505).
- New `escapeIlikePattern()` helper in `lib/ring-name.ts`. Both `share/p/[username]/[eventShortId]/page.tsx` and `api/profile/ring-name/route.ts` now escape `\`/`%`/`_` before passing input to `.ilike("ring_name", ...)`. `_` is a valid ring-name character *and* a single-char ILIKE wildcard — without the escape `/p/a_b/...` silently matched "acb"/"a1b"/etc.
- Route handler 23505 → `ring_name_taken` mapping was already in place; the index makes it a defense-in-depth backstop for races between concurrent INSERTs.

### #11 — `SignupGateModal` Tab focus trap

Lifted the ShareMenu focus trap pattern verbatim:
- `dialogRef` on the inner panel.
- `getFocusable()` recomputed per Tab keystroke.
- Tab cycles forward, Shift+Tab cycles backward.
- Escape, focus restore, portal-in-`document.body` — unchanged.

### Codex CLI cutover (#9 + #10 + #11)

Replaces all direct OpenAI API calls for review gates with the Codex CLI (`@openai/codex` v0.120.0).

- Profile config in `~/.codex/config.toml`: `[profiles.blackpick]` (high), `[profiles.blackpick_lite]` (medium), `[profiles.blackpick_max]` (xhigh) — same pattern as the SETS_Stock / SETS_Crypto projects.
- New `scripts/codex-review.sh` wrapper. Diff-review mode (`review`) and free-form prompt mode (stdin → `codex exec -`). Inlines model + reasoning effort per profile because `codex review` doesn't accept `--profile`. Hardened through 6+ codex max review iterations to handle: empty stdout vs stderr noise, profile aliases at any position, value-taking flag list, `set -u`-safe array expansion, ARG_MAX-safe stdin prompt for large free-form payloads.
- New `Docs/codex-review.md` with the full profile table, escalation rules, and failure modes. CLAUDE.md just imports it via a one-line pointer (per Sean's preference for keeping CLAUDE.md thin).
- Memory file `feedback_gpt_review_workflow.md` rewritten to mandate Codex CLI for reviews; OpenAI API direct calls are now forbidden for review purposes.

### Workflow discipline (carried + reinforced)

- Three independent PRs (#9, #10, #11), each with its own codex review pass.
- Each PR rebased onto the latest `develop` after the previous one merged so the wrapper script changes never collided in the bundled history.
- `merge -s ours` on `develop` reconnects the divergent main parent chain (PR #1 / #2 from 2026-04-09 were never merged back) without resurrecting dead code.
- Bundled `develop → main` PR (#12) carries everything to prod via the GitHub Actions workflow on push to `main`.

---

## Remaining Tasks (carried over from prior sessions)

### Launch blockers (unchanged)
| # | Task | Status |
|---|------|--------|
| 1 | Facebook OAuth setup (Meta console + Supabase wire-in) | **Pending** — Google pattern verified, same template applies |
| 2 | Manual e2e of Google OAuth from multiple locales | **Partial** — Sean confirmed login + ring-name save |

### Launch nice-to-have
| # | Task | Notes |
|---|------|-------|
| 3 | Supabase migration history sync | PROD schema is correct but migration tracking table doesn't have 202604090001/2/3 records. Cosmetic — `IF NOT EXISTS` guards make re-running safe. |
| 4 | OG image | `public/og/default.png` (1200x630) still missing |
| 5 | Sentry production DSN | Package installed, config ready, DSN env var needs value |
| 6 | Agent-skills plugin install | `/plugin marketplace add addyosmani/agent-skills` + `/plugin install agent-skills@addy-agent-skills` — slash command, Sean runs at next session start |

### Phase 2 test infrastructure (not started)
- BlackPick_Test new Supabase project (~5 min create)
- Real DB integration test for ring-name route (covers Bug 3 class directly)
- Test data factories with `@faker-js/faker`
- `supabase gen types` automation + diff against committed `database.ts`
- Direct middleware/proxy.ts unit tests
- lefthook pre-commit hook
- Coverage measurement (no thresholds yet)

### Phase 3 test infrastructure (later)
- Route handler unit tests for auth/admin critical paths
- Playwright OAuth stub flow (no real Google in CI)
- Coverage thresholds for `src/lib/auth/**`
- BC scraper isolation test (mock fetch)

---

## Recommended Next Steps

```
1. Facebook OAuth (Meta console + Supabase wire-in)
2. Sentry DSN + OG image
3. Agent-skills plugin install (Sean runs the slash command)
4. Phase 2 test infrastructure — start with the BlackPick_Test Supabase project
5. Refresh local Vercel CLI auth — `vercel login` — so future sessions can use `npm run deploy` directly without depending on the GitHub Actions main-push workflow
```

---

## Schema (PROD)

| Table | Columns | Notes |
|---|---|---|
| `users` | 11 (id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, created_at, p4p_score, preferred_language) | New index `users_ring_name_lower_unique` on `lower(ring_name)` (this session) |
| `admin_users` | 2 (user_id, created_at) | no changes |
| `events` | 9 | no changes |
| `fights` | 12 | no changes |
| `predictions` | 12 | no changes |
| `fighters` | 10 | no changes |
| `fighter_comments` | 6 | no changes |

Drift: none (`npm run check:schema-drift` clean).

## OAuth Clients (unchanged)

| Environment | Google Client ID prefix | Supabase project | Redirect URI |
|---|---|---|---|
| DEV | `312732011458-6dd753flhh...` | `lqyzivuxznybmlnlexmq` | `https://lqyzivuxznybmlnlexmq.supabase.co/auth/v1/callback` |
| PROD | `312732011458-ju6m9oe4s2b...` | `nxjwthpydynoecrvggih` | `https://nxjwthpydynoecrvggih.supabase.co/auth/v1/callback` |

## Test Surface

| Layer | Files | Cases | Runtime |
|---|---|---|---|
| Unit + component (vitest) | 9 | 84 | ~1.3s |
| Schema drift script | `scripts/check-schema-drift.mjs` | 7 tables | ~2s |
| i18n integrity script | `scripts/check-i18n-keys.mjs` | 7 locales (339 keys each) | <1s |
| Prod smoke script | `scripts/smoke-prod.mjs` | 13 checks | ~5s |

`npm run test:fast` — 84/84 passing
`npm run predeploy` — i18n + schema-drift + tests + build
`npm run deploy` — predeploy + `vercel --prod` + smoke (note: requires `vercel login` — currently stale; use the GitHub Actions deploy on push to `main` instead)

---

## Review gate

**Codex CLI is the only second-opinion reviewer for this project** (replaces direct OpenAI API calls as of this session). Use `scripts/codex-review.sh`. Profile selection rules and escalation table live in `Docs/codex-review.md`. CLAUDE.md just imports it.

| Profile          | Model           | Effort | Use for                                                                              |
|------------------|-----------------|--------|--------------------------------------------------------------------------------------|
| `blackpick_lite` | `gpt-5.4-mini`  | medium | lint cleanup, single-file CSS/copy tweaks, isolated component fixes                 |
| `blackpick`      | `gpt-5.4`       | high   | feature PRs, hook/store refactors, multi-file UI changes (default)                  |
| `blackpick_max`  | `gpt-5.4`       | xhigh  | auth/RLS, Supabase migrations, money/score/streak math, share-page enumeration risk |

---

## Dev Tools Available

DevPanel (dev only, 우하단 톱니):
- **Full Data** — 시드 유저 10명, 이벤트 3개, 예측, 댓글, 랭킹 생성
- **Complete** — upcoming/live 경기 → completed (랜덤 승자)
- **Empty** — 시드 데이터 전부 삭제

## Fighter Images
- 84개 픽셀아트 in `public/fighters/pixel/`
- 배경: #2A2A2A
- 머리 잘린 이미지 31개 — 리스트는 `Wiki_Sean/BlackPick/2026-04-08-session.md`
