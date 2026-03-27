#!/usr/bin/env bash
# Orbit PreToolUse Hook — Validates tool calls and detects adversarial inputs
# Runs before every Bash tool call. Blocks on critical violations.

set -euo pipefail

# Read tool call data from stdin
INPUT=$(cat 2>/dev/null || echo "{}")

# Extract tool name and input if jq is available
if command -v jq &>/dev/null; then
  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
  TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}' 2>/dev/null || echo "{}")
  BASH_COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""' 2>/dev/null || echo "")
else
  TOOL_NAME="unknown"
  BASH_COMMAND=""
fi

# ─── Prompt Injection Detection ───────────────────────────────────────────────
# Detect patterns that suggest prompt injection in bash commands
INJECTION_PATTERNS=(
  "ignore previous instructions"
  "ignore all previous"
  "disregard your"
  "forget your instructions"
  "new instructions:"
  "system prompt"
  "you are now"
  "\\\$\{IFS\}"
)

for pattern in "${INJECTION_PATTERNS[@]}"; do
  if echo "$BASH_COMMAND" | grep -qi "$pattern" 2>/dev/null; then
    echo "Orbit SECURITY: Potential prompt injection detected in tool call — blocked" >&2
    echo "Pattern matched: $pattern" >&2
    exit 1
  fi
done

# ─── Destructive Command Detection ────────────────────────────────────────────
# Warn on high-blast-radius commands
DESTRUCTIVE_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "dd if="
  "mkfs"
  "> /dev/sd"
  ":(){ :|:& };:"
)

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if echo "$BASH_COMMAND" | grep -q "$pattern" 2>/dev/null; then
    echo "Orbit SAFETY: Destructive command pattern detected — review required" >&2
    echo "Command: $BASH_COMMAND" >&2
    exit 1
  fi
done

# ─── Secret Leak Detection ─────────────────────────────────────────────────
# Detect if command would print secrets to stdout
SECRET_PATTERNS=(
  "echo.*password"
  "echo.*secret"
  "echo.*token"
  "cat.*\.env"
  "printenv.*SECRET"
  "printenv.*PASSWORD"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$BASH_COMMAND" | grep -qi "$pattern" 2>/dev/null; then
    echo "Orbit SECURITY: Possible secret exposure in command — review before running" >&2
    # Non-blocking — just warn
    break
  fi
done

exit 0
