#!/usr/bin/env node
/**
 * Orbit Eval Runner (Issue #13)
 * Checks routing accuracy, workflow coverage, registry integrity, and portability.
 * Reads docs/quality/eval-dataset.md as the ground truth and validates against live registry/files.
 * Exits 1 if overall pass rate < 80%.
 *
 * Usage:  node bin/eval-runner.js [--json]
 * CI:     node bin/eval-runner.js --json > eval-report.json
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const JSON_OUT = ARGS.includes('--json');

// ── Helpers ────────────────────────────────────────────────────────────────

function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readMarkdownSection(content, heading) {
  if (!content) return '';
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`(^|\\n)## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[0] : '';
}

function hasMarkdownListItems(sectionText) {
  return /(^|\n)(- |\d+\.)\S?/.test(sectionText) || /(^|\n)(- |\d+\.)\s+\S/.test(sectionText);
}

function hasSectionContent(sectionText, heading) {
  if (!sectionText) return false;
  return sectionText.replace(new RegExp(`(^|\\n)## ${heading}\\n?`), '').trim().length > 0;
}

function extractMarkdownCodeRefs(sectionText) {
  return [...sectionText.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function makeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function buildFakeRuntime({ branch, dirty = false, prData = null }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-runtime-'));
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const gitScript = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "rev-parse" && "$2" == "--abbrev-ref" && "$3" == "HEAD" ]]; then
  printf '%s\\n' '${branch}'
  exit 0
fi
if [[ "$1" == "status" && "$2" == "--porcelain" ]]; then
  if [[ "${dirty ? '1' : '0'}" == "1" ]]; then
    printf ' M src/example.js\\n'
  fi
  exit 0
fi
exit 1
`;

  const ghBody = JSON.stringify(prData ?? {});
  const ghScript = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  cat <<'EOF'
${ghBody}
EOF
  exit 0
fi
exit 1
`;

  makeExecutable(path.join(binDir, 'git'), gitScript);
  makeExecutable(path.join(binDir, 'gh'), ghScript);

  return {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
    },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

function runNode(relPath, args = [], options = {}) {
  return execFileSync('node', [path.join(ROOT, relPath), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...options,
  });
}

function installRuntimeArtifact(tool) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `orbit-eval-install-${tool}-`));
  try {
    execFileSync(
      'bash',
      [path.join(ROOT, 'install.sh'), '--local', '--skip-verify', '--tool', tool],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    const contractPath =
      tool === 'claude'
        ? path.join(tmpDir, '.claude', 'adapter.contract.json')
        : tool === 'codex'
          ? path.join(tmpDir, '.codex', 'adapter.contract.json')
          : path.join(tmpDir, '.antigravity', 'adapter.contract.json');

    return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function initGitRepo(repoDir) {
  fs.mkdirSync(repoDir, { recursive: true });
  execFileSync('git', ['init'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync('git', ['config', 'user.name', 'Orbit Test'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync('git', ['config', 'user.email', 'orbit-tests@example.com'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# test\n');
  execFileSync('git', ['add', 'README.md'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync('git', ['commit', '-m', 'init'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveHooksDir(repoDir) {
  const hooksPath = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return path.isAbsolute(hooksPath) ? hooksPath : path.join(repoDir, hooksPath);
}

function checkLinkedHooks(repoDir) {
  return ['pre-commit', 'pre-push', 'post-commit'].every((hook) => {
    const hookPath = path.join(resolveHooksDir(repoDir), hook);
    return fs.existsSync(hookPath) && fs.lstatSync(hookPath).isSymbolicLink();
  });
}

function runInstallOrSetup({ kind, worktree = false }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `orbit-eval-${kind}-`));
  try {
    const repoDir = path.join(tmpDir, 'repo');
    initGitRepo(repoDir);

    let targetDir = repoDir;
    if (worktree) {
      const worktreeDir = path.join(tmpDir, 'worktree');
      execFileSync('git', ['worktree', 'add', worktreeDir, '-b', 'feat/eval-hooks'], {
        cwd: repoDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      targetDir = worktreeDir;
    }

    if (kind === 'install') {
      execFileSync(
        'bash',
        [path.join(ROOT, 'install.sh'), '--local', '--skip-verify', '--tool', 'claude'],
        {
          cwd: targetDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
    } else {
      execFileSync('bash', [path.join(ROOT, 'bin', 'setup.sh'), '--tool', 'claude'], {
        cwd: targetDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }

    return checkLinkedHooks(targetDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
function checkRuntimeCommandOutput(relPath, args, expectations) {
  try {
    const output = runNode(relPath, args);
    const pass = expectations.every((snippet) => output.includes(snippet));
    return {
      pass,
      reason: pass ? 'ok' : `${relPath} missing expected runtime block output`,
    };
  } catch (error) {
    return {
      pass: false,
      reason: `${relPath} failed to execute: ${error.message}`,
    };
  }
}

/** Parse the eval-dataset.md Markdown table into case objects. */
function parseEvalDataset(content) {
  const cases = [];
  const lines = content.split('\n');
  // Find the header row, skip separator, then read data rows
  let inTable = false;
  let headerPassed = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      inTable = false;
      headerPassed = false;
      continue;
    }
    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells[0] === 'ID') {
      inTable = true;
      continue;
    } // header
    if (inTable && /^[-:]+$/.test(cells[0])) {
      headerPassed = true;
      continue;
    } // separator
    if (inTable && headerPassed && cells.length >= 5) {
      const id = cells[0];
      const agent = cells[3];
      // Extract first /orbit:command from the workflow cell (strip backticks/qualifiers)
      const wfCell = cells[4];
      const wfMatch = wfCell.match(/`(\/orbit:[a-z-]+)`/);
      const workflow = wfMatch ? wfMatch[1] : null;
      cases.push({ id, agent, workflow, raw: { agent: cells[3], workflow: wfCell } });
    }
  }
  return cases;
}

