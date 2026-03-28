#!/usr/bin/env bash
# Orbit Installation Script v2.0.0
# Soupler Engineering Standard — agentic framework
set -e

FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_MODE="local"
TOOL="claude"
PROJECT_DIR="${PWD}"
SKIP_VERIFY=0
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

while [[ $# -gt 0 ]]; do
  case $1 in
    --global|-g)   INSTALL_MODE="global"; shift ;;
    --local|-l)    INSTALL_MODE="local";  shift ;;
    --tool)        TOOL="$2"; shift 2 ;;
    --all)         TOOL="all"; shift ;;
    --hooks-only)  INSTALL_HOOKS_ONLY=1; shift ;;
    --skip-verify) SKIP_VERIFY=1; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$INSTALL_MODE" == "global" ]]; then
  CLAUDE_DIR="$HOME/.claude"
else
  CLAUDE_DIR="$PROJECT_DIR/.claude"
fi

echo -e "${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║   Orbit Installer v2.0.0   ║"
echo "║   Soupler AI Engineering Standard      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Checksum Verification ───────────────────────────────────────────────────
# Verifies framework files against the published SHASUM256.txt manifest.
# Requires: curl, shasum (both available by default on macOS and most Linux distros).
# Skip with --skip-verify (prints a prominent warning).
verify_checksums() {
  local manifest="$FRAMEWORK_DIR/SHASUM256.txt"

  if [[ "$SKIP_VERIFY" -eq 1 ]]; then
    echo -e "${YELLOW}⚠️  WARNING: --skip-verify flag is set. Checksum verification SKIPPED.${NC}"
    echo -e "${YELLOW}   Only use this in local development. Never skip in production installs.${NC}"
    return 0
  fi

  # If a local manifest exists (e.g. cloned repo), verify against it
  if [[ -f "$manifest" ]]; then
    echo -e "${YELLOW}▶ Verifying framework file integrity...${NC}"
    # Run shasum check from the framework dir so relative paths resolve
    if (cd "$FRAMEWORK_DIR" && shasum -a 256 --check SHASUM256.txt --quiet 2>&1); then
      echo -e "${GREEN}  ✅ All checksums verified${NC}"
    else
      echo -e "${RED}  ❌ Checksum mismatch detected — aborting installation.${NC}" >&2
      echo -e "${RED}     One or more framework files do not match the published manifest.${NC}" >&2
      echo -e "${RED}     Download a fresh copy from: https://github.com/soupler-hq/orbit/releases${NC}" >&2
      exit 1
    fi
  else
    # No local manifest — skip silently (expected for source checkouts without a release)
    echo -e "${BLUE}  ℹ  No SHASUM256.txt found — skipping integrity check (source install).${NC}"
  fi
}

