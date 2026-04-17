# Spec — Fight scorecard display

_2026-04-17 · Branch: `feature/fight-scorecard-display` · v2 after second-opinion-reviewer BLOCK_

## Objective

When a BlackPick user views a completed fight that went to the judges, surface the BC-published scorecard (3 judges × 2 fighters + totals per round) inline with the fight card — so the user can see HOW a decision was scored, not just who won.

Fills the gap between "winner label" (already visible) and "I want to know why the decision went that way".

## Non-goals

- Inferring method (KO/TKO/Submission/Decision) from the scorecard — separate follow-on.
- Editing the scorecard via admin UI — BC is the canonical source.
- Polling / live refresh — scorecards only exist for finished fights; static data.
- Headless-browser automation for method/round — out of scope.
- New DB columns (no migration). Scorecard fetched per-request from BC with caching.
- Pre-Exodus events — already hidden via PR #32.

## Assumptions (11 total — assumptions 9–11 added after spec review)

1. **Placement**: scorecard lives inside `FightCard.tsx` below the result row. Same component works on home + detail + fight detail.
2. **Visibility default**: expanded when present. No toggle.
3. **Data fetch**: server-side parallel with existing `fetchBcOfficialEventCard` in `bc-predictions.ts`. Not client-side, not lazy.
4. **Per-fight cost**: ≤ 1 extra HTTP to BC per decision-with-scorecard fight. **Bounded by per-fetch 3s timeout + shared scoreSeq cache (see §Caching)**, not the 20s global axios default.
5. **Retro styling**: grid table inside `retroPanelClassName({ tone: 'flat' })`. No new additions to `ui/retro.tsx`.
6. **Overtime column**: round 4 column shown only if any referee's `overtimeYn*` is `1`.
7. **Fighter identity at render time**: BC's positional `score*1*` / `score*2*` reconciled to BlackPick DB fighters via the `normalizeName` + `chooseFightRow` pair-match utility already proven in `sync-bc-event-card.ts`.
8. **Winner highlight**: drawn from `fight.winner_id` (DB-authoritative), not inferred from scorecard totals.
9. **[new — name-match defensive failure]** If fuzzy name-match between BC positional fighters and DB fighter_a/fighter_b fails to produce a unique mapping for BOTH sides, the scorecard is **suppressed** (rendered as null). Never render columns that could display inverted scores under the wrong fighter name. Silent correctness > speculative display.
10. **[new — caching + timeout contract]** Per-fetch timeout overridden to **3000ms** (not the global 20s). Successful + error-envelope responses cached in a module-level `Map<scoreSeq, Promise<BcScoreCard | null>>` with a **10-minute TTL** (matches the existing `bcCache` pattern in `bc-predictions.ts`). Parallel dispatch uses `Promise.allSettled` — one slow/failed scorecard cannot stall the rest.
11. **[new — method filter]** Pre-filter on `fight.method === 'Decision'` before attempting the fetch. `KO/TKO` / `Submission` / `cancelled` / `no_contest` skip the fetch entirely (BC has no scorecard for those; wasted calls). `method === null` ALSO skips — the fight hasn't been finalized by admin yet, so rendering a stale scorecard would be premature. Scorecards appear on the next page render after admin enters the method via `/admin/results`.

## User-visible acceptance criteria

