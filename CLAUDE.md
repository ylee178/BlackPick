@AGENTS.md
@DESIGN.md
@CURRENT_STATE.md

# Where to look

- **What's next / what to work on** → [`TASKS.md`](TASKS.md). Living task
  manifest, survives session clears. Update it as things land; do NOT
  inline its contents here. Treat it as the entry point for "what
  should I do?" questions at session start.
- **What just shipped / current prod state** → `CURRENT_STATE.md`
  (imported above). Historical snapshot of the latest session.
- **Deeper session context** → `Wiki_Sean/BlackPick/<date>-<slug>.md`.
  One entry per session, indexed by date.

# Review gate

Every commit / PR goes through a Codex CLI review pass. **Never call the
OpenAI API directly for reviews** — use `scripts/codex-review.sh`. Full
profile table, escalation rules, and failure modes live in
[`Docs/codex-review.md`](Docs/codex-review.md). Read that file before your
first review of the session.
