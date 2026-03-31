#!/usr/bin/env bash
# Orbit Hook Installation — Links repo hooks to .git/hooks

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_DIR="$ROOT_DIR/.git"
HOOKS_DIR="$ROOT_DIR/hooks/scripts"

if [ ! -d "$GIT_DIR" ]; then
  echo "⚠️  No .git directory found. Move to a Git repository to use this feature."
  exit 1
fi

echo "🛡️  Installing Orbit Governance Hooks..."

# Link pre-commit
ln -sf "$HOOKS_DIR/pre-commit.sh" "$GIT_DIR/hooks/pre-commit"
chmod +x "$GIT_DIR/hooks/pre-commit"

# Link post-commit so STATE.md deltas are mirrored into context.db after commits
ln -sf "$HOOKS_DIR/post-commit.sh" "$GIT_DIR/hooks/post-commit"
chmod +x "$GIT_DIR/hooks/post-commit"

# Link pre-push so the structured cache is refreshed before shared history leaves the repo
ln -sf "$HOOKS_DIR/pre-push.sh" "$GIT_DIR/hooks/pre-push"
chmod +x "$GIT_DIR/hooks/pre-push"

# Link pre-tool-use (for internal use by Antigravity if configured)
ln -sf "$HOOKS_DIR/pre-tool-use.sh" "$GIT_DIR/hooks/pre-tool-use"
chmod +x "$GIT_DIR/hooks/pre-tool-use"

echo "✅ Orbit hooks installed. Governance is now enforced on commits and pushes."
