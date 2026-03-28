#!/usr/bin/env node
/**
 * Orbit Eval Runner (Issue #13)
 * Checks routing accuracy, workflow coverage, registry integrity, and portability.
 * Reads docs/eval-dataset.md as the ground truth and validates against live registry/files.
 * Exits 1 if overall pass rate < 80%.
 *
 * Usage:  node bin/eval-runner.js [--json]
 * CI:     node bin/eval-runner.js --json > eval-report.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const ARGS    = process.argv.slice(2);
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

/** Parse the eval-dataset.md Markdown table into case objects. */
function parseEvalDataset(content) {
  const cases = [];
  const lines = content.split('\n');
  // Find the header row, skip separator, then read data rows
  let inTable = false;
  let headerPassed = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { inTable = false; headerPassed = false; continue; }
    const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
    if (cells[0] === 'ID') { inTable = true; continue; }       // header
    if (inTable && /^[-:]+$/.test(cells[0])) { headerPassed = true; continue; } // separator
    if (inTable && headerPassed && cells.length >= 5) {
      const id       = cells[0];
      const agent    = cells[3];
      // Extract first /orbit:command from the workflow cell (strip backticks/qualifiers)
      const wfCell   = cells[4];
      const wfMatch  = wfCell.match(/`(\/orbit:[a-z-]+)`/);
      const workflow = wfMatch ? wfMatch[1] : null;
      cases.push({ id, agent, workflow, raw: { agent: cells[3], workflow: wfCell } });
    }
  }
  return cases;
}

// ── Load artefacts ─────────────────────────────────────────────────────────

const registryText = readFile('orbit.registry.json');
if (!registryText) { console.error('ERROR: orbit.registry.json not found'); process.exit(2); }
const registry = JSON.parse(registryText);

const datasetText = readFile('docs/eval-dataset.md');
if (!datasetText) { console.error('ERROR: docs/eval-dataset.md not found'); process.exit(2); }
const evalCases = parseEvalDataset(datasetText);

const adapterText  = readFile('docs/runtime-adapters.md') || '';
const commandsText = readFile('commands/commands.md') || '';

// Build lookup sets from registry
const registryAgentNames   = new Set(registry.agents.map(a => a.name));
const registryWorkflowCmds = new Set(registry.workflows.map(w => w.command));

// ── Metric 1: Routing Accuracy ─────────────────────────────────────────────
// For each eval case: expected agent exists in registry AND agent file exists.

const routingResults = evalCases.map(c => {
  // Some agents are listed with " or " — treat first as primary
  const primaryAgent = c.agent.split(/\s+or\s+/)[0].trim();
  const inRegistry   = registryAgentNames.has(primaryAgent);
  const agentEntry   = registry.agents.find(a => a.name === primaryAgent);
  const fileOk       = agentEntry ? fileExists(agentEntry.file) : false;
  const pass         = inRegistry && fileOk;
  return {
    id: c.id,
    agent: primaryAgent,
    inRegistry,
    fileExists: fileOk,
    pass,
    reason: pass ? 'ok' :
      !inRegistry ? `agent "${primaryAgent}" not in registry` :
      `agent file "${agentEntry?.file}" missing`,
  };
});

// ── Metric 2: Workflow Coverage ────────────────────────────────────────────
// For each eval case: expected workflow command exists in registry AND in commands.md.

