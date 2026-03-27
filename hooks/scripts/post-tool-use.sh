#!/usr/bin/env bash
# Orbit PostToolUse Hook — Tracks tool usage, logs anomalies, updates context metrics
# Runs after every tool call. Non-blocking (failures are logged, not surfaced).

set -uo pipefail

STATE_DIR="${AGENTIC_FRAMEWORK_STATE_DIR:-.orbit/state}"
TOOL_LOG="$STATE_DIR/tool-usage.log"

mkdir -p "$STATE_DIR" 2>/dev/null || true

# Read event data from stdin
INPUT=$(cat 2>/dev/null || echo "{}")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Extract metadata if jq is available
if command -v jq &>/dev/null; then
  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
  EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_response.exit_code // 0' 2>/dev/null || echo "0")
else
  TOOL_NAME="unknown"
  EXIT_CODE="0"
fi

# Log tool use for audit trail (rolling — keep last 500 lines)
echo "$TIMESTAMP tool=$TOOL_NAME exit=$EXIT_CODE" >> "$TOOL_LOG" 2>/dev/null || true

# Trim log to last 500 entries
if command -v tail &>/dev/null && [[ -f "$TOOL_LOG" ]]; then
  LINES=$(wc -l < "$TOOL_LOG" 2>/dev/null || echo 0)
  if [[ "$LINES" -gt 500 ]]; then
    tail -500 "$TOOL_LOG" > "${TOOL_LOG}.tmp" && mv "${TOOL_LOG}.tmp" "$TOOL_LOG" 2>/dev/null || true
  fi
fi

exit 0
