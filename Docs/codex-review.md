# Review gate — HISTORICAL FALLBACK (deprioritized 2026-04-13)

> **Status**: deprioritized as of 2026-04-13. Primary review path is
> now the user-level `second-opinion-reviewer` subagent. Invoke via
> natural language:
>
> > Use the second-opinion-reviewer subagent to review <artifact>
>
> Model: Sonnet 4.6 default, Opus 4.6 escalation on low-confidence
> BLOCK. Usage guide:
> `/Users/uxersean/Desktop/Wiki_Sean/Tech/second_opinion_reviewer_usage.md`.
>
> **Why this path was deprioritized**: Codex CLI + `gpt-review.sh`
> became too expensive to run routinely under the Max subscription.
> Cumulative OpenAI spend hit ~$8.93 during the Branch 4 review loop
> on 2026-04-12 before Sean flagged the cost.
>
> **When to still reach for this path**: the subagent is a
> SUPPLEMENT to cross-family external review, not a full
> replacement. For high-stakes calls where a different model
> family's opinion is worth the spend — auth, RLS, money/score
> migrations, share-page enumeration risk — use this file's
> escalation table. The scripts (`scripts/codex-review.sh`,
> `scripts/gpt-review.sh`) are kept in-repo for break-glass use but
> are no longer the default.
>
> The rest of this file is the original profile table, escalation
> rules, and failure modes. Treat it as reference material for the
> historical fallback path.

---

# Code review gate

**Codex CLI is the primary reviewer** for this project. When Codex CLI
is unavailable (rate-limited, broken, session dead, whatever) the
**only sanctioned fallback** is `scripts/gpt-review.sh`, which calls
the OpenAI `/v1/responses` endpoint directly with the same profile
vocabulary. Any other direct-to-API path or silent local-model swap
is forbidden — both must be explicitly invoked by name.

See the "Fallback: gpt-review.sh" section at the bottom of this doc.

## Helper

Use `scripts/codex-review.sh` rather than calling `codex` directly:

```bash
# Diff review against develop (default profile, default base)
scripts/codex-review.sh review

# Diff review against a different base / target
scripts/codex-review.sh review --base main
scripts/codex-review.sh review --commit HEAD
scripts/codex-review.sh review --uncommitted

# Free-form architectural question
echo "should the share page use ISR or static?" | scripts/codex-review.sh
```

## Profiles — match effort to task

Profiles live in `~/.codex/config.toml` under `[profiles.blackpick*]`. Pick
the cheapest profile that fits the task. Don't burn `max` for shallow diffs.

| Profile          | Model           | Effort | Use for                                                                                  |
|------------------|-----------------|--------|------------------------------------------------------------------------------------------|
| `blackpick_lite` | `gpt-5.4-mini`  | medium | lint/i18n cleanup, single-file CSS/copy tweaks, isolated component fixes                 |
| `blackpick`      | `gpt-5.4`       | high   | feature PRs, hook/store refactors, multi-file UI changes (default)                       |
| `blackpick_max`  | `gpt-5.4`       | xhigh  | auth/RLS/admin paths, Supabase migrations, money/score/streak math, share-page security  |

Override per call:

```bash
scripts/codex-review.sh review lite                # cheap lane
scripts/codex-review.sh review max --base main     # premium lane vs main
echo "..." | scripts/codex-review.sh max           # premium free-form
CODEX_PROFILE=blackpick_max scripts/codex-review.sh review   # via env var
```

## When to escalate

| Diff touches…                                     | Profile          |
|---------------------------------------------------|------------------|
| pure lint/format/i18n keys                        | `blackpick_lite` |
| client component, hook, store, layout, copy       | `blackpick`      |
| `src/lib/auth/**`, `proxy.ts`, RLS-affecting SQL  | `blackpick_max`  |
| `supabase/migrations/**`                          | `blackpick_max`  |
| score / streak / ranking math                     | `blackpick_max`  |
| share-page enumeration / public read paths        | `blackpick_max`  |

If a diff straddles tiers, pick the higher one. The cost difference is not
worth shipping a security regression.

## Never

- Never commit a feature/fix without a review pass (Codex primary, gpt-review.sh fallback).
- Never call the OpenAI API from ad-hoc scripts or new wrappers. Either `codex-review.sh` OR `gpt-review.sh` — those two and only those two.
- Never use `blackpick_max` for one-line questions or single-file CSS edits.
- Never bypass review for "trivial" auth/RLS/migration changes — those are exactly the ones `max` exists for.

## Failure modes

- **`codex: command not found`** — install with `npm i -g @openai/codex`,
  or check that `/Applications/Codex.app/Contents/Resources/codex` exists.
