#!/usr/bin/env bash
# Orbit recovery-loop bridge for documented OnError behavior.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

TASK_NAME="${1:-unknown}"
PHASE="${2:-execute}"
ERROR_MSG="${3:-no details}"
SUMMARY_FILE="${4:-}"

ARGS=(
  --command /orbit:riper
  --phase "$PHASE"
  --task "$TASK_NAME"
  --error-message "$ERROR_MSG"
)

if [[ -n "$SUMMARY_FILE" ]]; then
  ARGS+=(--summary-file "$SUMMARY_FILE")
fi

node "$ROOT_DIR/bin/recovery-loop.js" "${ARGS[@]}"
