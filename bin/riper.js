#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');
const { formatNextCommand } = require('./status');
const { formatRecoveryDecision, recordRecoveryAttempt } = require('./recovery-loop');

function renderRiper(args = {}) {
  const baseOutput = buildRuntimeCommandOutput(args, {
    command: '/orbit:riper',
    domain: 'RESEARCH',
    complexity: 'COMPLEX',
    agent: 'strategist',
    progressAgent: 'strategist',
    defaultPrimary: '/orbit:quick',
    defaultWhy: 'RIPER should resolve ambiguous or complex work into a concrete execution path.',
    details: args.task || args.description || 'structured RIPER analysis',
    includeWorkflowGate: true,
  });

  if (!args['error-message']) {
    return baseOutput;
  }

  const recovery = recordRecoveryAttempt({
    stateDir: args['state-dir'],
    errorDir: args['error-dir'],
    command: '/orbit:riper',
    phase: args.phase || 'execute',
    task: args.task || args.description || 'structured-task',
    errorMessage: args['error-message'],
    summaryFile: args['summary-file'],
    maxAttempts: args['max-attempts'],
  });

  return [
    baseOutput,
    formatRecoveryDecision(recovery),
    formatNextCommand({
      primary: recovery.next_command,
      why:
        recovery.decision === 'halt'
          ? 'The same execute-step failure repeated enough times that Orbit must stop and request human help.'
          : 'The recovery loop captured the failure, persisted context, and recommends one more bounded retry.',
      alternatives: ['/orbit:review', '/orbit:resume'],
    }),
  ].join('\n\n');
}

if (require.main === module) {
  process.stdout.write(renderRiper(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderRiper,
};
