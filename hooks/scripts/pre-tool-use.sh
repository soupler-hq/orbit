#!/usr/bin/env bash
# Orbit Pre-Tool-Use Hook
set -euo pipefail

# 1. Read input
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | /usr/bin/jq -r '.tool_name // "unknown"')
RAW_CMD=$(echo "$INPUT" | /usr/bin/jq -r '.tool_input.command // ""')

# 2. Logic
CHECK_CMD="${RAW_CMD:-$BASH_COMMAND_ENV}"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
EVALUATOR="$PROJECT_ROOT/bin/safety-evaluator.js"

if [ -f "$EVALUATOR" ] && [ -n "$CHECK_CMD" ]; then
  if ! node "$EVALUATOR" "$CHECK_CMD" "$PROJECT_ROOT"; then
    echo "[SECURITY] Safety Evaluator blocked command: $CHECK_CMD" >&2
    exit 1
  fi
fi

# 3. Static checks
if [ -n "$CHECK_CMD" ]; then
  if echo "$CHECK_CMD" | grep -qE "[a-zA-Z0-9+/=]{40}"; then
    echo "[SECURITY] Potential obfuscation detected." >&2
    exit 1
  fi
fi

exit 0