1. **Decision fight with scorecard** — Event 286 fight 308 (김명환 vs O'Shay Jordan): renders a table showing VEGETABLE / MASTER KIM / LOGAN with per-round scores for each fighter + totals. Winner's column visually marked (token-driven — gold accent on winner, muted on loser).
2. **Non-decision fight** — KO/TKO/Submission — scorecard section absent entirely. No empty placeholder.
3. **BC endpoint failure** — 404, 5xx, timeout, `{"success":false}` envelope, or malformed JSON — scorecard absent. No error banner to users. Warning-level Sentry capture emitted server-side for observability (reconciles the `swallow-to-null` pattern with the `never silently swallow errors` boundary).
4. **Not-yet-admin-finalized fight** — `fight.method` is null — no fetch attempted.
5. **Name-match ambiguous** — scorecard suppressed (assumption 9).
6. **All three surfaces** — home featured event, event detail, fight detail — render scorecards identically.
7. **Mobile at 360px** — **judge-as-row** layout (confirmed for density): 5 columns max (Judge name + R1 + R2 + R3 + Total) ≈ 56–72px per column. Horizontal scroll is a last-resort, not a baseline state.
8. **Retro tokens only**, DESIGN.md compliant.
9. **i18n**: 5 new keys × 7 locales = 35 new values (keys named in §L5).

## Core features by layer

### L1 — BC fetch + parser (pure lib)

`src/lib/bc-official.ts`:
- Export `BcScoreCard` + `BcRefereeScore` types.
- Export `parseScoreCardJson(raw): BcScoreCard | null` — pure, testable, handles `{success: false}` error envelope + legacy 1/2-referee rows + all-zero scores.
- Export `fetchBcScoreCard(scoreSeq): Promise<BcScoreCard | null>`:
  - Per-call timeout **3000ms** (override, not global 20s).
  - Module-level cache `Map<scoreSeq, { promise, expiresAt }>` with 10-min TTL.
  - Errors → `Sentry.captureException(err, { level: 'warning' })` + return `null`.
  - `{"success":false}` envelope → return `null` (not an exception; no Sentry).

Tests (6 cases):
- 3-referee decision
- 2-referee legacy
- `{success:false}` envelope → null
- Malformed JSON → null
- Overtime flag propagation (any `overtimeYn=1` surfaces correctly)
- All-zero referee (name present but all scores 0) → preserved in output (component layer decides suppression)

### L2 — wiring into existing server-side BC pipeline

- **NOT** `BcFightData` (that type has no `fightSeq` — reviewer blocker #1). Instead, attach `scoreCard?: BcScoreCard | null` to `BcOfficialFight`.
- `fetchBcOfficialEventCard` is where `fightSeq` is already extracted, so the natural site is there.
- For each parsed fight where `fightSeq != null`, kick off `fetchBcScoreCard(fightSeq)` via `Promise.allSettled`. On resolution, attach to the matching `BcOfficialFight`.
- **Guard by method filter at consumer site** (`page.tsx`, `events/[id]`, `fights/[fightId]`): the consumer reads the DB fight row + decides whether to pass the BC scoreCard to `FightCard` based on `fight.method === 'Decision'`. (Alternative: filter inside `fetchBcOfficialEventCard`. Chose consumer-side because it needs DB context anyway.)

### L3 — `<FightScoreCard>` server component

`src/components/FightScoreCard.tsx`:
- Server component, no client interactivity.
- Receives pre-translated labels as props (parent is `FightCard` which is already async and can call `getTranslations()`) — avoids duplicate translation calls.
- Props:
  ```ts
  type Props = {
    scoreCard: BcScoreCard;
    fighterALabel: string;    // localized display name
    fighterBLabel: string;
    winnerSide: "A" | "B" | null;  // from DB winner_id — NOT computed from scores
    labels: {
      title: string;
      judge: string;
      total: string;
      roundLabel: (round: number) => string;  // e.g. "R1" or "1R"
      overtime: string;
    };
  };
  ```
- Layout (confirmed judge-as-row):
  ```
  ┌─────────────────────────────────────────────────┐
  │ SCORECARD                       김명환 · O'Shay   │
  ├─────────────┬─────┬─────┬─────┬─────┬──────────┤
  │ JUDGE       │ R1  │ R2  │ R3  │ R4* │ Total    │
  ├─────────────┼─────┼─────┼─────┼─────┼──────────┤
  │ VEGETABLE   │10-9 │10-9 │10-9 │ —   │ 30 · 27  │
  │ MASTER KIM  │10-9 │10-8 │10-9 │ —   │ 30 · 26  │
  │ LOGAN       │10-9 │10-9 │10-9 │ —   │ 30 · 27  │
  └─────────────┴─────┴─────┴─────┴─────┴──────────┘
  ```
  R4 column hidden when overtime flag is 0 for all referees. Winner's total marked with `--bp-accent` color.

### L4 — wire-in

`FightCard.tsx` takes optional `scoreCard?: BcScoreCard | null` prop. When non-null AND `displayState === "completed"` AND `winnerSide != null`, renders `<FightScoreCard>` below the result row.

Three call sites (`page.tsx`, `events/[id]/page.tsx`, `events/[id]/fights/[fightId]/page.tsx`) pass `officialCard[i].scoreCard` into each `FightCard`. Each also applies the assumption-11 method filter (`fight.method === 'Decision'`) before passing.

### L5 — i18n (5 keys × 7 locales)

New keys under `scorecard.*`:
1. `scorecard.title` — card heading ("Scorecard" / "점수표")
2. `scorecard.judge` — column header ("Judge" / "심판")
3. `scorecard.total` — column header ("Total" / "합계")
4. `scorecard.roundLabel` — round header with `{round}` interpolation: `"R{round}"` (en), `"{round}R"` (ko) — one key covers rounds 1–4
5. `scorecard.overtime` — R4 header when shown ("OT" / "연장")

Target: 373 → 378 keys per locale. `npm run check:i18n` must pass.

## Testing strategy

**Unit — pure (`parseScoreCardJson` + `fetchBcScoreCard`):**

Per L1 above — 6 cases. Fetch tests mock axios via vitest `vi.mock`.

**Component state-matrix (`FightScoreCard.state-matrix.test.tsx`):**

6 cases (original 4 + 2 from review):
1. 3-referee full decision, winnerSide = "A" → renders 3 rows, accent on A columns
2. 3-referee split (some judges 29-28, others 28-29), winnerSide from DB = "A" → renders without crashing, A column still marked winner (does NOT self-compute)
3. Overtime fight (any `overtimeYn=1`) → R4 column visible with values
4. Null scoreCard input → component returns `null` (guard at render)
5. **[new]** All-zero referee row → rendered with 0-0 entries (no suppression at component level; assumption 9 filters at consumer layer)
6. **[new]** DB-winner disagrees with scorecard totals (controversial decision where BC's judges' numeric majority differs from DB's `winner_id`) — component highlights the DB-winner side, NOT the numeric majority. Regression guard.

**Integration:** no live BC call. L1 tests are fetch-mocked. Live-BC correctness is covered indirectly by the manual acceptance checklist below.

## Caching and timeout (formal requirement)

```ts
const scoreCardCache = new Map<string, { promise: Promise<BcScoreCard | null>; expiresAt: number }>();
const SCORECARD_TTL_MS = 10 * 60 * 1000;

export async function fetchBcScoreCard(scoreSeq: string): Promise<BcScoreCard | null> {
  const now = Date.now();
  const hit = scoreCardCache.get(scoreSeq);
  if (hit && hit.expiresAt > now) return hit.promise;

  const promise = client
    .get(`/findScore.php?score_seq=${scoreSeq}`, {
      timeout: 3_000,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
    .then((res) => parseScoreCardJson(res.data))
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        // Dynamic import so tests don't require Sentry init.
        import("@sentry/nextjs")
          .then(({ captureException }) =>
            captureException(err, { level: "warning", tags: { scope: "bc-scorecard" } }),
          )
          .catch(() => {});
      }
      return null;
    });

  scoreCardCache.set(scoreSeq, { promise, expiresAt: now + SCORECARD_TTL_MS });
  return promise;
}
```

## Boundaries

**Always:**
- Retro tokens (DESIGN.md compliant)
- State-matrix test on new UI component
- Graceful degradation (null return) + Sentry warning-level capture on any BC fetch exception
- Per-fetch 3s timeout + scoreSeq cache
- `npm run check:i18n` green (378 × 7) before commit

**Ask first:**
- If manual testing shows LCP regression > 200ms on event detail page
- If BC endpoint changes response shape
- If Sean wants a toggle / accordion after seeing it live

**Never:**
- Call BC without the 3s timeout override
- Cache in DB (BC is source of truth, no migration)
- Render the scorecard when name-match is ambiguous (risk of inverted display)
- Render without Sentry wire-up for exception paths
- Ship without i18n parity across 7 locales

## Rollout

Single PR against `develop`. No feature flag (purely additive, hidden when scorecard absent).

## Verification checklist

- [ ] `npm run test:fast` green (6 unit + 6 state-matrix = 12 new tests)
- [ ] `npm run build` clean
- [ ] `npm run check:i18n` → 378 × 7
- [ ] Manual: event detail page with Event 286 — 3 decision fights show scorecards, 6 non-decision fights show nothing extra
- [ ] Manual: mobile 360px width — 5-column layout legible without horizontal scroll
- [ ] Manual: disable network → page still renders, scorecard absent, no crash, Sentry event would have been queued (assert log)
- [ ] Manual: concurrent 5× page load in 5 seconds — no BC 429s in server logs (cache working)
- [ ] second-opinion-reviewer sweep (Tier A)

## Changelog from spec review

Reviewer verdict v1: BLOCK (2 blockers, 3 major, 2 minor). v2 changes:

| Reviewer finding | Resolution |
|---|---|
| **[blocker]** L2 attaches to wrong type (`BcFightData` has no `fightSeq`) | §L2 rewritten to attach `scoreCard` on `BcOfficialFight` at the `fetchBcOfficialEventCard` site |
| **[blocker]** Up to 9+1 uncached BC fetches with 20s timeout per render | §Caching + assumption 10 added: 3s per-fetch timeout + 10-min scoreSeq cache + `Promise.allSettled` |
| **[major]** Silent correctness risk on name-match failure | Assumption 9 added: match failure → suppress entire scorecard |
| **[major]** Boundary contradiction (swallow vs never-swallow-silently) | §L1 now requires Sentry warning capture on exception paths |
| **[major]** Test matrix missing 2 cases | §Testing strategy now lists 6 component cases including all-zero referee + DB/BC winner disagreement |
| **[minor]** i18n baseline 373 not 380, 5 keys named not 7 | §L5 corrected: 5 keys (`roundLabel` uses `{round}` interpolation), target 373 → 378 |
| **[minor]** Wasted BC calls on KO/TKO/Sub fights | Assumption 11 added: filter by `method === 'Decision'` at consumer site |
| **[minor]** 360px density unclear | §AC7 + §L3 confirm judge-as-row layout, 5-column max |
