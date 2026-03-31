import { describe, it, expect } from 'vitest';
import workflowState from '../bin/workflow-state.js';

describe('workflow state engine', () => {
  it('marks untracked work as blocked until an issue is linked', () => {
    const summary = workflowState.evaluateWorkflowState({});

    expect(summary.state).toBe('untracked');
    expect(summary.nextTransition).toBe('issue_ready');
    expect(summary.prGate).toBe('blocked');
    expect(summary.blockers[0]).toContain('GitHub issue');
  });

  it('treats a tested branch with no review request as tests_green', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'not_requested',
    });

    expect(summary.state).toBe('tests_green');
    expect(summary.nextTransition).toBe('review_required');
    expect(summary.nextCommand).toBe('/orbit:review');
  });

  it('moves review-pending work into review_required', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'pending',
    });

    expect(summary.state).toBe('review_required');
    expect(summary.blockers[0]).toContain('Await review completion');
  });

  it('routes review changes back to implementation_done', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'changes_requested',
    });

    expect(summary.state).toBe('implementation_done');
    expect(summary.blockers[0]).toContain('Review requested changes');
  });

  it('blocks PR readiness until tests and review are both satisfied', () => {
    expect(() =>
      workflowState.assertPullRequestReady({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
      })
    ).toThrow('Pull request gate blocked');
  });

  it('allows PR readiness only after tests and review are green', () => {
    const summary = workflowState.assertPullRequestReady({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'approved',
    });

    expect(summary.state).toBe('pr_ready');
    expect(summary.prGate).toBe('ready');
  });
});