// ── Load artefacts ─────────────────────────────────────────────────────────

const registryText = readFile('orbit.registry.json');
if (!registryText) {
  console.error('ERROR: orbit.registry.json not found');
  process.exit(2);
}
const registry = JSON.parse(registryText);

const datasetText = readFile('docs/quality/eval-dataset.md');
if (!datasetText) {
  console.error('ERROR: docs/quality/eval-dataset.md not found');
  process.exit(2);
}
const evalCases = parseEvalDataset(datasetText);

const adapterText = readFile('docs/architecture/runtime-adapters.md') || '';
const commandsText = readFile('commands/commands.md') || '';
const configText = readFile('orbit.config.json');
const config = configText ? JSON.parse(configText) : { runtimes: {} };
const stateTemplateText = readFile('templates/STATE.md') || '';
const decisionsLogTemplateText = readFile('templates/DECISIONS-LOG.md') || '';
const operationalRulesTemplateText = readFile('templates/OPERATIONAL-RULES.json') || '';
const preToolUseHookText = readFile('hooks/scripts/pre-tool-use.sh') || '';

// Build lookup sets from registry
const registryAgentNames = new Set(registry.agents.map((a) => a.name));
const registryWorkflowCmds = new Set(registry.workflows.map((w) => w.command));
const registrySkillFiles = new Set(registry.skills.map((s) => s.file));

const REQUIRED_V29_AGENT_CONTRACTS = [
  'product-manager',
  'business-analyst',
  'qa-engineer',
  'designer',
  'security-engineer',
  'data-engineer',
  'safety-evaluator',
  'pedagogue',
];
const REQUIRED_AGENT_SECTIONS = [
  'ROLE',
  'TRIGGERS ON',
  'DOMAIN EXPERTISE',
  'OPERATING RULES',
  'SKILLS LOADED',
  'OUTPUT FORMAT',
  'ANTI-PATTERNS',
];
const REQUIRED_V29_SKILLS = ['skills/instructor.md', 'skills/workflow-audit.md'];
const REQUIRED_V29_WORKFLOWS = [
  { command: '/orbit:ask', doc: 'commands/orbit/ask.md' },
  { command: '/orbit:clarify', doc: 'commands/orbit/clarify.md' },
  { command: '/orbit:discover', doc: 'commands/orbit/discover.md' },
  { command: '/orbit:eval', doc: 'commands/orbit/eval.md' },
  { command: '/orbit:riper', doc: 'commands/orbit/riper.md' },
];

// ── Metric 1: Routing Accuracy ─────────────────────────────────────────────
// For each eval case: expected agent exists in registry AND agent file exists.

const routingResults = evalCases.map((c) => {
  // Some agents are listed with " or " — treat first as primary
  const primaryAgent = c.agent.split(/\s+or\s+/)[0].trim();
  const inRegistry = registryAgentNames.has(primaryAgent);
  const agentEntry = registry.agents.find((a) => a.name === primaryAgent);
  const fileOk = agentEntry ? fileExists(agentEntry.file) : false;
  const pass = inRegistry && fileOk;
  return {
    id: c.id,
    agent: primaryAgent,
    inRegistry,
    fileExists: fileOk,
    pass,
    reason: pass
      ? 'ok'
      : !inRegistry
        ? `agent "${primaryAgent}" not in registry`
        : `agent file "${agentEntry?.file}" missing`,
  };
});

// ── Metric 2: Workflow Coverage ────────────────────────────────────────────
// For each eval case: expected workflow command exists in registry AND in commands.md.

const workflowResults = evalCases.map((c) => {
  if (!c.workflow) {
    return {
      id: c.id,
      workflow: null,
      pass: false,
      reason: 'no /orbit: command parsed from dataset',
    };
  }
  const inRegistry = registryWorkflowCmds.has(c.workflow);
  const inCommands = commandsText.includes(c.workflow);
  const pass = inRegistry && inCommands;
  return {
    id: c.id,
    workflow: c.workflow,
    inRegistry,
    inCommands,
    pass,
    reason: pass
      ? 'ok'
      : !inRegistry
        ? `workflow "${c.workflow}" not in registry`
        : `workflow "${c.workflow}" not in commands.md`,
  };
});

// ── Metric 3: Registry Integrity ───────────────────────────────────────────
// All agent files exist, all skill files exist, all workflow commands are /orbit:.

const integrityResults = [];

for (const agent of registry.agents) {
  const exists = fileExists(agent.file);
  integrityResults.push({
    check: `agent file: ${agent.file}`,
    pass: exists,
    reason: exists ? 'ok' : `missing file: ${agent.file}`,
  });
}

for (const skill of registry.skills) {
  const exists = fileExists(skill.file);
  integrityResults.push({
    check: `skill file: ${skill.file}`,
    pass: exists,
    reason: exists ? 'ok' : `missing file: ${skill.file}`,
  });
}

for (const wf of registry.workflows) {
  const valid = /^\/orbit:[a-z-]+$/.test(wf.command);
  integrityResults.push({
    check: `workflow command format: ${wf.command}`,
    pass: valid,
    reason: valid ? 'ok' : `invalid format: "${wf.command}"`,
  });
}

