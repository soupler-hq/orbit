#!/usr/bin/env node
/**
 * Orbit workflow state engine.
 * Converts task evidence into an enforced lifecycle state with next transitions and PR gates.
 */

'use strict';

const WORKFLOW_STATES = [
  'untracked',
  'issue_ready',
  'branch_ready',
  'implementation_done',
  'tests_green',
  'review_required',
  'review_clean',
  'pr_ready',
  'pr_open',
  'merged',
];

const NEXT_TRANSITIONS = {
  untracked: 'issue_ready',
  issue_ready: 'branch_ready',
  branch_ready: 'implementation_done',
  implementation_done: 'tests_green',
  tests_green: 'review_required',
  review_required: 'review_clean',
  review_clean: 'pr_ready',
  pr_ready: 'pr_open',
  pr_open: 'merged',
  merged: null,
};

const NEXT_COMMANDS = {
  untracked: '/orbit:plan 1',
  issue_ready: '/orbit:quick #NNN',
  branch_ready: '/orbit:quick #NNN',
  implementation_done: '/orbit:quick #NNN',
  tests_green: '/orbit:review',
  review_required: '/orbit:review',
  review_clean: '/orbit:ship',
  pr_ready: '/orbit:ship',
  pr_open: '/orbit:progress',
  merged: '/orbit:resume',
};

function normalizeStatus(value, allowed, fallback) {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function isFeatureBranch(branch) {
  if (!branch) return false;
  return !['develop', 'main', 'master', 'HEAD'].includes(branch);
}

function inferIssueFromBranch(branch) {
  const match = String(branch || '').match(/(?:^|[-/])(\d+)(?:[-/]|$)/);
  return match ? `#${match[1]}` : null;
}

function normalizeEvidence(evidence = {}) {
  return {
    issue:
      evidence.issue ||
      evidence.issueRef ||
      inferIssueFromBranch(evidence.branch || evidence.branchName) ||
      null,
    branch: evidence.branch || evidence.branchName || null,
    implementationStatus: normalizeStatus(
      evidence.implementationStatus || (evidence.implementationDone ? 'done' : 'not_started'),
      ['not_started', 'in_progress', 'done'],
      'not_started'
    ),
    testsStatus: normalizeStatus(evidence.testsStatus, ['not_run', 'failed', 'passed'], 'not_run'),
    reviewStatus: normalizeStatus(
      evidence.reviewStatus,
      ['not_requested', 'pending', 'changes_requested', 'approved'],
      'not_requested'
    ),
    prStatus: normalizeStatus(evidence.prStatus, ['not_open', 'open', 'merged'], 'not_open'),
  };
}

function evaluateWorkflowState(rawEvidence = {}) {
  const evidence = normalizeEvidence(rawEvidence);
  const blockers = [];

  if (!evidence.issue) {
    blockers.push('Link this work to a GitHub issue before starting implementation.');
    return buildSummary('untracked', evidence, blockers);
  }

  if (!isFeatureBranch(evidence.branch)) {
    blockers.push('Create a feature branch from develop before making tracked changes.');
    return buildSummary('issue_ready', evidence, blockers);
  }

  if (evidence.prStatus === 'merged') {
    return buildSummary('merged', evidence, blockers);
  }

  if (evidence.prStatus === 'open') {
    return buildSummary('pr_open', evidence, blockers);
  }

  if (evidence.reviewStatus === 'approved' && evidence.testsStatus === 'passed') {
    return buildSummary('pr_ready', evidence, blockers);
  }

  if (evidence.reviewStatus === 'approved') {
    blockers.push('Tests must be green before opening a PR, even after review approval.');
    return buildSummary('review_clean', evidence, blockers);
  }

  if (evidence.reviewStatus === 'changes_requested') {
    blockers.push('Review requested changes; fix findings and rerun tests before re-review.');
    return buildSummary('implementation_done', evidence, blockers);
  }

  if (evidence.reviewStatus === 'pending') {
    blockers.push('Await review completion or address findings before opening a PR.');
    return buildSummary('review_required', evidence, blockers);
  }

  if (evidence.testsStatus === 'passed') {
    return buildSummary('tests_green', evidence, blockers);
  }

  if (evidence.implementationStatus === 'done') {
    if (evidence.testsStatus === 'failed') {
      blockers.push('Tests are failing; fix the branch before requesting review.');
    } else {
      blockers.push('Run verification and capture green tests before review.');
    }
    return buildSummary('implementation_done', evidence, blockers);
  }

  return buildSummary('branch_ready', evidence, blockers);
}

function buildSummary(state, evidence, blockers) {
  const nextTransition = NEXT_TRANSITIONS[state];
  const canOpenPullRequest = state === 'pr_ready' || state === 'pr_open';
  return {
    state,
    evidence,
    blockers,
    nextTransition,
    nextCommand: NEXT_COMMANDS[state],
    allowedTransitions: nextTransition ? [nextTransition] : [],
    canOpenPullRequest,
    prGate: canOpenPullRequest ? 'ready' : 'blocked',
  };
}

function assertWorkflowTransition(targetState, evidence = {}) {
  const summary = evaluateWorkflowState(evidence);

  if (!WORKFLOW_STATES.includes(targetState)) {
    throw new Error(
      `[ERR-ORBIT-007] Unknown workflow transition target "${targetState}". Allowed states: ${WORKFLOW_STATES.join(', ')}`
    );
  }

  if (summary.state === targetState) {
    return summary;
  }

  if (!summary.allowedTransitions.includes(targetState)) {
    const blockers = summary.blockers.length ? ` Blockers: ${summary.blockers.join(' ')}` : '';
    throw new Error(
      `[ERR-ORBIT-007] Cannot move from ${summary.state} to ${targetState}. Next allowed transition: ${summary.nextTransition || 'none'}.${blockers}`
    );
  }

  return summary;
}

function assertPullRequestReady(evidence = {}) {
  const summary = evaluateWorkflowState(evidence);
  if (!summary.canOpenPullRequest) {
    const blockers = summary.blockers.length ? ` ${summary.blockers.join(' ')}` : '';
    throw new Error(
      `[ERR-ORBIT-007] Pull request gate blocked at ${summary.state}. Next: ${summary.nextTransition || 'none'}.${blockers}`
    );
  }
  return summary;
}

function formatSummary(summary) {
  const lines = [
    '━━━ Workflow Gate ━━━━━━━━━━━━━━━━━━━━━',
    `  State:    ${summary.state}`,
    `  PR Gate:  ${summary.prGate}`,
    `  Next:     ${summary.nextTransition || 'complete'}`,
  ];
  if (summary.nextCommand) lines.push(`  Command:  ${summary.nextCommand}`);
  if (summary.blockers.length) lines.push(`  Blocker:  ${summary.blockers.join(' ')}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
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

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const evidence = args.json ? JSON.parse(args.json) : {};
  const summary = evaluateWorkflowState(evidence);
  process.stdout.write(formatSummary(summary) + '\n');

  if (args.guard === 'pr_open') {
    try {
      assertPullRequestReady(evidence);
    } catch (error) {
      process.stderr.write(error.message + '\n');
      process.exit(1);
    }
  }
}

module.exports = {
  WORKFLOW_STATES,
  assertPullRequestReady,
  assertWorkflowTransition,
  evaluateWorkflowState,
  formatSummary,
  inferIssueFromBranch,
  isFeatureBranch,
  normalizeEvidence,
};
