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
      prStatus: 'not_open',
    });

    expect(summary.state).toBe('tests_green');
    expect(summary.nextTransition).toBe('review_required');
    expect(summary.nextCommand).toBe('/orbit:review');
  });

  it('treats active implementation as implementation_in_progress', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'in_progress',
      testsStatus: 'unknown',
      reviewStatus: 'unknown',
      prStatus: 'unknown',
    });

    expect(summary.state).toBe('implementation_in_progress');
    expect(summary.nextTransition).toBe('implementation_done');
  });

  it('moves review-pending work into review_required', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'pending',
      prStatus: 'not_open',
    });

    expect(summary.state).toBe('review_required');
    expect(summary.blockers.some((blocker) => blocker.includes('Await review completion'))).toBe(true);
  });

  it('routes review changes back to implementation_done', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'changes_requested',
      prStatus: 'not_open',
    });

    expect(summary.state).toBe('implementation_done');
    expect(summary.blockers.some((blocker) => blocker.includes('Review requested changes'))).toBe(true);
  });

  it('blocks PR readiness until tests and review are both satisfied', () => {
    expect(() =>
      workflowState.assertPullRequestReady({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
        prStatus: 'not_open',
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
      prStatus: 'not_open',
    });

    expect(summary.state).toBe('pr_ready');
    expect(summary.prGate).toBe('ready');
  });

  it('treats merged pull requests as a terminal merged state', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'approved',
      prStatus: 'merged',
    });

    expect(summary.state).toBe('merged');
    expect(summary.nextCommand).toBe('/orbit:resume');
  });

  it('blocks shipping when PR state is unavailable', () => {
    const summary = workflowState.evaluateWorkflowState({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      reviewStatus: 'approved',
      prStatus: 'unknown',
    });

    expect(summary.state).toBe('pr_ready');
    expect(summary.prGate).toBe('blocked');
    expect(summary.blockers[0]).toContain('PR state unavailable');
  });
});
