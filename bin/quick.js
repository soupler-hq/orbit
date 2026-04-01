#!/usr/bin/env node
'use strict';

const { buildEvidence } = require('./progress');
const { syncPullRequest } = require('./pull-request-controller');
const { renderReview } = require('./review');
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

function truthyFlag(value) {
  return String(value || '').toLowerCase() === 'true';
}

function normalizeReviewResult(result) {
  if (!result) return {};
  if (typeof result === 'string') {
    return { output: result };
  }
  return { ...result };
}

function executeReviewPhase(args = {}, deps = {}) {
  const reviewArgs = { ...args };
  const result = deps.reviewRunner
    ? deps.reviewRunner(reviewArgs)
    : {
        output: (deps.renderReview || renderReview)(reviewArgs),
        reviewStatus: reviewArgs.reviewStatus || 'pending',
      };
  return normalizeReviewResult(result);
}

function runQuick(args = {}, deps = {}) {
  const runtimeArgs = { ...args };
  let evidence = buildEvidence(runtimeArgs, deps.runtimeDeps);
  let workflow = evaluateWorkflowState(evidence);
  let autoChain = buildQuickAutoChain(evidence, workflow, runtimeArgs);
  const approvedRoute = runtimeArgs.route === 'approved';
  const reviewExecutionEnabled =
    truthyFlag(runtimeArgs.executeReviewAction || runtimeArgs['execute-review-action']) ||
    approvedRoute;
  const prSyncEnabled =
    truthyFlag(runtimeArgs.executePrAction || runtimeArgs['execute-pr-action']) || approvedRoute;

  let reviewResult = null;
  let prResult = null;
  if (autoChain && autoChain.review === 'auto_dispatch_review' && reviewExecutionEnabled) {
    reviewResult = executeReviewPhase(runtimeArgs, deps);
    if (reviewResult.reviewStatus) runtimeArgs.reviewStatus = reviewResult.reviewStatus;
    if (reviewResult.reviewEvidenceStatus) {
      runtimeArgs.reviewEvidenceStatus = reviewResult.reviewEvidenceStatus;
    }
    if (reviewResult.shipDecisionStatus) {
      runtimeArgs.shipDecisionStatus = reviewResult.shipDecisionStatus;
    }
    if (reviewResult.reviewFindings) runtimeArgs.reviewFindings = reviewResult.reviewFindings;
    evidence = buildEvidence(runtimeArgs, deps.runtimeDeps);
    workflow = evaluateWorkflowState(evidence);
    autoChain = buildQuickAutoChain(evidence, workflow, runtimeArgs);
  }

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
    reviewResult,
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
