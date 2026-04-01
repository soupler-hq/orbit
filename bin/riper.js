#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');
const { formatNextCommand } = require('./status');
const { formatRecoveryDecision, recordRecoveryAttempt } = require('./recovery-loop');

const ROOT = path.resolve(__dirname, '..');

function parseExecuteStep(args) {
  if (!args.execute) return null;
  let parsed;
  try {
    parsed = JSON.parse(args.execute);
  } catch (error) {
    throw new Error(
      'Invalid --execute payload: expected JSON array like ["node","-e","process.exit(1)"]',
      { cause: error }
    );
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((item) => typeof item !== 'string')
  ) {
    throw new Error('Invalid --execute payload: expected non-empty JSON string array');
  }
  return parsed;
}

function runExecuteStep(step) {
  try {
    execFileSync(step[0], step.slice(1), {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return null;
  } catch (error) {
    const message =
      String(error.stderr || '').trim() ||
      String(error.stdout || '').trim() ||
      error.message ||
      'Unknown execute-step failure';
    return message;
  }
}

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

  const executeStep = parseExecuteStep(args);
  const executeError = executeStep ? runExecuteStep(executeStep) : null;
  const errorMessage = args['error-message'] || executeError;

  if (!errorMessage) {
    return baseOutput;
  }

  const recovery = recordRecoveryAttempt({
    stateDir: args['state-dir'],
    errorDir: args['error-dir'],
    command: '/orbit:riper',
    phase: args.phase || 'execute',
    task: args.task || args.description || 'structured-task',
    errorMessage,
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
  parseExecuteStep,
  renderRiper,
  runExecuteStep,
};
