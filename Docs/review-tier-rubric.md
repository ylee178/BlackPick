# Review tier rubric (2026-04-13, research-grounded)

> **Why this file exists**: CLAUDE.md § Review gate names the
> `second-opinion-reviewer` subagent as the primary review path. This
> file holds the 3-tier decision-routing table that sits below that
> choice, plus the research citations that justify the routing.
> CLAUDE.md keeps a thin pointer to this file so the root config
> stays readable.

Self-bias is structural per Yan et al. 2025 and cannot be prompted
away; tool grounding + diverse framing per Dipper 2024 is the only
robust mitigation on verifiable tasks; on findings-set tasks like
code review this is supplemented by cross-family review on
irreversible decisions.

## Tier A — Routine (~85%)

Baseline `second-opinion-reviewer` subagent invocation. Default for
ordinary spec, plan, and implementation reviews. Cost: zero on the
subscription; single fresh-context pass with tool grounding.

## Tier B — Elevated (~10%)

Same subagent + one or more of the prompt framings below. **Template
menu, NOT forced parallel** — pick the framing that matches the
artifact; run multiple only when disagreement across framings would
itself be signal worth the token cost (Dipper's +10pt evidence is on
verifiable single-answer tasks, not findings-set code review — the
mechanism may transfer but has not been empirically measured on
this project's review artifacts, so defaulting to "always parallel"
would harden an untested recommendation into a rule).

1. **Red-team framing**: "This artifact contains at least 3 critical
   defects. Find them with file:line evidence. If you genuinely
   cannot, explain why your prior belief is calibrated."

2. **Forensic archive retrieval**: "Read any POSTMORTEM entries,
   memory files, session logs, and prior decision records available
   in this project. Has this artifact's pattern failed before?
   Quote specific prior failures with file:line citations."

3. **Oracle verification**: "Every finding must include a runnable
   verification (test command, grep command, file:line inspection,
   or equivalent tool-grounded check). Findings without a runnable
   verification are discarded."

Use Tier B when the artifact's stakes exceed routine but none of
the Tier C triggers fire. Typical examples: larger spec rewrites,
non-blessed structural changes, plans that block multiple
downstream tasks, review of a design doc that multiple future
specs will depend on.

## Tier C — Irreversible high-stakes (~5%)

Tier B framings (all three, in parallel as independent invocations)
**+ cross-family external review (one of Codex / GPT / Gemini)
mandatory**. The subagent alone cannot catch shared-family
blindspots on these triggers — the research is explicit that
structural self-bias is not removable by prompting.

**Hard trigger list** (ANY one fires Tier C — category headings are
universal patterns, copied verbatim from the shared rubric;
BlackPick-specific examples appear as sub-bullets):

1. **Rotation or change of the project's canonical "blessed"
   production pointer** (whatever file or record names the active
   production artifact).
   - Promoting `develop → main` (release PR that GitHub Actions
     deploys to blackpick.io)
   - Switching the production Vercel project alias or canonical URL
   - Any manual touch to `main` that bypasses the release PR flow

2. **Change to a scoring, evaluation, or selection formula that
   would invalidate historical leaderboard / experiment state /
   prior result comparability.**
   - `users.score` / `current_streak` / `best_streak` /
     `hall_of_fame_count` / `p4p_score` calculation logic
   - Prediction winner-correctness rules
   - Ranking tiebreakers on the leaderboard
   - BC-weighted prediction multipliers (when introduced)

3. **Change to any kill-switch, risk gate, or safety-critical
   threshold whose failure mode is financial or otherwise
   irreversible.**
   - RLS policies on `users`, `predictions`, `fights`, `events`,
     `fighter_comments`
   - `proxy.ts` (née `middleware.ts`) auth gating
   - Signup-gate modal server-side check
   - Prediction lock gate (`api/predictions/route.ts:60-73`)
   - `ring_name` uniqueness constraint / case-insensitive index
   - Admin-only endpoint authorization checks

4. **Direct modification of a frozen / blessed / immutable
   production artifact** (whatever file the project treats as
   never-touched-without-ceremony).
   - `supabase/migrations/001_schema.sql` (baseline — never touched
     without ceremony)
   - PROD Supabase project (`nxjwthpydynoecrvggih`) schema applied
     out-of-band from a migration file
   - Google/Facebook OAuth client IDs, redirect URIs
   - DNS / nameserver records for `blackpick.io`
   - Production Vercel environment variables touched outside the
     `vercel env` CLI

5. **ADR-level architectural decision** (layer structure change,
   new infrastructure launch, audit final-lock decision).
   - Next.js major version bump (15 → 16 → 17…)
   - React major version bump
   - Adding a new DB table (not column — table)
   - Adding or removing an i18n locale
   - Switching auth providers
   - New third-party integrations (payments, analytics, email)
   - Splitting or merging Supabase projects

