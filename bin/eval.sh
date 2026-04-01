#!/usr/bin/env bash
# Orbit eval harness
# Writes the executable eval artifacts promised by /orbit:eval.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$ROOT_DIR/bin/eval-contract.js" "$@"