for (const agentName of REQUIRED_V29_AGENT_CONTRACTS) {
  const agent = registry.agents.find((entry) => entry.name === agentName);
  const content = agent ? readFile(agent.file) : '';
  const baseLabel = `agent contract: ${agentName}`;

  integrityResults.push({
    check: `${baseLabel} is registered`,
    pass: !!agent,
    reason: agent ? 'ok' : `registry missing agent "${agentName}"`,
  });

  if (!agent || !content) {
    integrityResults.push({
      check: `${baseLabel} file exists`,
      pass: false,
      reason: agent ? `missing file: ${agent.file}` : `registry missing agent "${agentName}"`,
    });
    continue;
  }

  integrityResults.push({
    check: `${baseLabel} file exists`,
    pass: true,
    reason: 'ok',
  });

  for (const heading of REQUIRED_AGENT_SECTIONS) {
    const sectionText = readMarkdownSection(content, heading);
    integrityResults.push({
      check: `${baseLabel} includes ## ${heading}`,
      pass: Boolean(sectionText.trim()),
      reason: sectionText.trim() ? 'ok' : `${agent.file} missing ## ${heading}`,
    });

    if (heading === 'TRIGGERS ON') {
      integrityResults.push({
        check: `${baseLabel} has non-empty triggers`,
        pass: hasMarkdownListItems(sectionText),
        reason: hasMarkdownListItems(sectionText)
          ? 'ok'
          : `${agent.file} has no trigger list under ## TRIGGERS ON`,
      });
    }

    if (heading === 'SKILLS LOADED') {
      const skillRefs = extractMarkdownCodeRefs(sectionText).filter((ref) =>
        ref.startsWith('skills/')
      );
      const invalidSkillRef = skillRefs.find(
        (ref) => !registrySkillFiles.has(ref) || !fileExists(ref)
      );
      integrityResults.push({
        check: `${baseLabel} skill refs are valid`,
        pass: skillRefs.length > 0 && !invalidSkillRef,
        reason:
          skillRefs.length === 0
            ? `${agent.file} has no skill refs under ## SKILLS LOADED`
            : invalidSkillRef
              ? `${agent.file} references missing skill: ${invalidSkillRef}`
              : 'ok',
      });
    }

    if (heading === 'OUTPUT FORMAT') {
      integrityResults.push({
        check: `${baseLabel} has non-empty outputs`,
        pass: hasSectionContent(sectionText, 'OUTPUT FORMAT'),
        reason: hasSectionContent(sectionText, 'OUTPUT FORMAT')
          ? 'ok'
          : `${agent.file} has no output contract under ## OUTPUT FORMAT`,
      });
    }

    if (heading === 'ANTI-PATTERNS') {
      integrityResults.push({
        check: `${baseLabel} has non-empty anti-patterns`,
        pass: hasMarkdownListItems(sectionText),
        reason: hasMarkdownListItems(sectionText)
          ? 'ok'
          : `${agent.file} has no anti-pattern list under ## ANTI-PATTERNS`,
      });
    }
  }
}

for (const skillFile of REQUIRED_V29_SKILLS) {
  const content = readFile(skillFile);
  integrityResults.push({
    check: `skill contract: ${skillFile} exists`,
    pass: Boolean(content),
    reason: content ? 'ok' : `missing file: ${skillFile}`,
  });
  integrityResults.push({
    check: `skill contract: ${skillFile} includes VERIFICATION WORKFLOW`,
    pass: Boolean(readMarkdownSection(content, 'VERIFICATION WORKFLOW').trim()),
    reason: readMarkdownSection(content, 'VERIFICATION WORKFLOW').trim()
      ? 'ok'
      : `${skillFile} missing ## VERIFICATION WORKFLOW`,
  });
}

