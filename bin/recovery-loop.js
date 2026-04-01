#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STATE_DIR = path.join(ROOT, '.orbit', 'state');
const DEFAULT_ERROR_DIR = path.join(ROOT, '.orbit', 'errors');

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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildErrorSignature({ command, phase, task, errorMessage }) {
  return [
    command || 'unknown-command',
    phase || 'unknown-phase',
    task || 'unknown-task',
    normalizeWhitespace(errorMessage),
  ]
    .join('|')
    .toLowerCase();
}

function loadLastError(stateDir = DEFAULT_STATE_DIR) {
  const lastErrorPath = path.join(stateDir, 'last_error.json');
  if (!fs.existsSync(lastErrorPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lastErrorPath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function appendRecoverySummary(summaryFile, payload) {
  if (!summaryFile) return false;
  ensureDir(path.dirname(summaryFile));
  const lines = [
    '',
    '## Recovery Loop',
    `- Attempt: ${payload.attempt}`,
    `- Decision: ${payload.decision}`,
    `- Command: ${payload.command}`,
    `- Error: ${payload.error_message}`,
  ];
  if (payload.next_command) {
    lines.push(`- Next: ${payload.next_command}`);
  }
  fs.appendFileSync(summaryFile, lines.join('\n') + '\n');
  return true;
}

function writeErrorLog(errorDir, payload) {
  ensureDir(errorDir);
  const stamp = payload.recorded_at.slice(0, 10);
  const logPath = path.join(errorDir, `${stamp}.log`);
  const lines = [
    `[${payload.recorded_at}] RECOVERY LOOP`,
    `Command: ${payload.command}`,
    `Phase: ${payload.phase}`,
    `Task: ${payload.task}`,
    `Attempt: ${payload.attempt}`,
    `Decision: ${payload.decision}`,
    `Error: ${payload.error_message}`,
    '---',
  ];
  fs.appendFileSync(logPath, lines.join('\n') + '\n');
  return logPath;
}

function recordRecoveryAttempt(options = {}) {
  const stateDir = path.resolve(options.stateDir || DEFAULT_STATE_DIR);
  const errorDir = path.resolve(options.errorDir || DEFAULT_ERROR_DIR);
  const maxAttempts = Number.parseInt(String(options.maxAttempts || 3), 10);
  const command = options.command || '/orbit:riper';
  const phase = options.phase || 'execute';
  const task = options.task || 'tracked-work';
  const errorMessage = normalizeWhitespace(
    options.errorMessage || options.error || 'Unknown error'
  );
  const summaryFile = options.summaryFile ? path.resolve(options.summaryFile) : null;

  ensureDir(stateDir);
  const previous = loadLastError(stateDir);
  const signature = buildErrorSignature({ command, phase, task, errorMessage });
  const attempt = previous && previous.error_signature === signature ? previous.attempt + 1 : 1;
  const decision = attempt >= maxAttempts ? 'halt' : 'retry';
  const nextCommand = decision === 'halt' ? '/orbit:review' : command;
  const recordedAt = new Date().toISOString();

  const payload = {
    command,
    phase,
    task,
    error_message: errorMessage,
    error_signature: signature,
    attempt,
    max_attempts: maxAttempts,
    decision,
    next_command: nextCommand,
    recorded_at: recordedAt,
  };

  payload.error_log = writeErrorLog(errorDir, payload);
  payload.summary_updated = appendRecoverySummary(summaryFile, payload);

  fs.writeFileSync(path.join(stateDir, 'last_error.json'), JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

function formatRecoveryDecision(payload) {
  const lines = [
    '━━━ Recovery Loop ━━━━━━━━━━━━━━━━━━━━━',
    `  Command:  ${payload.command}`,
    `  Phase:    ${payload.phase}`,
    `  Attempt:  ${payload.attempt}/${payload.max_attempts}`,
    `  Decision: ${payload.decision}`,
    `  Next:     ${payload.next_command}`,
    `  Error:    ${payload.error_message}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = recordRecoveryAttempt({
    stateDir: args['state-dir'],
    errorDir: args['error-dir'],
    command: args.command,
    phase: args.phase,
    task: args.task,
    errorMessage: args['error-message'],
    maxAttempts: args['max-attempts'],
    summaryFile: args['summary-file'],
  });
  process.stdout.write(formatRecoveryDecision(payload) + '\n');
  process.exit(payload.decision === 'halt' ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildErrorSignature,
  formatRecoveryDecision,
  loadLastError,
  parseArgs,
  recordRecoveryAttempt,
};
