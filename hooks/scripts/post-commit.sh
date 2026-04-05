#!/usr/bin/env bash
# Orbit Post-Commit Hook — refreshes context.db after every successful commit

set -uo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

"$ROOT_DIR/hooks/scripts/sync-context.sh" || true

exit 0
