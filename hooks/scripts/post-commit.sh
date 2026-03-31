#!/usr/bin/env bash
# Orbit Post-Commit Hook — refreshes context.db after every successful commit

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync-context.sh" || true

exit 0
