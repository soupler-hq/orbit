#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, '.orbit', 'reports', 'eval');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function runCommand(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    return { pass: true, stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      pass: false,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || ''),
      exitCode: typeof error.status === 'number' ? error.status : 1,
    };
  }
}

function runDocChecks() {
  const checks = [];
  const readme = readFile('README.md');
  const architecture = readFile('docs/architecture/overview.md');
  const dataset = readFile('docs/quality/eval-dataset.md');

  const readmePatterns = [
    'What is Orbit?',
    '## Why Use This Framework',
    '### With Orbit',
    '### Without Orbit',
    '## Sample Eval Set',
  ];

  for (const pattern of readmePatterns) {
    checks.push({
      check: `README contains "${pattern}"`,
      pass: readme.includes(pattern),
      reason: readme.includes(pattern) ? 'ok' : `README missing required section: ${pattern}`,
    });
  }

  const architecturePatterns = [
    '### Compatibility',
    '### Architecture',
    '### Flow Diagram',
    '### Component Diagram',
    '## Complex Scenario: Secure Feature Delivery',
  ];

  for (const pattern of architecturePatterns) {
    checks.push({
      check: `Architecture overview contains "${pattern}"`,
      pass: architecture.includes(pattern),
      reason: architecture.includes(pattern)
        ? 'ok'
        : `docs/architecture/overview.md missing required section: ${pattern}`,
    });
  }

  checks.push({
    check: 'README no longer contains comparison table section',
    pass: !readme.includes('Comparison with Similar Projects'),
    reason: !readme.includes('Comparison with Similar Projects')
      ? 'ok'
      : 'README still contains comparison table section',
  });

  checks.push({
    check: 'Eval dataset exists and contains the sample header',
    pass: dataset.includes('# Sample Eval Dataset'),
    reason: dataset.includes('# Sample Eval Dataset') ? 'ok' : 'missing eval dataset',
  });

  return checks;
}

function summarizeFailures(results) {
  return results.filter((result) => !result.pass).map((result) => result.reason);
}

function writeMarkdownReport(reportPath, payload) {
  const docFailures = summarizeFailures(payload.docChecks);
  const evalFailures = Object.values(payload.evalRunner.details)
    .flat()
    .filter((detail) => !detail.pass)
    .map((detail) => detail.reason);
  const followUps = [...docFailures, ...evalFailures];

  const lines = [
    '# EVAL-REPORT',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Gate: ${payload.gate.toUpperCase()}`,
    `- Output directory: \`${payload.outputDir}\``,
    `- Eval runner version: ${payload.evalRunner.version}`,
    '',
    '## Summary',
    '',
    `- Doc contract checks: ${payload.docChecks.filter((item) => item.pass).length}/${payload.docChecks.length} passing`,
    `- Eval runner checks: ${payload.evalRunner.overall.pass}/${payload.evalRunner.overall.total} passing (${payload.evalRunner.overall.score})`,
    '',
    '## Artifact Contract',
    '',
    '- `EVAL-REPORT.md` — human-readable summary of eval status and required follow-up actions',
    '- `eval-report.json` — machine-readable eval runner output',
    '',
    '## Doc Contract Checks',
    '',
  ];

  for (const check of payload.docChecks) {
    lines.push(`- [${check.pass ? 'x' : ' '}] ${check.check}`);
    if (!check.pass) {
      lines.push(`  Reason: ${check.reason}`);
    }
  }

  lines.push('', '## Eval Runner Metrics', '');
  for (const [name, metric] of Object.entries(payload.evalRunner.metrics)) {
    lines.push(`- ${name}: ${metric.pass}/${metric.total} (${metric.score})`);
  }

  lines.push('', '## Follow-up Actions', '');
  if (followUps.length === 0) {
    lines.push('- none');
  } else {
    for (const failure of followUps) {
      lines.push(`- ${failure}`);
    }
  }

  fs.writeFileSync(reportPath, lines.join('\n') + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args['output-dir'] || DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonReportPath = path.join(outputDir, 'eval-report.json');
  const markdownReportPath = path.join(outputDir, 'EVAL-REPORT.md');

  const validateResult = runCommand('bash', [path.join(ROOT, 'bin/validate.sh')]);
  const docChecks = validateResult.pass
    ? runDocChecks()
    : [
        {
          check: 'Orbit validation passes before eval',
          pass: false,
          reason:
            validateResult.stderr.trim() ||
            validateResult.stdout.trim() ||
            'bin/validate.sh failed before eval contract checks',
        },
      ];

  const evalRunnerResult = runCommand('node', [path.join(ROOT, 'bin/eval-runner.js'), '--json']);
  let evalRunnerPayload;
  try {
    evalRunnerPayload = JSON.parse(evalRunnerResult.stdout || '{}');
  } catch (_error) {
    evalRunnerPayload = {
      version: 'unknown',
      gate: 'fail',
      metrics: {},
      overall: { pass: 0, total: 0, score: '0.0%' },
      details: {},
      parse_error:
        evalRunnerResult.stderr.trim() ||
        'Could not parse eval-runner JSON output for artifact generation.',
    };
  }

  fs.writeFileSync(jsonReportPath, JSON.stringify(evalRunnerPayload, null, 2) + '\n');

  const gatePass =
    docChecks.every((check) => check.pass) &&
    validateResult.pass &&
    evalRunnerResult.pass &&
    evalRunnerPayload.gate === 'pass';

  writeMarkdownReport(markdownReportPath, {
    generatedAt: new Date().toISOString(),
    gate: gatePass ? 'pass' : 'fail',
    outputDir,
    docChecks,
    evalRunner: evalRunnerPayload,
  });

  process.stdout.write(`Orbit eval artifact written to ${markdownReportPath}\n`);
  process.stdout.write(`Machine-readable eval written to ${jsonReportPath}\n`);
  process.exit(gatePass ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  runDocChecks,
  writeMarkdownReport,
};
