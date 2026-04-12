#!/bin/bash
# codex-review.sh — Second-opinion review helper for BlackPick.
#
# Uses the Codex CLI with project-scoped profiles defined in
# ~/.codex/config.toml ([profiles.blackpick*]).
#
# Two modes:
#
# 1. Diff review against a base branch / commit / uncommitted changes:
#      scripts/codex-review.sh review                              # vs develop, default profile
#      scripts/codex-review.sh review lite                         # vs develop, cheap lane
#      scripts/codex-review.sh review max --base main              # vs main, premium lane
#      scripts/codex-review.sh review --commit HEAD                # latest commit
#      scripts/codex-review.sh review --uncommitted                # staged + unstaged + untracked
#
# 2. Free-form prompt via stdin (one-off architectural questions):
#      echo "should the share page use ISR or static?" | scripts/codex-review.sh
#      echo "..." | scripts/codex-review.sh max
#
# Profile selection: positional arg > env var (CODEX_PROFILE) > default (blackpick).
#   blackpick       — gpt-5.4 + high   (default: feature PRs, hook refactors)
#   blackpick_lite  — gpt-5.4-mini + medium (lint/i18n cleanup, single-file tweaks)
#   blackpick_max   — gpt-5.4 + xhigh  (auth/RLS, supabase migrations, money math)
#
# Rule: don't burn `max` for shallow diffs. Match effort to task.
# If Codex CLI fails or returns empty, this script exits loud — do NOT
# silently fall back to the OpenAI API for reviews (per CLAUDE.md
# review-gate principle).

set -euo pipefail

CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"
if [ ! -x "$CODEX_BIN" ]; then
    if command -v codex >/dev/null 2>&1; then
        CODEX_BIN="$(command -v codex)"
    else
        echo "ERROR: codex CLI not found (checked \$CODEX_BIN and PATH)." >&2
        echo "Install with: npm i -g @openai/codex" >&2
        echo "Or ask Sean to check /Applications/Codex.app." >&2
        echo "Do NOT fall back to OPENAI_API_KEY for reviews." >&2
        exit 2
    fi
fi

# Detect mode: first arg "review" → diff review subcommand
MODE="exec"
if [ "${1:-}" = "review" ]; then
    MODE="review"
    shift
fi

# Profile selection: first remaining positional arg > env var > default
ARG_PROFILE="${1:-}"
case "$ARG_PROFILE" in
    lite)  PROFILE="blackpick_lite" ; shift ;;
    max)   PROFILE="blackpick_max"  ; shift ;;
    "")    PROFILE="${CODEX_PROFILE:-blackpick}" ;;
    blackpick|blackpick_lite|blackpick_max)
           PROFILE="$ARG_PROFILE" ; shift ;;
    *)     PROFILE="${CODEX_PROFILE:-blackpick}" ;;
esac

# Inline the profile values so we can override on subcommands that don't
# accept `--profile`/`-p` (notably `codex review`). Keep these in sync
# with `~/.codex/config.toml [profiles.blackpick*]`.
case "$PROFILE" in
    blackpick)
        MODEL="gpt-5.4"
        EFFORT="high"
        ;;
    blackpick_lite)
        MODEL="gpt-5.4-mini"
        EFFORT="medium"
        ;;
    blackpick_max)
        MODEL="gpt-5.4"
        EFFORT="xhigh"
        ;;
    *)
        echo "ERROR: unknown profile '$PROFILE'. Valid: blackpick, blackpick_lite, blackpick_max." >&2
        exit 6
        ;;
esac

if [ "$MODE" = "review" ]; then
    # `codex review` rejects positional [PROMPT] when --base/--commit is
    # used (CLI clap rule), and it does not accept --profile. Override
    # the model + reasoning effort via `-c` instead. Forward any extra
    # args the caller passed (--base, --commit, --uncommitted, --title);
    # default to `--base develop` if nothing was passed.
    REVIEW_ARGS=("$@")
    if [ ${#REVIEW_ARGS[@]} -eq 0 ]; then
        REVIEW_ARGS=(--base develop)
    fi
    exec "$CODEX_BIN" review \
        -c model="$MODEL" \
        -c model_reasoning_effort="$EFFORT" \
        "${REVIEW_ARGS[@]}"
fi

# Free-form prompt mode: read from stdin into a temp file
PROMPT_FILE=$(mktemp)
OUTPUT_FILE=$(mktemp)
trap 'rm -f "$PROMPT_FILE" "$OUTPUT_FILE"' EXIT

cat > "$PROMPT_FILE"

if [ ! -s "$PROMPT_FILE" ]; then
    echo "ERROR: empty prompt on stdin" >&2
    echo "Usage: echo 'question' | $0 [lite|max]" >&2
    echo "Or:    $0 review [lite|max] [--base <branch>|--commit <sha>|--uncommitted]" >&2
    exit 3
fi

"$CODEX_BIN" exec \
    --profile "$PROFILE" \
    -c model="$MODEL" \
    -c model_reasoning_effort="$EFFORT" \
    --skip-git-repo-check \
    --sandbox read-only \
    --color never \
    -o "$OUTPUT_FILE" \
    "$(cat "$PROMPT_FILE")" \
    < /dev/null \
    > /dev/null 2>&1 || {
        echo "ERROR: codex exec failed (profile=$PROFILE)." >&2
        echo "Ask Sean to check Codex auth and profile config." >&2
        exit 4
    }

if [ ! -s "$OUTPUT_FILE" ]; then
    echo "ERROR: codex returned empty output (profile=$PROFILE)." >&2
    exit 5
fi

cat "$OUTPUT_FILE"
