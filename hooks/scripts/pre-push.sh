#!/usr/bin/env bash
# Orbit Pre-Push Hook — refreshes context.db before pushing shared history

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync-context.sh" || true

exit 0
