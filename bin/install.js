#!/usr/bin/env node
/**
 * Orbit SOTA CLI v2.3.0
 * Usage: npx orbit [init|sync|promote|help] [--global] [--tool claude|all]
 */

const fs = require('fs');
const path = require('path');
// child_process reserved for future use
const os = require('os');

const FRAMEWORK_ROOT = path.join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const command = args.find((a) => ['init', 'sync', 'promote', 'help'].includes(a)) || 'init';
const isGlobal = args.includes('--global') || args.includes('-g');
const isNexus = args.includes('nexus') || args.includes('--nexus');
const _tool = args.includes('--all')
  ? 'all'
  : args.find((a) => ['claude', 'codex', 'cursor'].includes(a)) || 'claude';

// Colors
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

console.log(`\n${c.bold('╔══════════════════════════════════════════╗')}`);
console.log(`${c.bold('║        Orbit SOTA CLI v2.3.0         ║')}`);
console.log(`${c.bold('║      "Nexus" Meta-Orchestrator       ║')}`);
console.log(`${c.bold('╚══════════════════════════════════════════╝')}\n`);

const projectDir = process.cwd();
const claudeDir = isGlobal ? path.join(os.homedir(), '.claude') : path.join(projectDir, '.claude');

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

/**
 * NEXUS: Initialize logical root
 */
function nexusInit() {
  console.log(c.cyan(`▸ Initializing Nexus Logical Root in ${projectDir}...\n`));

  const nexusConfig = {
    workspace_mode: 'nexus',
    org: path.basename(projectDir),
    last_sync: new Date().toISOString(),
    repos: [],
  };

  fs.writeFileSync(path.join(projectDir, 'orbit.nexus.json'), JSON.stringify(nexusConfig, null, 2));
  console.log(`  ${c.green('✓')} orbit.nexus.json (Meta-Registry)`);

  const nexusState = `# NEXUS STATE: ${nexusConfig.org}\n\nThis folder is an Orbit Nexus workspace. Sub-repos are indexed and coordinated by the central Orchestrator.\n`;
  fs.writeFileSync(path.join(projectDir, 'NEXUS-STATE.md'), nexusState);
  console.log(`  ${c.green('✓')} NEXUS-STATE.md (Organizational Memory)`);

  nexusSync();
}

/**
 * NEXUS: Auto-discover sub-repos
 */
function nexusSync() {
  console.log(c.cyan(`\n▸ Syncing Nexus Workspace (Auto-Discovery)...\n`));

  const nexusPath = path.join(projectDir, 'orbit.nexus.json');
  if (!fs.existsSync(nexusPath)) {
    console.error(c.yellow('  ⚠️  No orbit.nexus.json found. Run "orbit nexus init" first.'));
    return;
  }

  const nexus = JSON.parse(fs.readFileSync(nexusPath, 'utf8'));
  const entries = fs.readdirSync(projectDir, { withFileTypes: true });

  nexus.repos = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      const repoPath = path.join(projectDir, entry.name);
      const orbitConfig = path.join(repoPath, 'orbit.config.json');
      const gitDir = path.join(repoPath, '.git');

      if (fs.existsSync(orbitConfig) || fs.existsSync(gitDir)) {
        nexus.repos.push({
          name: entry.name,
          path: `./${entry.name}`,
          orbit_aware: fs.existsSync(orbitConfig),
        });
        console.log(
          `  ${c.green('✓')} Discovered Repo: ${c.bold(entry.name)} ${fs.existsSync(orbitConfig) ? '(Orbit-Aware)' : '(Legacy)'}`
        );
      }
    }
  }

  nexus.last_sync = new Date().toISOString();
  fs.writeFileSync(nexusPath, JSON.stringify(nexus, null, 2));
  console.log(
    c.green(`\n  ✅ Nexus Workspace Sync Complete (${nexus.repos.length} repos indexed)`)
  );
}

/**
 * KNOWLEDGE PROPAGATION: Promote local patterns to core
 */
