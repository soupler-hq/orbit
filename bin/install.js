#!/usr/bin/env node
/**
 * Orbit Installer
 * Usage: npx orbit [--global] [--local] [--tool claude|all]
 *        node bin/install.js --global --tool claude
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const FRAMEWORK_VERSION = '1.0.0';
const FRAMEWORK_ROOT = path.join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const tool = args.includes('--all') ? 'all' 
  : args.find(a => ['claude', 'codex', 'cursor'].includes(a)) || 'claude';

// Colors
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue:  (s) => `\x1b[34m${s}\x1b[0m`,
  yellow:(s) => `\x1b[33m${s}\x1b[0m`,
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
  dim:   (s) => `\x1b[2m${s}\x1b[0m`,
};

console.log(`\n${c.bold('╔══════════════════════════════════════════╗')}`);
console.log(`${c.bold('║        Orbit Installer        ║')}`);
console.log(`${c.bold(`║              v${FRAMEWORK_VERSION}                      ║`)}`);
console.log(`${c.bold('╚══════════════════════════════════════════╝')}\n`);

const projectDir = process.cwd();
const claudeDir = isGlobal 
  ? path.join(os.homedir(), '.claude')
  : path.join(projectDir, '.claude');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
      process.stdout.write(`  ${c.dim('✓')} ${entry.name}\n`);
    }
  }
}

function installForClaude() {
  console.log(c.yellow(`\n▸ Installing for Claude Code → ${claudeDir}\n`));

  // Core orchestrator
  copyFile(path.join(FRAMEWORK_ROOT, 'CLAUDE.md'), path.join(claudeDir, 'CLAUDE.md'));
  console.log(`  ${c.green('✓')} CLAUDE.md (master orchestrator)`);

  // Control plane docs
  console.log(`\n  ${c.bold('Control Plane:')}`);
  copyFile(path.join(FRAMEWORK_ROOT, 'AGENTS.md'), path.join(claudeDir, 'AGENTS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'INSTRUCTIONS.md'), path.join(claudeDir, 'INSTRUCTIONS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'SKILLS.md'), path.join(claudeDir, 'SKILLS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'WORKFLOWS.md'), path.join(claudeDir, 'WORKFLOWS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'orbit.registry.json'), path.join(claudeDir, 'orbit.registry.json'));
  copyFile(path.join(FRAMEWORK_ROOT, 'orbit.config.schema.json'), path.join(claudeDir, 'orbit.config.schema.json'));
  console.log(`  ${c.green('✓')} control plane docs, registry, schema`);

  // Agents
  console.log(`\n  ${c.bold('Agents:')}`);
  copyDir(path.join(FRAMEWORK_ROOT, 'agents'), path.join(claudeDir, 'agents'));

  // Skills
  console.log(`\n  ${c.bold('Skills:')}`);
  copyDir(path.join(FRAMEWORK_ROOT, 'skills'), path.join(claudeDir, 'skills'));

  // Commands
  const cmdDir = path.join(claudeDir, 'commands', 'nx');
  ensureDir(cmdDir);
  copyFile(
    path.join(FRAMEWORK_ROOT, 'commands', 'commands.md'),
    path.join(cmdDir, 'commands.md')
  );

  // Install individual command files for Claude Code slash commands
  const commands = [
    'new-project', 'plan', 'build', 'verify', 'ship', 'next',
    'quick', 'forge', 'review', 'audit', 'eval', 'monitor', 'debug',
    'map-codebase', 'progress', 'resume', 'deploy', 'rollback',
    'milestone', 'help'
  ];

  console.log(`\n  ${c.bold('Commands:')}`);
  for (const cmd of commands) {
    const content = `---
description: Orbit /orbit:${cmd} — AI agent orchestration
allowed-tools: all
---

Load .claude/CLAUDE.md for Orbit system context.
Load .claude/commands/orbit/commands.md for the /orbit:${cmd} specification.
Execute the /orbit:${cmd} command following the defined process exactly.
Arguments: $ARGUMENTS
`;
    fs.writeFileSync(path.join(cmdDir, `${cmd}.md`), content);
    process.stdout.write(`  ${c.dim('✓')} /orbit:${cmd}\n`);
  }

  // State template
  ensureDir(path.join(claudeDir, 'state'));
  copyFile(
    path.join(FRAMEWORK_ROOT, 'state', 'STATE.template.md'),
    path.join(claudeDir, 'state', 'STATE.template.md')
  );

  // Hooks reference
  ensureDir(path.join(claudeDir, 'hooks'));
  copyFile(
    path.join(FRAMEWORK_ROOT, 'hooks', 'HOOKS.md'),
    path.join(claudeDir, 'hooks', 'HOOKS.md')
  );

  // Docs
  ensureDir(path.join(claudeDir, 'docs'));
  copyDir(path.join(FRAMEWORK_ROOT, 'docs'), path.join(claudeDir, 'docs'));

  console.log(`\n${c.green('  ✅ Claude Code installation complete')}`);
}

function initProjectState() {
  if (isGlobal) return;
  
  const nexusStateDir = path.join(projectDir, '.orbit', 'state');
  ensureDir(nexusStateDir);

  const statePath = path.join(nexusStateDir, 'STATE.md');
  if (!fs.existsSync(statePath)) {
    copyFile(
      path.join(FRAMEWORK_ROOT, 'state', 'STATE.template.md'),
      statePath
    );
    console.log(`\n${c.blue('▸')} Created .orbit/state/STATE.md`);
  }

  // Update .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.orbit/cache')) {
    fs.appendFileSync(gitignorePath, '\n# Orbit cache (state is tracked)\n.orbit/cache/\n.orbit/errors/\n');
      console.log(`${c.blue('▸')} Updated .gitignore`);
    }
  }
}

// Run
try {
  if (tool === 'claude' || tool === 'all') installForClaude();
  initProjectState();

  console.log(`\n${c.bold('╔══════════════════════════════════════════╗')}`);
  console.log(`${c.bold('║        Installation Complete! 🚀         ║')}`);
  console.log(`${c.bold('╚══════════════════════════════════════════╝')}\n`);

  console.log(`${c.green('Get started:')}\n`);
  console.log(`  ${c.bold('New project:')}     /orbit:new-project`);
  console.log(`  ${c.bold('Existing repo:')}   /orbit:map-codebase  →  /orbit:new-project`);
  console.log(`  ${c.bold('Quick task:')}      /orbit:quick <describe the task>`);
  console.log(`  ${c.bold('Custom agent:')}    /orbit:forge <describe the domain>`);
  console.log(`  ${c.bold('All commands:')}    /orbit:help\n`);

} catch (err) {
  console.error(`\n\x1b[31m❌ Installation failed:\x1b[0m ${err.message}`);
  process.exit(1);
}
