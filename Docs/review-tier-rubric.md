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
