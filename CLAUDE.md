@AGENTS.md
@DESIGN.md
@CURRENT_STATE.md

# Review gate

Every commit / PR goes through a Codex CLI review pass. **Never call the
OpenAI API directly for reviews** — use `scripts/codex-review.sh`. Full
profile table, escalation rules, and failure modes live in
[`Docs/codex-review.md`](Docs/codex-review.md). Read that file before your
first review of the session.