for (const { command, doc } of REQUIRED_V29_WORKFLOWS) {
  const workflow = registry.workflows.find((entry) => entry.command === command);
  integrityResults.push({
    check: `workflow contract: ${command} is registered`,
    pass: !!workflow,
    reason: workflow ? 'ok' : `registry missing workflow "${command}"`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} has valid mode`,
    pass: ['autonomous', 'collaborative', 'audit'].includes(workflow?.mode),
    reason: ['autonomous', 'collaborative', 'audit'].includes(workflow?.mode)
      ? 'ok'
      : `${command} missing valid mode`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} defines inputs`,
    pass: Array.isArray(workflow?.inputs) && workflow.inputs.length > 0,
    reason:
      Array.isArray(workflow?.inputs) && workflow.inputs.length > 0
        ? 'ok'
        : `${command} missing non-empty inputs`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} defines outputs`,
    pass: Array.isArray(workflow?.outputs) && workflow.outputs.length > 0,
    reason:
      Array.isArray(workflow?.outputs) && workflow.outputs.length > 0
        ? 'ok'
        : `${command} missing non-empty outputs`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} references agents`,
    pass: Array.isArray(workflow?.agents) && workflow.agents.length > 0,
    reason:
      Array.isArray(workflow?.agents) && workflow.agents.length > 0
        ? 'ok'
        : `${command} missing non-empty agents list`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} agent refs exist`,
    pass:
      Array.isArray(workflow?.agents) &&
      workflow.agents.length > 0 &&
      workflow.agents.every((agentName) => registryAgentNames.has(agentName)),
    reason:
      Array.isArray(workflow?.agents) &&
      workflow.agents.length > 0 &&
      workflow.agents.every((agentName) => registryAgentNames.has(agentName))
        ? 'ok'
        : `${command} references missing workflow agent(s)`,
  });
  integrityResults.push({
    check: `workflow contract: ${command} doc exists`,
    pass: fileExists(doc),
    reason: fileExists(doc) ? 'ok' : `missing file: ${doc}`,
  });
}

integrityResults.push({
  check: 'config contract: loop_detection.enabled exists',
  pass: typeof config.loop_detection?.enabled === 'boolean',
  reason:
    typeof config.loop_detection?.enabled === 'boolean'
      ? 'ok'
      : 'orbit.config.json missing loop_detection.enabled boolean',
});
integrityResults.push({
  check: 'config contract: loop_detection.window_size exists',
  pass:
    Number.isInteger(config.loop_detection?.window_size) && config.loop_detection.window_size > 0,
  reason:
    Number.isInteger(config.loop_detection?.window_size) && config.loop_detection.window_size > 0
      ? 'ok'
      : 'orbit.config.json missing positive loop_detection.window_size',
});
integrityResults.push({
  check: 'config contract: loop_detection.threshold exists',
  pass: Number.isInteger(config.loop_detection?.threshold) && config.loop_detection.threshold > 0,
  reason:
    Number.isInteger(config.loop_detection?.threshold) && config.loop_detection.threshold > 0
      ? 'ok'
      : 'orbit.config.json missing positive loop_detection.threshold',
});
integrityResults.push({
  check: 'config contract: clarification_gate boolean exists',
  pass: typeof config.clarification_gate === 'boolean',
  reason:
    typeof config.clarification_gate === 'boolean'
      ? 'ok'
      : 'orbit.config.json missing clarification_gate boolean',
});
integrityResults.push({
  check: 'config contract: distributed_mutex_warning boolean exists',
  pass: typeof config.distributed_mutex_warning === 'boolean',
  reason:
    typeof config.distributed_mutex_warning === 'boolean'
      ? 'ok'
      : 'orbit.config.json missing distributed_mutex_warning boolean',
});
integrityResults.push({
  check: 'hook contract: pre-tool-use references clarification gate helper',
  pass:
    preToolUseHookText.includes('bin/clarification-gate.js') &&
    preToolUseHookText.includes('/orbit:clarify'),
  reason:
    preToolUseHookText.includes('bin/clarification-gate.js') &&
    preToolUseHookText.includes('/orbit:clarify')
      ? 'ok'
      : 'hooks/scripts/pre-tool-use.sh missing clarification gate enforcement',
});
integrityResults.push({
  check: 'template contract: STATE.md includes clarification requests section',
  pass: stateTemplateText.includes('## Clarification Requests'),
  reason: stateTemplateText.includes('## Clarification Requests')
    ? 'ok'
    : 'templates/STATE.md missing clarification requests section',
});
integrityResults.push({
  check: 'template contract: STATE.md includes runtime events section',
  pass: stateTemplateText.includes('## Runtime Events'),
  reason: stateTemplateText.includes('## Runtime Events')
    ? 'ok'
    : 'templates/STATE.md missing runtime events section',
});
integrityResults.push({
  check: 'template contract: STATE.md includes LOOP_DETECTED event example',
  pass: stateTemplateText.includes('[LOOP_DETECTED]'),
  reason: stateTemplateText.includes('[LOOP_DETECTED]')
    ? 'ok'
    : 'templates/STATE.md missing LOOP_DETECTED event example',
});
integrityResults.push({
  check: 'template contract: DECISIONS-LOG.md exists',
  pass: Boolean(decisionsLogTemplateText),
  reason: decisionsLogTemplateText ? 'ok' : 'templates/DECISIONS-LOG.md missing',
});
for (const field of [
  'decision:',
  'made_at:',
  'version:',
  'phase:',
  'made_by:',
  'context:',
  'rationale:',
  'supersedes:',
  'still_valid:',
  'invalidated_at:',
]) {
  integrityResults.push({
    check: `template contract: DECISIONS-LOG.md includes ${field}`,
    pass: decisionsLogTemplateText.includes(field),
    reason: decisionsLogTemplateText.includes(field)
      ? 'ok'
      : `templates/DECISIONS-LOG.md missing ${field}`,
  });
}
integrityResults.push({
  check: 'template contract: OPERATIONAL-RULES.json exists',
  pass: Boolean(operationalRulesTemplateText),
  reason: operationalRulesTemplateText ? 'ok' : 'templates/OPERATIONAL-RULES.json missing',
});
for (const field of ['"version"', '"rules"', '"scope"', '"guidance"', '"preferred_route"']) {
  integrityResults.push({
    check: `template contract: OPERATIONAL-RULES.json includes ${field}`,
    pass: operationalRulesTemplateText.includes(field),
    reason: operationalRulesTemplateText.includes(field)
      ? 'ok'
      : `templates/OPERATIONAL-RULES.json missing ${field}`,
  });
}

// ── Metric 4: Forge Integrity ─────────────────────────────────────────────
// forge/ is userland — agents are created on demand, NOT added to the registry.
// If forge/ exists, any .md files there must meet the core agent structural contract.

const forgeDir = path.join(ROOT, 'forge');
const forgeIntegrityResults = [];
if (fs.existsSync(forgeDir)) {
  const forgeFiles = fs.readdirSync(forgeDir).filter((f) => f.endsWith('.md'));
  const required = [
    'TRIGGERS ON',
    'DOMAIN EXPERTISE',
    'OPERATING RULES',
    'SKILLS LOADED',
    'OUTPUT FORMAT',
  ];
  for (const file of forgeFiles) {
    const content = fs.readFileSync(path.join(forgeDir, file), 'utf8');
    for (const section of required) {
      const pass = content.includes(`## ${section}`);
      forgeIntegrityResults.push({
        check: `forge/${file}: ## ${section}`,
        pass,
        reason: pass ? 'ok' : `forge/${file} missing section: ## ${section}`,
      });
    }
  }
}
// If forge/ is absent or empty, treat as pass (no forge agents = valid state)
if (forgeIntegrityResults.length === 0) {
  forgeIntegrityResults.push({ check: 'forge/ (no agents — valid)', pass: true, reason: 'ok' });
}

