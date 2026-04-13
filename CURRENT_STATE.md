# BlackPick — Current State (2026-04-13, Phase 1 at 8/9 after PR #27 Branch 7 + PR #26 Branch 6 + PR #25 Supabase email templates out-of-phase)

## Branch
`develop` (Phase 1 is 8/9 branches shipped after PR #27 Branch 7 `feature/onboarding-first-time-flow`; remaining Phase 1: Branch 8 `feature/streak-ux` + Branch 9 `fix/verify-all-predicted-toast`)

## Latest Commits
**`develop` tip** (newest first):
- `69a53b6` chore(docs): session wrap 2026-04-13 — PR #27 Branch 7 shipped, Phase 1 → 8/9
- `cc7bbc7` feat(onboarding): first-time user flow — dismissible ring-name + anon CTA + first-pick hint (#27) — **this session**
- `af5cfec` chore: 2026-04-13 autonomous follow-ups — PROD migration + Facebook OAuth docs + smoke checks
- `84a274d` chore(docs): session wrap 2026-04-13 — PR #26 Branch 6 shipped, Phase 1 → 7/9
- `b24057a` fix(i18n): hardcoded Korean leak sweep + English caps-lock chip labels (#26)

**`main` tip** (PROD):
- `20ffbd6` chore(email): ship bp-logo-email.png to PROD for Supabase template verification — **this session**, single static PNG cherry-pick to unblock Sean's test-email verification without waiting for Phase 1 release bundle
- `5b51afc` Merge pull request #12 from ylee178/develop (prediction flow UX + share layer + hooks migration + a11y) — previous PROD baseline
- `976618c` chore(docs): session wrap 2026-04-13 — PR #25 Supabase email templates shipped
- `992fb9e` feat(email): supabase auth templates — confirm signup + reset password (#25)
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
- **Latest production deploy**: `20ffbd6` on main (2026-04-13, this session) — single-file cherry-pick of `public/email/bp-logo-email.png` from develop. Prior baseline was PR #12 merge (`5b51afc`) which bundled PRs #3–#11. Phase 1 work (PRs #17–#24 + #26 + #27) + Phase 3 partial (PR #25 templates + icon routes) are on `develop` but **not yet released to prod as a bundle**. Next full prod release will bundle all Phase 1 branches + this session's email templates once Branches 8/9 are also in. The logo-PNG-only cherry-pick is a surgical hotfix to unblock Sean's email-template verification path — it does NOT count as the Phase 1 release.
- **PROD migration `202604130001` — APPLIED 2026-04-13** (end of session via `supabase db query --linked --file`). Both `is_title_fight` and `is_main_card` columns now exist on PROD `public.fights` (384 rows × 0 NULLs, BOOLEAN NOT NULL DEFAULT false). `check:schema-drift` clean on both DEV and PROD (14 cols each). The PR #24 title-fight / main-card chips now render on PROD fights.
- **PROD email assets — ALL LIVE as of 2026-04-13** (this session, commit `20ffbd6`): `https://blackpick.io/email/bp-logo-email.png` → 200, `/email/icon-shield` → 200, `/email/icon-key` → 200. The icon routes were already on main from an earlier release; the logo PNG was cherry-picked standalone because PR #25 (which added it on develop) is awaiting the Phase 1 release bundle.
- **Supabase email templates — SAVED in dashboard but NOT YET verified via test email**: Sean saved the branded HTML for `confirm_signup` + `reset_password` into the Supabase dashboard during this session. Dashboard Preview tab shows broken images because Supabase Preview does NOT substitute `{{ .SiteURL }}` template variables (expected, not a bug). **Next step — Sean runs Send Test Email** from the Supabase dashboard now that all PROD assets are live. Validates the end-to-end rendering in Gmail / iOS Mail / Outlook before the Phase 1 release. Once a test email renders cleanly, the PR #25 follow-up is fully closed.

---

## Completed (this session — 2026-04-13, PRs #25 + #26 + #27)

### PR #27 — `feature/onboarding-first-time-flow` (Phase 1 Branch 7, 7/9 → 8/9)

Three dismissible first-time onboarding prompts sharing a single `useOnboardingDismissal` hook.

**New files**:
- `src/lib/onboarding-dismissal.ts` — `useOnboardingDismissal(key, ttlMs?)` returns `{ status, dismiss }` where `status ∈ "checking" | "show" | "hide"`. Three-state transition avoids a flash of the prompt on devices where it was previously dismissed. Passing `ttlMs` enables a 30-day re-show window; omit for permanent dismissal. `ONBOARDING_KEYS` factory centralises the `bp.onboarding.*` key scheme (versioned `v1` per `client-localstorage-schema` react-best-practices rule). `ONBOARDING_TTL_30_DAYS = 30 × 24 × 60 × 60 × 1000`.
- `src/components/AnonFirstPickCta.tsx` — dismissible CTA rendered above the fight list on `/` when `!authUser && featured && fights.length > 0`. Sparkles lucide icon + retro panel styling + 30-day TTL. Button links to `/events/{featured.id}`.
- `src/components/FirstPickHintCard.tsx` — dismissible hint on fight detail pages for authed users with zero picks across the app. MousePointerClick lucide icon + retro panel styling + per-user key (so dismissing once suppresses on every fight, not just the one you dismissed on).

**Modified files**:
- `src/components/RingNameOnboarding.tsx` — new optional `userId?: string | null` prop. When passed, opts the modal into dismissible mode: reads `bp.onboarding.ringName.v1:${userId}` from localStorage with `ONBOARDING_TTL_30_DAYS`, shows a "Skip for now" button at the bottom of the form, and hides itself on dismissal. When omitted, preserves legacy forced-modal behavior for any caller. `useEffect` hook for `document.body.style.overflow = "hidden"` is now gated on `visible` so it only fires when the modal is actually rendering, and cleans up correctly on unmount / visible → false transition. Early return moved to AFTER all hooks (`useMemo(helperText)` now runs before the `if (!visible) return null`) — Rules of Hooks compliance.
- `src/app/[locale]/(main)/layout.tsx` — `<RingNameOnboarding>` render call now passes `userId={authUser.id}` to opt the modal into dismissible mode. The existing `needsRingNameOnboarding = Boolean(authUser && !publicUser?.ring_name?.trim())` gate remains — the only UX change is that users can now dismiss the modal with the 30-day block instead of being force-blocked. No duplicate fetch in `page.tsx` (round 1 reviewer caught my first attempt at this).
- `src/app/[locale]/(main)/page.tsx` — imports `AnonFirstPickCta`, computes `featuredHref = featured ? "/events/${featured.id}" : "/"`, renders `<AnonFirstPickCta featuredEventHref={featuredHref} />` above the fight list when `!authUser && featured && fights.length > 0`. No ring-name logic (handled in layout).
- `src/app/[locale]/(main)/events/[id]/fights/[fightId]/page.tsx` — new third Promise in the existing `Promise.all`: `supabase.from("predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id)` for authed users, resolving to `{ count: null, error: null }` for anons. Computes `hasZeroPicks = Boolean(user) && userTotalPicks.count === 0 && !(error check)` — strict `=== 0` so a Supabase error fails closed instead of flashing the hint to established users. Renders `<FirstPickHintCard userId={user.id} />` when `user && hasZeroPicks && eventStatus !== "completed" && !hasStarted`.
- `src/components/DevPanel.tsx` — new "Reset onboarding dismissals" action in the Actions section. Iterates `window.localStorage` backwards (to avoid skipping entries after `removeItem`) and wipes any key starting with `bp.onboarding.`. Returns the count in the DevPanel status row. Complements the existing "Reset 'all predicted' toast lock" action — different namespace, different purpose.

**i18n**: 7 new keys × 7 locales = 49 additions. Final `check:i18n` **365 × 7 aligned** (up from 358 after Branch 6). New keys: `onboarding.skipForNow`, `onboarding.dismiss`, `onboarding.anonCtaTitle`, `onboarding.anonCtaDescription`, `onboarding.anonCtaButton`, `onboarding.firstPickHintTitle`, `onboarding.firstPickHintDescription`. Korean uses the retro-boxing casual register ("나중에 할게요", "첫 예측, 준비됐어요?"), pt-BR uses Brazilian casual ("Pronto pra mandar seu primeiro palpite?"), and the other 5 locales match their existing `onboarding.*` namespace voice.

**Review trail — 2 rounds file-based dialogue (blackpick profile)**:

- **Round 1** APPROVE_WITH_CHANGES 0.91 — 1 [blocker] (AnonFirstPickCta missing the `ttlMs` arg → silently permanent dismissal instead of 30-day) + 2 [major] (OAuth signup regression from scoping the ring-name modal to `/` only — users signing up from a fight page via Google OAuth land back on the fight page and never see the prompt + duplicate `users` row fetch on `/` for authed users because I added a second ring_name fetch in page.tsx that the layout was already doing for AccountDropdown) + 2 [minor] (firstPickHint per-fight key violated "single prompt per state" + `hasZeroPicks` `?? 0` treated DB error as zero picks).
- **Round 1 folds** (`c1e5631`): anon CTA TTL one-liner; RingNameOnboarding moved back to layout (resolves both majors in one move — OAuth regression disappears because the modal is now layout-wide, and the duplicate fetch disappears because page.tsx no longer needs its own ring_name query); firstPickHint key drops `fightId`; hasZeroPicks switched to strict `count === 0` with explicit error check.
- **Round 2** APPROVE 0.93 — verified all 5 round 1 folds (fold_verified on each), no new blockers, cross-round systemic sweep: 22 `t()` call-sites all resolve in en.json + all 7 locales, no Korean leaks in touched files, no English caps-lock chip label regressions, no localStorage namespace collisions with the existing `allPredictedToast:v1:*` keys. 2 non-blocking minors noted but intentional: redundant TypeScript narrowing guard in the `hasZeroPicks` computation (correct but belt-and-suspenders, leave it) + vanishingly rare edge case where an authed ring-name-less user landing on `/login` sees the modal stacked on the login form (pre-existing middleware gap, not Branch 7 scope).

**Lesson — layout-vs-page scope decision**: the spec said "prompt on `/` landing" literally, and I implemented that literally in round 0 by removing the layout-level render and adding it to page.tsx. Round 1 reviewer correctly called this out as a user-journey regression vs. the pre-existing forced-modal behavior — OAuth flows that redirect to non-`/` pages would never see the prompt. Quality-Maximizing Path meta-rule applied: expand the scope beyond the literal spec to preserve the stronger user journey, since the spec clearly intends "first-time experience" and the layout-wide placement matches that intent better than a strict route restriction. The dismissible flag preserves the "30-day re-show" requirement while keeping the layout-wide coverage.

**Verification**: `npm run build` clean (after one round of Rules-of-Hooks fix for an early return I'd initially placed between `useEffect` and `useMemo` in RingNameOnboarding), `npm run test:fast` 125/125, `npm run check:i18n` 365 × 7 aligned, grep clean on new files, no regressions to the pre-existing forced-modal path (legacy callers omit `userId`).

---

### PR #26 — `fix/hardcoded-korean-leaks` (Phase 1 Branch 6, 6/9 → 7/9)

After PR #25 merged, resumed Branch 6 as originally planned. Every hardcoded Korean user-facing string in `src/components/**/*.tsx` and `src/app/[locale]/**/*.tsx` moved behind `t()` or explicitly scoped out. Plus hardcoded English caps-lock chip labels (PR #24 deferred the `MAIN EVENT` chip to this branch).

**Source changes** (5 files):
- `FightCard.tsx:279` `MAIN EVENT` → `t("event.mainEvent")`. The PR #24 deferred chip.
- `page.tsx` 3 sites: `LIVE` → `t("event.liveBadge")`, `Score` → `t("ranking.score")` (reused existing), `best` → `t("ranking.best")`.
- `my-record/[eventId]/page.tsx` — 6 Korean prediction result chips (승자/방법/라운드 맞춤·틀림) → existing `t("myRecord.winnerCorrect")` / `winnerWrong` / etc. keys (keys pre-existed in 7 locales with formal-register `적중/오답` values; Korean users see slightly more formal wording, non-Korean users finally see localized text). Also 3 stat column labels (`WIN`/`LOSS`/`PTS`) → new `myRecord.statWin/statLoss/statPts` keys.
- `PredictionsList.tsx` — 5 edits: removed 4 dead `|| "전체"/"맞춤"/"틀림"` Korean fallback patterns on `t()` calls (the keys exist in all 7 locales so fallbacks never fire in practice, but they were Korean-leak vectors); `${selectedEvents.size}개 대회` template literal → `t("myRecord.eventsSelected", {count})` via the `{var}` interpolator at `src/lib/i18n-provider.tsx:26-32`; `Perfect Prediction` chip → reused `t("profile.perfectCard")`; `" WIN"` suffix → new `t("myRecord.blackCupWin")`.
- `ranking/page.tsx` — 5 call sites of `t("ranking.perfectCard")` replaced with `t("profile.perfectCard")`. The wrong key was **pre-existing** — `ranking.perfectCard` does not exist in the ranking namespace and `getNestedValue` was silently returning the raw key string `"ranking.perfectCard"` as visible UI text. Pulled into Branch 6 scope per Quality-Maximizing Path since Branch 6 IS the i18n leak sweep branch. Also added a comment block above the Oracle/Sniper/Sharp Call HoF tier render documenting that these are **intentional brand-fixed English proper nouns** matching the DB `hall_of_fame_entries.tier` enum, not translated strings.

**i18n key additions**: 8 new keys × 7 locales = 56 new entries. Final `check:i18n` **358 × 7 aligned** (up from 350 before Branch 6). New keys: `event.mainEvent`, `event.liveBadge`, `myRecord.eventsSelected`, `myRecord.blackCupWin`, `myRecord.statWin/statLoss/statPts`, `ranking.best`.

**Out of scope** (explicitly deferred): privacy/terms legal documents (`isKo ? X : Y` dual-language ternaries, Phase 5 tone review); admin surface (Korean-only by design, zero i18n imports); crawler scripts (intentional Korean BC parsing); weight-class/locales data structures (canonical Korean keys); Storybook demos; `profile.perfectCard` casing convention gap; dead `event.live` key; `MvpVoteSection IMG` fallback + `ui/ranking.tsx NEW` chip (pre-existing minors round 3 found via broader sweep, Phase 5).

**File-based dialogue pattern — first end-to-end validation in BlackPick**:

Sean asked mid-session to set up conversational review with the `second-opinion-reviewer` subagent. Key findings:

- The `SendMessage` tool (Claude Code changelog line 639 v2.1.77 "use SendMessage to continue a previously spawned agent") is **not loadable** in current non-experimental sessions — `ToolSearch query="select:SendMessage"` returns "No matching deferred tools found". The runtime auto-prints an `agentId: <hash>` hint at the end of every subagent response **regardless of whether SendMessage is actually loadable**, which is misleading.
- **File-based dialogue is the correct design anyway**: every round must be a fresh-context dispatch so that authorship-blind / self-bias mitigation holds (Yan et al. 2025). SendMessage continuation would carry the prior round's internal state forward and anchor the reviewer to their own past conclusions — self-reinforcing bias. File-based dialogue preserves fresh context per round while transmitting prior-round findings as verifiable READ input.
- **Directory convention**: `BlackPick/reviews/BlackPick/<YYYY-MM-DD>_<topic>_dialog/` (note the inner `BlackPick/` subfolder — project-isolation visual guard mandated by the generic usage doc). `reviews/` is gitignored. Session-log summaries at the external `Wiki_Sean/BlackPick/` path remain the durable record.
- **New section** in `Docs/review-tier-rubric.md` § File-based dialogue pattern documents BlackPick adoption: transcript location, profile routing (lite/default/max), when to dispatch round 2, concrete dispatch recipe, token cost awareness.

**Branch 6 review trail — 3 rounds, validated end-to-end**:

- **Round 1** APPROVE_WITH_CHANGES 0.87 — 2 [blocker] (I missed `Perfect Prediction` + `" WIN"` suffix in PredictionsList on the initial grep) + 1 [major] (pre-existing `ranking.perfectCard` raw-key-string bug at 5 sites) + 3 [minor]. All addressed.
- **Round 2** APPROVE_WITH_CHANGES 0.91 — verified round 1 folds against HEAD, found 1 NEW [blocker] (`WIN`/`LOSS`/`PTS` stat column labels in a file I had already touched but where I missed a broader area) + 1 [major] (Oracle/Sniper/Sharp Call product decision) + 3 [minor]. **Flagged `hardcoded-english-chip-label` as systemic defect class across rounds 1+2 in 3+ files** — the headline cross-round pattern detection feature working as designed.
- **Round 3** APPROVE 0.94 — verified round 2 folds + broader systemic sweep across `src/**/*.tsx` (excl. stories/admin/email). Defect class now **bounded**: 5 remaining grep hits all intentional (brand wordmark, IMG fallback, NEW rank chip), none i18n leaks.

**Lesson — single-round review would have shipped with 4 missed issues**:
- Round 1 blocker 1 (`Perfect Prediction`) + round 1 blocker 2 (` WIN`): missed in initial grep
- Round 2 new blocker (`WIN/LOSS/PTS`): would never have surfaced because round 1's scope was narrower
- Round 2 major (`ranking.perfectCard` pre-existing bug): also only caught by the systemic sweep round 3 did with full prior-round context

The multi-round dialogue caught all 4. The pattern's value is now empirically validated on this project.

**Verification**: `npm run build` clean, `npm run test:fast` 125/125, `npm run check:i18n` 358 × 7 aligned, `grep` zero Korean leaks in scope files + zero hardcoded caps-lock chips outside the intentional-brand carve-outs.

---

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
| 1 | Facebook OAuth setup (Meta console + Supabase wire-in) | **Pending** — full step-by-step guide written at `Docs/facebook-oauth-setup.md` (2026-04-13, this session). Sean runs the Meta console + Supabase dashboard steps per the guide. Estimated: 45 min active + 1–3 business days App Review wait. |
| 2 | Manual e2e of Google OAuth from multiple locales | **Partial** — Sean confirmed login + ring-name save |

### Launch nice-to-have
| # | Task | Notes |
|---|------|-------|
| 3 | Supabase migration history sync | PROD schema is correct but migration tracking table doesn't have 202604090001/2/3 records. Cosmetic — `IF NOT EXISTS` guards make re-running safe. |
| 4 | OG image | ✅ **Resolved** — already implemented as a dynamic `src/app/opengraph-image.tsx` Next.js route (not a static PNG). Verified 2026-04-13. Renders via `next/og` `ImageResponse` with BlackPick branding. Served at `/opengraph-image` and hit by `smoke-prod.mjs:124`. |
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
1. Facebook OAuth (Meta console + Supabase wire-in) — step-by-step at Docs/facebook-oauth-setup.md
2. Sentry DSN — see Wiki_Sean/BlackPick/2026-04-13-manual-handoff-checklist.md
3. Supabase email template paste-in (PR #25 follow-up) — same checklist
4. Agent-skills plugin install (Sean runs the slash command)
5. Phase 2 test infrastructure — start with the BlackPick_Test Supabase project
6. Refresh local Vercel CLI auth — `vercel login` — so future sessions can use `npm run deploy` directly without depending on the GitHub Actions main-push workflow
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
