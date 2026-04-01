#!/usr/bin/env node
'use strict';

const { buildEvidence } = require('./progress');
const {
  evaluateWorkflowState,
  inferIssueFromBranch,
  isFeatureBranch,
} = require('./workflow-state');
const {
  formatCheckpointSummary,
  formatClassification,
  formatNextCommand,
  formatOperationalRule,
  formatProgressStatus,
  formatWorkflowGate,
} = require('./status');
const { buildCheckpointManifest, writeCheckpointManifest } = require('./checkpoint-manifest');
const {
  findOperationalRule,
  loadOperationalRules,
  OPERATIONAL_RULES_PATH,
} = require('./operational-rules');

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

function buildTaskBoundaryWorkflow(args, evidence) {
  const requestedIssue = args.issue || null;
  const activeBranch = evidence.branch || null;
  const branchIssue = inferIssueFromBranch(activeBranch);

  if (!requestedIssue || !activeBranch || !isFeatureBranch(activeBranch) || !branchIssue) {
    return null;
  }

  if (requestedIssue === branchIssue) {
    return null;
  }

  return {
    state: 'context_switch_required',
    prGate: 'blocked',
    nextTransition: 'branch_aligned',
    nextCommand: `/orbit:quick ${requestedIssue}`,
    blockers: [
      `Requested issue ${requestedIssue} does not match active branch ${activeBranch} (${branchIssue}); switch to a ${requestedIssue}-aligned feature branch before continuing.`,
    ],
  };
}

function buildOperationalRuleWorkflow(args, profile) {
  if (profile.consultOperationalRules === false) {
    return { rule: null, workflow: null };
  }

  const rulesConfig = loadOperationalRules(args.rulesFile || OPERATIONAL_RULES_PATH);
  const rule = findOperationalRule(rulesConfig, {
    environment: args.environment || '',
    tool: args.tool || '',
    operation: args.operation || '',
    route: args.route || '',
    runtimeCommand: profile.command,
  });

  if (!rule) {
    return { rule: null, workflow: null };
  }

  const preferredRoute = rule.guidance?.preferred_route || '';
  if (!preferredRoute || !args.route || args.route === preferredRoute) {
    return { rule, workflow: null };
  }

  return {
    rule,
    workflow: {
      state: 'operational_rule_required',
      prGate: 'blocked',
      nextTransition: 'approved_route',
      nextCommand: profile.command,
      blockers: [
        `${rule.id} requires route ${preferredRoute} for ${args.tool || 'this tool'} ${args.operation || 'operation'} in ${args.environment || 'this environment'}.`,
      ],
    },
  };
}

function buildRuntimeCommandOutput(args, profile) {
  const evidence = buildEvidence(args);
  const operational = buildOperationalRuleWorkflow(args, profile);
  const boundaryWorkflow =
    profile.enforceIssueBoundary === true ? buildTaskBoundaryWorkflow(args, evidence) : null;
  const workflow =
    operational.workflow ||
    boundaryWorkflow ||
    profile.workflowOverride ||
    evaluateWorkflowState(evidence);
  const primary =
    workflow.nextCommand && workflow.nextCommand !== profile.command
      ? workflow.nextCommand
      : profile.defaultPrimary;
  const why =
    workflow.blockers[0] ||
    profile.defaultWhy ||
    `Orbit classified this as ${profile.command} and emitted the next workflow step.`;
  const prLabel =
    args.pr ||
    args.prNumber ||
    evidence.prNumber ||
    (evidence.prStatus === 'not_open' ? 'not opened yet' : null);

  const sections = [
    formatClassification({
      domain: profile.domain,
      complexity: profile.complexity,
      agent: profile.agent,
      mode: profile.mode || 'AUTONOMOUS',
      issue: profile.classificationIssue || evidence.issue || args.issue || null,
      branch: evidence.branch || args.branch || null,
      pr: prLabel,
    }),
    formatProgressStatus({
      command: profile.command,
      agent: profile.progressAgent || profile.agent,
      wave: args.wave || '-',
      status: args.status || profile.status || 'in progress',
      details: args.details || args.task || args.description || evidence.branch || profile.details,
    }),
  ];

  if (operational.rule) {
    sections.push(formatOperationalRule(operational.rule));
  }

  if (profile.includeWorkflowGate !== false) {
    sections.push(formatWorkflowGate(workflow));
  }

  const shouldWriteCheckpoint =
    args['write-checkpoint'] === true ||
    String(args['write-checkpoint'] || args.writeCheckpoint || '').toLowerCase() === 'true';

  if (shouldWriteCheckpoint) {
    const manifest = buildCheckpointManifest({
      args,
      profile,
      evidence,
      workflow,
    });
    const { latestPath } = writeCheckpointManifest({
      checkpointDir: args['checkpoint-dir'] || args.checkpointDir,
      manifest,
    });
    sections.push(formatCheckpointSummary(manifest, latestPath));
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
  buildOperationalRuleWorkflow,
  buildTaskBoundaryWorkflow,
  buildRuntimeCommandOutput,
  parseArgs,
};
