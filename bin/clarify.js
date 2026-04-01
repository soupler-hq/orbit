#!/usr/bin/env node
'use strict';

const path = require('path');
const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');
const {
  pendingClarificationRequests,
  resolveClarificationRequest,
} = require('./clarification-gate');

const ROOT = path.resolve(__dirname, '..');

function stateFileFromArgs(args = {}) {
  return args['state-file'] || args.stateFile || path.join(ROOT, '.orbit', 'state', 'STATE.md');
}

function formatClarificationQueue(requests) {
  const lines = ['━━━ Clarification Queue ━━━━━━━━━━━━━━━', `  Pending:   ${requests.length}`];

  requests.forEach((entry, index) => {
    lines.push(`  ${index + 1}. ID: ${entry.id}`);
    if (entry.issue) lines.push(`     Issue: ${entry.issue}`);
    if (entry.requestedBy) lines.push(`     Requested by: ${entry.requestedBy}`);
    if (entry.command) lines.push(`     Command: ${entry.command}`);
    if (entry.question) lines.push(`     Question: ${entry.question}`);
    if (entry.reason) lines.push(`     Reason: ${entry.reason}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function renderClarify(args = {}) {
  const stateFile = stateFileFromArgs(args);

  if (args.resolve) {
    if (!args.answer) {
      throw new Error('--answer is required with --resolve');
    }
    resolveClarificationRequest(
      stateFile,
      args.resolve,
      args.answer,
      args['resolved-by'] || args.resolvedBy || 'operator'
    );
  }

  const pending = pendingClarificationRequests(stateFile);
  const base = buildRuntimeCommandOutput(args, {
    command: '/orbit:clarify',
    domain: 'OPERATIONS',
    complexity: 'TASK',
    agent: 'strategist',
    progressAgent: 'strategist',
    defaultPrimary: pending.length > 0 ? '/orbit:clarify' : '/orbit:next',
    defaultWhy:
      pending.length > 0
        ? 'There are unresolved clarification requests blocking safe autonomous execution.'
        : 'No clarification requests are pending, so Orbit can continue normal workflow progression.',
    details: pending.length > 0 ? 'clarification required' : 'no clarification backlog',
    workflowOverride:
      pending.length > 0
        ? {
            state: 'clarification_required',
            prGate: 'blocked',
            nextTransition: 'clarified',
            nextCommand: '/orbit:clarify',
            blockers: [
              `${pending.length} clarification request(s) remain open in STATE.md; resolve them before continuing tool execution.`,
            ],
          }
        : {
            state: 'clarification_clear',
            prGate: 'ready',
            nextTransition: 'continue',
            nextCommand: '/orbit:next',
            blockers: [],
          },
  });

  return [base, formatClarificationQueue(pending)].join('\n\n');
}

if (require.main === module) {
  process.stdout.write(renderClarify(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  formatClarificationQueue,
  renderClarify,
};
