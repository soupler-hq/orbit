#!/usr/bin/env bash
# Orbit Hook Installation — Links repo hooks to the active Git hooks directory

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$ROOT_DIR"
HOOKS_DIR="$ROOT_DIR/hooks/scripts"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir)
      PROJECT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: bash bin/install-hooks.sh [--project-dir <path>]" >&2
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "⚠️  Git is not available. Skipping Orbit hook installation."
  exit 0
fi

if ! git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "⚠️  No Git worktree found at $PROJECT_DIR. Skipping Orbit hook installation."
  exit 0
fi

HOOK_TARGET_DIR="$(git -C "$PROJECT_DIR" rev-parse --git-path hooks)"
mkdir -p "$HOOK_TARGET_DIR"

echo "🛡️  Installing Orbit Governance Hooks..."

# Link pre-commit
ln -sf "$HOOKS_DIR/pre-commit.sh" "$HOOK_TARGET_DIR/pre-commit"
chmod +x "$HOOK_TARGET_DIR/pre-commit"

# Link post-commit so STATE.md deltas are mirrored into context.db after commits
ln -sf "$HOOKS_DIR/post-commit.sh" "$HOOK_TARGET_DIR/post-commit"
chmod +x "$HOOK_TARGET_DIR/post-commit"

# Link pre-push so the structured cache is refreshed before shared history leaves the repo
ln -sf "$HOOKS_DIR/pre-push.sh" "$HOOK_TARGET_DIR/pre-push"
chmod +x "$HOOK_TARGET_DIR/pre-push"

# Link pre-tool-use (for internal use by Antigravity if configured)
ln -sf "$HOOKS_DIR/pre-tool-use.sh" "$HOOK_TARGET_DIR/pre-tool-use"
chmod +x "$HOOK_TARGET_DIR/pre-tool-use"

echo "✅ Orbit hooks installed in $HOOK_TARGET_DIR. Governance is now enforced on commits and pushes."
