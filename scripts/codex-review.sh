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

# Profile selection: first remaining positional arg > env var > default.
# A bare token that doesn't look like a flag must be a profile alias —
# anything else is a typo and we exit hard so the wrapper never silently
# forwards garbage to `codex review` as a positional [PROMPT] (P3 from
# 2026-04-12 codex review).
ARG_PROFILE="${1:-}"
case "$ARG_PROFILE" in
    lite)  PROFILE="blackpick_lite" ; shift ;;
    max)   PROFILE="blackpick_max"  ; shift ;;
    "")    PROFILE="${CODEX_PROFILE:-blackpick}" ;;
    blackpick|blackpick_lite|blackpick_max)
           PROFILE="$ARG_PROFILE" ; shift ;;
    -*)    PROFILE="${CODEX_PROFILE:-blackpick}" ;;
    *)
        echo "ERROR: unknown profile alias '$ARG_PROFILE'." >&2
        echo "Valid: lite, max, blackpick, blackpick_lite, blackpick_max." >&2
        echo "If you meant to pass a flag, prefix it with '--' (e.g. --base develop)." >&2
        exit 7
        ;;
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
    # args the caller passed (--base, --commit, --uncommitted, --title).
    # Capture passthrough args without tripping `set -u` on an empty
    # `$@`. The `${REVIEW_ARGS[@]+...}` idiom expands to nothing when
    # the array is unset, instead of producing a stray empty string
    # token like `${REVIEW_ARGS[@]:-}` does.
    REVIEW_ARGS=()
    if [ "$#" -gt 0 ]; then
        REVIEW_ARGS=("$@")
    fi

    # Inject `--base develop` as the comparison target unless the caller
    # already specified one (--base, --commit, or --uncommitted). The
    # earlier version only injected when the arg list was completely
    # empty, which silently broke the documented contract for callers
    # like `... review --title "..."` (P2 from 2026-04-12 codex review).
    HAS_TARGET=false
    if [ "${#REVIEW_ARGS[@]}" -gt 0 ]; then
        for arg in "${REVIEW_ARGS[@]}"; do
            case "$arg" in
                --base|--base=*|--commit|--commit=*|--uncommitted)
                    HAS_TARGET=true
                    break
                    ;;
            esac
        done
    fi
    if [ "$HAS_TARGET" = false ]; then
        REVIEW_ARGS=(--base develop ${REVIEW_ARGS[@]+"${REVIEW_ARGS[@]}"})
    fi

    # Capture only stdout to a temp file so codex's startup PATH
    # warnings (or any other stderr-only chatter) cannot fool the
    # wrapper into thinking a real review ran. Stderr still passes
    # through to the caller's terminal so progress diagnostics are
    # visible. The earlier `2>&1 | tee` version had this exact bug —
    # flagged as P1 in the 2026-04-12 codex review.
    #
    # We don't stream stdout live; instead we capture, cat at the end,
    # then verify the file is non-empty. Streaming via process
    # substitution introduced an async tee race that could leave the
    # temp file empty even after a successful run.
    REVIEW_STDOUT=$(mktemp)
    trap 'rm -f "$REVIEW_STDOUT"' EXIT

    if ! "$CODEX_BIN" review \
        -c model="$MODEL" \
        -c model_reasoning_effort="$EFFORT" \
        ${REVIEW_ARGS[@]+"${REVIEW_ARGS[@]}"} \
        > "$REVIEW_STDOUT"; then
        # Replay whatever did make it to stdout before the failure.
        cat "$REVIEW_STDOUT"
        echo "ERROR: codex review failed (model=$MODEL, effort=$EFFORT)." >&2
        exit 4
    fi

    if [ ! -s "$REVIEW_STDOUT" ]; then
        echo "ERROR: codex review returned empty stdout (model=$MODEL, effort=$EFFORT)." >&2
        echo "Do not treat this PR as having passed the review gate." >&2
        exit 5
    fi

    cat "$REVIEW_STDOUT"
    exit 0
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
