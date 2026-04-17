# Spec — Fight scorecard display

_2026-04-17 · Branch: `feature/fight-scorecard-display` · **v3** after second-opinion-reviewer BLOCK (v1) + Codex CLI tiebreaker BLOCK (v2)_

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

## Assumptions (13 total — v3 revises 9–11 and adds 12–13 after Codex tiebreaker)

1. **Placement**: scorecard lives inside `FightCard.tsx` below the result row. Same component works on home + detail + fight detail.
2. **Visibility default**: expanded when present. No toggle.
3. **Data fetch**: server-side. **NOT inside `fetchBcOfficialEventCard`** (that function has no DB-method visibility — see v3 §L2 redesign). Scorecards are fetched by a separate helper that the three pages call AFTER they already have both the official card and the DB fights in scope.
4. **Per-fight cost**: ≤ 1 extra HTTP to BC per decision-with-scorecard fight, bounded by the per-fetch 3s timeout + scoreSeq cache.
5. **Retro styling**: grid table inside `retroPanelClassName({ tone: 'flat' })`. No new additions to `ui/retro.tsx`.
6. **Overtime column**: round 4 column shown only if any referee's `overtimeYn*` is `1`.
7. **Fighter identity at render time**: BC's positional `score*1*` / `score*2*` reconciled to BlackPick DB fighters — via a new **strict two-sided unique-match** helper, not the `chooseFightRow` highest-overlap fallback (which was designed for card-sync + tolerant by intent).
8. **Winner highlight**: drawn from `fight.winner_id` (DB-authoritative). When `winner_id` is null and `status = completed`, treat as **draw** (see assumption 13).
9. **[v3 revised — name-match defensive failure]** Strict match requires BOTH `official.fighterA` and `official.fighterB` to normalize-match exactly one DB fighter among `fight.fighter_a` / `fight.fighter_b` — and the two sides must resolve to DIFFERENT DB fighters. If any of those conditions fail, the scorecard is **suppressed for that fight only** (neighbours unaffected). Keyed by `dbFight.id`, not positional index — so one mismatch cannot shift scorecards onto adjacent fights.
10. **[v3 revised — caching + timeout]** Per-fetch timeout overridden to **3000ms** (not 20s global). Separate TTLs by outcome: **success → 10 minutes**, **error (exception / non-JSON) → 60 seconds** — avoids 10-minute blanks after a single transient BC 5xx. `{success:false}` envelope is a legitimate "no scorecard" and uses the success TTL. Module-level `Map` is per-process (not cross-instance on Vercel); acceptable for dev + single-instance builds, limited reuse across Vercel edge replicas.
11. **[v3 revised — method filter at consumer]** Pre-filter on `fight.method === 'Decision'` happens at the **consumer site** (page.tsx / events/[id] / fights/[fightId]) where DB method is available. `fetchBcOfficialEventCard` does NOT invoke `fetchBcScoreCard`. Non-decision / null-method / cancelled fights never trigger a scorecard fetch.
12. **[new — parallel dispatch semantics]** `Promise.allSettled` bounds total batch time to `max(individual-fetch-times) ≤ 3s`. It is NOT a non-blocking render — the page still awaits the slowest fetch. The "doesn't stall siblings" claim is about rejection propagation, not response latency. Page render latency worst-case = 3s + existing BC card fetch time, not 20s+.
13. **[new — draw rendering]** Completed fights with `winner_id = null` render with `winnerSide = "draw"`. FightScoreCard shows the full grid with **both columns neutral** (no accent). This is a valid state (rare but real — split decision draws, technical draws) and the codebase already handles it at `fighters/[id]/page.tsx:74`. Prior v2 language of "winnerSide: A | B | null" implicitly coerced draws into the null-suppression branch — a regression of existing behavior.

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

### L2 — **v3 redesign** — consumer-side helper, NOT inside `fetchBcOfficialEventCard`

`fetchBcOfficialEventCard` stays unchanged (doesn't know DB method, can't pre-filter, has too many other callers). Instead:

New helper in `src/lib/bc-scorecards.ts` (NEW file — isolates the matching + fetch orchestration from the existing card parser):

```ts
import type { BcOfficialFight, BcScoreCard } from "./bc-official";
import { fetchBcScoreCard } from "./bc-official";

type DbFightRef = {
  id: string;
  method: string | null;
  fighter_a: { name: string | null; name_en: string | null; name_ko: string | null; ring_name: string | null };
  fighter_b: { name: string | null; name_en: string | null; name_ko: string | null; ring_name: string | null };
};

type ScoreCardResolution =
  | { kind: "scored"; scoreCard: BcScoreCard | null /* null = BC returned no card */ }
  | { kind: "suppressed-no-match" }
  | { kind: "suppressed-non-decision" }
  | { kind: "suppressed-no-method" };

/**
 * Keyed by DB fight id — not positional index — so one mismatched
 * fight cannot shift scorecards onto neighbours (v3 blocker #2).
 */
export async function resolveScoreCardsByDbFightId(
  dbFights: readonly DbFightRef[],
  officialFights: readonly BcOfficialFight[],
): Promise<Map<string, ScoreCardResolution>>;
```

