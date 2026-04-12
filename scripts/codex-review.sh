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

# Walk all positional args once and partition into:
#   - MODE     : "review" / "exec" (first time `review` is seen)
#   - PROFILE  : a known alias seen anywhere in the arg list
#   - REST     : everything else, in original order, to forward downstream
#
# This avoids the trap where a profile alias appears AFTER a flag —
# e.g. `review --title foo max` — and would otherwise leak through to
# `codex review` as a positional [PROMPT], colliding with --base
# (P2 from 2026-04-12 codex review).
#
# Bare tokens that aren't a known mode keyword AND aren't a known
# profile alias AND aren't a flag value (consumed by --base/--commit/
# --title/-c) are rejected hard so typos never become silent prompts.

MODE="exec"
PROFILE_FROM_ARG=""
REST_ARGS=()
EXPECT_VALUE=false
for arg in "$@"; do
    if [ "$EXPECT_VALUE" = true ]; then
        # Previous arg was a flag that consumes the next token as its
        # value. Pass the value through verbatim — even if it spells a
        # profile alias literally (e.g. `--title max`).
        REST_ARGS+=("$arg")
        EXPECT_VALUE=false
        continue
    fi
    case "$arg" in
        review)
            if [ "$MODE" = "exec" ]; then
                MODE="review"
            else
                REST_ARGS+=("$arg")
            fi
            ;;
        lite|max|blackpick|blackpick_lite|blackpick_max)
            if [ -n "$PROFILE_FROM_ARG" ] && [ "$PROFILE_FROM_ARG" != "$arg" ]; then
                echo "ERROR: multiple profile aliases passed ('$PROFILE_FROM_ARG' and '$arg')." >&2
                exit 7
            fi
            PROFILE_FROM_ARG="$arg"
            ;;
        --base|--commit|--title|--enable|--disable|--config|-c)
            # All `codex review` flags that consume a separate value
            # token. Keep this list aligned with `codex review --help`.
            REST_ARGS+=("$arg")
            EXPECT_VALUE=true
            ;;
        --*|-*)
            # Self-contained flag (--uncommitted, --base=foo, --enable=x)
            REST_ARGS+=("$arg")
            ;;
        *)
            # Bare positional that we can't classify. In review mode this
            # would become a [PROMPT] and conflict with --base/--commit;
            # in exec mode it would become a stray prompt token. Reject.
            echo "ERROR: unexpected positional argument '$arg'." >&2
            echo "Did you mean a profile alias (lite/max/blackpick*) or a flag (--base develop / --commit HEAD / --uncommitted)?" >&2
            exit 7
            ;;
    esac
done

# Resolve profile: positional alias > CODEX_PROFILE env var > default
case "$PROFILE_FROM_ARG" in
    lite)             PROFILE="blackpick_lite" ;;
    max)              PROFILE="blackpick_max" ;;
    blackpick|blackpick_lite|blackpick_max)
                      PROFILE="$PROFILE_FROM_ARG" ;;
    "")               PROFILE="${CODEX_PROFILE:-blackpick}" ;;
esac

# Replace `$@` with the post-walk REST_ARGS so the rest of the script
# (which still uses `"$@"` and `shift` semantics) sees a clean arg list
# without the profile alias / mode keyword.
set --
if [ "${#REST_ARGS[@]}" -gt 0 ]; then
    set -- "${REST_ARGS[@]}"
fi

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

# Pipe the prompt to codex on stdin (with `-` as the positional prompt
# arg) instead of expanding it into argv via `"$(cat …)"`. argv on
# macOS caps at ~1 MiB (ARG_MAX = 1048576), so a long pasted spec / log
# would otherwise blow up before codex even starts.
"$CODEX_BIN" exec \
    --profile "$PROFILE" \
    -c model="$MODEL" \
    -c model_reasoning_effort="$EFFORT" \
    --skip-git-repo-check \
    --sandbox read-only \
    --color never \
    -o "$OUTPUT_FILE" \
    - \
    < "$PROMPT_FILE" \
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
