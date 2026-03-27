#!/usr/bin/env bash
# Orbit Pre-Commit Hook — Enforces governance before any local commit

set -euo pipefail

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🛡️  Orbit Governance: Running bin/validate.sh before commit..."

# 1. Run the validator. Must pass 100%.
if ! bash "$ROOT_DIR/bin/validate.sh" > /dev/null; then
  echo "❌ COMMIT BLOCKED: Orbit validator failed. Fix the semantic errors or missing files first." >&2
  # Run it again without silencing output to show the errors
  bash "$ROOT_DIR/bin/validate.sh" >&2
  exit 1
fi

# 2. Check for missing metadata or unlinked skills
echo "🛡️  Orbit Governance: Validating registry integrity..."
# (Implicit in validate.sh)

echo "✅ Orbit Governance: Validation passed. Proceeding with commit."
exit 0
