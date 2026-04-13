# BlackPick — Current State (2026-04-13, Phase 1 at 6/9 + PR #25 Supabase email templates shipped out-of-phase)

## Branch
`develop` (Phase 1 is 6/9 branches shipped after PRs #23 + #24; PR #25 shipped a partial Phase 3 branch as a mid-session pivot)

## Latest Commits (develop tip, newest first)
- `992fb9e` feat(email): supabase auth templates — confirm signup + reset password (#25) — **this session**
- `5db7657` chore(docs): session wrap 2026-04-13 — PR #24 Branch 5 Part 2 shipped
- `b2a9dea` feat(ui): title_fight + main_card chips on fight cards + fighter history + DevPanel preview (#24)
- `3cf7600` chore(docs): session wrap 2026-04-13 — PR #23 Branch 5 Part 1 shipped
- `84857f1` db: add is_title_fight + is_main_card flags to public.fights (#23)
- `5658b8f` docs: add 3-tier review tier rubric (research-grounded)
- `56deb48` chore(docs): TASKS.md — Branch 5 resume brief for post-/clear session
- `0e16e33` docs: switch review path to second-opinion-reviewer subagent
- `4e0f08a` chore(docs): TASKS.md — mark PR #22 pick-label hotfix shipped
- `eb049a7` fix(prediction): align post-lock "Your Pick" label with voting state (#22)
- `08582ef` feat(fighters): winrate + weight-class sort + country filter with URL state (#21)
- `bf6f50e` chore(wiki): move session logs out of repo to ~/Desktop/Wiki_Sean/BlackPick (#20)
- `d5d03b2` fix(ui): avatar glow drop + placeholder contrast + mobile name wrap (#19)
- `5ee064d` fix(share): event share CTA visibility + state machine (#18)
- `93b2d9e` fix(predictions): lock transition watcher + FightCard Your Pick chip (#17)

## Production
- **URL**: https://blackpick.io
- **Latest production deploy**: PR #12 (`release: prediction flow UX + share layer + hooks migration + a11y`) bundled PRs #3–#11 from the 2026-04-12 session. Phase 1 work (PRs #17–#24) + Phase 3 partial (PR #25) are on `develop` but **not yet released to prod**. Next prod release will bundle all Phase 1 branches + this session's email templates once Branches 6–9 are also in.
- **Pending PROD migration**: `supabase/migrations/202604130001_title_fight_and_main_card_flags.sql` (from PR #23). Sean runs via Management API — same flow as `202604120001_ring_name_case_insensitive_unique.sql`. Expected to apply idempotently since DEV is already converged. The PR #24 UI defensively treats both flags as optional booleans so the title-fight / main-card chips just don't render on PROD fights until the migration lands there.
- **Pending Supabase email template paste-in (PR #25 follow-up)**: after the next preview deploy, Sean opens `https://<preview>.vercel.app/email/{bp-logo-email.png, icon-shield, icon-key}` to confirm all 200, then Supabase Dashboard → Authentication → URL Configuration → Site URL is `https://blackpick.io`, then Email Templates → paste `Docs/email-templates/confirm-signup.html` and `reset-password.html` into the respective slots, test-email from dashboard. Until this step is done, Supabase sends the default plain-text auth emails — the branded HTML isn't live. README has the full checklist.

---

## Completed (this session — 2026-04-13 third pass)

### PR #25 — `feature/supabase-email-templates` (Phase 3 partial, out-of-phase pivot)

Mid-session pivot away from the planned Branch 6 (`fix/hardcoded-korean-leaks`) after Sean pointed at `public/email/previews/` Codex-designed reference HTMLs and asked for proper Supabase auth email templates. Discovered during exploration that `Docs/email-templates/` already had a 2026-04-10 committed system (`b29a4ec`, GPT-5.4 reviewed) that was never applied to Supabase and had several issues: WCAG AA failure on copy-link label, 10-11px text below DESIGN.md minimum, missing `<meta color-scheme>`, box-shadow glow conflicting with Sean's "no gradient" direction, vague expiry on reset, and a broken logo asset reference (`public/email/bp-logo-email.png` was declared but never committed — the web app uses SVG only, so the PNG never existed in prod). Rewrote from scratch using the pre-existing system as a base, applying every fix surfaced by two rounds of `second-opinion-reviewer` and Sean's mid-session lucide-react instruction.

**Templates** (`Docs/email-templates/*.html`):
- Dark theme (`#0a0a0a` outer, `#000` card, `#050505` footer) with solid gold CTA pill (`#ffba3c`) — no gradients or glow effects.
- WCAG AA audit: all 12 text/background pairs computed in Node and verified in README, lowest ratio 6.25:1 on the 12px "Or Copy This Link" label. Non-text contrast (1.4.11) explicitly excluded as the copy panel border is presentational decoration, not a UI control.
- `<meta name="color-scheme" content="dark">` + `supported-color-schemes` as a best-effort dark-mode auto-inversion opt-out. Inline dark color values remain the primary defense.
- `<table align="center">` HTML attribute on CTA button and copy-link panel tables in addition to CSS `margin:auto`, so Outlook Desktop's Word renderer doesn't left-align the call-to-action.
- MSO conditional comment forces Arial on Outlook for consistent fallback typography.
- Preheader hide-bundle: `display:none + visibility + opacity + color:transparent + mso-hide:all + max-heights + font-size:1px` — covers every mainstream client.
- 32px `<h1>` + 15px body + 12px minimum everywhere (no text below 12px per DESIGN.md §Typography).
- `reset-password.html` shows `{{ .Email }}` on an "Account:" line (security practice — lets the recipient verify the reset was requested for their own address) and an explicit "1 hour" expiry note matching Supabase's recovery default.
- `confirm-signup.html` explicit "24 hours" expiry note matching Supabase's confirm default.
- Footer identity disclosure + "If you didn't request this, safely ignore" pattern meets GDPR transactional requirement.

**Icon routes — lucide-react refactor** (`src/app/email/icon-{shield,key}/route.tsx`):
- Previous versions inlined lucide SVG path data as hardcoded strings. Sean's mid-session feedback: "use the icon library we use on the web" (= `lucide-react`).
- Both routes now import raw `__iconNode` data from the per-icon module at `lucide-react/dist/esm/icons/<name>.js` (`shield-check.js` + `key-round.js`). The top-level `ShieldCheck`/`KeyRound` components cannot be used because `lucide-react` 1.7.0 ships `Icon.js` with a `'use client'` directive — importing them in a Next.js RSC server route fails at prerender time. The raw `__iconNode` array is pure data, no React wrapper, server-safe.
- The SVG wrapper hardcodes lucide's `defaultAttributes.js` values (`viewBox="0 0 24 24"`, `fill="none"`, `stroke={BRAND_ACCENT}`, `strokeWidth=2`, `strokeLinecap/Linejoin="round"`) so the visual output matches how lucide-react renders the component on the web.
- **Satori `currentColor` fix** — set CSS `color: BRAND_ACCENT` on the outer `<div>` so key-round's keyhole dot (which uses `fill="currentColor"` in its iconNode) inherits the brand gold instead of resolving to Satori's default black and disappearing into the dark gold background. Verified visually by inspecting the prerendered PNG at `.next/server/app/email/icon-key.body` — the keyhole dot renders in gold.
- iconNode `key` extraction uses the modern JSX transform pattern (`const { key, ...rest } = attrs; return <Tag key={key} {...rest} />`) to avoid React list-key warnings.
- Tag cast widened from 4 elements to the full lucide SVG union (`path | circle | rect | line | ellipse | polygon | polyline`) for future icon routes.

**Infrastructure**:
- New `src/types/lucide-icons.d.ts` — TypeScript shim declaring `declare module "lucide-react/dist/esm/icons/*.js"` with the correct `__iconNode` shape. Required because `lucide-react` ships no per-icon `.d.ts` files.
- `package.json` — pinned `lucide-react` from `^1.7.0` → `~1.7.0` (patch-only upgrades) to reduce the blast radius of the internal-API coupling. A minor bump could silently rename `__iconNode` or restructure per-icon module paths.
- New `public/email/bp-logo-email.png` (537×129, 20KB) — Codex-designed silver-gradient BLACK PICK wordmark. Documented as email-specific exception to BlackPick's "web UI uses SVG only" policy because email clients have poor SVG support (Gmail strips, Outlook partial).
- Deleted `public/email/previews/{confirm-signup,reset-password}.html` (Codex reference HTMLs, used as visual inspiration but not shipped) and `.DS_Store`.
- `remove_background/` working-tree deletions explicitly NOT staged per the PR #24 "never git add -A" lesson. Remains as an orthogonal future cleanup commit.

**Review trail** — two rounds with `second-opinion-reviewer` (blackpick profile):
- **Round 1** APPROVE_WITH_CHANGES 0.88. 2 [major] + 2 [minor]: missing `align="center"` on 4 tables (MSO centering), README WCAG claim overstating coverage to include non-text contrast, missing footer-link row in audit table, color-scheme meta coverage overclaim. All four fixed before round 2.
- **Round 2** APPROVE_WITH_CHANGES 0.82 (delta review — round 1 fixes + lucide-react refactor). 1 [major] + 3 [minor]: key-round `currentColor` resolving to black in Satori (visual bug in shipped PNG), spread-key React warning under new JSX transform, incomplete SVG tag cast, lucide-react caret range allowing silent internal API break. All four fixed + **visually verified** by direct PNG inspection.

**Verification**:
- `npm run build` — clean, both `/email/icon-*` routes listed as prerendered static with 1y cache (Satori rendered successfully at build time, no `'use client'` errors).
- `npm run test:fast` — 125/125 passing.
- `npm run check:i18n` — 350 keys × 7 locales aligned.
- Visual inspection of `.next/server/app/email/icon-{shield,key}.body` PNGs — both icons render correctly in gold on dark gold circles. Key-round keyhole dot visible (currentColor fix confirmed).

**Not yet applied to Supabase** — the paste-to-dashboard step is post-merge follow-up. Documented in `Docs/email-templates/README.md` and in the §Production section above.

**Phase impact**: This PR partially ships Phase 3's `feature/supabase-email-templates` branch (2 of 4 templates — `magic_link.html` + `invite.html` still pending). Phase 1 progress unchanged at 6/9. Original plan to start Branch 6 this session was paused for the pivot; resumes next session.

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
| `fights` | 14 (DEV only until PROD migrated) | New columns `is_title_fight` and `is_main_card` from PR #23 — both `BOOLEAN NOT NULL DEFAULT false`. DEV converged (384 rows × 0 NULLs). PROD still at 12 columns until Sean runs the migration. `check:schema-drift` will correctly flag both missing on PROD until the migration lands there. |
| `predictions` | 12 | no changes |
| `fighters` | 10 | no changes |
| `fighter_comments` | 6 | no changes |

Drift: `fights.is_title_fight` + `fights.is_main_card` present on DEV, not yet on PROD. `check:schema-drift` will flag both until Sean runs the migration on PROD. Expected, not a bug.

## OAuth Clients (unchanged)

| Environment | Google Client ID prefix | Supabase project | Redirect URI |
|---|---|---|---|
| DEV | `312732011458-6dd753flhh...` | `lqyzivuxznybmlnlexmq` | `https://lqyzivuxznybmlnlexmq.supabase.co/auth/v1/callback` |
| PROD | `312732011458-ju6m9oe4s2b...` | `nxjwthpydynoecrvggih` | `https://nxjwthpydynoecrvggih.supabase.co/auth/v1/callback` |

## Test Surface

| Layer | Files | Cases | Runtime |
|---|---|---|---|
| Unit + component (vitest) | 10 | 125 | ~1.3s |
| Schema drift script | `scripts/check-schema-drift.mjs` | 7 tables | ~2s |
| i18n integrity script | `scripts/check-i18n-keys.mjs` | 7 locales (339 keys each) | <1s |
| Prod smoke script | `scripts/smoke-prod.mjs` | 13 checks | ~5s |

`npm run test:fast` — 84/84 passing
`npm run predeploy` — i18n + schema-drift + tests + build
`npm run deploy` — predeploy + `vercel --prod` + smoke (note: requires `vercel login` — currently stale; use the GitHub Actions deploy on push to `main` instead)

---

## Review gate

**Primary review path (as of 2026-04-13)**: the user-level `second-opinion-reviewer` subagent. Invoke via natural language: "Use the second-opinion-reviewer subagent to review <artifact>". Sonnet 4.6 default, Opus 4.6 escalation on low-confidence BLOCK. Usage guide: `/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`. **3-tier Review rubric** (Tier A routine / Tier B elevated with red-team / forensic / oracle framings / Tier C irreversible-high-stakes with 8 hard triggers + mandatory cross-family external review) **lives in `Docs/review-tier-rubric.md`**. Supplements — does NOT replace — cross-family external review; reach for external (GPT / Codex / Gemini) when stakes justify the cost. Historical fallback (deprioritized for cost after ~$8.93 cumulative spend on 2026-04-12): `scripts/codex-review.sh` → `scripts/gpt-review.sh`, see `Docs/codex-review.md`. CLAUDE.md imports this section.

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