const workflowResults = evalCases.map(c => {
  if (!c.workflow) {
    return { id: c.id, workflow: null, pass: false, reason: 'no /orbit: command parsed from dataset' };
  }
  const inRegistry = registryWorkflowCmds.has(c.workflow);
  const inCommands = commandsText.includes(c.workflow);
  const pass       = inRegistry && inCommands;
  return {
    id: c.id,
    workflow: c.workflow,
    inRegistry,
    inCommands,
    pass,
    reason: pass ? 'ok' :
      !inRegistry ? `workflow "${c.workflow}" not in registry` :
      `workflow "${c.workflow}" not in commands.md`,
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

// ── Metric 4: Portability ──────────────────────────────────────────────────
// Claude (native), Codex (stable), Antigravity (experimental or better) are all documented.

const REQUIRED_RUNTIMES = [
  { name: 'claude',       minSupport: 'native',       adapterKeyword: 'claude' },
  { name: 'codex',        minSupport: 'stable',        adapterKeyword: 'codex' },
  { name: 'antigravity',  minSupport: 'experimental',  adapterKeyword: 'antigravity' },
];

const portabilityResults = REQUIRED_RUNTIMES.map(req => {
  const rt = registry.runtimes.find(r => r.name === req.name);
  const inRegistry = !!rt;
  const inAdapters = adapterKeyword =>
    adapterText.toLowerCase().includes(adapterKeyword);
  const docsCovered = inAdapters(req.adapterKeyword);
  const pass = inRegistry && docsCovered;
  return {
    runtime: req.name,
    inRegistry,
    inAdapterDocs: docsCovered,
    support: rt?.support ?? null,
    pass,
    reason: pass ? 'ok' :
      !inRegistry ? `runtime "${req.name}" not in registry` :
      `runtime "${req.name}" not documented in runtime-adapters.md`,
  };
});

// ── Aggregate scores ───────────────────────────────────────────────────────

function score(results) {
  const pass = results.filter(r => r.pass).length;
  return { pass, fail: results.length - pass, total: results.length, pct: results.length ? pass / results.length : 0 };
}

const metrics = {
  routing:     score(routingResults),
  workflow:    score(workflowResults),
  registry:    score(integrityResults),
  portability: score(portabilityResults),
};

const allResults = [...routingResults, ...workflowResults, ...integrityResults, ...portabilityResults];
const overall    = score(allResults);
const GATE       = 0.80;
const gatePass   = overall.pct >= GATE;

// ── Output ─────────────────────────────────────────────────────────────────

const report = {
  version:   registry.version,
  timestamp: new Date().toISOString(),
  gate:      gatePass ? 'pass' : 'fail',
  metrics: {
    routing:     { ...metrics.routing,     score: (metrics.routing.pct * 100).toFixed(1) + '%' },
    workflow:    { ...metrics.workflow,    score: (metrics.workflow.pct * 100).toFixed(1) + '%' },
    registry:    { ...metrics.registry,   score: (metrics.registry.pct * 100).toFixed(1) + '%' },
    portability: { ...metrics.portability, score: (metrics.portability.pct * 100).toFixed(1) + '%' },
  },
  overall: { ...overall, score: (overall.pct * 100).toFixed(1) + '%' },
  details: {
    routing:     routingResults,
    workflow:    workflowResults,
    registry:    integrityResults,
    portability: portabilityResults,
  },
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  const G = '\x1b[0;32m'; const R = '\x1b[0;31m'; const Y = '\x1b[1;33m';
  const B = '\x1b[1m';    const N = '\x1b[0m';

  const pct = v => (v.pct * 100).toFixed(0) + '%';
  const bar = v => (v.pass === v.total ? `${G}${v.pass}/${v.total}${N}` : `${R}${v.pass}/${v.total}${N}`);

  console.log(`\n${B}Orbit Eval Runner v${registry.version}${N}`);
  console.log('─'.repeat(52));
  console.log(`  Routing accuracy    ${bar(metrics.routing).padEnd(30)}  ${pct(metrics.routing)}`);
  console.log(`  Workflow coverage   ${bar(metrics.workflow).padEnd(30)}  ${pct(metrics.workflow)}`);
  console.log(`  Registry integrity  ${bar(metrics.registry).padEnd(30)}  ${pct(metrics.registry)}`);
  console.log(`  Portability         ${bar(metrics.portability).padEnd(30)}  ${pct(metrics.portability)}`);
  console.log('─'.repeat(52));
  console.log(`  Overall             ${bar(overall).padEnd(30)}  ${pct(overall)}`);

  // Print failures
  const failures = allResults.filter(r => !r.pass);
  if (failures.length) {
    console.log(`\n${Y}Failures:${N}`);
    for (const f of failures) {
      const label = f.id || f.runtime || f.check || f.workflow || '?';
      console.log(`  ${R}✗${N} [${label}] ${f.reason}`);
    }
  }

  console.log('');
  if (gatePass) {
    console.log(`${G}✅  Gate: PASS  (${(overall.pct * 100).toFixed(1)}% ≥ ${GATE * 100}% required)${N}`);
  } else {
    console.log(`${R}❌  Gate: FAIL  (${(overall.pct * 100).toFixed(1)}% < ${GATE * 100}% required)${N}`);
  }
  console.log('');
}

process.exit(gatePass ? 0 : 1);
