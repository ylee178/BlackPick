@AGENTS.md
@DESIGN.md
@CURRENT_STATE.md

# Core decision rule — Quality-maximizing path (meta-rule above everything else)

Every decision branch, pick the **path that makes the design the strongest**. "Ship fast" / "small enough to skip" / "can patch later" / "probably fine" / "that's just a P3" are **never sufficient justification** on their own. BlackPick is Sean's real product — users, not just latency, pay for a bad call.

Concrete application:
- Breadth-first scan vs depth-first dig → **depth**.
- Mutation vs read-only evidence gathering → **read-only first**.
- Internal confidence vs external review → **external review**.
- Simple-but-partial vs complete-but-tedious → **complete-but-tedious**.
- Cheap model vs correct model for the task → **correct model** (see §Review gate profile escalation).
- 1 issue flagged vs 4 issues flagged → **fix all 4**, never stop at the loud one.
- Shortcut that works vs canonical approach → **canonical approach**.
- "The cheap profile was enough last time" → re-evaluate the current task, not the last one.

This rule sits **above** everything else in this file — it tells you *how* to choose between priorities when they tie, not what to prioritize in the abstract. If a shortcut is tempting, the answer is almost always no.

Pattern lifted from `SETS_Stock/CLAUDE.md` Core Principle #7 (Sean 2026-04-12). Same operator, same standard across all of Sean's projects.

# Session start (MANDATORY — run before any task work, including post-`/clear`)

1. **Read [`TASKS.md`](TASKS.md) end-to-end.** This is the durable task
   manifest. The in-session `TaskList` tool is volatile — `/clear` wipes
   it. TASKS.md is the source of truth.
2. **Read `CURRENT_STATE.md`** (imported above) — production snapshot
   and branch status.
3. **Read the latest session log at `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/<date>-*.md`**
   — last session's decisions, context behind choices. These logs
   live **outside** the BlackPick repo at the external Wiki_Sean
   path; never write or read from any in-repo `Wiki_Sean/` directory.
   See the `feedback_wiki_log_location` memory entry for the rule.
4. **Restore the in-session TaskList tool** from TASKS.md §Current-focus
   actionable sub-tasks via `TaskCreate`. Only restore the **current
   branch's** sub-tasks, not the full roadmap.
5. **Sanity-check**: if `CURRENT_STATE.md` disagrees with TASKS.md (e.g.
   something marked done in one place but pending in the other), flag to
   Sean. Do not silently trust either side.
6. **Update TASKS.md immediately on every task transition** — not at
   session end. Stale manifest = process failure.

# Review gate

**Primary review path**: the user-level `second-opinion-reviewer`
subagent. Invoke via natural language:

> Use the second-opinion-reviewer subagent to review <artifact>

Model: Sonnet 4.6 default, Opus 4.6 escalation on low-confidence
BLOCK. Usage guide:
[`/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`](/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md).

The subagent gives fresh-context, tool-grounded, non-rubberstamping
review of specs, plans, and implementations. It replaces the
external GPT API / Codex CLI review path that became too expensive
to run routinely under the Max subscription (cumulative spend hit
~$8.93 during the Branch 4 review loop on 2026-04-12).

**Honest caveat**: this subagent is a SUPPLEMENT to cross-family
external review (GPT / Codex / Gemini), not a full replacement. For
high-stakes calls — auth, RLS, migrations touching money/score,
share-page enumeration — still reach for external review when the
cost is justified and the external path is available. The agent's
mandatory `## What this review cannot catch` output section is an
honest reminder of its shared-training-weights blind spot.

**Historical fallback only** (deprioritized for cost):
`scripts/codex-review.sh` auto-falls-back to `scripts/gpt-review.sh`
(OpenAI `/v1/responses`). Both scripts stay in-repo for break-glass
use but are no longer the default. Full profile table and failure
modes in [`Docs/codex-review.md`](Docs/codex-review.md). Do NOT call
the OpenAI API from anywhere else.

Docs-only PRs (TASKS.md, wiki, Docs/) remain exempt from the review
gate — self-review OK.
