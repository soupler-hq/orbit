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

# 2. Scan for committed secrets and private keys
echo "🛡️  Orbit Governance: Scanning for secrets..."
SECRET_PATTERNS='(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{80,}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA|EC|OPENSSH|PRIVATE KEY)-----|AKIA[0-9A-Z]{16})'
if git -C "$ROOT_DIR" grep -nE "$SECRET_PATTERNS" -- ':!package-lock.json' ':!coverage/**' ':!node_modules/**' >/dev/null 2>&1; then
  echo "❌ COMMIT BLOCKED: Potential secrets or private keys detected in tracked files." >&2
  git -C "$ROOT_DIR" grep -nE "$SECRET_PATTERNS" -- ':!package-lock.json' ':!coverage/**' ':!node_modules/**' >&2 || true
  exit 1
fi

echo "✅ Orbit Governance: Validation passed. Proceeding with commit."
exit 0
