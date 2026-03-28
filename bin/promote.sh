#!/usr/bin/env bash
# Orbit Promote — /orbit:promote
# Validates a local forged agent or skill and prints a PR draft for upstreaming to soupler-hq/orbit.
# Usage: bash bin/promote.sh <file> [--dry-run]
#
# What this does:
#   1. Validates the candidate file meets the structural contract
#   2. Classifies it as agent or skill
#   3. Checks it does not already exist in the Orbit core
#   4. Prints a PR body ready to open against soupler-hq/orbit

set -euo pipefail

FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

# ── Args ──────────────────────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: bash bin/promote.sh <file> [--dry-run]" >&2
  echo "  file       path to an agent (agents/*.md) or skill (skills/*.md)" >&2
  echo "  --dry-run  validate only, do not open a PR" >&2
  exit 1
fi

CANDIDATE="$1"
DRY_RUN=0
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN=1

if [[ ! -f "$CANDIDATE" ]]; then
  echo -e "${RED}✗ File not found: $CANDIDATE${NC}" >&2
  exit 1
fi

NAME=$(basename "$CANDIDATE" .md)
CONTENT=$(cat "$CANDIDATE")

echo -e "${BOLD}Orbit Promote — validating: $CANDIDATE${NC}"
echo ""

# ── Classify ──────────────────────────────────────────────────────────────────
# Determine if this is an agent or skill based on required sections.
AGENT_SECTIONS=("TRIGGERS ON" "DOMAIN EXPERTISE" "OPERATING RULES" "SKILLS LOADED" "OUTPUT FORMAT")
SKILL_SECTIONS=("ACTIVATION" "CORE PRINCIPLES" "PATTERNS" "CHECKLISTS" "ANTI-PATTERNS" "VERIFICATION WORKFLOW")

is_agent() {
  for s in "${AGENT_SECTIONS[@]}"; do
    grep -q "## $s" "$CANDIDATE" 2>/dev/null || return 1
  done
  return 0
}

is_skill() {
  for s in "${SKILL_SECTIONS[@]}"; do
    grep -q "## $s" "$CANDIDATE" 2>/dev/null || return 1
  done
  return 0
}

TYPE=""
REQUIRED_SECTIONS=()
DEST_DIR=""

if is_agent; then
  TYPE="agent"
  REQUIRED_SECTIONS=("${AGENT_SECTIONS[@]}")
  DEST_DIR="agents"
elif is_skill; then
  TYPE="skill"
  REQUIRED_SECTIONS=("${SKILL_SECTIONS[@]}")
  DEST_DIR="skills"
else
  echo -e "${RED}✗ Cannot classify $CANDIDATE as agent or skill.${NC}" >&2
  echo "  Agent requires:  TRIGGERS ON, DOMAIN EXPERTISE, OPERATING RULES, SKILLS LOADED, OUTPUT FORMAT" >&2
  echo "  Skill requires:  ACTIVATION, CORE PRINCIPLES, PATTERNS, CHECKLISTS, ANTI-PATTERNS, VERIFICATION WORKFLOW" >&2
  exit 1
fi

echo -e "  Type: ${BOLD}$TYPE${NC}"

# ── Section check ─────────────────────────────────────────────────────────────
PASS=0; FAIL=0
for section in "${REQUIRED_SECTIONS[@]}"; do
  if echo "$CONTENT" | grep -q "## $section"; then
    echo -e "  ${GREEN}✓${NC} ## $section"
    (( PASS++ )) || true
  else
    echo -e "  ${RED}✗${NC} ## $section — missing"
    (( FAIL++ )) || true
  fi
done

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}✗ Validation failed — $FAIL required section(s) missing.${NC}" >&2
  echo "  Fix the file before promoting." >&2
  exit 1
fi

echo ""
echo -e "${GREEN}✓ All required sections present ($PASS/$PASS)${NC}"

# ── Uniqueness check ──────────────────────────────────────────────────────────
CORE_FILE="$FRAMEWORK_DIR/$DEST_DIR/$NAME.md"
if [[ -f "$CORE_FILE" ]]; then
  echo -e "${YELLOW}⚠  $DEST_DIR/$NAME.md already exists in the Orbit core.${NC}"
  echo "   If you want to update an existing ${TYPE}, open a PR manually with the diff."
  exit 0
fi

echo -e "${GREEN}✓ No conflict — $DEST_DIR/$NAME.md does not exist in core${NC}"

# ── PR draft ──────────────────────────────────────────────────────────────────
FIRST_LINE=$(head -1 "$CANDIDATE" | sed 's/^# //')
REPO_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "unknown")
SOURCE_REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || echo "project")")
BRANCH="promote/${TYPE}/${NAME}"

echo ""
echo -e "${BOLD}── PR Draft ────────────────────────────────────────────────────────${NC}"
echo ""
cat << PR_BODY
Title: promote(${TYPE}): add ${NAME} — ${FIRST_LINE}

Body:
## Summary
- Promotes \`${TYPE}/${NAME}.md\` from \`${SOURCE_REPO}\` to the Orbit core
- Type: ${TYPE}
- Validated: all required sections present

## File
\`${DEST_DIR}/${NAME}.md\`

## Checklist
- [ ] All required sections present (${REQUIRED_SECTIONS[*]})
- [ ] orbit.registry.json updated to include ${NAME}
- [ ] CLAUDE.md agent table updated (if agent)
- [ ] CHANGELOG.md entry added
PR_BODY

echo ""
echo -e "${BOLD}── Next Steps ──────────────────────────────────────────────────────${NC}"
echo ""
echo "  1. Fork or branch soupler-hq/orbit"
echo "  2. Copy $CANDIDATE → $DEST_DIR/$NAME.md"
echo "  3. Add to orbit.registry.json"
echo "  4. Open a PR with the title and body above"
echo ""

if [[ "$DRY_RUN" -eq 0 ]] && command -v gh &>/dev/null; then
  echo -e "${YELLOW}  To open the PR now (requires gh CLI and fork access):${NC}"
  echo "  gh pr create --repo soupler-hq/orbit --title \"promote(${TYPE}): add ${NAME}\" --body \"...\""
fi

echo -e "${GREEN}✓ Promote check complete — $NAME is ready for upstream.${NC}"