function handlePromote() {
  console.log(c.cyan(`\n▸ Scouting for Promotion Candidates in ${projectDir}...\n`));

  const localOrbit = path.join(projectDir, '.orbit');
  if (!fs.existsSync(localOrbit)) {
    console.error(c.yellow('  ⚠️  No .orbit folder found in current directory.'));
    return;
  }

  let corePath = null;
  const nexusPath = path.join(projectDir, '..', 'orbit.nexus.json');
  if (fs.existsSync(nexusPath)) {
    const nexus = JSON.parse(fs.readFileSync(nexusPath, 'utf8'));
    const orbitRepo = nexus.repos.find((r) => r.name === 'orbit');
    if (orbitRepo) corePath = path.resolve(projectDir, '..', orbitRepo.path);
  }

  if (!corePath) {
    const relativeCore = path.join(projectDir, '..', 'orbit');
    if (fs.existsSync(relativeCore)) corePath = relativeCore;
  }

  if (!corePath) {
    console.error(c.red('  ❌ Could not locate Orbit Core source repo. Propagation aborted.'));
    return;
  }

  console.log(`${c.dim('  Core found at:')} ${corePath}\n`);

  const subdirs = ['agents', 'skills'];
  let count = 0;

  for (const dir of subdirs) {
    const localDir = path.join(localOrbit, dir);
    if (!fs.existsSync(localDir)) continue;

    const files = fs.readdirSync(localDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(localDir, file), 'utf8');

      if (content.includes('promotion_candidate: true')) {
        console.log(`  ${c.yellow('⭐')} Found Candidate: ${c.bold(file)} (${dir})`);
        const dest = path.join(corePath, dir, file);
        if (fs.existsSync(dest)) {
          console.log(`     ${c.dim('⤷ Skipped: Already exists in core.')}`);
        } else {
          fs.copyFileSync(path.join(localDir, file), dest);
          console.log(`     ${c.green('✅ Promoted to core!')}`);
          count++;
        }
      }
    }
  }

  if (count === 0) {
    console.log(c.dim('  No new candidates found for promotion.'));
  } else {
    console.log(c.green(`\n  ✨ Successfully promoted ${count} patterns to Orbit Core!`));
  }
}

function installForClaude() {
  console.log(c.yellow(`\n▸ Installing for Claude Code → ${claudeDir}\n`));
  copyFile(path.join(FRAMEWORK_ROOT, 'CLAUDE.md'), path.join(claudeDir, 'CLAUDE.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'AGENTS.md'), path.join(claudeDir, 'AGENTS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'INSTRUCTIONS.md'), path.join(claudeDir, 'INSTRUCTIONS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'SKILLS.md'), path.join(claudeDir, 'SKILLS.md'));
  copyFile(path.join(FRAMEWORK_ROOT, 'WORKFLOWS.md'), path.join(claudeDir, 'WORKFLOWS.md'));
  copyFile(
    path.join(FRAMEWORK_ROOT, 'orbit.registry.json'),
    path.join(claudeDir, 'orbit.registry.json')
  );
  copyDir(path.join(FRAMEWORK_ROOT, 'agents'), path.join(claudeDir, 'agents'));
  copyDir(path.join(FRAMEWORK_ROOT, 'skills'), path.join(claudeDir, 'skills'));

  const cmdDir = path.join(claudeDir, 'commands', 'nx');
  ensureDir(cmdDir);
  copyFile(path.join(FRAMEWORK_ROOT, 'commands', 'commands.md'), path.join(cmdDir, 'commands.md'));

  const commands = [
    'new-project',
    'plan',
    'build',
    'verify',
    'ship',
    'next',
    'quick',
    'forge',
    'review',
    'audit',
    'eval',
    'monitor',
    'debug',
    'map-codebase',
    'progress',
    'resume',
    'deploy',
    'rollback',
    'milestone',
    'help',
    'nexus-init',
    'nexus-sync',
    'promote',
  ];

  for (const cmd of commands) {
    const content = `---\ndescription: Orbit /orbit:${cmd} — AI agent orchestration\nallowed-tools: all\n---\n\nLoad .claude/CLAUDE.md for Orbit system context.\nLoad .claude/commands/orbit/commands.md for the /orbit:${cmd} specification.\nArguments: $ARGUMENTS\n`;
    fs.writeFileSync(path.join(cmdDir, `${cmd}.md`), content);
  }

  console.log(`\n${c.green('  ✅ Claude Code installation complete')}`);
}

function initProjectState() {
  if (isGlobal) return;
  const nxStateDir = path.join(projectDir, '.orbit', 'state');
  ensureDir(nxStateDir);
  const statePath = path.join(nxStateDir, 'STATE.md');
  if (!fs.existsSync(statePath)) {
    copyFile(path.join(FRAMEWORK_ROOT, 'state', 'STATE.template.md'), statePath);
  }
}

// Run
try {
  if (isNexus || args.includes('nexus')) {
    if (command === 'init' || args.includes('init')) nexusInit();
    else if (command === 'sync' || args.includes('sync')) nexusSync();
    else console.log('Usage: orbit nexus [init|sync]');
  } else if (command === 'promote') {
    handlePromote();
  } else if (command === 'help') {
    console.log(
      `Commands:\n  init    - Setup local project\n  nexus   - init/sync multi-repo workspace\n  promote - push local patterns to core\n  help    - show this help`
    );
  } else {
    installForClaude();
    initProjectState();
    console.log(`\n${c.green('  ✅ Orbit Installation/Update Complete')}`);
  }
} catch (err) {
  console.error(`\n${c.red('❌ Command failed:')} ${err.message}`);
  process.exit(1);
}