# ─── Install for Claude Code ──────────────────────────────────────────────────
install_for_claude() {
  echo -e "${YELLOW}▶ Installing for Claude Code...${NC}"

  # Core directories
  mkdir -p \
    "$CLAUDE_DIR/commands/orbit" \
    "$CLAUDE_DIR/agents" \
    "$CLAUDE_DIR/skills" \
    "$CLAUDE_DIR/state" \
    "$CLAUDE_DIR/orbit/hooks"

  # ── Orchestrator ──────────────────────────────────────────────────────────
  cp "$FRAMEWORK_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
  echo "  ✓ CLAUDE.md (orchestrator v2.0)"

  # ── Control Plane ─────────────────────────────────────────────────────────
  cp "$FRAMEWORK_DIR/AGENTS.md" "$CLAUDE_DIR/AGENTS.md"
  cp "$FRAMEWORK_DIR/INSTRUCTIONS.md" "$CLAUDE_DIR/INSTRUCTIONS.md"
  cp "$FRAMEWORK_DIR/SKILLS.md" "$CLAUDE_DIR/SKILLS.md"
  cp "$FRAMEWORK_DIR/WORKFLOWS.md" "$CLAUDE_DIR/WORKFLOWS.md"
  cp "$FRAMEWORK_DIR/orbit.registry.json" "$CLAUDE_DIR/orbit.registry.json"
  cp "$FRAMEWORK_DIR/orbit.config.schema.json" "$CLAUDE_DIR/orbit.config.schema.json"
  echo "  ✓ control plane docs + registry + schema"

  # ── Core Agents ───────────────────────────────────────────────────────────
  for f in "$FRAMEWORK_DIR"/agents/*.md; do
    name=$(basename "$f")
    cp "$f" "$CLAUDE_DIR/agents/$name"
    echo "  ✓ agents/$name"
  done

  # ── Forged Specialist Agents ───────────────────────────────────────────────
  if [[ -d "$FRAMEWORK_DIR/forge" ]]; then
    mkdir -p "$CLAUDE_DIR/agents/forge"
    for f in "$FRAMEWORK_DIR"/forge/*.md; do
      name=$(basename "$f")
      cp "$f" "$CLAUDE_DIR/agents/forge/$name"
      echo "  ✓ agents/forge/$name"
    done
  fi

  # ── Skills ────────────────────────────────────────────────────────────────
  for f in "$FRAMEWORK_DIR"/skills/*.md; do
    name=$(basename "$f")
    cp "$f" "$CLAUDE_DIR/skills/$name"
    echo "  ✓ skills/$name"
  done

  # ── Commands ──────────────────────────────────────────────────────────────
  cp "$FRAMEWORK_DIR/commands/commands.md" "$CLAUDE_DIR/commands/orbit/commands.md"
  echo "  ✓ commands/orbit/commands.md"

  # Generate individual command files
  local commands=(
    new-project plan build verify ship next quick forge review audit
    monitor debug map-codebase progress resume deploy rollback
    riper worktree cost
  )
  for cmd in "${commands[@]}"; do
    cat > "$CLAUDE_DIR/commands/orbit/${cmd}.md" << CMDEOF
---
description: "Orbit /orbit:${cmd} — AI agent orchestration"
allowed-tools: all
---
Read \$CLAUDE_DIR/CLAUDE.md to load Orbit context.
Read \$CLAUDE_DIR/commands/orbit/commands.md for this command's exact process specification.
If STATE.md exists at .orbit/state/STATE.md, read it for project context.
Execute: /orbit:${cmd} \$ARGUMENTS — follow the exact process defined, no shortcuts.
CMDEOF
    echo "  ✓ /orbit:${cmd}"
  done

  # ── State Template ────────────────────────────────────────────────────────
  cp "$FRAMEWORK_DIR/state/STATE.template.md" "$CLAUDE_DIR/state/STATE.template.md"
  echo "  ✓ state/STATE.template.md"

  # ── Hook Scripts ──────────────────────────────────────────────────────────
  echo ""
  echo -e "${YELLOW}▶ Installing lifecycle hooks...${NC}"
  for f in "$FRAMEWORK_DIR"/hooks/scripts/*.sh; do
    name=$(basename "$f")
    cp "$f" "$CLAUDE_DIR/orbit/hooks/$name"
    chmod +x "$CLAUDE_DIR/orbit/hooks/$name"
    echo "  ✓ hooks/$name"
  done

  # ── Claude Code Settings (hooks registration) ─────────────────────────────
  echo ""
  echo -e "${YELLOW}▶ Configuring Claude Code settings...${NC}"
  install_claude_settings

  echo -e "${GREEN}  ✅ Claude Code installation complete${NC}"
}

# ─── Install for Codex ───────────────────────────────────────────────────────
install_for_codex() {
  echo -e "${YELLOW}▶ Installing for Codex...${NC}"

  local codex_dir
  if [[ "$INSTALL_MODE" == "global" ]]; then
    codex_dir="$HOME/.codex"
  else
    codex_dir="$PROJECT_DIR/.codex"
  fi

  mkdir -p "$codex_dir/agents" "$codex_dir/skills" "$codex_dir/state"

  # Codex reads INSTRUCTIONS.md as its operator prompt (equivalent to CLAUDE.md).
  cp "$FRAMEWORK_DIR/INSTRUCTIONS.md"          "$codex_dir/INSTRUCTIONS.md"
  cp "$FRAMEWORK_DIR/AGENTS.md"                "$codex_dir/AGENTS.md"
  cp "$FRAMEWORK_DIR/SKILLS.md"                "$codex_dir/SKILLS.md"
  cp "$FRAMEWORK_DIR/WORKFLOWS.md"             "$codex_dir/WORKFLOWS.md"
  cp "$FRAMEWORK_DIR/orbit.registry.json"      "$codex_dir/orbit.registry.json"
  cp "$FRAMEWORK_DIR/orbit.config.json"        "$codex_dir/orbit.config.json"
  cp "$FRAMEWORK_DIR/orbit.config.schema.json" "$codex_dir/orbit.config.schema.json"
  cp "$FRAMEWORK_DIR/state/STATE.template.md"  "$codex_dir/state/STATE.template.md"
  echo "  ✓ operator surface + registry + config + state template"

  for f in "$FRAMEWORK_DIR"/agents/*.md; do
    cp "$f" "$codex_dir/agents/$(basename "$f")"
  done
  echo "  ✓ agents/ ($(ls "$FRAMEWORK_DIR/agents/"*.md | wc -l | tr -d ' ') files)"

  for f in "$FRAMEWORK_DIR"/skills/*.md; do
    cp "$f" "$codex_dir/skills/$(basename "$f")"
  done
  echo "  ✓ skills/ ($(ls "$FRAMEWORK_DIR/skills/"*.md | wc -l | tr -d ' ') files)"

  # Codex policy: injected system context pointing to the Orbit control plane.
  cat > "$codex_dir/policy.md" << 'POLICY_EOF'
# Orbit Control Plane — Codex Adapter

You are running the Orbit orchestration framework.

Read INSTRUCTIONS.md at session start. Your agent registry is orbit.registry.json.
Classify the request, select the best agent, dispatch work per WORKFLOWS.md.
Read state/STATE.md on start, write it on session end.

/orbit: command equivalents — follow the matching section in WORKFLOWS.md:
  plan → WORKFLOWS.md §plan  |  build → §build  |  verify → §verify  |  ship → §ship
POLICY_EOF
  echo "  ✓ policy.md (Orbit adapter context)"
  echo -e "${GREEN}  ✅ Codex installation complete → $codex_dir${NC}"
}

# ─── Write Claude Code settings.json with hooks ───────────────────────────────
install_claude_settings() {
  local settings_file="$CLAUDE_DIR/settings.json"
  local hooks_dir

  if [[ "$INSTALL_MODE" == "global" ]]; then
    hooks_dir="\$HOME/.claude/orbit/hooks"
  else
    hooks_dir=".orbit/hooks"
  fi

  # Merge with existing settings if present, otherwise create new
  if [[ -f "$settings_file" ]] && command -v jq &>/dev/null; then
    echo "  Found existing settings.json — merging hooks..."
    local tmp_settings
    tmp_settings=$(mktemp)
    jq --arg hdir "$HOME/.claude/orbit/hooks" '
      .hooks = {
        "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": ("bash \"" + $hdir + "/pre-tool-use.sh\" 2>/dev/null || true")}]}],
        "PostToolUse": [{"matcher": ".*", "hooks": [{"type": "command", "command": ("bash \"" + $hdir + "/post-tool-use.sh\" 2>/dev/null || true")}]}],
        "PreCompact":  [{"matcher": ".*", "hooks": [{"type": "command", "command": ("bash \"" + $hdir + "/pre-compact.sh\" 2>/dev/null || true")}]}],
        "Stop":        [{"matcher": ".*", "hooks": [{"type": "command", "command": ("bash \"" + $hdir + "/stop.sh\" 2>/dev/null || true")}]}]
      }
    ' "$settings_file" > "$tmp_settings" && mv "$tmp_settings" "$settings_file"
  else
    # Write fresh settings
    local HOOK_BASE="$HOME/.claude/orbit/hooks"
    cat > "$settings_file" << SETTINGS_EOF
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(node:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{"type": "command", "command": "bash \"${HOOK_BASE}/pre-tool-use.sh\" 2>/dev/null || true"}]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [{"type": "command", "command": "bash \"${HOOK_BASE}/post-tool-use.sh\" 2>/dev/null || true"}]
      }
    ],
    "PreCompact": [
      {
        "matcher": ".*",
        "hooks": [{"type": "command", "command": "bash \"${HOOK_BASE}/pre-compact.sh\" 2>/dev/null || true"}]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [{"type": "command", "command": "bash \"${HOOK_BASE}/stop.sh\" 2>/dev/null || true"}]
      }
    ]
  }
}
SETTINGS_EOF
  fi
  echo "  ✓ settings.json (hooks: PreToolUse, PostToolUse, PreCompact, Stop)"
}

# ─── Initialize project state directory ───────────────────────────────────────
init_project_state() {
  echo ""
  echo -e "${YELLOW}▶ Initializing project state...${NC}"

  local state_dir="$PROJECT_DIR/.orbit/state"
  local hooks_dir="$PROJECT_DIR/.orbit/hooks"

  mkdir -p "$state_dir" "$hooks_dir" "$PROJECT_DIR/.orbit/errors"

  # Copy STATE template if no STATE.md yet
  if [[ ! -f "$state_dir/STATE.md" ]]; then
    cp "$FRAMEWORK_DIR/state/STATE.template.md" "$state_dir/STATE.md"
    echo "  ✓ .orbit/state/STATE.md (from template)"
  else
    echo "  ✓ .orbit/state/STATE.md (already exists — preserved)"
  fi

  # Copy hook scripts to project-local .orbit/hooks/
  for f in "$FRAMEWORK_DIR"/hooks/scripts/*.sh; do
    name=$(basename "$f")
    cp "$f" "$hooks_dir/$name"
    chmod +x "$hooks_dir/$name"
  done
  echo "  ✓ .orbit/hooks/ (lifecycle scripts)"

  # Copy config if not present
  if [[ ! -f "$PROJECT_DIR/orbit.config.json" ]]; then
    cp "$FRAMEWORK_DIR/orbit.config.json" "$PROJECT_DIR/orbit.config.json"
    echo "  ✓ orbit.config.json (framework configuration)"
  fi

  # Add Orbit state dirs to .gitignore
  local gitignore="$PROJECT_DIR/.gitignore"
  if [[ -f "$gitignore" ]]; then
    if ! grep -q "\.orbit/errors" "$gitignore" 2>/dev/null; then
      cat >> "$gitignore" << GITIGNORE_EOF

# Orbit
.orbit/errors/
.orbit/state/sessions.log
.orbit/state/tool-usage.log
.orbit/state/compact.log
.worktrees/
GITIGNORE_EOF
      echo "  ✓ .gitignore (Orbit entries added)"
    fi
  fi

  echo -e "${GREEN}  ✅ Project state initialized${NC}"
}

# ─── Main ────────────────────────────────────────────────────────────────────
verify_checksums

if [[ "$INSTALL_MODE" == "local" ]]; then
  init_project_state
fi

case "$TOOL" in
  claude) install_for_claude ;;
  codex)  install_for_codex ;;
  all)    install_for_claude; install_for_codex ;;
esac

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Installation complete!${NC}"
echo ""
echo -e "Installed to: ${BLUE}$CLAUDE_DIR${NC}"
echo ""
echo -e "Framework:"
echo -e "  Agents:  $(ls "$FRAMEWORK_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ') core + $(ls "$FRAMEWORK_DIR/forge/"*.md 2>/dev/null | wc -l | tr -d ' ') forged"
echo -e "  Skills:  $(ls "$FRAMEWORK_DIR/skills/"*.md 2>/dev/null | wc -l | tr -d ' ') skills loaded"
echo -e "  Hooks:   PreToolUse, PostToolUse, PreCompact, Stop"
echo ""
echo -e "Start with:"
echo -e "  ${BLUE}/orbit:new-project${NC}   — start a new project from scratch"
echo -e "  ${BLUE}/orbit:map-codebase${NC}  — analyze an existing repo before planning"
echo -e "  ${BLUE}/orbit:resume${NC}        — continue from last session"
echo ""
echo -e "${YELLOW}Docs: https://github.com/soupler/orbit${NC}"
