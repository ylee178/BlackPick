@AGENTS.md
@DESIGN.md
@CURRENT_STATE.md

# Session start (MANDATORY — run before any task work, including post-`/clear`)

1. **Read [`TASKS.md`](TASKS.md) end-to-end.** This is the durable task
   manifest. The in-session `TaskList` tool is volatile — `/clear` wipes
   it. TASKS.md is the source of truth.
2. **Read `CURRENT_STATE.md`** (imported above) — production snapshot
   and branch status.
3. **Read the latest `Wiki_Sean/BlackPick/<date>-*.md`** — last session's
   decisions, context behind choices.
4. **Restore the in-session TaskList tool** from TASKS.md §Current-focus
   actionable sub-tasks via `TaskCreate`. Only restore the **current
   branch's** sub-tasks, not the full roadmap.
5. **Sanity-check**: if `CURRENT_STATE.md` disagrees with TASKS.md (e.g.
   something marked done in one place but pending in the other), flag to
   Sean. Do not silently trust either side.
6. **Update TASKS.md immediately on every task transition** — not at
   session end. Stale manifest = process failure.

# Review gate

Every code PR goes through `scripts/codex-review.sh`, which
**auto-falls-back** to `scripts/gpt-review.sh` (OpenAI `/v1/responses`)
when Codex CLI is blocked. Do NOT call the OpenAI API from anywhere
else. Docs-only PRs (TASKS.md, wiki, Docs/) are explicitly exempt from
the gate — self-review OK. Full profile table, escalation rules, and
failure modes live in [`Docs/codex-review.md`](Docs/codex-review.md).
Read that file before your first review of the session.