// ── Metric 5: Portability ──────────────────────────────────────────────────
// Claude (native), Codex (stable), Antigravity (experimental or better) are all documented.

const REQUIRED_RUNTIMES = [
  { name: 'claude', adapterKeyword: 'claude' },
  { name: 'codex', adapterKeyword: 'codex' },
  { name: 'antigravity', adapterKeyword: 'antigravity' },
];

const portabilityResults = REQUIRED_RUNTIMES.map((req) => {
  const rt = registry.runtimes.find((r) => r.name === req.name);
  const inRegistry = !!rt;
  const inAdapters = (adapterKeyword) => adapterText.toLowerCase().includes(adapterKeyword);
  const docsCovered = inAdapters(req.adapterKeyword);
  const pass = inRegistry && docsCovered;
  return {
    runtime: req.name,
    inRegistry,
    inAdapterDocs: docsCovered,
    support: rt?.support ?? null,
    pass,
    reason: pass
      ? 'ok'
      : !inRegistry
        ? `runtime "${req.name}" not in registry`
        : `runtime "${req.name}" not documented in runtime-adapters.md`,
  };
});

// ── Metric 6: Prompt Routing Capability ────────────────────────────────────
// Runtime claims about plain-prompt routing must match the documented adapter surface.

const installedClaudeAdapterContract = installRuntimeArtifact('claude');
const installedCodexAdapterContract = installRuntimeArtifact('codex');
const installedAntigravityAdapterContract = installRuntimeArtifact('antigravity');

const promptRoutingCapabilityResults = [
  {
    check: 'installed claude adapter contract declares implicit prompt routing support',
    pass:
      installedClaudeAdapterContract.capabilities.implicit_prompt_routing === true &&
      installedClaudeAdapterContract.hook_support.post_tool_use ===
        (config.hooks?.post_tool_use === true),
    reason:
      installedClaudeAdapterContract.capabilities.implicit_prompt_routing === true &&
      installedClaudeAdapterContract.hook_support.post_tool_use ===
        (config.hooks?.post_tool_use === true)
        ? 'ok'
        : 'installed claude adapter contract does not match runtime routing or hook support',
  },
  {
    check: 'installed codex adapter contract declares implicit prompt routing support',
    pass:
      installedCodexAdapterContract.capabilities.implicit_prompt_routing === true &&
      installedCodexAdapterContract.policy_file === 'policy.md',
    reason:
      installedCodexAdapterContract.capabilities.implicit_prompt_routing === true &&
      installedCodexAdapterContract.policy_file === 'policy.md'
        ? 'ok'
        : 'installed codex adapter contract must require policy.md for implicit prompt routing',
  },
  {
    check: 'installed antigravity adapter contract declares explicit command routing only',
    pass:
      installedAntigravityAdapterContract.capabilities.implicit_prompt_routing === false &&
      installedAntigravityAdapterContract.capabilities.explicit_command_preferred === true,
    reason:
      installedAntigravityAdapterContract.capabilities.implicit_prompt_routing === false &&
      installedAntigravityAdapterContract.capabilities.explicit_command_preferred === true
        ? 'ok'
        : 'installed antigravity adapter contract must prefer explicit commands',
  },
  {
    check: 'runtime adapter docs describe Codex prompt routing support',
    pass: adapterText.includes('Supported via generated `INSTRUCTIONS.md` + `policy.md`'),
    reason: adapterText.includes('Supported via generated `INSTRUCTIONS.md` + `policy.md`')
      ? 'ok'
      : 'docs/architecture/runtime-adapters.md missing Codex prompt-routing support note',
  },
  {
    check: 'runtime adapter docs describe Antigravity prompt routing limitation',
    pass: adapterText.includes('Plain-prompt Orbit workflow routing is not currently supported'),
    reason: adapterText.includes('Plain-prompt Orbit workflow routing is not currently supported')
      ? 'ok'
      : 'docs/architecture/runtime-adapters.md missing Antigravity prompt-routing limitation',
  },
  {
    check: 'install path teaches Codex policy to infer tracked plain prompts',
    pass: (readFile('install.sh') || '').includes('plain prompt that implies tracked work'),
    reason: (readFile('install.sh') || '').includes('plain prompt that implies tracked work')
      ? 'ok'
      : 'install.sh missing Codex plain-prompt routing policy',
  },
];

// ── Metric 7: Runtime Enforcement ──────────────────────────────────────────
// Distinguish executable enforcement from documentation/structural coverage.

