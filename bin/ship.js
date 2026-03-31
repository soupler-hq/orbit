#!/usr/bin/env node
/**
 * Orbit ship runtime.
 * Blocks PR progression until workflow gates are satisfied.
 */

'use strict';

const { assertPullRequestReady, evaluateWorkflowState } = require('./workflow-state');
const { formatNextCommand, formatWorkflowGate } = require('./status');
const { buildEvidence } = require('./progress');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function renderShipDecision(args = {}) {
  const evidence = buildEvidence(args);
  const summary = evaluateWorkflowState(evidence);

  try {
    assertPullRequestReady(evidence);
    return {
      exitCode: 0,
      output: [
        formatWorkflowGate(summary),
        formatNextCommand({
          primary: '/orbit:ship',
          why: 'Tests and review are green, so PR progression is allowed.',
          alternatives: ['/orbit:progress', '/orbit:resume'],
        }),
      ].join('\n\n'),
    };
  } catch (error) {
    return {
      exitCode: 1,
      output: [
        formatWorkflowGate(summary),
        error.message,
        formatNextCommand({
          primary: summary.nextCommand || '/orbit:progress',
          why: summary.blockers[0] || 'Workflow gate blocked.',
          alternatives: ['/orbit:review', '/orbit:resume'],
        }),
      ].join('\n\n'),
    };
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const result = renderShipDecision(args);
  const stream = result.exitCode === 0 ? process.stdout : process.stderr;
  stream.write(result.output + '\n');
  process.exit(result.exitCode);
}

module.exports = {
  renderShipDecision,
};
