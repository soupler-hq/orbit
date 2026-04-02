#!/usr/bin/env node
'use strict';

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    console.error(
      'Usage: node bin/prompt-dispatch.js --prompt "<text>" [--issue #NNN] [--workflow-state state]'
    );
    process.exit(1);
  }

  const result = classifyPromptDispatch(args.prompt, {
    issue: args.issue,
    workflowState: args['workflow-state'] || args.workflowState,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  classifyPromptDispatch,
  extractExplicitOrbitCommand,
  inferWorkflow,
  normalizePrompt,
  parseArgs,
};
