#!/usr/bin/env node
'use strict';

const { buildEvidence } = require('./progress');
const { syncPullRequest } = require('./pull-request-controller');
const { buildQuickAutoChain, buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');
const { evaluateWorkflowState } = require('./workflow-state');

function renderQuick(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:quick',
    domain: 'ENGINEERING',
    complexity: 'TASK',
    agent: 'engineer',
    progressAgent: 'engineer',
    defaultPrimary: '/orbit:review',
    defaultWhy: 'Tracked implementation work should flow to review once the branch is ready.',
    details: 'tracked implementation',
    enforceIssueBoundary: true,
    autoChain: true,
  });
}

function runQuick(args = {}, deps = {}) {
  const runtimeArgs = { ...args };
  const evidence = buildEvidence(runtimeArgs, deps.runtimeDeps);
  const workflow = evaluateWorkflowState(evidence);
  const autoChain = buildQuickAutoChain(evidence, workflow, runtimeArgs);
  const prSyncEnabled =
    String(runtimeArgs.executePrAction || runtimeArgs['execute-pr-action'] || '').toLowerCase() ===
      'true' || runtimeArgs.route === 'approved';

  let prResult = null;
  if (
    autoChain &&
    ['create_or_update_ready', 'update_existing_pr'].includes(autoChain.prAction) &&
    prSyncEnabled
  ) {
    prResult = (deps.syncPullRequest || syncPullRequest)(
      {
        issue: evidence.issue,
        branch: evidence.branch,
        title: runtimeArgs.prTitle,
        verificationCommands:
          runtimeArgs.verificationCommands ||
          runtimeArgs['verification-commands'] ||
          runtimeArgs.verificationChecks ||
          '',
        changedFiles: String(runtimeArgs.changedFiles || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        args: runtimeArgs,
        prAction: autoChain.prAction,
      },
      deps.prDeps || {}
    );

    runtimeArgs.prStatus = 'open';
    if (prResult.number) {
      runtimeArgs.prNumber = `#${prResult.number}`;
      runtimeArgs.pr = `#${prResult.number}`;
    }
    runtimeArgs.prActionResult = prResult.action;
  }

  return {
    output: renderQuick(runtimeArgs),
    prResult,
  };
}

if (require.main === module) {
  process.stdout.write(runQuick(parseArgs(process.argv.slice(2))).output + '\n');
}

module.exports = {
  renderQuick,
  runQuick,
};
