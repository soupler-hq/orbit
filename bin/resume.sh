#!/usr/bin/env bash
# Orbit Resume Utility — Rehydrates the control plane from the last snapshot

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.orbit/state"
SNAPSHOT_FILE="$STATE_DIR/snapshot.json"
PROGRESS_BIN="$ROOT_DIR/bin/progress.js"

if [ ! -f "$SNAPSHOT_FILE" ]; then
  echo "⚠️  No snapshot found. Starting fresh."
  exit 0
fi

echo "🔋 Rehydrating Orbit session..."

# Extract metadata
PROJECT_NAME=$(jq -r '.project // "Orbit"' "$SNAPSHOT_FILE")
SNAPSHOT_AT=$(jq -r '.snapshot_at // "Unknown"' "$SNAPSHOT_FILE")
STATE_SUMMARY=$(jq -r '.state // "# No state summary found"' "$SNAPSHOT_FILE")
GIT_HISTORY=$(jq -r '.git_history // "No history found"' "$SNAPSHOT_FILE")

WORKFLOW_STATUS=""
if command -v node >/dev/null 2>&1 && [ -f "$PROGRESS_BIN" ]; then
  WORKFLOW_STATUS=$(node "$PROGRESS_BIN" --command /orbit:resume --status rehydrating 2>/dev/null || true)
fi

if [ -n "$WORKFLOW_STATUS" ]; then
  echo "$WORKFLOW_STATUS"
  echo ""
fi

# Generate the Resume Prompt
RESUME_PROMPT="# 🔋 RESUME: $PROJECT_NAME (Snapshot: $SNAPSHOT_AT)

## CURRENT STATE (STATE.md)
$STATE_SUMMARY

## GIT CONTEXT
$GIT_HISTORY

## WORKFLOW STATUS
$WORKFLOW_STATUS

## INSTRUCTIONS
1. Continue from the active milestone and phase.
2. Read the latest SUMMARY.md files in $STATE_DIR.
3. Respect the workflow gate before review or PR progression.
4. Verify consistency via bin/validate.sh before execution.
"

# Store the resume prompt for the orchestrator to pick up
echo "$RESUME_PROMPT" > "$STATE_DIR/RESUME_PROMPT.md"

echo "✅ Orbit rehydrated. Current status is in $STATE_DIR/RESUME_PROMPT.md"
