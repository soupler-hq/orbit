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

// Build lookup sets from registry
const registryAgentNames = new Set(registry.agents.map((a) => a.name));
const registryWorkflowCmds = new Set(registry.workflows.map((w) => w.command));

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
