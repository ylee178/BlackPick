# BlackPick — Task Manifest (durable, survives `/clear`)

> **WHY THIS FILE EXISTS**: Claude's in-session `TaskList` tool is volatile — `/clear` wipes it. This file is the canonical, git-tracked source of truth. At session start (or after `/clear`), Claude must read this file and restore context from it before touching any task.
>
> **OWNER**: Sean + Claude. Update on **every task transition** (create, start, complete, delete, defer) — immediately, not at session end. Ending a session with a stale manifest is a process failure.
>
> **Two-level model** — this file carries the **full durable roadmap** (all phases 0–7). The in-session `TaskList` tool only carries **actionable-this-session** items (the sub-tasks of the current branch). Loading the full roadmap into the tool drowns current work.

_Last updated: 2026-04-13 (end-of-session — PR #25 shipped Supabase email templates as an out-of-phase pivot; Phase 1 still 6/9; next up Branch 6 `fix/hardcoded-korean-leaks`)_

---

## Session start protocol (MANDATORY — run before any task work, including post-`/clear`)

1. **Read this file end-to-end.** You need the full phase map, not just the current item.
2. **Read `CURRENT_STATE.md`** — production snapshot. Flags schema state, branch status, launch blockers.
3. **Review gate** — primary path is the user-level `second-opinion-reviewer` subagent. Invoke via "Use the second-opinion-reviewer subagent to review <artifact>". Sonnet 4.6 default, Opus 4.6 escalation on low-confidence BLOCK. Usage guide: `/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`. Historical fallback (deprioritized for cost): `scripts/codex-review.sh` → `scripts/gpt-review.sh`, see [`Docs/codex-review.md`](Docs/codex-review.md).
4. **Read the latest wiki entry** in `Wiki_Sean/BlackPick/` — session-by-session decisions, context behind choices.
5. **Restore the TaskList tool** from §Current-focus actionable sub-tasks below via `TaskCreate` with stored `subject` / `description` / `activeForm`. Only restore the **current** branch's sub-tasks — not the full roadmap.
6. **Sanity check**: if `CURRENT_STATE.md` disagrees with this manifest (something marked done in one place, pending in the other), **flag to Sean**. Do not silently trust either side.
7. **Update this manifest immediately on every task transition** — not at session end. A trailing stale manifest is a process failure.

---

## Current focus

**Phase 1 — UX bugs + onboarding + streak**.

**Active branch**: none. **This session shipped PR #25 (`feature/supabase-email-templates`, commit `992fb9e`)** — an out-of-phase pivot that partially completes a Phase 3 branch. Original Phase 1 progress unchanged at 6/9. Next up is **Branch 6 (`fix/hardcoded-korean-leaks`)** as originally planned. PROD migration for `202604130001` still pending (Sean to run via Management API) — doesn't block Branch 6.

### Next session resume brief

1. **Start on develop**: `git checkout develop && git pull`. Verify `992fb9e feat(email): supabase auth templates...` is the tip or close to it.

2. **PROD migration still pending**: apply `supabase/migrations/202604130001_title_fight_and_main_card_flags.sql` to PROD via Management API if Sean hasn't already. Same flow as `202604120001_ring_name_case_insensitive_unique.sql`. Expected to apply idempotently. After: `check:schema-drift` clean on both DEV and PROD. Doesn't block Branch 6 UI work.

3. **Supabase email templates manual deploy (PR #25 follow-up)**: after the next preview deploy, Sean opens `https://<preview>.vercel.app/email/{bp-logo-email.png, icon-shield, icon-key}` and verifies all three return 200. Then Supabase Dashboard → Authentication → URL Configuration → confirm Site URL is `https://blackpick.io`, then Email Templates → paste `Docs/email-templates/confirm-signup.html` into **Confirm signup** slot and `reset-password.html` into **Reset password** slot. Use "Send test email" for at least one real-inbox render check. README has the full checklist.

4. **Branch 6 (`fix/hardcoded-korean-leaks`)** — this is the natural next target because PR #24 explicitly deferred the `MAIN EVENT` hardcoded-English chip to Branch 6's sweep, which now has a stronger motivator (Korean users see 2 i18n'd chips + 1 English chip side-by-side). Scope:
   - `grep -rn "[ㄱ-ㅎ가-힣]" src/components src/app --include="*.tsx" --include="*.ts"` — every match not in a comment or a `ko.json` key is a leak.
   - Also grep for hardcoded English caps-lock labels in tsx files (`"MAIN EVENT"`, `"VS"`, `"LIVE"`, etc.) that should be i18n keys.
   - Fix each by moving the string to `src/messages/*.json` and `t(key)`.
   - Bug class, not i18n improvement. Comprehensive tone review stays at Phase 5.

5. **Review gate**: blackpick profile (default). Use `second-opinion-reviewer` subagent.

6. **Remaining Phase 1 branches after Branch 6**: Branch 7 (`feature/onboarding-first-time-flow`), Branch 8 (`feature/streak-ux`), Branch 9 (`fix/verify-all-predicted-toast`). Target Phase 1 completion → Phase 2 (feedback widget + ticket system).

### Branch 5 Part 1 review trail (for future reference)

The migration went through an unusual 3-round review path. Documenting because the disagreement is load-bearing context for anyone touching this file later:

- **Round 1** (prior session, APPROVE_WITH_CHANGES 0.82): 1 [major] flagging header prose claim about atomicity + 1 [minor] missing post-convergence assertion + 1 [minor] dead prop (deferred to Part 2).
- **Round 2** (this session, on my first fix): subagent PUSHED BACK on my round-1 fix, arguing the round-1 [major] concern was itself a false positive — neither round could verify the Supabase CLI transaction-wrapping behavior without a live test. Both are shared-training assessments.
- **Resolution**: step back from the contested external-tool claim entirely. Final prose asserts only always-true Postgres atomicity plus a **tool-agnostic** "do NOT add statements after COMMIT" warning.
- **Round 3** (on the final fix): APPROVE 0.88, zero blockers, single [minor] nit suggesting `ILIKE` over `LIKE` for case-insensitivity, applied inline.

**Lesson for future migrations**: when two subagent reviews contradict each other on an external-tool behavioral claim, the safer answer is usually to **drop the claim entirely** rather than pick a side — SQL-engine-level truths are verifiable, external-tool behavior without live test access is not. The Quality-Maximizing Path meta-rule applies: "canonical approach" wins, and the canonical approach is not making unverifiable claims in permanent documentation.

### Prior subagent review — verified properties (0.82 confidence, APPROVE_WITH_CHANGES)

1. **Convergence matrix** — symbolic state-machine walker across 5 starting states (clean, half-migrated-no-default, half-migrated-wrong-default, half-migrated-default-false, converged). All terminate at `exists=True nullable=False default=false null_rows=False`.
2. **Race-window closure** — `ADD COLUMN` inside transaction acquires `ACCESS EXCLUSIVE` on `public.fights` and holds until COMMIT; independently, `DEFAULT false` pre-set on ADD makes concurrent inserts pick up false automatically. Belt-and-suspenders.
3. **TypeScript type shape match** — `Row.is_title_fight: boolean` / `Row.is_main_card: boolean` required (non-null). `Insert`/`Update.is_title_fight?: boolean` / `Insert`/`Update.is_main_card?: boolean` optional. Matches `is_cup_match` precedent and `NOT NULL DEFAULT false` Postgres shape.
4. **`is_main_card` naming non-collision** — repo grep scoped outside `node_modules`, no existing column/symbol/translation key collision.
5. **No mutual-exclusion assumption with `is_cup_match`** — grep of `is_cup_match` usages (`src/app/[locale]/(main)/page.tsx:171`, `my-record/page.tsx:124`) shows only single-flag filters, no mutual-exclusion invariant.
6. **RLS policies unaffected** — `fights` table has one policy (`CREATE POLICY fights_select FOR SELECT USING (true)` at `001_schema.sql:149`). New columns surface identically to existing flags. No security regression.

**Branches already shipped in Phase 1**: #17 (branch 1), #18 (branch 2), #19 (branch 3), #21 (branch 4), #22 (hotfix), **#23 (branch 5 part 1)**, **#24 (branch 5 part 2, this session)**. Docs switch committed on develop as `0e16e33` (2026-04-13 review-path switch to subagent). 3-tier review rubric at `5658b8f`.

**Review gate**: primary path is the user-level `second-opinion-reviewer` subagent — "Use the second-opinion-reviewer subagent to review <artifact>". Sonnet 4.6 default, Opus 4.6 escalation on low-confidence BLOCK. Usage guide: `/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`. 3-tier rubric: `Docs/review-tier-rubric.md`. Historical fallback only (deprioritized): `scripts/codex-review.sh` → `scripts/gpt-review.sh`, see `Docs/codex-review.md`. Cumulative OpenAI spend reached **~$8.93** before the 2026-04-13 switch — external review is now reserved for high-stakes calls (auth, RLS, money/score migrations, share-page enumeration) where a cross-family opinion is worth the spend. The subagent SUPPLEMENTS external review, not REPLACES it — every subagent output includes a mandatory `## What this review cannot catch` section declaring its shared-training blind spot.

**Wiki log location**: `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/` — **outside** the repo. PR #20 (`chore/move-wiki-out-of-repo`, merged as `9bb0da2`) moved the pre-2026-04-13 in-repo session logs to the external path and added a `.gitignore` block on `Wiki_Sean/`. The memory entry `feedback_wiki_log_location` documents the rule.

**Phase 0 done. Phase 1 in progress (6/9 branches shipped after PRs #23 + #24).** PR #25 (this session) was an out-of-phase pivot that partially completes a Phase 3 branch (`feature/supabase-email-templates` — 2 of 4 templates done, docs/email-setup still pending). Do not start Phase 2 until every Phase 1 item lands.

---

## Recently shipped (chronological, newest first)

| PR | Branch | Commit | Phase | What shipped |
|---|---|---|---|---|
| #25 | `feature/supabase-email-templates` | `992fb9e` (squashed) | **Phase 3 partial ✅** (out-of-phase pivot) | Branded dark-theme Supabase auth email templates for confirm-signup + reset-password — replaces the default plain-text Supabase emails. Full WCAG AA audit (all 12 text/bg pairs pass 1.4.3, lowest 6.25:1 for the copy-link label), 12px minimum font anywhere, `<meta name="color-scheme" content="dark">` + supported-color-schemes opt-out, `<table align="center">` HTML attribute on CTA + copy-link panel for MSO Outlook Desktop centering, MSO conditional Arial font override, preheader hide-bundle, 32px `<h1>` + 15px body + explicit expiry notes (24h confirm / 1h reset matching Supabase defaults). Reset-password shows `{{ .Email }}` as an account identification line (security practice). No gradients or glow effects per Sean's direction. `src/app/email/icon-shield/route.tsx` + `icon-key/route.tsx` refactored to import raw `__iconNode` data from `lucide-react/dist/esm/icons/<name>.js` instead of hardcoded SVG path strings — routes now actually consume the lucide-react package. Per-icon import is necessary because lucide-react 1.7.0 marks `Icon.js` as `'use client'`, which fails at prerender time in Next.js RSC server routes. Satori `currentColor` fix: set `color: BRAND_ACCENT` on the outer div so key-round's keyhole dot (which uses `fill="currentColor"` in lucide's iconNode) inherits the brand gold instead of resolving to black. **Visually verified** by inspecting `.next/server/app/email/icon-key.body` PNG — dot renders correctly in gold. `src/types/lucide-icons.d.ts` new type shim for the internal `lucide-react/dist/esm/icons/*.js` module pattern. `package.json` `lucide-react` pinned from `^1.7.0` → `~1.7.0` (patch-only) to reduce blast radius of internal API coupling. `public/email/bp-logo-email.png` (537×129 Codex-designed silver-gradient wordmark) committed as email-specific asset exception to BlackPick's "web uses SVG only" policy — email clients have poor SVG support. Cleanup: deleted `public/email/previews/*.html` Codex reference files + `.DS_Store`. `remove_background/` working-tree deletions explicitly not staged per the PR #24 "never git add -A" lesson. **Review trail**: 2 rounds with subagent (blackpick profile). Round 1 APPROVE_WITH_CHANGES 0.88 — 2 [major] + 2 [minor] all fixed (align=center on 4 tables, README WCAG claim qualified to text-only, footer-link row added to audit table, color-scheme meta reworded as best-effort). Round 2 APPROVE_WITH_CHANGES 0.82 — 1 [major] + 3 [minor] all fixed (currentColor bug + key spread warning + tag cast widened + lucide-react version pin). Build clean, 125/125 tests, check:i18n 350×7 clean. **Not yet applied to Supabase** — Sean's manual paste step is post-merge follow-up, documented in README + Current focus §3. This PR partially completes Phase 3's `feature/supabase-email-templates` branch (confirm_signup + reset_password done; magic_link + invite still pending). |
| #24 | `feature/title-fight-badge` | `b2a9dea` (squashed) | **Phase 1 branch 5 part 2 ✅** | UI + DevPanel follow-up to PR #23. FightCard header gets two new RetroLabel chips — `TITLE FIGHT` (accent tone + Crown lucide icon, rendered when `fight.is_title_fight`) and `MAIN CARD` (neutral tone, rendered when `fight.is_main_card && !isMainEvent` to avoid double-chipping the headline). Both i18n'd via new `event.titleFight` + `event.mainCard` keys × 7 locales. Fighter career page (`fighters/[id]/page.tsx`) gets a Crown icon inline with the opponent name + subtle `bg-[var(--bp-accent-dim)]` row tint on title-fight rows so championship bouts stand out in the career retrospective. `is_main_card` intentionally NOT rendered on fighter pages — scope decision to keep main-card distinction on live event context only. 3 FightCard query sites (home, event detail, single-fight detail) and 1 fighter query site updated to select the new columns. DevPanel v2 gets a new "Content Flags" section with 2 dev-only action rows (`Preview title + main card` / `Clear title + main card`) backed by new server actions `set-content-flags-preview` + `clear-content-flags` in `api/dev/seed/route.ts`. Preview logic: reset all flags on latest event, then mark fight[0] (earliest start_time + deterministic id tiebreak) as both flags, mark first half of remaining fights as `is_main_card=true`, leave the rest as undercard. Clear: reset everything. Every supabase update destructures `{ error }` and forwards on failure (round-1 [minor] fix). Storybook MockFightCard extended with `isTitleFight` + `isMainCard` props + 3 new story variants (TitleFightMainEvent, MainCardTitleFight, MainCardOnly). Single subagent review round: APPROVE_WITH_CHANGES 0.87 — 1 [major] on unstaged `remove_background/` deletion risk (avoided by specific-file staging; Sean's intentional orthogonal cleanup) + 4 [minor] all addressed inline (redundant truncate class, supabase error hygiene, deterministic sort tiebreak, Storybook coverage gap). Pre-existing hardcoded-English `MAIN EVENT` chip left alone — Branch 6 scope. Local quality gates: tsc clean, test:fast 125/125, check:i18n 350×7, eslint 0 errors. |
| #23 | `db/title-fight-flag` | `84857f1` (squashed) | **Phase 1 branch 5 part 1 ✅** | Migration adds `is_title_fight BOOLEAN NOT NULL DEFAULT false` and `is_main_card BOOLEAN NOT NULL DEFAULT false` to `public.fights`. Per-column 4-step convergent pattern (ADD with DEFAULT → SET DEFAULT → UPDATE NULL rows → SET NOT NULL) wrapped in `BEGIN;…COMMIT;`. Post-convergence DO \$\$ assertion iterates both columns checking exists / `data_type=boolean` / `is_nullable=NO` / `column_default ILIKE '%false%'` / 0 NULL rows — pattern lifted from `202604120001_ring_name_case_insensitive_unique.sql`. `src/types/database.ts` gets `Row.is_title_fight: boolean` / `Row.is_main_card: boolean` + optional Insert/Update shapes (matches `is_cup_match` precedent). TypeScript types carried over from the pre-rebase wip commit. **Review trail**: 3 rounds with subagent — round 1 flagged header prose (APPROVE_WITH_CHANGES 0.82), round 2 PUSHED BACK on my first fix arguing the round-1 concern was itself a false positive on Supabase CLI behavior, resolution was to drop the contested external-tool claim entirely and keep only always-true PG-engine-level atomicity prose plus a tool-agnostic "do NOT add statements after COMMIT" warning. Round 3 APPROVE 0.88 with one [minor] nit (`ILIKE` not `LIKE`) applied inline. Lesson documented in Current focus: when two subagent reviews contradict each other on external-tool behavior, drop the claim. DEV already migrated in prior session (384 rows × 0 NULLs). PROD still pending Sean's Management API run. Part 2 (`feature/title-fight-badge`) next — UI badge, DevPanel toggles, wire up dead `is_title_fight?: boolean` prop in `FightCard.tsx:50`. |
| #22 | `fix/prediction-pick-label-consistency` | `f8f9016` (squashed) | **Phase 1 hotfix ✅** | Sean flagged mid-session: the FightCard post-lock "Your Pick" chip from PR #17 differed from the FightCardPicker voting-state chip (gold `tone="accent"` vs neutral green-check, and top-left vs top-right). Two fixes: (1) FightCard now uses `tone="neutral"` + green check icon (`text-[#4ade80]`) + `right-2 top-2` position — matches the picker exactly so upcoming → locked transition looks seamless. (2) FightCardPicker's hardcoded English `"My Pick"` replaced with `t("prediction.yourPick")`, closing a hardcoded-English leak bug. Scope-kept: card border differences (`var(--bp-accent)/40` vs `rgba(229,169,68,0.3)`) left for a later retro-tokens pass. gpt-review.sh lite CLEAN round 1, cost $0.0007. |
| #21 | `feature/fighter-page-sort` | `08582ef` | **Phase 1 branch 4 ✅** | Adds `winrate_desc` (3-decided-fight minimum gate) + `weightclass_asc` (canonical weight ladder) sort options and country filter to `/fighters`, with URL state for shareability + localStorage persist. New `src/lib/fighter-grid-state.ts` pure helpers (parseStateFromParams with explicit status metadata, isEqualState, serializeStateToQuery, buildFightersHref, readPersistedState, writePersistedState) + 39 unit tests. Architecture: URL as committed source of truth, `useTransition`-wrapped navigation, `optimisticState` anchored to `searchParamsString` (auto-invalidates on URL moves — no render-time setState, no ref-read-in-render), `latestIntentRef` synchronous merge buffer resynced via `useLayoutEffect`, `pendingPersistRef` match-on-settle persistence (clears on supersede), `canonicalizedTargetQueryRef` deterministic shared-link handling, effect order persist → canonicalize → restore. Unrelated query params (utm, feature flags) preserved via baseSearch in buildFightersHref. Duplicated params (`?sort=a&sort=b`) detected via `getAll` + canonicalized. 7 new i18n keys × 7 locales. 11 gpt-review rounds, all findings fixed, ship decision collaborative with GPT. 125/125 tests. Known trade-off: brief flash of defaults on first mount before localStorage restore commits (~50ms) — fix requires SSR cookie read / useSyncExternalStore, out of scope. Cost ~$0.50 (3 default + 8 lite per Sean's cost rule). |
| #20 | `chore/move-wiki-out-of-repo` | `bf6f50e` (squashed) | Chore | Moves 7 pre-2026-04-13 session wiki files out of the repo to `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/`, `.gitignore` blocks `Wiki_Sean/` entirely, CLAUDE.md session-start protocol updated to read from the external path. New memory entry `feedback_wiki_log_location` documents the rule. Docs-only, exempt from review gate. |
| #19 | `fix/ui-polish-batch` | `d5d03b2` (squashed) | **Phase 1 branch 3 ✅** | Drops `avatar-glow` golden halo on picked fighter (solid 2px gold border replaces it, matches DESIGN.md "no radiating decorative layers"). `.retro-field::placeholder` opacity 0.2 → 0.5 for WCAG contrast. FightCardPicker + FightCard name+flag line wraps (`min-w-0 w-full text-center break-words`) so long Hangul/Cyrillic/accented names wrap instead of truncating on narrow mobile. Lite profile CLEAN round 1, cost $0.003. |
| #18 | `fix/share-cta-visibility` | `5ee064d` (squashed) | **Phase 1 branch 2 ✅** | New `EventShareCta` client component with 6-variant state machine (disabled_no_ring_name / disabled_no_picks / streak_badge / record_badge / all_locked_in / default_has_picks). ShareMenu extended with optional triggerLabel/triggerVariant/triggerSize/hideIcon props. Event page mounts CTA inside both hero branches, gated on `user` truthy (anon viewers see no CTA). 7 new i18n keys across all 7 locales. shareUrl null-safe. Mobile sticky bottom bar deferred to Branch 2-extra (layout conflict with existing z-50 mobile nav). 3 review rounds, 5 findings fixed, final CLEAN. Cost ~$0.32. |
| #17 | `fix/prediction-lock-state` | `93b2d9e` (squashed) | **Phase 1 branch 1 ✅** | `LockTransitionWatcher` client component (subscribes to `useClockTick`, calls `router.refresh()` when an upcoming fight's `start_time` crosses `now`, rate-limited to 1/10s with prop-driven reset). Event page FlipTimer condition widened to `!== "completed"` so the locked card stays mounted through upcoming → live. `FightCard` static mode: `isUserPick` / `myPickLabel` props + "Your Pick" accent chip + gold border for the viewer's saved pick in live state. Server-side lock guard verified at `api/predictions/route.ts:60-73`. Tooling: `blackpick_max` upgraded to `gpt-5.4-pro` + `high`, curl `--max-time` 300→600s, Quality-Maximizing Path meta-rule added to CLAUDE.md, `public/email/previews/` ignored. 3 review rounds, 5 findings fixed, final CLEAN. |
| #16 | `chore/tasks-manifest-session-structure` | `...` | Planning | SETS_Stock session-continuity pattern lifted into BlackPick: mandatory session-start protocol in CLAUDE.md, two-level model (durable roadmap vs in-session TaskList subset), Current focus section, Recently shipped ledger, Phase completion records with commit SHAs, per-branch actionable sub-tasks. Every PR now updates TASKS.md in the same commit that ships its code. |
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

### Branch 1: `fix/prediction-lock-state` ✅ shipped in PR #17 (commit `93b2d9e`)

### Branch 2: `fix/share-cta-visibility` ✅ shipped in PR #18 (commit `5ee064d`)

Scope: move the share CTA into the hero, add state-driven dynamic copy, gate on auth, handle disabled states with helpful hints.

**Current-focus actionable sub-tasks**:

| # | Subtask | Status |
|---|---|---|
| 2-1 | New `EventShareCta` client component with state machine: `disabled_no_ring_name` / `disabled_no_picks` / `all_locked_in` / `record_badge` / `streak_badge` / `default_has_picks`. First-match-wins ordering. Post-result variants take priority over pre-lock when `winsThisCard + lossesThisCard > 0`. | ✅ done |
| 2-2 | `ShareMenu` gets optional `triggerLabel` / `triggerVariant` / `triggerSize` / `hideIcon` props (backward-compatible) so `EventShareCta` can pass custom CTA copy while reusing the share dialog logic. | ✅ done |
| 2-3 | New i18n keys across 7 locales: `ctaDefault`, `ctaAllLocked`, `ctaCompleteRecord`, `ctaCompleteStreak`, `ctaDisabledNoRingName`, `ctaDisabledNoPicks`, `goToProfile`. Mechanical translations for now — Phase 5 comprehensive tone review will polish. | ✅ done |
| 2-4 | Event page: remove old standalone share CTA block. Mount `EventShareCta` inside both hero branches (poster + no-poster). Gate entire mount on `user` truthy — anon viewers don't see any CTA (pre-diff behavior preserved). | ✅ done |
| 2-5 | Compute `winsThisCard` / `lossesThisCard` from `pickedEntries` on the event page via `prediction.is_winner_correct === true/false`. `userCurrentStreak` plumbed as `null` placeholder — Branch 8 wires it. | ✅ done |
| 2-6 | Domain fix (round 2 P2): `upcomingPickedCount` + `upcomingTotal` replace `pickedCount` + `predictableTotal` so the `all_locked_in` variant counts only upcoming picks, avoiding the impossible "3/2 locked in" state when completed-fight picks exceed upcoming-fight total. Separate `hasAnyPicks` boolean gates the disabled state. | ✅ done |
| 2-7 | `shareUrl` prop changed to `string \| null`. Event page only calls `buildSharePath` when `userRingName` is truthy. `EventShareCta` falls through to `null` render in enabled states if `shareUrl` is missing (defense in depth). | ✅ done |
| 2-8 | Mobile sticky bottom bar — **deferred** to a follow-up branch (see Branch 2-extra below). Layout-level change conflicts with existing `z-50` mobile nav at `bottom-0`. Clean stacking needs layout changes out of scope for this bugfix. | deferred |
| 2-9 | `npx eslint` clean · `npx tsc --noEmit` clean · `npm run test:fast` 84/84 · `npm run check:i18n` 346 keys × 7 locales match | ✅ done |
| 2-10 | `scripts/codex-review.sh review` — Round 1: 2 findings (P2 domain mismatch, P3 anon regression). Round 2: 3 findings (P1 malformed shareUrl, P2 mobile sticky overlap, P3 "ring name" English leak in es/pt-BR/mn). Round 3: **CLEAN**. Cumulative cost ~$0.32 for branch 2. | ✅ done |

### Branch 2-extra (deferred): mobile sticky share CTA

Scope: re-introduce the mobile-only sticky bottom bar variant of `EventShareCta`. Deferred because stacking cleanly above the existing fixed mobile nav at `bottom-0 z-50` requires layout work that didn't belong in a bugfix branch. Approach:
- Position CTA at `bottom-[nav-height + env(safe-area-inset-bottom)]`
- Bump the event page root `pb-24` to `pb-36` (or conditional on `hasAnyPicks`) to reserve space
- Or use `IntersectionObserver` to only render the sticky bar when the inline hero CTA has scrolled off screen

### Branch 3: `fix/ui-polish-batch` ✅ shipped in PR #19 (commit `d5d03b2`)

| # | Subtask | Status |
|---|---|---|
| 3-1 | FightCardPicker: remove `avatar-glow` (golden radial-pulse halo) on picked fighter. Replace with solid 2px `var(--bp-accent)` border on the avatar. Card-level `fighter-card-selected` background + accent-colored name text still signal the selected state cleanly. Aligns with DESIGN.md "no glassmorphism, no radiating decorative layers". | ✅ done |
| 3-2 | `.retro-field::placeholder` bumped from `rgba(255,255,255,0.2)` to `rgba(255,255,255,0.5)` in `globals.css`. Global — affects every retro input, not just fighter search. 0.2 was below WCAG placeholder-contrast guidance. | ✅ done |
| 3-3 | Mobile fight card name+flag truncation: both FightCardPicker and FightCard FighterSideStatic wrap the name/flag line in `min-w-0 w-full text-center` + `break-words` so long Hangul/Cyrillic/accented names wrap instead of truncating below 380px. Flag stays inline so it flows with the last word. | ✅ done |
| 3-4 | `npx eslint` clean · `npx tsc --noEmit` clean · `npm run test:fast` 84/84 | ✅ done |
| 3-5 | `scripts/codex-review.sh review lite` — **CLEAN round 1**. Cost $0.003 (lite profile was the right call). | ✅ done |

### Branch 4: `feature/fighter-page-sort` ✅ shipped in PR #21 (commit `08582ef`)

Shipped via **Exit B** (URL-as-state kept) after a full architectural rewrite. 11 gpt-review rounds, all findings fixed, ship decision collaborative with GPT (round 11's remaining concern was defensive complexity for a scenario that doesn't occur with Next.js router dedup semantics). 125/125 tests, cost ~$0.50 session total.

### Branch 4-extra: `fix/prediction-pick-label-consistency` ✅ shipped in PR #22 (commit `f8f9016`)

FightCard post-lock chip aligned with FightCardPicker voting-state chip (same neutral tone + green check icon + top-right position). Picker's hardcoded English "My Pick" replaced with `t("prediction.yourPick")`. Lite profile CLEAN round 1.

### Branch 5 Part 1: `db/title-fight-flag` ✅ shipped in PR #23 (commit `84857f1`)

Migration adds two admin-managed boolean flags (`is_title_fight`, `is_main_card`) to `public.fights`, both `BOOLEAN NOT NULL DEFAULT false`. See Recently shipped row for the full 3-round review trail + lesson. DEV migrated; **PROD still pending Sean's Management API run**.

### Branch 5 Part 2: `feature/title-fight-badge` ✅ shipped in PR #24 (commit `b2a9dea`)

UI + DevPanel surfacing of the PR #23 schema flags. See Recently shipped row for full detail + review trail.

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

### Branch: `feature/supabase-email-templates` (lite review — HTML only) — ⚠️ **partially shipped out-of-phase in PR #25 (`992fb9e`, this session)**
- [x] `Docs/email-templates/confirm-signup.html` — shipped. Dark-theme + WCAG AA + `<meta color-scheme>` + MSO bulletproof + lucide shield icon via ImageResponse route + `<h1>` + 12px min + 24h expiry note. Review trail: 2 rounds, all findings fixed.
- [x] `Docs/email-templates/reset-password.html` — shipped. Same base as confirm + `{{ .Email }}` account identification line + 1h expiry matching Supabase recovery default + lucide key-round icon (with `currentColor` fix for the keyhole dot).
- [x] `Docs/email-templates/README.md` — asset dependency map, WCAG audit table (12 pairs), email-client compatibility matrix, step-by-step Supabase dashboard deploy guide, Site URL security note, brand token sync table.
- [x] `src/types/lucide-icons.d.ts` + `public/email/bp-logo-email.png` + `package.json` lucide pin `^1.7.0` → `~1.7.0`. Route handlers now import raw `__iconNode` data from per-icon lucide-react modules (required because lucide-react `Icon.js` is `'use client'` — top-level components can't be invoked in RSC server routes).
- [ ] `magic_link.html` — not shipped. Follows the same design as confirm + reset, swap icon (lucide `Link` or `Wand`). ~10 min if same session.
- [ ] `invite.html` — not shipped. Same design, swap icon (lucide `UserPlus`). ~10 min if same session.
- [ ] **Sean's post-merge manual deploy** — open `https://<preview>.vercel.app/email/{bp-logo-email.png, icon-shield, icon-key}` → all 200 → Supabase Dashboard → Authentication → URL Configuration (Site URL = blackpick.io) → Email Templates → paste + test-email. README has full checklist.
- [ ] `Docs/email-setup.md` — "how to paste these into Supabase Dashboard → Auth → Email Templates" (manual, Supabase API doesn't expose templates). **Superseded** by `Docs/email-templates/README.md` at a practical level, but the Phase 3 docs setup (Cloudflare Email Routing + Resend DNS + Supabase Custom SMTP) is a separate concern and still pending in the `docs/email-setup` branch above.

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

- **Review gate**: primary path is the user-level `second-opinion-reviewer` subagent — invoke via "Use the second-opinion-reviewer subagent to review <artifact>". Sonnet 4.6 default, Opus 4.6 escalation on low-confidence BLOCK. Usage guide: `/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`. **3-tier Review rubric (Tier A routine / Tier B elevated with red-team / forensic / oracle framings / Tier C irreversible-high-stakes with 8 hard triggers + mandatory cross-family external review) lives in [`Docs/review-tier-rubric.md`](Docs/review-tier-rubric.md). Read that file before any review-gate judgment call.** Supplements — does NOT replace — cross-family external review; reach for external when stakes justify the cost. Historical fallback (deprioritized for cost): `scripts/codex-review.sh` → `scripts/gpt-review.sh`, see `Docs/codex-review.md`. Never call the OpenAI API from anywhere else. Docs-only PRs (TASKS.md, wiki, Docs/) exempt — self-review OK.
- **Every PR updates TASKS.md in the same commit** that ships its code. When a branch lands, its row moves from the active section to Recently shipped, and the next branch's sub-tasks are restored to the in-session TaskList.
- **Session-end ritual**: before wrapping, update `CURRENT_STATE.md` (in the repo, commit as `chore(docs):`) + write a new session log to `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/<YYYY-MM-DD>-<slug>.md` (**outside** the repo — see `.gitignore` and the `feedback_wiki_log_location` memory entry). Sweep TASKS.md for stale items.
- **Lead engineer mode**: make best-practice decisions autonomously. Don't present 2–3 option menus on every step. Warn before destructive operations (force-push, drop table, etc).
- **Branch discipline**: every phase task = new branch, naming convention (`feature/`, `fix/`, `refactor/`, `db/`, `a11y/`, `i18n/`, `chore/`, `dev-ui/`). One PR per branch against `develop`. No stacking.
- **Phase gates**: finish a phase completely before starting the next. Parallel work within a phase is fine, but a Phase N branch never depends on a Phase N+1 branch.
- **GPT plan review reconcile**: the phase order and scope decisions live in `Wiki_Sean/BlackPick/2026-04-12-plan-review-and-reconcile.md`. Read it if you're about to reorder or rescope anything.
