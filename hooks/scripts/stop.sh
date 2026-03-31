#!/usr/bin/env bash
# Orbit Stop Hook — Runs when Claude Code session ends (agent responds with final answer)
# Saves session summary and updates STATE.md timestamps.

set -euo pipefail

STATE_DIR="${AGENTIC_FRAMEWORK_STATE_DIR:-.orbit/state}"
STATE_FILE="$STATE_DIR/STATE.md"
SESSION_LOG="$STATE_DIR/sessions.log"

mkdir -p "$STATE_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LAST_COMMIT_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "no commits")

# Append session record to sessions log
cat >> "$SESSION_LOG" << SESSION

## Session: $TIMESTAMP
- Branch: $GIT_BRANCH
- Last commit: $GIT_COMMIT — $LAST_COMMIT_MSG
- Recent changes:
$(git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  none")
SESSION

# Update STATE.md last-updated timestamp if it exists
if [[ -f "$STATE_FILE" ]]; then
  # Update the last-updated line if present
  if grep -q "Last Updated:" "$STATE_FILE" 2>/dev/null; then
    sed -i.bak "s/Last Updated:.*/Last Updated: $TIMESTAMP/" "$STATE_FILE" 2>/dev/null && rm -f "${STATE_FILE}.bak" || true
  fi
fi

# Keep the structured cache aligned with the human-readable state file.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync-context.sh" || true

echo "Orbit: Session recorded at $TIMESTAMP (branch=$GIT_BRANCH, commit=$GIT_COMMIT)" >&2
exit 0
