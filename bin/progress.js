#!/usr/bin/env node
/**
 * Orbit progress runtime.
 * Emits the current execution block, workflow gate block, and next command footer.
 */

'use strict';

const { execFileSync } = require('child_process');
const { evaluateWorkflowState, inferIssueFromBranch } = require('./workflow-state');
const { inferEvidenceStatus, parseReviewEvidence } = require('./review-evidence');
const { formatNextCommand, formatProgressStatus, formatWorkflowGate } = require('./status');

function runCommand(bin, args, fallback = null) {
  try {
    return execFileSync(bin, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_error) {
    return fallback;
  }
}

function readGit(args) {
  return runCommand('git', args, null);
}

function readGitHubCurrentPullRequest() {
  const result = runCommand(
    'gh',
    ['pr', 'view', '--json', 'number,state,reviewDecision,statusCheckRollup,body'],
    null
  );
  return result ? JSON.parse(result) : null;
}

function inferTestsStatus(prData) {
  const checks = prData?.statusCheckRollup || [];
  if (!checks.length) return 'unknown';

  const conclusions = checks.map((check) => String(check.conclusion || '').toUpperCase());
  if (
    conclusions.some((value) =>
      ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'].includes(value)
    )
  ) {
    return 'failed';
  }

  const allFinished = checks.every(
    (check) => String(check.status || '').toUpperCase() === 'COMPLETED'
  );
  if (allFinished) return 'passed';
  return 'unknown';
}

function inferReviewStatus(prData) {
  const reviewDecision = String(prData?.reviewDecision || '').toUpperCase();
  if (reviewDecision === 'APPROVED') return 'approved';
  if (reviewDecision === 'CHANGES_REQUESTED') return 'changes_requested';
  if (reviewDecision === 'REVIEW_REQUIRED') return 'pending';
  return prData ? 'pending' : 'unknown';
}

function inferPrStatus(prData) {
  const state = String(prData?.state || '').toUpperCase();
  if (state === 'MERGED') return 'merged';
  if (state === 'OPEN') return 'open';
  if (state === 'CLOSED') return 'not_open';
  return prData ? 'not_open' : 'unknown';
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function buildEvidence(args = {}, deps = {}) {
  if (args.json) return JSON.parse(args.json);

  const gitReader = deps.gitReader || readGit;
  const githubReader = deps.githubReader || readGitHubCurrentPullRequest;

  const branch = args.branch || gitReader(['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD';
  const issue = args.issue || inferIssueFromBranch(branch);
  const dirty = args.dirty ?? Boolean(gitReader(['status', '--porcelain']));
  const prData = args.githubData || githubReader();
  const reviewEvidence = prData?.body ? parseReviewEvidence(prData.body) : null;
  const evidenceStatus = prData?.body
    ? inferEvidenceStatus(prData.body)
    : {
        reviewEvidenceStatus: args.reviewEvidenceStatus || 'unknown',
        testEvidenceStatus: args.testEvidenceStatus || 'unknown',
        shipDecisionStatus: args.shipDecisionStatus || 'unknown',
      };

  return {
    issue,
    branch,
    prNumber: args.prNumber || (prData?.number ? `#${prData.number}` : null),
    implementationStatus: args.implementationStatus || (dirty ? 'in_progress' : 'not_started'),
    testsStatus: args.testsStatus || inferTestsStatus(prData),
    reviewStatus: args.reviewStatus || inferReviewStatus(prData),
    prStatus: args.prStatus || inferPrStatus(prData),
    reviewEvidenceStatus: args.reviewEvidenceStatus || evidenceStatus.reviewEvidenceStatus,
    testEvidenceStatus: args.testEvidenceStatus || evidenceStatus.testEvidenceStatus,
    shipDecisionStatus: args.shipDecisionStatus || evidenceStatus.shipDecisionStatus,
    reviewFindings:
      args.reviewFindings || args['review-findings'] || reviewEvidence?.findings || null,
  };
}

function renderProgress(args = {}) {
  const evidence = buildEvidence(args);
  const workflow = evaluateWorkflowState(evidence);
  const command = args.command || '/orbit:progress';
  const agent = args.agent || 'strategist';
  const wave = args.wave || '-';
  const status = args.status || workflow.prGate;
  const details = args.details || evidence.branch || 'no branch';

  return [
    formatProgressStatus({ command, agent, wave, status, details }),
    formatWorkflowGate(workflow),
    formatNextCommand({
      primary: workflow.nextCommand || '/orbit:progress',
      why: workflow.blockers[0] || `Workflow state is ${workflow.state}.`,
      alternatives: ['/orbit:resume', '/orbit:review'],
    }),
  ].join('\n\n');
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  process.stdout.write(renderProgress(args) + '\n');
}

module.exports = {
  buildEvidence,
  inferPrStatus,
  inferReviewStatus,
  inferTestsStatus,
  readGitHubCurrentPullRequest,
  renderProgress,
};
