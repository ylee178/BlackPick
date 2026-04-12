# 2026-04-12 — Hooks migration, ring_name index, a11y, codex CLI cutover

## Session goal

Carry the 2026-04-12 prediction-flow PRs (#3 / #5 / #6 / #7) the rest of the way to prod by closing every "remaining" item from the previous session entry:

1. Manual click-through of the four merged feature PRs on dev.
2. `develop → main` PR + `npm run deploy` for the bundled session work.
3. Case-insensitive uniqueness on `users.ring_name`.
4. Migrate the 5 `setMounted-in-effect` components to `useSyncExternalStore` and re-enable `react-hooks/set-state-in-effect`.
5. Add a real focus trap to `SignupGateModal`.
6. Onboard the agent-skills plugin (deferred — slash command, user runs).

Net result: 3 individual PRs (#9, #10, #11) merged, ring_name migration applied to DEV + PROD, codex CLI cutover replacing all OpenAI-API-direct review calls, and the bundled `develop → main` release PR (#12) merged + deployed via `npm run deploy`. Final task #6 (agent-skills slash command) deferred.

## What shipped

### #9 — `react-hooks/set-state-in-effect` migration

5 components flagged in CURRENT_STATE plus 2 more (`CountdownTimer`, `LanguagePicker`) that the rule re-enable surfaced.

- New `src/lib/use-sync-store.ts` exports two helpers built on `useSyncExternalStore`:
  - `useIsMounted()` — false on SSR/first paint, true thereafter. Pure replacement for `useState(mounted) + useEffect(setMounted(true))`.
  - `useClockTick()` — shared 1Hz wall-clock store. Single `setInterval` shared across all subscribers; returns 0 on SSR (which doubles as the "not yet mounted" sentinel) and `Date.now()` thereafter.
- New `src/lib/use-notifications.ts` lifts `NotificationBell` polling out of effects entirely. Module-level store with subscribe-counted poller (start on first listener, stop on last unsubscribe). Optimistic-vs-await behavior preserved (await PATCH then commit).
- `src/lib/use-timezone.ts` rewritten as a real external store with:
  - `cachedSnapshot` for stable snapshot identity (React's useSyncExternalStore Object.is comparison).
  - In-memory `sessionOverride` so the user's selection survives even when `localStorage.setItem` is a no-op (private browsing). Codex caught this regression in iteration 1.
  - Storage-event handler that filters by `TIMEZONE_STORAGE_KEY` and clears `sessionOverride` so cross-tab writes win. Codex caught this regression in iteration 2.
- `FlipCard` switches from prop-sync via `useEffect` to the "adjusting state during render" pattern (stores `lastValue` in state, not in a ref, so `react-hooks/refs` is happy). Added a `flipId` discriminator so the 600ms reset timer restarts on every value change even mid-flip — Codex caught the timer-not-restarted regression on the very first review pass.
- `LanguagePicker` first-visit hint reads the flag during render (state-only) and writes the seen marker inside the timeout effect — Codex flagged the original "localStorage.setItem in render under Strict Mode" risk.
- `eslint.config.mjs` override is removed; `react-hooks/set-state-in-effect` is now enforced globally.
- 84/84 unit tests still passing.

### #10 — `users.ring_name` case-insensitive unique index

- New `supabase/migrations/202604120001_ring_name_case_insensitive_unique.sql` with:
  - Pre-flight DO block that aborts loudly if any existing rows would violate the new index. Picking a winner between two real ring names is a product call, not something to silently de-dup.
  - `CREATE UNIQUE INDEX IF NOT EXISTS users_ring_name_lower_unique ON public.users (lower(ring_name))`.
- Verified zero case-insensitive duplicates in DEV and PROD via the management API before applying.
- Applied to DEV first, then PROD (after PR merge). Collision test confirmed: `UPDATE blackPicker → blackPicker` rejected with 23505 as expected.
- Discovered (via codex max review) a separate latent bug: `_` is a valid ring_name character *and* an ILIKE single-char wildcard, so `share/page.tsx` and `api/profile/ring-name/route.ts` could both silently match wrong rows for any name containing `_`. Added `escapeIlikePattern()` helper in `lib/ring-name.ts` and threaded it through both call sites.
- Route handler 23505 → `ring_name_taken` mapping was already in place — this just makes the index a defense-in-depth backstop.

### #11 — `SignupGateModal` Tab focus trap

- Lifted ShareMenu's focus trap pattern verbatim into `SignupGateModal`:
  - `dialogRef` on the inner panel.
  - `getFocusable()` recomputed per Tab keystroke (because `SocialAuthButtons` and the `authError` paragraph can appear/disappear while the modal is open).
  - Tab cycles forward, Shift+Tab cycles backward.
  - Escape, focus restore, and the `ConfirmModal` portal pattern unchanged.
- Closes the a11y follow-up tracked in CURRENT_STATE.

### Codex CLI cutover (#9 + #10 + #11)

Replaces the prior pattern of calling `https://api.openai.com/v1/responses` directly with `OPENAI_API_KEY` for review gates. The user explicitly asked for this mid-session: "지피티 api 쓰지말고 codex cli로 교체해줘 리뷰받을때."

- Installed `@openai/codex` v0.120.0 globally.
- New project profiles in `~/.codex/config.toml`:
  - `[profiles.blackpick]` — `gpt-5.4` + `high` (default; feature PRs, hook refactors)
  - `[profiles.blackpick_lite]` — `gpt-5.4-mini` + `medium` (lint cleanup, single-file tweaks)
  - `[profiles.blackpick_max]` — `gpt-5.4` + `xhigh` (auth/RLS, supabase migrations, money math)
- New `scripts/codex-review.sh` wrapper. Two modes:
  - `review [lite|max] [--base|--commit|--uncommitted|--title|...]` — diff review against develop by default.
  - `echo "..." | scripts/codex-review.sh [lite|max]` — free-form prompt via stdin (uses `codex exec -` so 1 MiB ARG_MAX doesn't bite long pasted specs).
- New `Docs/codex-review.md` with the full profile table, escalation rules, failure modes. CLAUDE.md just imports it via a one-line pointer (per user preference: "클로드엠디에는 저 전체 코덱스 클리내용은 넣지말고 따로 문서 빼주고 참조하게해줘").
- Wrapper hardening went through 6 codex max review iterations:
  1. Replace `--profile` with `-c model=... -c model_reasoning_effort=...` because `codex review` doesn't accept `--profile`.
  2. Capture stdout-only so codex's startup PATH warning doesn't fool the empty-output guard.
  3. Inject `--base develop` even when only passthrough flags (e.g. `--title`) are present.
  4. Reject mistyped profile aliases instead of leaking them through as positional `[PROMPT]`.
  5. `set -u`-safe array expansion (`${arr[@]+"${arr[@]}"}` instead of `${arr[@]:-}`).
  6. Single-pass walker that recognizes profile aliases at any position in `$@`, distinguishes flag values from bare tokens, and rejects unknown bare tokens hard.
  7. Add `--config`/`--enable`/`--disable` to the value-taking flag list.
  8. Pipe free-form prompt via stdin (`codex exec -`) instead of expanding into argv.
- All 8 wrapper edge cases tested against a mock `CODEX_BIN`.

### Memory updated

- `feedback_gpt_review_workflow.md` rewritten: now mandates Codex CLI for review gates; OpenAI API direct calls forbidden for reviews. Other env keys (Gemini, remove.bg) still fine to call directly.

## Codex review iterations — what got caught

| PR | Iter | Severity | Issue |
|----|------|----------|-------|
| #9 | 1 (gpt-5-pro via OpenAI API, last call before cutover) | P1 | FlipCard timer not restarted mid-flip — added `flipId` discriminator |
| #9 | 1 | P1 | LanguagePicker `localStorage.setItem` in render — moved to effect |
| #9 | 1 | P2 | NotificationBell optimistic markAllRead changed behavior — reverted to await-PATCH-then-update |
| #9 | 2 (codex CLI default) | P2 | use-timezone session loss when localStorage blocked — added in-memory `sessionOverride` |
| #9 | 3 (codex CLI default) | P2 | use-timezone cross-tab sync broken once `sessionOverride` set — split storage handler clears the override |
| #10 | 1 (codex CLI max) | P2 | ILIKE `_` wildcard ambiguity in share + ring-name routes — `escapeIlikePattern()` helper |
| #10 | 1 | P2 | `codex-review.sh` review mode never checked empty output — captured stdout, exit 5 if empty |
| #11 | 1-3 (codex CLI default) | P2 each | Wrapper holes: empty `$@` under `set -u`, profile alias after flag, missing value-flags, ARG_MAX limit on free-form prompts |

Three codex review passes left zero blocking findings on each branch by the time it merged.

## Open follow-ups (none from this session)

The previous "Remaining Tasks" list is now closed except for items already documented as launch blockers / nice-to-haves carried from earlier sessions:

- Facebook OAuth (Meta console + Supabase wire-in)
- Sentry production DSN
- OG image asset
- Phase 2 / Phase 3 test infrastructure

Agent-skills plugin install (`/plugin marketplace add addyosmani/agent-skills` + `/plugin install agent-skills@addy-agent-skills`) is a slash command — user runs at next session start.

## Session schema impact

DEV + PROD both gained `users_ring_name_lower_unique`. No column changes.

| Index | Source | DEV | PROD |
|---|---|---|---|
| `users_ring_name_lower_unique` | `202604120001_ring_name_case_insensitive_unique.sql` | ✅ applied | ✅ applied |

Schema-drift script unchanged — it only diffs columns.
