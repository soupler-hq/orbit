#!/usr/bin/env bash
# Integration tests for install.sh
# Tests run in a temp directory to avoid polluting the developer environment.
# Usage: bash tests/install.test.sh
# CI:    docker run --rm -v "$PWD":/orbit -w /orbit node:22-alpine sh -c "apk add bash && bash tests/install.test.sh"

set -euo pipefail
export LC_ALL=C
export LANG=C

FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0; FAIL=0
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

# ── Test harness ──────────────────────────────────────────────────────────────
assert() {
  local desc="$1"; shift
  if "$@" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $desc"
    (( PASS++ )) || true
  else
    echo -e "  ${RED}✗${NC} $desc"
    (( FAIL++ )) || true
  fi
}

assert_file()    { assert "$1 exists"        test -f "$2"; }
assert_dir()     { assert "$1 exists"        test -d "$2"; }
assert_exec()    { assert "$1 is executable" test -x "$2"; }
assert_symlink() { assert "$1 is symlink"    test -L "$2"; }
assert_contains(){ assert "$2 contains '$3'" grep -q "$3" "$2"; }
assert_equal()   { assert "$1" [ "$2" = "$3" ]; }

section() { echo -e "\n${BOLD}$1${NC}"; }

# ── Scratch directory ─────────────────────────────────────────────────────────
TMPDIR_ROOT=$(mktemp -d)
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

run_install() {
  local project_dir="$1"; shift
  mkdir -p "$project_dir"
  ( cd "$project_dir" && HOME="$TMPDIR_ROOT/home" \
    bash "$FRAMEWORK_DIR/install.sh" --local --skip-verify "$@" >/dev/null 2>&1 ) || true
}

run_setup() {
  local project_dir="$1"; shift
  mkdir -p "$project_dir"
  (
    cd "$project_dir" &&
    HOME="$TMPDIR_ROOT/home" \
    bash "$FRAMEWORK_DIR/bin/setup.sh" --tool claude >/dev/null 2>&1
  ) || true
}

git_init_repo() {
  local repo_dir="$1"
  mkdir -p "$repo_dir"
  (
    cd "$repo_dir"
    git init >/dev/null 2>&1
    git config user.name "Orbit Test"
    git config user.email "orbit-tests@example.com"
    touch README.md
    git add README.md
    git commit -m "init" >/dev/null 2>&1
  )
}