6. **PRD / durable-plan hard modification that creates a new
   cross-phase dependency or invalidates a prior phase's exit
   criteria.**
   - Restructuring Phase 0–7 in `TASKS.md`
   - Moving a branch between phases in a way that breaks exit
     criteria
   - Changing the launch gate (Phase 6) criteria
   - Adding a Phase N dependency on Phase N+1 work

7. **Once-per-phase irreversible verification-gate verdict**
   (e.g., promotion gate to the next phase, pass/fail decision that
   cannot be reopened without rerunning the phase).
   - Phase 0 closure (done via PR #14)
   - Phase 1 closure (all 9 branches must ship)
   - Phase 4 DB migration freeze
   - Phase 6 launch gate verdict (production-readiness sign-off)
   - Any "release/YYYY-MM-DD" PR ready-to-merge verdict

8. **Pre-first-run constants review for any production-stage
   activation** (cron / launchd activation, first live execution,
   domain cutover, feature-flag GA, anything that changes state in
   a system users or capital are exposed to).
   - First PROD apply of any migration
   - First Facebook OAuth provider activation (Meta console +
     Supabase enable)
   - First Resend email send (Phase 3 email infra)
   - First Sentry DSN activation
   - First GitHub Actions cron enable (Phase 7 automation)
   - First production smoke after a release PR merge

## File-based dialogue pattern (how to run round 2+ reviews in BlackPick)

The generic pattern is defined upstream in
`~/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`
§ Multi-round file-based dialogue pattern. The generic doc covers
the WHY (subagent terminates after one response; SendMessage is
not loadable in non-experimental Claude Code runtimes; the
`agentId` hint at the end of reviewer output is template-printed
and informational only), the directory convention, the mandatory
"Prior dialog rounds" clause block in every round-N+1 prompt, and
the defect-class pattern detection mechanism for N ≥ 2. Read that
section first.

This BlackPick section collapses the project-local decisions so a
session can run a dialog without re-deriving them.

### Where review transcripts live

- **Single-round reviews (default)**: no ceremony needed. The
  reviewer's output goes into the main conversation transcript
  and TASKS.md / the session log captures the summary. Skip the
  directory ceremony and just dispatch the subagent.
- **Multi-round dialogues**: save under
  `/Users/uxersean/Desktop/BlackPick/reviews/BlackPick/<YYYY-MM-DD>_<topic>_dialog/`
  with files `round_<N>_prompt.md` and `round_<N>_review.md`. Note
  the **inner `BlackPick/` subfolder** — this is not a typo, it is
  the project-isolation visual guard mandated by the generic usage
  doc at `~/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`
  § Directory convention. Every project on this machine uses the
  same `<project>/reviews/<project>/<topic>_dialog/` shape so any
  absolute path a reviewer encounters makes its owning project
  unambiguous at a glance. Cross-project contamination is prevented
  by (a) the inner project-name segment making any mismatch visually
  obvious and (b) the reviewer agent's Hard Invariant #1 project
  isolation rule blocking reads that resolve outside the inferred
  project root.
- **`reviews/` directory is gitignored** (`.gitignore` entry added
  in the commit that introduced this section). Dialog transcripts
  stay local — they are session-noise and should not pollute git
  history.
- **Session-log summaries** (not raw review transcripts) still live
  at `/Users/uxersean/Desktop/Wiki_Sean/BlackPick/<YYYY-MM-DD>-<topic>.md`
  per the `feedback_wiki_log_location` memory entry. Session logs
  are condensed narrative records; dialog transcripts are raw
  reviewer output for audit.

### Profile routing (maps tier choice to dispatch model)

When dispatching the reviewer, explicitly name the profile in the
prompt so downstream tooling can trace which tier was used:

| Profile | Tier default | Use for |
|---|---|---|
| `blackpick_lite` | Tier A on trivial artifacts | Lint cleanup, single-file CSS/copy tweaks, isolated component fixes |
| `blackpick` | Tier A routine, Tier B with framings | Feature PRs, hook/store refactors, multi-file UI, most Phase 1–4 branch work |
| `blackpick_max` | Tier C | Auth/RLS, Supabase migrations, money/score/streak math, share-page enumeration, anything firing the Tier C trigger list above |

Dispatch syntax (used as the prompt to the `Agent` tool call with
`subagent_type: "second-opinion-reviewer"`):

```
Use profile <blackpick_lite|blackpick|blackpick_max>. Review <artifact>
against BlackPick conventions (CLAUDE.md / AGENTS.md / DESIGN.md /
Docs/review-tier-rubric.md). Return the structured verdict per
~/.claude/agents/second-opinion-reviewer.md.
```

The reviewer auto-reads `CLAUDE.md` and therefore inherits the
Quality-Maximizing Path rule, DESIGN.md Typography minimum,
`feedback_*` memory entries, and this tier rubric. No manual
handoff.

### When to dispatch round 2

Default BlackPick policy:

| Round 1 result | Action |
|---|---|
| APPROVE, or APPROVE_WITH_CHANGES with only [minor] findings that are trivially mechanical | Fix inline, no round 2. Self-verify, ship. |
| APPROVE_WITH_CHANGES with any [major] finding | Fix all findings per Quality-Maximizing Path + dispatch round 2 to verify the fold |
| Any [blocker] finding | Fix + round 2 mandatory. The blocker fold might introduce new issues. |
| Shared-training-bias concern flagged by the reviewer itself | Consider Tier C escalation instead of another in-family round — cross-family review is the only reliable mitigation per Yan 2025 |
| Rounds 1+2 surface the SAME defect class | Systemic authoring pattern. Stop iterating the artifact, fix the workflow. |
| Round count ≥ 5 | Stop. Structural problem the reviewer won't fix. Escalate to human redesign. |

### Dispatch recipe (round 2 concrete steps)

```
1. mkdir -p /Users/uxersean/Desktop/BlackPick/reviews/BlackPick/<YYYY-MM-DD>_<topic>_dialog

2. Save round 1 verbatim — Write the full round 1 reviewer
   output into round_1_review.md with YAML frontmatter
   (artifact, reviewer, ran_at, verdict, confidence, framing,
   tier, dialog_round: 1).

3. Fold findings — apply fixes per Quality-Maximizing Path. Run
   local gates: build, test:fast, check:i18n, re-grep for any
   pattern the reviewer flagged.

4. Write round 2 prompt — round_2_prompt.md must open with the
   verbatim "Prior dialog rounds" mandatory clause block from
   the generic doc § Round N+1 prompt — mandatory clauses, with
   the path to round_1_review.md filled in. Follow the mandatory
   clauses with a brief description of WHICH round 1 findings
   were folded and HOW, plus any explicit observations you want
   the reviewer to verify.

5. Dispatch — Agent tool with subagent_type
   "second-opinion-reviewer" and the round_2_prompt.md contents
   as the prompt. Profile as chosen per § Profile routing above.

6. Save round 2 verbatim — round_2_review.md with dialog_round:
   2, prior_rounds: [round_1_review.md],
   verdict_delta_from_round_1: "<one-line>",
   defect_classes_recurring: [<list or empty>].

7. If round 2 surfaces new blockers, go to round 3 (repeat steps
   4–6). If clean or minors only, fold and ship.
```

The mandatory clause block in step 4 is load-bearing — it tells
the fresh reviewer instance to read the prior rounds as its first
tool calls, inherit the accumulated finding list, but still
verify every claim against HEAD. Without the block, the round 2
reviewer starts fresh with no prior context and re-litigates
settled findings.

### Token cost awareness

Rounds 1–3 cost nothing extra on the Max subscription. Rounds 4–5
the cumulative prior-round context starts to approach the
reviewer's useful-context limit; consider whether the artifact
actually needs more review or a redesigner. Past round 5 the
generic doc mandates compression (write a
`round_5_compressed_summary.md`, archive rounds 1–5, start round 6
reading only the summary + most recent review).

If you hit compression, stop and ask whether the artifact needs a
reviewer or a redesigner — compression is a signal that review
iteration has diminishing returns.

## Research citations (why prompting alone is insufficient)

Keep these so future maintainers can trace the reasoning.

- **Yan et al. 2025** (arxiv 2508.06709) — self-bias is structural,
  not rubric-driven; same prompt, same rubric, nine judges,
  family-bias persists.
- **Huang et al. 2024** (arxiv 2310.01798) — intrinsic
  self-correction often degrades outside verifiable-answer tasks.
- **Kamoi et al. 2024** TACL critical survey — tool grounding is
  the only robust mitigation in general tasks; no major work shows
  successful prompt-only self-correction under fair settings.
- **Rethinking Prompt-based Debiasing** (arxiv 2503.09219) — prompt
  debiasing increases evasion ("Unknown" responses), not real bias
  reduction.
- **Dipper** (arxiv 2412.15238) — prompt diversity yields +10pt on
  verifiable-answer tasks (MATH, MMLU-STEM); supports Tier B
  template menu but authors disclaim transfer to findings-set
  tasks like code review.

## Measurement TODO (data-over-opinion)

Tier B multi-variant versus single-variant effectiveness has NOT
been empirically A/B-tested on code-review artifacts in any of
Sean's projects. Dipper's positive result is on verifiable-answer
tasks and may not fully transfer. BlackPick should measure its
next Tier B reviews both ways (same artifact, single variant vs.
parallel framings) before hardening a parallel-execution default.
Until measurement is done, Tier B's "run multiple framings when
useful" recommendation is based on research analogy plus
observable depth-of-review effect, not local empirical data.
