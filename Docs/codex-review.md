# Codex CLI review gate

**Codex CLI is the only second-opinion reviewer for this project.** Direct
OpenAI API calls (`OPENAI_API_KEY`, `https://api.openai.com/...`) are
**forbidden** for review purposes — if Codex CLI fails, stop and ask Sean
to investigate. Do NOT silently fall back to the OpenAI API.

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

- Never commit a feature/fix without a Codex review pass on its diff.
- Never call the OpenAI API directly for review purposes.
- Never use `blackpick_max` for one-line questions or single-file CSS edits.
- Never bypass review for "trivial" auth/RLS/migration changes — those are
  exactly the ones `max` exists for.

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
