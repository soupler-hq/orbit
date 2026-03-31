#!/usr/bin/env node
/**
 * Orbit progress runtime.
 * Emits the current execution block, workflow gate block, and next command footer.
 */

'use strict';

const { execFileSync } = require('child_process');
const { evaluateWorkflowState, inferIssueFromBranch } = require('./workflow-state');
const { formatNextCommand, formatProgressStatus, formatWorkflowGate } = require('./status');

function readGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_error) {
    return null;
  }
}

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

function buildEvidence(args = {}) {
  if (args.json) return JSON.parse(args.json);

  const branch = args.branch || readGit(['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD';
  const issue = args.issue || inferIssueFromBranch(branch);

  return {
    issue,
    branch,
    implementationStatus: args.implementationStatus || 'in_progress',
    testsStatus: args.testsStatus || 'not_run',
    reviewStatus: args.reviewStatus || 'not_requested',
    prStatus: args.prStatus || 'not_open',
  };
}

function renderProgress(args = {}) {
  const evidence = buildEvidence(args);
  const workflow = evaluateWorkflowState(evidence);
  const command = args.command || '/orbit:progress';
  const agent = args.agent || 'strategist';
  const wave = args.wave || '-';
  const status = args.status || workflow.prGate;
  const details = args.details || evidence.branch || 'no branch';

  return [
    formatProgressStatus({ command, agent, wave, status, details }),
    formatWorkflowGate(workflow),
    formatNextCommand({
      primary: workflow.nextCommand || '/orbit:progress',
      why: workflow.blockers[0] || `Workflow state is ${workflow.state}.`,
      alternatives: ['/orbit:resume', '/orbit:review'],
    }),
  ].join('\n\n');
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  process.stdout.write(renderProgress(args) + '\n');
}

module.exports = {
  buildEvidence,
  renderProgress,
};