Internals:
1. For each `dbFight`, compute `kind` first:
   - `method === null` → `suppressed-no-method`
   - `method !== 'Decision'` → `suppressed-non-decision`
2. For remaining fights, run **strict two-sided match** (v3 blocker #2). Each side must uniquely match one BC fighter via `normalizeName` across `{name, name_en, name_ko, ring_name}`. If ambiguous or not-found on either side → `suppressed-no-match`.
3. For matched Decision fights, collect `fightSeq` values and call `fetchBcScoreCard` in parallel via `Promise.allSettled`. Each promise already has the 3s timeout + Sentry wrap from L1.
4. Return `Map<dbFight.id, ScoreCardResolution>` so the consumer can render `scored` resolutions and surface nothing for suppressed ones.

Consumer usage:

```ts
const scoreCardResolutions = await resolveScoreCardsByDbFightId(fights, officialCard);

<FightCard
  fight={fight}
  scoreCard={
    scoreCardResolutions.get(fight.id)?.kind === "scored"
      ? (scoreCardResolutions.get(fight.id) as { scoreCard: BcScoreCard | null }).scoreCard
      : null
  }
/>
```

**Why the redesign is mandatory** (Codex v2 blockers):

- **B1 — method filter at the wrong site.** `fetchBcOfficialEventCard` has no DB handle, so previous v2 plan to filter there was a design contradiction. Moving the filter + fetch to a consumer-invoked helper keeps the existing card parser free of DB dependency.
- **B2 — name-match enforcement.** `chooseFightRow` was built for `sync-bc-event-card` where tolerant fallbacks are appropriate (we WANT a best-guess match for card alignment). Rendering scorecards has the opposite risk profile — an ambiguous match silently displays inverted scores. The strict two-sided matcher is a different function for a different contract.

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
    winnerSide: "A" | "B" | "draw";  // v3: "draw" for completed+winner_id=null — render both neutral
    labels: {
      title: string;
      judge: string;
      total: string;
      roundLabel: (round: number) => string;  // e.g. "R1" or "1R"
      overtime: string;
    };
  };
  ```
  The component never receives `null` — suppression is the CALLER's job (v3 assumption 9). If scoreCard is null at the call site, `FightCard` skips rendering `<FightScoreCard>` entirely.
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

## Caching and timeout (formal requirement — v3 revised for Codex M1)

Success vs error paths use **separate TTLs** so a transient BC 5xx doesn't blank a legitimate scorecard for 10 minutes.

```ts
const SUCCESS_TTL_MS = 10 * 60 * 1000;   // 10 min for a landed parse result (null envelope included)
const ERROR_TTL_MS = 60 * 1000;          // 60 sec for exceptions — retry quickly after transient BC hiccups
type CacheEntry = { value: BcScoreCard | null; expiresAt: number; kind: "success" | "error" };
const scoreCardCache = new Map<string, CacheEntry>();

export async function fetchBcScoreCard(scoreSeq: string): Promise<BcScoreCard | null> {
  const now = Date.now();
  const hit = scoreCardCache.get(scoreSeq);
  if (hit && hit.expiresAt > now) return hit.value;

  try {
    const res = await client.get(`/findScore.php?score_seq=${scoreSeq}`, {
      timeout: 3_000,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const parsed = parseScoreCardJson(res.data);
    scoreCardCache.set(scoreSeq, {
      value: parsed,
      expiresAt: now + SUCCESS_TTL_MS,
      kind: "success",
    });
    return parsed;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      // Dynamic import — tests don't require Sentry init.
      void import("@sentry/nextjs").then(({ captureException }) =>
        captureException(err, { level: "warning", tags: { scope: "bc-scorecard" } }),
      ).catch(() => {});
    }
    scoreCardCache.set(scoreSeq, {
      value: null,
      expiresAt: now + ERROR_TTL_MS,
      kind: "error",
    });
    return null;
  }
}
```

Note: the cache is **per-process**, not cross-instance. Vercel edge / serverless replicas will each have their own Map. Under Vercel fanout this reduces cache hit rate but never corrupts data — worst case is an extra fetch, never a stale scorecard bleeding across users.

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

## Rollout — **v3 split into 2 PRs** (Codex recommendation)

The risky external-data semantics (fetch + caching + strict matching) and the additive UI are cleanly separable. Splitting gives us a verification checkpoint before rendering.

**PR A — `feature/bc-scorecard-plumbing`** (land first)
- L1 types + `parseScoreCardJson` + `fetchBcScoreCard` with caching + Sentry
- L2 `src/lib/bc-scorecards.ts` — `resolveScoreCardsByDbFightId` + strict two-sided matcher
- Unit tests for L1 (6 cases) + L2 matcher (5-6 cases: unique match / ambiguous / non-decision / no-method / draw / name-missing)
- **No UI changes. No i18n changes.** Fully dormant in production until PR B wires it up.

**PR B — `feature/fight-scorecard-display` (rebased on A)**
- L3 `FightScoreCard` component + state-matrix tests
- L4 wire into `FightCard` + 3 page call sites (passing `scoreCardResolutions.get(fight.id)`)
- L5 i18n (5 × 7)
- Manual acceptance checks

Both PRs against `develop`. No feature flag — PR A is pure lib addition with zero consumer, PR B is purely additive UI with graceful absence.

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