resolve_hooks_dir() {
  local repo_dir="$1"
  local hooks_dir
  hooks_dir=$(git -C "$repo_dir" rev-parse --git-path hooks)
  if [[ "$hooks_dir" = /* ]]; then
    printf '%s\n' "$hooks_dir"
  else
    printf '%s/%s\n' "$repo_dir" "$hooks_dir"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
section "Flag matrix: --tool claude (default)"
PROJECT1="$TMPDIR_ROOT/proj-claude"
run_install "$PROJECT1" --tool claude

assert_file "CLAUDE.md installed"             "$PROJECT1/.claude/CLAUDE.md"
assert_file "INSTRUCTIONS.md installed"       "$PROJECT1/.claude/INSTRUCTIONS.md"
assert_file "SKILLS.md installed"             "$PROJECT1/.claude/SKILLS.md"
assert_file "WORKFLOWS.md installed"          "$PROJECT1/.claude/WORKFLOWS.md"
assert_file "orbit.registry.json installed"   "$PROJECT1/.claude/orbit.registry.json"
assert_file "orbit.config.json installed"     "$PROJECT1/orbit.config.json"
assert_file "STATE.template.md installed"     "$PROJECT1/.claude/state/STATE.template.md"
assert_dir  "agents/ installed"               "$PROJECT1/.claude/agents"
assert_dir  "skills/ installed"               "$PROJECT1/.claude/skills"
assert_dir  "hooks/ installed"                "$PROJECT1/.claude/orbit/hooks"
assert_file ".orbit/state/STATE.md created"   "$PROJECT1/.orbit/state/STATE.md"

# ─────────────────────────────────────────────────────────────────────────────
section "Flag matrix: --tool codex"
PROJECT2="$TMPDIR_ROOT/proj-codex"
run_install "$PROJECT2" --tool codex

assert_file "INSTRUCTIONS.md installed"     "$PROJECT2/.codex/INSTRUCTIONS.md"
assert_file "orbit.registry.json installed" "$PROJECT2/.codex/orbit.registry.json"
assert_file "orbit.config.json installed"   "$PROJECT2/.codex/orbit.config.json"
assert_file "policy.md installed"           "$PROJECT2/.codex/policy.md"
assert_file "STATE.template.md installed"   "$PROJECT2/.codex/state/STATE.template.md"
assert_dir  "agents/ installed"             "$PROJECT2/.codex/agents"
assert_dir  "skills/ installed"             "$PROJECT2/.codex/skills"
assert_contains "policy.md mentions INSTRUCTIONS" "$PROJECT2/.codex/policy.md" "INSTRUCTIONS.md"

# ─────────────────────────────────────────────────────────────────────────────
section "Flag matrix: --all (claude + codex)"
PROJECT3="$TMPDIR_ROOT/proj-all"
run_install "$PROJECT3" --all

assert_file "Claude: CLAUDE.md"         "$PROJECT3/.claude/CLAUDE.md"
assert_file "Codex: INSTRUCTIONS.md"    "$PROJECT3/.codex/INSTRUCTIONS.md"
assert_file "Codex: policy.md"          "$PROJECT3/.codex/policy.md"

# ─────────────────────────────────────────────────────────────────────────────
section "Node wrapper smoke test: bin/install.js delegates to install.sh"
PROJECT3B="$TMPDIR_ROOT/proj-node-wrapper"
mkdir -p "$PROJECT3B"
( cd "$PROJECT3B" && HOME="$TMPDIR_ROOT/home" node "$FRAMEWORK_DIR/bin/install.js" --tool claude >/dev/null 2>&1 ) || true
assert_file "Node wrapper CLAUDE.md installed"   "$PROJECT3B/.claude/CLAUDE.md"
assert_file "Node wrapper STATE.md created"       "$PROJECT3B/.orbit/state/STATE.md"

# ─────────────────────────────────────────────────────────────────────────────
section "Idempotency: running install twice produces identical result"
PROJECT4="$TMPDIR_ROOT/proj-idempotent"
run_install "$PROJECT4" --tool claude
HASH1=$(find "$PROJECT4/.claude" -type f ! -name "settings.json" | sort | xargs shasum -a 256 2>/dev/null | shasum -a 256 | awk '{print $1}')
run_install "$PROJECT4" --tool claude
HASH2=$(find "$PROJECT4/.claude" -type f ! -name "settings.json" | sort | xargs shasum -a 256 2>/dev/null | shasum -a 256 | awk '{print $1}')
assert_equal "Two installs produce identical file tree" "$HASH1" "$HASH2"

# ─────────────────────────────────────────────────────────────────────────────
section "Merge logic: existing STATE.md is preserved"
PROJECT5="$TMPDIR_ROOT/proj-merge"
mkdir -p "$PROJECT5/.orbit/state"
echo "# My existing state" > "$PROJECT5/.orbit/state/STATE.md"
run_install "$PROJECT5" --tool claude
assert_contains "Existing STATE.md preserved" "$PROJECT5/.orbit/state/STATE.md" "My existing state"

# ─────────────────────────────────────────────────────────────────────────────
section "--skip-verify: installs without a manifest present"
PROJECT6="$TMPDIR_ROOT/proj-skipverify"
run_install "$PROJECT6" --tool claude
assert_file "Installed despite no manifest" "$PROJECT6/.claude/CLAUDE.md"

# ─────────────────────────────────────────────────────────────────────────────
section "Hook scripts are executable"
PROJECT7="$TMPDIR_ROOT/proj-hooks"
run_install "$PROJECT7" --tool claude
for hook in pre-tool-use post-tool-use pre-compact stop sync-context post-commit pre-push; do
  assert_exec "hooks/$hook.sh is +x" "$PROJECT7/.claude/orbit/hooks/$hook.sh"
done

# ─────────────────────────────────────────────────────────────────────────────
section ".gitignore: Orbit entries added"
PROJECT8="$TMPDIR_ROOT/proj-gitignore"
mkdir -p "$PROJECT8"
echo "node_modules/" > "$PROJECT8/.gitignore"
run_install "$PROJECT8" --tool claude
assert_contains ".gitignore has .orbit/errors/" "$PROJECT8/.gitignore" ".orbit/errors/"
assert_contains ".gitignore has .worktrees/"    "$PROJECT8/.gitignore" ".worktrees/"

# ─────────────────────────────────────────────────────────────────────────────
section "Local install wires git hooks in a normal repo"
PROJECT9="$TMPDIR_ROOT/proj-git-hooks"
git_init_repo "$PROJECT9"
run_install "$PROJECT9" --tool claude
HOOKS_DIR_9=$(git -C "$PROJECT9" rev-parse --git-path hooks)
HOOKS_DIR_9=$(resolve_hooks_dir "$PROJECT9")
assert_symlink "post-commit hook linked" "$HOOKS_DIR_9/post-commit"
assert_symlink "pre-push hook linked"    "$HOOKS_DIR_9/pre-push"
assert_symlink "pre-commit hook linked"  "$HOOKS_DIR_9/pre-commit"

# ─────────────────────────────────────────────────────────────────────────────
section "Local install wires git hooks in a linked worktree"
PROJECT10_ROOT="$TMPDIR_ROOT/proj-worktree-root"
PROJECT10_WT="$TMPDIR_ROOT/proj-worktree-copy"
git_init_repo "$PROJECT10_ROOT"
( cd "$PROJECT10_ROOT" && git worktree add "$PROJECT10_WT" -b feat/test-hooks >/dev/null 2>&1 )
run_install "$PROJECT10_WT" --tool claude
HOOKS_DIR_10=$(resolve_hooks_dir "$PROJECT10_WT")
assert_symlink "worktree post-commit hook linked" "$HOOKS_DIR_10/post-commit"
assert_symlink "worktree pre-push hook linked"    "$HOOKS_DIR_10/pre-push"
assert_symlink "worktree pre-commit hook linked"  "$HOOKS_DIR_10/pre-commit"

# ─────────────────────────────────────────────────────────────────────────────
section "Setup path also ensures git hooks are active"
PROJECT11="$TMPDIR_ROOT/proj-setup-hooks"
git_init_repo "$PROJECT11"
run_setup "$PROJECT11"
HOOKS_DIR_11=$(resolve_hooks_dir "$PROJECT11")
assert_symlink "setup post-commit hook linked" "$HOOKS_DIR_11/post-commit"
assert_symlink "setup pre-push hook linked"    "$HOOKS_DIR_11/pre-push"
assert_symlink "setup pre-commit hook linked"  "$HOOKS_DIR_11/pre-commit"

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
