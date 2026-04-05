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
PROJECT_ROOT="${ORBIT_PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
EVALUATOR="$PROJECT_ROOT/bin/safety-evaluator.js"
STATE_FILE="$PROJECT_ROOT/.orbit/state/STATE.md"
CONFIG_FILE="$PROJECT_ROOT/orbit.config.json"
CLARIFICATION_HELPER="$PROJECT_ROOT/bin/clarification-gate.js"

clarification_gate_enabled() {
  [ -f "$CONFIG_FILE" ] || return 1
  node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.exit(config.clarification_gate === true ? 0 : 1)" "$CONFIG_FILE"
}

clarification_bypass_allowed() {
  case "$CHECK_CMD" in
    *"/orbit:clarify"*|*"bin/clarify.js"*|*"STATE.md"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if clarification_gate_enabled && [ -f "$CLARIFICATION_HELPER" ]; then
  PENDING_COUNT=$(node "$CLARIFICATION_HELPER" --state-file "$STATE_FILE" --pending-count)
  if [ "${PENDING_COUNT:-0}" -gt 0 ] && ! clarification_bypass_allowed; then
    echo "[CLARIFICATION] Pending clarification request detected. Run /orbit:clarify before continuing tool execution." >&2
    exit 2
  fi
fi

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