- **`Logged in using ChatGPT`** is the expected auth state. If
  `codex login status` shows otherwise, run `codex login`.
- **`--base <BRANCH>` cannot be used with `[PROMPT]`** — that's a `codex
  review` clap rule. The wrapper handles it: in review mode it forwards
  extra args directly without injecting a prompt.
- **Empty output** — wrapper exits 5. Re-run; if it persists, check
  `~/.codex/logs_2.sqlite` and ask Sean.

## Fallback: `gpt-review.sh` (when Codex is blocked)

Same profile vocabulary, same invocation UX, different backend. Calls
`https://api.openai.com/v1/responses` with the BlackPick review prompt.
Only use when Codex CLI is actually down — this is not a cost-saving
measure, it's an availability measure.

```bash
# Diff review (defaults to develop, like codex-review.sh)
scripts/gpt-review.sh review
scripts/gpt-review.sh review --base main
scripts/gpt-review.sh review --commit HEAD
scripts/gpt-review.sh review --uncommitted

# Profile selection (same meaning as codex profiles)
scripts/gpt-review.sh review lite   # gpt-5.4-mini + medium
scripts/gpt-review.sh review max    # gpt-5.4 + xhigh

# Free-form prompt via stdin
echo "should the share page use ISR?" | scripts/gpt-review.sh
```

### Profile → model mapping

| Profile          | Model          | Reasoning effort | Use for                                    |
|------------------|----------------|------------------|--------------------------------------------|
| `blackpick_lite` | `gpt-5.4-mini` | `medium`         | CSS / copy / placeholder / i18n key cleanup |
| `blackpick`      | `gpt-5.4`      | `high`           | feature PRs, hook refactors, client UI     |
| `blackpick_max`  | `gpt-5.4-pro`  | `high`           | DB migrations / auth / RLS / money / Sentry hooks |

`gpt-5.4-pro` is the dedicated "deep reasoning" model on Sean's account — the same model SETS_Stock uses for its `sets_stock_max` profile. It's ~8× more expensive than `gpt-5.4` at the margin, but Quality-Maximizing Path (CLAUDE.md §Core decision rule) says that's exactly the trade-off we want for high-stakes reviews: a DB migration that corrupts data costs far more than $0.50 of review compute.

### Cost

Every run logs `{ts, profile, model, effort, input_tokens, output_tokens, cost_usd}` to `~/.blackpick/gpt-review-log.jsonl`. Check cumulative cost with:

```bash
jq -s 'map(.cost_usd) | add' ~/.blackpick/gpt-review-log.jsonl
```

Typical costs (2026 pricing, approximate):
- `lite` — ~$0.003 per review
- default — ~$0.03 per review
- `max` — ~$0.50–$2.00 per review (gpt-5.4-pro; diff-size dependent)

`max` is ~10× more expensive than default because pro is ~8× the base rate plus deeper reasoning. Use it only when the escalation table below applies. For everything else, default is the right call — BUT never downgrade max to default "to save money" when the task actually warrants pro. See CLAUDE.md §Core decision rule.

`--uncommitted` reviews exclude `tsconfig.tsbuildinfo`, `package-lock.json`, `.next/`, `node_modules/`, and `coverage/` by default — those would otherwise inflate token counts without surfacing real feedback.

### Security notes

- The wrapper writes the payload + `Authorization` header to `0600` temp files and passes them to curl via `--data-binary @file` and `-K config_file`. Neither the API key nor the diff body lands on argv, so `ps auxww` cannot leak either one.
- Only `OPENAI_API_KEY` is loaded from `.env.local`, not the whole file. Other secrets in `.env.local` are not exported to child processes.
- Note: env-var visibility via `ps eww` / `/proc/N/environ` is a separate concern — shell variables are still inherited by spawned children unless explicitly unset. On Sean's single-user macOS this is not a meaningful risk; on shared machines consider `env -i` wrapping.
- Git diff collection uses `--no-color --no-ext-diff --no-textconv` so local git config cannot inject ANSI escapes or run custom textconv drivers that transform or swallow hunks before upload.
- The review prompt wraps the diff in sentinel markers and explicitly tells the model that diff content is untrusted input, defending against prompt-injection attempts from untrusted PR contributors.

### Failure modes

- **`OPENAI_API_KEY not set`** — check `.env.local` is present in the repo root.
- **HTTP 429 / rate limit** — wrapper exits 4 and prints the OpenAI error body. Back off and retry.
- **Empty review text** — wrapper exits 5. Usually means the model got cut off by its reasoning budget on very long diffs. Re-run with `lite` or split the branch.
- **`unknown argument`** — whitelist: only `--base`, `--commit`, `--uncommitted`, `--title` are accepted. Typos like `--based` hard-fail.
