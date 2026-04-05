#!/usr/bin/env bash
# Orbit Context Sync — refreshes context.db from STATE.md
# Non-blocking: commit/push/session hooks should warn, not fail, if sync is unavailable.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTEXT_CLI="$ROOT_DIR/bin/context.js"

if [[ ! -f "$CONTEXT_CLI" ]]; then
  echo "⚠️  Orbit context sync skipped: bin/context.js not found" >&2
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "⚠️  Orbit context sync skipped: node not available" >&2
  exit 0
fi

if node "$CONTEXT_CLI" --save >/dev/null 2>&1; then
  echo "✅ Orbit context synced from STATE.md"
else
  echo "⚠️  Orbit context sync failed — run: node bin/context.js --save" >&2
fi

exit 0
