#!/usr/bin/env bash
# validate-config.sh — cross-file consistency checks for the Orbit framework itself
# Catches mechanical anti-patterns that pass unit tests but create structural drift.
# Run in CI via orbit-sentinel.yml and locally before raising a PR.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
WARNINGS=0

red()   { echo -e "\033[0;31m❌ $*\033[0m"; }
green() { echo -e "\033[0;32m✓  $*\033[0m"; }
warn()  { echo -e "\033[0;33m⚠  $*\033[0m"; }

fail() { red "$1"; ERRORS=$((ERRORS + 1)); }
pass() { green "$1"; }
note() { warn "$1"; WARNINGS=$((WARNINGS + 1)); }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Orbit Config Validator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Version: orbit.config.json must NOT contain a "version" field ──────────
echo "[ 1/5 ] Version field in orbit.config.json"
if jq -e '.version' "$ROOT/orbit.config.json" > /dev/null 2>&1; then
  CONFIG_VER=$(jq -r '.version' "$ROOT/orbit.config.json")
  PKG_VER=$(jq -r '.version' "$ROOT/package.json")
  fail "orbit.config.json contains \"version\": \"$CONFIG_VER\" — package.json is \"$PKG_VER\"."
  echo "     Fix: remove the 'version' key from orbit.config.json entirely."
  echo "     If you need a schema version, use 'config_schema_version' instead."
else
  pass "orbit.config.json has no 'version' field (package.json is the single source)"
fi

# ── 2. Changelog entry matches package.json version ───────────────────────────
echo ""
echo "[ 2/5 ] CHANGELOG version alignment"
PKG_VER=$(jq -r '.version' "$ROOT/package.json")
if grep -q "## \[$PKG_VER\]" "$ROOT/CHANGELOG.md"; then
  pass "CHANGELOG.md contains entry for v$PKG_VER"
else
  fail "CHANGELOG.md has no entry for v$PKG_VER (current package.json version)."
  echo "     Fix: add a ## [$PKG_VER] section to CHANGELOG.md before releasing."
fi

# ── 3. Hook flags in orbit.config.json must match what install.sh registers ───
echo ""
echo "[ 3/5 ] Hook config vs install.sh registration"

check_hook() {
  local config_key="$1"   # e.g. post_tool_use
  local install_key="$2"  # e.g. PostToolUse
  local enabled
  enabled=$(jq -r ".hooks.$config_key // false" "$ROOT/orbit.config.json")

  local registered=false
  if grep -q "\"$install_key\"" "$ROOT/install.sh" 2>/dev/null; then
    registered=true
  fi

  if [ "$enabled" = "false" ] && [ "$registered" = "true" ]; then
    fail "Hook '$config_key' is false in orbit.config.json but '$install_key' is still registered in install.sh."
    echo "     Fix: make install.sh read the hooks flags before writing settings.json."
    return
  fi
  if [ "$enabled" = "true" ] && [ "$registered" = "false" ]; then
    note "Hook '$config_key' is true in orbit.config.json but '$install_key' is not found in install.sh."
    return
  fi
  pass "Hook '$config_key' config ($enabled) matches install.sh registration ($registered)"
}

check_hook "post_tool_use" "PostToolUse"
check_hook "pre_tool_use"  "PreToolUse"
check_hook "pre_compact"   "PreCompact"
check_hook "stop"          "Stop"

# ── 4. No hardcoded model IDs in agents/ or skills/ ───────────────────────────
echo ""
echo "[ 4/5 ] Hardcoded model IDs in agents/ and skills/"
MODEL_PATTERN="claude-haiku-[0-9]|claude-sonnet-[0-9]|claude-opus-[0-9]"
HITS=$(grep -rn --include="*.md" -E "$MODEL_PATTERN" "$ROOT/agents/" "$ROOT/skills/" 2>/dev/null || true)
if [ -n "$HITS" ]; then
  fail "Hardcoded model IDs found — use semantic aliases from orbit.config.json → models.routing:"
  echo "$HITS" | while IFS= read -r line; do echo "     $line"; done
else
  pass "No hardcoded model IDs in agents/ or skills/"
fi

# ── 5. Vertical domain skills in kernel ───────────────────────────────────────
echo ""
echo "[ 5/5 ] Vertical domain skills in kernel (skills/)"
VERTICAL_SKILLS=("ecommerce")
for skill in "${VERTICAL_SKILLS[@]}"; do
  if [ -f "$ROOT/skills/$skill.md" ]; then
    note "skills/$skill.md is a vertical domain skill in the horizontal kernel."
    echo "     Fix: move to examples/skills/$skill.md (consistent with v2.7.0 forge cleanup)."
  else
    pass "skills/$skill.md not in kernel"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -gt 0 ]; then
  red "FAILED — $ERRORS error(s), $WARNINGS warning(s)"
  echo ""
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  warn "PASSED WITH WARNINGS — 0 errors, $WARNINGS warning(s)"
  echo ""
  exit 0
else
  green "PASSED — 0 errors, 0 warnings"
  echo ""
  exit 0
fi
