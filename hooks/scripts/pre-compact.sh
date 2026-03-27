#!/usr/bin/env bash
# Orbit PreCompact Hook — Saves session state before Claude Code compacts the context window
# Triggered automatically when context approaches the limit.
# This is the single most important hook: prevents state loss across compression events.

set -euo pipefail

STATE_DIR="${AGENTIC_FRAMEWORK_STATE_DIR:-.orbit/state}"
COMPACT_LOG="$STATE_DIR/compact.log"
SNAPSHOT_FILE="$STATE_DIR/pre-compact-snapshot.md"

mkdir -p "$STATE_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Read event data from stdin (Claude Code passes JSON)
EVENT_DATA=$(cat 2>/dev/null || echo "{}")

# Write compact snapshot — this is loaded by /orbit:resume in the next session
cat > "$SNAPSHOT_FILE" << SNAPSHOT
# Orbit Pre-Compact Snapshot
> Context compression event at: $TIMESTAMP

## Session State at Compression
- Branch: \`$GIT_BRANCH\`
- Last commit: \`$GIT_COMMIT\`
- Snapshot saved: $TIMESTAMP

## Active Work
<!-- Orbit: Append your current in-progress task summary here if you're mid-task -->

## What Was In Progress
Check git status and recent commits to reconstruct context:
\`\`\`
$(git log --oneline -10 2>/dev/null || echo "git log unavailable")
\`\`\`

## Uncommitted Changes
\`\`\`
$(git diff --stat 2>/dev/null || echo "no changes or git unavailable")
\`\`\`

## Resume Instructions
1. Run \`/orbit:resume\` in the new session
2. This loads STATE.md + this snapshot
3. Check git log above to reconstruct what was in progress
4. Continue from last atomic task boundary
SNAPSHOT

# Append to compact log for audit trail
echo "[$TIMESTAMP] Context compacted on branch=$GIT_BRANCH commit=$GIT_COMMIT" >> "$COMPACT_LOG" 2>/dev/null || true

echo "Orbit: Pre-compact snapshot saved to $SNAPSHOT_FILE" >&2
exit 0
