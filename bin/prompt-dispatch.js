#!/usr/bin/env node
'use strict';

const { runQuick } = require('./quick');
const { renderPlan } = require('./plan');
const { renderReview } = require('./review');
const { renderVerify } = require('./verify');
const { renderNext } = require('./next');
const { renderRiper } = require('./riper');
const { renderClarify } = require('./clarify');

const EXECUTABLE_COMMANDS = new Map([
  ['/orbit:quick', (args, deps) => (deps.runQuick || runQuick)(args, deps).output],
  ['/orbit:plan', (args, deps) => (deps.renderPlan || renderPlan)(args)],
  ['/orbit:review', (args, deps) => (deps.renderReview || renderReview)(args)],
  ['/orbit:verify', (args, deps) => (deps.renderVerify || renderVerify)(args)],
  ['/orbit:next', (args, deps) => (deps.renderNext || renderNext)(args)],
  ['/orbit:riper', (args, deps) => (deps.renderRiper || renderRiper)(args)],
  ['/orbit:clarify', (args, deps) => (deps.renderClarify || renderClarify)(args)],
]);

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

function normalizePrompt(prompt) {
  return String(prompt || '').trim();
}

function extractExplicitOrbitCommand(prompt) {
  const normalized = normalizePrompt(prompt);
  const match = normalized.match(/^(?:\/)?(orbit:[a-z-]+)\b(.*)$/i);
  if (!match) return null;

  const command = `/${match[1].toLowerCase()}`;
  const remainder = match[2].trim();
  return {
    type: 'explicit_command',
    command,
    raw: normalized,
    remainder,
    reason: 'Explicit Orbit command detected; inferred routing and freeform handling are disabled.',
  };
}

function inferWorkflow(prompt, context = {}) {
  const normalized = normalizePrompt(prompt).toLowerCase();
  const activeIssue = context.issue || context.activeIssue || null;
  const activeState = String(
    context.workflowState || context.activeWorkflowState || ''
  ).toLowerCase();

  if (/^(pick next task|what next)\b/.test(normalized)) {
    return {
      type: 'inferred_workflow',
      command: '/orbit:next',
      reason:
        'Next-task prompt detected; route through backlog selection instead of the current PR lane.',
    };
  }

  if (
    /^(continue|go ahead)\b/.test(normalized) &&
    activeIssue &&
    !['review_clean', 'pr_ready', 'pr_open'].includes(activeState)
  ) {
    return {
      type: 'inferred_workflow',
      command: `/orbit:quick ${activeIssue}`,
      reason: `Continuation prompt detected; route through the active tracked issue ${activeIssue}.`,
    };
  }

  if (/^(review this|please review)\b/.test(normalized)) {
    return {
      type: 'inferred_workflow',
      command: '/orbit:review',
      reason: 'Review prompt detected; route through Orbit review.',
    };
  }

  return {
    type: 'unclassified',
    command: null,
    reason: 'No explicit Orbit command or supported plain-prompt workflow match found.',
  };
}

function classifyPromptDispatch(prompt, context = {}) {
  const explicit = extractExplicitOrbitCommand(prompt);
  if (explicit) return explicit;
  return inferWorkflow(prompt, context);
}

function issueFromText(text) {
  const match = String(text || '').match(/#\d+/);
  return match ? match[0] : null;
}

function prFromText(text) {
  const match = String(text || '').match(/(?:\bPR\s+)?(#\d+)/i);
  return match ? match[1] : null;
}

function buildDispatchArgs(dispatch, context = {}) {
  const args = { ...context };
  const remainder = dispatch?.remainder || '';

  if (dispatch?.command === '/orbit:quick') {
    args.issue = issueFromText(remainder) || context.issue || context.activeIssue || args.issue;
    args.task = remainder || context.task || '';
  }

  if (dispatch?.command === '/orbit:review') {
    const pr = prFromText(remainder);
    if (pr) {
      args.pr = pr;
      args.prNumber = pr;
    }
  }

  return args;
}

function dispatchPrompt(prompt, context = {}, deps = {}) {
  const dispatch = classifyPromptDispatch(prompt, context);
  if (!dispatch.command) {
    return {
      dispatch,
      executed: false,
      output: null,
      error: dispatch.reason,
    };
  }

  const execute = EXECUTABLE_COMMANDS.get(dispatch.command);
  if (!execute) {
    return {
      dispatch,
      executed: false,
      output: null,
      error: `Explicit Orbit command ${dispatch.command} is not executable through the repo-local dispatcher yet.`,
    };
  }

  const args = buildDispatchArgs(dispatch, context);
  return {
    dispatch,
    executed: true,
    args,
    output: execute(args, deps),
    error: null,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    console.error(
      'Usage: node bin/prompt-dispatch.js --prompt "<text>" [--issue #NNN] [--workflow-state state]'
    );
    process.exit(1);
  }

  const context = {
    issue: args.issue,
    workflowState: args['workflow-state'] || args.workflowState,
    branch: args.branch,
    pr: args.pr,
    prNumber: args.pr || args.prNumber,
    stateFile: args['state-file'] || args.stateFile,
  };

  if (args.execute) {
    const result = dispatchPrompt(args.prompt, context);
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    process.stdout.write(`${result.output}\n`);
    return;
  }

  const result = classifyPromptDispatch(args.prompt, context);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDispatchArgs,
  classifyPromptDispatch,
  dispatchPrompt,
  EXECUTABLE_COMMANDS,
  extractExplicitOrbitCommand,
  inferWorkflow,
  normalizePrompt,
  parseArgs,
};