const runtimeEnforcementResults = [
  {
    check: 'progress runtime exists',
    pass: fileExists('bin/progress.js'),
    reason: fileExists('bin/progress.js') ? 'ok' : 'bin/progress.js missing',
  },
  {
    check: 'ship runtime exists',
    pass: fileExists('bin/ship.js'),
    reason: fileExists('bin/ship.js') ? 'ok' : 'bin/ship.js missing',
  },
  {
    check: 'runtime enforcement unit coverage exists',
    pass: fileExists('tests/runtime-enforcement.test.js'),
    reason: fileExists('tests/runtime-enforcement.test.js')
      ? 'ok'
      : 'tests/runtime-enforcement.test.js missing',
  },
  {
    check: 'runtime enforcement end-to-end coverage exists',
    pass: fileExists('tests/enforcement-e2e.test.js'),
    reason: fileExists('tests/enforcement-e2e.test.js')
      ? 'ok'
      : 'tests/enforcement-e2e.test.js missing',
  },
  {
    check: 'install tests cover normal-repo hook installation',
    ...(() => {
      try {
        const pass = runInstallOrSetup({ kind: 'install' });
        return {
          pass,
          reason: pass ? 'ok' : 'install.sh did not link expected git hooks in a normal repo',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `install.sh normal-repo hook check failed: ${error.message}`,
        };
      }
    })(),
  },
  {
    check: 'install tests cover linked-worktree hook installation',
    ...(() => {
      try {
        const pass = runInstallOrSetup({ kind: 'install', worktree: true });
        return {
          pass,
          reason: pass ? 'ok' : 'install.sh did not link expected git hooks in a linked worktree',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `install.sh linked-worktree hook check failed: ${error.message}`,
        };
      }
    })(),
  },
  {
    check: 'install tests cover setup-path hook activation',
    ...(() => {
      try {
        const pass = runInstallOrSetup({ kind: 'setup' });
        return {
          pass,
          reason: pass ? 'ok' : 'setup.sh did not leave expected git hooks active',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `setup.sh hook check failed: ${error.message}`,
        };
      }
    })(),
  },
  {
    check: 'progress runtime executes review gate from live runtime evidence',
    ...(() => {
      const runtime = buildFakeRuntime({
        branch: 'feat/132-runtime-enforcement',
        prData: {
          state: 'CLOSED',
          reviewDecision: 'REVIEW_REQUIRED',
          statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        },
      });
      try {
        const output = runNode('bin/progress.js', ['--agent', 'engineer', '--wave', '1'], {
          env: runtime.env,
        });
        const pass =
          output.includes('Workflow Gate') &&
          output.includes('State:    review_required') &&
          output.includes('Command:  /orbit:review');
        return {
          pass,
          reason: pass
            ? 'ok'
            : 'bin/progress.js did not surface the review gate from runtime truth',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `bin/progress.js failed to execute: ${error.message}`,
        };
      } finally {
        runtime.cleanup();
      }
    })(),
  },
  {
    check: 'ship runtime blocks progression when review is incomplete',
    ...(() => {
      const runtime = buildFakeRuntime({
        branch: 'feat/132-runtime-enforcement',
        prData: {
          state: 'CLOSED',
          reviewDecision: 'REVIEW_REQUIRED',
          statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        },
      });
      try {
        runNode('bin/ship.js', [], {
          env: runtime.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        return {
          pass: false,
          reason: 'bin/ship.js allowed PR progression even though review was still required',
        };
      } catch (error) {
        const stderr = String(error.stdout || '') + String(error.stderr || '');
        const pass =
          stderr.includes('Pull request gate blocked') && stderr.includes('/orbit:review');
        return {
          pass,
          reason: pass ? 'ok' : 'bin/ship.js did not block progression with review guidance',
        };
      } finally {
        runtime.cleanup();
      }
    })(),
  },
  {
    check: 'recovery loop persists retry and halt decisions deterministically',
    ...(() => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-recovery-'));
      const stateDir = path.join(tmpDir, '.orbit', 'state');
      try {
        runNode('bin/recovery-loop.js', [
          '--state-dir',
          stateDir,
          '--command',
          '/orbit:riper',
          '--phase',
          'execute',
          '--task',
          'eval-check',
          '--error-message',
          'TypeError: missing dependency',
        ]);

        try {
          runNode('bin/recovery-loop.js', [
            '--state-dir',
            stateDir,
            '--command',
            '/orbit:riper',
            '--phase',
            'execute',
            '--task',
            'eval-check',
            '--error-message',
            'TypeError: missing dependency',
            '--max-attempts',
            '2',
          ]);
          return {
            pass: false,
            reason: 'bin/recovery-loop.js did not halt after repeated identical failures',
          };
        } catch (error) {
          const persisted = JSON.parse(
            fs.readFileSync(path.join(stateDir, 'last_error.json'), 'utf8')
          );
          const pass =
            persisted.decision === 'halt' &&
            persisted.attempt === 2 &&
            String(error.status) === '2';
          return {
            pass,
            reason: pass
              ? 'ok'
              : 'bin/recovery-loop.js did not persist deterministic retry/halt state',
          };
        }
      } catch (error) {
        return {
          pass: false,
          reason: `bin/recovery-loop.js failed to execute: ${error.message}`,
        };
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    })(),
  },
  {
    check: 'riper runtime automatically triggers recovery when execute step fails',
    ...(() => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-riper-auto-'));
      const stateDir = path.join(tmpDir, '.orbit', 'state');
      try {
        const output = runNode('bin/riper.js', [
          '--issue',
          '#147',
          '--branch',
          'feat/147-executable-recovery-loop',
          '--state-dir',
          stateDir,
          '--execute',
          '["node","-e","process.stderr.write(\\"boom\\\\n\\"); process.exit(1)"]',
        ]);
        const persisted = JSON.parse(
          fs.readFileSync(path.join(stateDir, 'last_error.json'), 'utf8')
        );
        const pass =
          output.includes('━━━ Recovery Loop') &&
          output.includes('Decision: retry') &&
          persisted.error_message === 'boom';
        return {
          pass,
          reason: pass
            ? 'ok'
            : 'bin/riper.js did not automatically invoke recovery on execute-step failure',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `bin/riper.js auto-recovery check failed: ${error.message}`,
        };
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    })(),
  },
  {
    check: 'instruction generator enforces supported vs unsupported plain-prompt routing',
    ...(() => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-routing-'));
      const codexOut = path.join(tmpDir, 'codex.md');
      const antigravityOut = path.join(tmpDir, 'antigravity.md');
      try {
        runNode('bin/generate-instructions.js', ['--runtime', 'codex', '--output', codexOut]);
        runNode('bin/generate-instructions.js', [
          '--runtime',
          'antigravity',
          '--output',
          antigravityOut,
        ]);
        const codexText = fs.readFileSync(codexOut, 'utf8');
        const antigravityText = fs.readFileSync(antigravityOut, 'utf8');
        const pass =
          codexText.includes('supports Orbit workflow inference for plain prompts') &&
          antigravityText.includes('does not provide reliable plain-prompt interception');
        return {
          pass,
          reason: pass
            ? 'ok'
            : 'instruction generation did not honor runtime prompt-routing capabilities',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `instruction generation failed: ${error.message}`,
        };
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    })(),
  },
];

// ── Metric 8: Observability ────────────────────────────────────────────────
// Commands quick, build, and plan must emit a structured classification block.
// Wave completion block must be present in build command spec.

const OBS_CHECKS = [
  {
    id: 'OBS001',
    check: 'orbit:quick emits classification header (━━━ Orbit)',
    section: '/orbit:quick',
  },
  {
    id: 'OBS002',
    check: 'orbit:build emits classification header (━━━ Orbit)',
    section: '/orbit:build',
  },
  {
    id: 'OBS003',
    check: 'orbit:plan emits classification header (━━━ Orbit)',
    section: '/orbit:plan',
  },
  {
    id: 'OBS004',
    check: 'orbit:build emits wave completion block (━━━ Wave)',
    section: '/orbit:build',
    keyword: 'Wave {N} Complete',
  },
  {
    id: 'OBS005',
    check: 'orbit:progress emits current execution block',
    section: '/orbit:progress',
    keyword: '━━━ Current Execution',
  },
  {
    id: 'OBS006',
    check: 'orbit:resume emits recommended next command footer',
    section: '/orbit:resume',
    keyword: '## Recommended Next Command',
  },
  {
    id: 'OBS007',
    check: 'orbit:quick runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/quick.js',
      ['--issue', '#146', '--branch', 'feat/146-runtime-status-parity'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS008',
    check: 'orbit:plan runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/plan.js',
      ['--issue', '#146', '--branch', 'feat/146-runtime-status-parity'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS009',
    check: 'orbit:review runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/review.js',
      ['--issue', '#146', '--branch', 'feat/146-runtime-status-parity'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS010',
    check: 'orbit:verify runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/verify.js',
      ['--issue', '#146', '--branch', 'feat/146-runtime-status-parity'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS011',
    check: 'orbit:next runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/next.js',
      ['--issue', '#146', '--branch', 'feat/146-runtime-status-parity'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS012',
    check: 'orbit:riper runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/riper.js',
      ['--issue', '#147', '--branch', 'feat/147-executable-recovery-loop'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS013',
    check: 'orbit:clarify runtime emits the standard status blocks',
    ...checkRuntimeCommandOutput(
      'bin/clarify.js',
      ['--issue', '#73', '--branch', 'feat/73-clarification-gate'],
      ['━━━ Orbit', 'Current Execution', 'Workflow Gate', '## Recommended Next Command']
    ),
  },
  {
    id: 'OBS014',
    check: 'checkpoint runtime exists',
    pass: fileExists('bin/checkpoint-manifest.js'),
    reason: fileExists('bin/checkpoint-manifest.js') ? 'ok' : 'missing bin/checkpoint-manifest.js',
  },
  {
    id: 'OBS015',
    check: 'orbit:quick runtime can emit a checkpoint manifest block',
    ...(() => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-checkpoint-'));
      try {
        const output = runNode('bin/quick.js', [
          '--issue',
          '#181',
          '--branch',
          'feat/181-quick-review-pr-autochain',
          '--implementationStatus',
          'done',
          '--testsStatus',
          'passed',
          '--testEvidenceStatus',
          'present',
          '--reviewStatus',
          'approved',
          '--reviewEvidenceStatus',
          'present',
          '--shipDecisionStatus',
          'approved',
          '--prStatus',
          'not_open',
          '--write-checkpoint',
          'true',
          '--checkpoint-dir',
          tmpDir,
          '--headSha',
          'abc1234',
          '--changedFiles',
          'bin/runtime-command.js,tests/command-runtime.test.js,docs/quality/evaluation-framework.md,orbit.registry.json',
          '--verificationChecks',
          'vitest:true,validate:true',
        ]);
        const latestPath = path.join(tmpDir, 'latest.json');
        const manifest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        const pass =
          output.includes('Orbit Auto-Chain') &&
          output.includes('Orbit Checkpoint') &&
          output.includes('Final State:  pr_ready') &&
          manifest.metadata.issue === '#181' &&
          manifest.checkpoint === 'pr_ready' &&
          manifest.verification_summary.status === 'success';
        return {
          pass,
          reason: pass ? 'ok' : 'quick runtime failed to emit a usable checkpoint manifest',
        };
      } catch (error) {
        return {
          pass: false,
          reason: `checkpoint runtime failed: ${error.message}`,
        };
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    })(),
  },
];

const observabilityResults = OBS_CHECKS.map((obs) => {
  if (Object.prototype.hasOwnProperty.call(obs, 'pass')) {
    return obs;
  }

  const sectionStart = commandsText.indexOf(`# Orbit Command: ${obs.section}`);
  const nextSection = commandsText.indexOf('\n# Orbit Command:', sectionStart + 1);
  const sectionText =
    sectionStart >= 0
      ? commandsText.slice(sectionStart, nextSection > 0 ? nextSection : undefined)
      : '';
  const keyword = obs.keyword || '━━━ Orbit';
  const pass = sectionText.includes(keyword);
  return {
    id: obs.id,
    check: obs.check,
    pass,
    reason: pass ? 'ok' : `${obs.section} missing: "${keyword}"`,
  };
});

// ── Aggregate scores ───────────────────────────────────────────────────────

function score(results) {
  const pass = results.filter((r) => r.pass).length;
  return {
    pass,
    fail: results.length - pass,
    total: results.length,
    pct: results.length ? pass / results.length : 0,
  };
}

const metrics = {
  routing: score(routingResults),
  workflow: score(workflowResults),
  registry: score(integrityResults),
  forge: score(forgeIntegrityResults),
  portability: score(portabilityResults),
  promptRouting: score(promptRoutingCapabilityResults),
  runtimeEnforcement: score(runtimeEnforcementResults),
  observability: score(observabilityResults),
};

const allResults = [
  ...routingResults,
  ...workflowResults,
  ...integrityResults,
  ...forgeIntegrityResults,
  ...portabilityResults,
  ...promptRoutingCapabilityResults,
  ...runtimeEnforcementResults,
  ...observabilityResults,
];
const overall = score(allResults);
const GATE = 0.8;
const gatePass = overall.pct >= GATE;

// ── Output ─────────────────────────────────────────────────────────────────

const report = {
  version: registry.version,
  timestamp: new Date().toISOString(),
  gate: gatePass ? 'pass' : 'fail',
  metrics: {
    routing: { ...metrics.routing, score: (metrics.routing.pct * 100).toFixed(1) + '%' },
    workflow: { ...metrics.workflow, score: (metrics.workflow.pct * 100).toFixed(1) + '%' },
    registry: { ...metrics.registry, score: (metrics.registry.pct * 100).toFixed(1) + '%' },
    forge: { ...metrics.forge, score: (metrics.forge.pct * 100).toFixed(1) + '%' },
    portability: {
      ...metrics.portability,
      score: (metrics.portability.pct * 100).toFixed(1) + '%',
    },
    promptRouting: {
      ...metrics.promptRouting,
      score: (metrics.promptRouting.pct * 100).toFixed(1) + '%',
    },
    runtimeEnforcement: {
      ...metrics.runtimeEnforcement,
      score: (metrics.runtimeEnforcement.pct * 100).toFixed(1) + '%',
    },
    observability: {
      ...metrics.observability,
      score: (metrics.observability.pct * 100).toFixed(1) + '%',
    },
  },
  overall: { ...overall, score: (overall.pct * 100).toFixed(1) + '%' },
  details: {
    routing: routingResults,
    workflow: workflowResults,
    registry: integrityResults,
    forge: forgeIntegrityResults,
    portability: portabilityResults,
    promptRouting: promptRoutingCapabilityResults,
    runtimeEnforcement: runtimeEnforcementResults,
    observability: observabilityResults,
  },
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  const G = '\x1b[0;32m';
  const R = '\x1b[0;31m';
  const Y = '\x1b[1;33m';
  const B = '\x1b[1m';
  const N = '\x1b[0m';

  const pct = (v) => (v.pct * 100).toFixed(0) + '%';
  const bar = (v) =>
    v.pass === v.total ? `${G}${v.pass}/${v.total}${N}` : `${R}${v.pass}/${v.total}${N}`;

  console.log(`\n${B}Orbit Eval Runner v${registry.version}${N}`);
  console.log('─'.repeat(52));
  console.log(`  Routing accuracy    ${bar(metrics.routing).padEnd(30)}  ${pct(metrics.routing)}`);
  console.log(
    `  Workflow coverage   ${bar(metrics.workflow).padEnd(30)}  ${pct(metrics.workflow)}`
  );
  console.log(
    `  Registry integrity  ${bar(metrics.registry).padEnd(30)}  ${pct(metrics.registry)}`
  );
  console.log(`  Forge integrity     ${bar(metrics.forge).padEnd(30)}  ${pct(metrics.forge)}`);
  console.log(
    `  Portability         ${bar(metrics.portability).padEnd(30)}  ${pct(metrics.portability)}`
  );
  console.log(
    `  Prompt routing      ${bar(metrics.promptRouting).padEnd(30)}  ${pct(metrics.promptRouting)}`
  );
  console.log(
    `  Runtime enforcement ${bar(metrics.runtimeEnforcement).padEnd(30)}  ${pct(metrics.runtimeEnforcement)}`
  );
  console.log(
    `  Observability       ${bar(metrics.observability).padEnd(30)}  ${pct(metrics.observability)}`
  );
  console.log('─'.repeat(52));
  console.log(`  Overall             ${bar(overall).padEnd(30)}  ${pct(overall)}`);

  // Print failures
  const failures = allResults.filter((r) => !r.pass);
  if (failures.length) {
    console.log(`\n${Y}Failures:${N}`);
    for (const f of failures) {
      const label = f.id || f.runtime || f.check || f.workflow || '?';
      console.log(`  ${R}✗${N} [${label}] ${f.reason}`);
    }
  }

  console.log('');
  if (gatePass) {
    console.log(
      `${G}✅  Gate: PASS  (${(overall.pct * 100).toFixed(1)}% ≥ ${GATE * 100}% required)${N}`
    );
  } else {
    console.log(
      `${R}❌  Gate: FAIL  (${(overall.pct * 100).toFixed(1)}% < ${GATE * 100}% required)${N}`
    );
  }
  console.log('');
}

process.exit(gatePass ? 0 : 1);
