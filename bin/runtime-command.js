#!/usr/bin/env node
'use strict';

const { buildEvidence } = require('./progress');
const { evaluateWorkflowState } = require('./workflow-state');
const {
  formatClassification,
  formatNextCommand,
  formatProgressStatus,
  formatWorkflowGate,
} = require('./status');

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

function buildRuntimeCommandOutput(args, profile) {
  const evidence = buildEvidence(args);
  const workflow = profile.workflowOverride || evaluateWorkflowState(evidence);
  const primary =
    workflow.nextCommand && workflow.nextCommand !== profile.command
      ? workflow.nextCommand
      : profile.defaultPrimary;
  const why =
    workflow.blockers[0] ||
    profile.defaultWhy ||
    `Orbit classified this as ${profile.command} and emitted the next workflow step.`;

  const sections = [
    formatClassification({
      domain: profile.domain,
      complexity: profile.complexity,
      agent: profile.agent,
      mode: profile.mode || 'AUTONOMOUS',
      issue: evidence.issue || args.issue || null,
    }),
    formatProgressStatus({
      command: profile.command,
      agent: profile.progressAgent || profile.agent,
      wave: args.wave || '-',
      status: args.status || profile.status || 'in progress',
      details: args.details || args.task || args.description || evidence.branch || profile.details,
    }),
  ];

  if (profile.includeWorkflowGate !== false) {
    sections.push(formatWorkflowGate(workflow));
  }

  sections.push(
    formatNextCommand({
      primary,
      why,
      alternatives: profile.alternatives || ['/orbit:progress', '/orbit:resume'],
    })
  );

  return sections.join('\n\n');
}

module.exports = {
  buildRuntimeCommandOutput,
  parseArgs,
};
