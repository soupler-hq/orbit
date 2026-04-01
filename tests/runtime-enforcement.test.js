import { describe, it, expect } from 'vitest';
import progress from '../bin/progress.js';
import ship from '../bin/ship.js';

const REVIEW_EVIDENCE_BODY = [
  '## Summary',
  '## Issues',
  '## Ship Decision',
  '- Head SHA: `abc1234`',
  '## Test plan',
  '- `npm test`',
  '## Orbit Self-Review',
  '**Command run**: `/orbit:review`',
  '**Agent(s) dispatched**: reviewer',
  '**Ship decision**: APPROVED',
  '**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):',
  '```',
  'none',
  '```',
].join('\n');

describe('runtime enforcement entrypoints', () => {
  it('progress runtime emits execution, workflow gate, and next command', () => {
    const output = progress.renderProgress({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
        prStatus: 'not_open',
      }),
      command: '/orbit:progress',
      agent: 'engineer',
      wave: '1',
      status: 'blocked',
    });

    expect(output).toContain('Current Execution');
    expect(output).toContain('Workflow Gate');
    expect(output).toContain('State:    review_required');
    expect(output).toContain('Recommended Next Command');
  });

  it('progress runtime infers active implementation when runtime truth is incomplete', () => {
    const evidence = progress.buildEvidence(
      {},
      {
        gitReader: (args) => {
          if (args[0] === 'rev-parse') return 'feat/131-enforce-workflow-state-machine';
          if (args[0] === 'status') return ' M bin/progress.js';
          return '';
        },
        githubReader: () => null,
      }
    );

    expect(evidence.implementationStatus).toBe('in_progress');
    expect(evidence.reviewStatus).toBe('unknown');
    expect(evidence.prStatus).toBe('unknown');
  });

  it('progress runtime keeps a clean tracked branch at branch_ready', () => {
    const evidence = progress.buildEvidence(
      {},
      {
        gitReader: (args) => {
          if (args[0] === 'rev-parse') return 'feat/131-enforce-workflow-state-machine';
          if (args[0] === 'status') return '';
          return '';
        },
        githubReader: () => null,
      }
    );

    const output = progress.renderProgress({
      json: JSON.stringify(evidence),
      command: '/orbit:progress',
      agent: 'engineer',
    });

    expect(evidence.implementationStatus).toBe('not_started');
    expect(output).toContain('State:    branch_ready');
  });

  it('ship runtime blocks PR progression when review is incomplete', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
        prStatus: 'not_open',
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Pull request gate blocked');
    expect(result.output).toContain('/orbit:review');
  });

  it('ship runtime blocks when GitHub truth is unavailable', () => {
    const result = ship.renderShipDecision({
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'unknown',
      reviewStatus: 'unknown',
      prStatus: 'unknown',
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('PR state unavailable');
  });

  it('ship runtime allows PR progression when tests and review are green', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'approved',
        prStatus: 'not_open',
        reviewEvidenceStatus: 'present',
        testEvidenceStatus: 'present',
      }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('PR Gate:  ready');
    expect(result.output).toContain('/orbit:ship');
  });

  it('ship runtime recommends progress when the PR is already open', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'approved',
        prStatus: 'open',
        reviewEvidenceStatus: 'present',
        testEvidenceStatus: 'present',
      }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('State:    pr_open');
    expect(result.output).toContain('**Primary**: /orbit:progress');
  });

  it('ship runtime blocks when review evidence is missing from an open PR', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#144',
        branch: 'feat/144-review-ship-evidence',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'approved',
        prStatus: 'open',
        reviewEvidenceStatus: 'missing',
        testEvidenceStatus: 'present',
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Review evidence missing');
    expect(result.output).toContain('/orbit:review');
  });

  it('progress runtime reads evidence status from a live PR body', () => {
    const evidence = progress.buildEvidence(
      {},
      {
        gitReader: (args) => {
          if (args[0] === 'rev-parse') return 'feat/144-review-ship-evidence';
          if (args[0] === 'status') return '';
          return '';
        },
        githubReader: () => ({
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
          body: REVIEW_EVIDENCE_BODY,
        }),
      }
    );

    expect(evidence.reviewEvidenceStatus).toBe('present');
    expect(evidence.testEvidenceStatus).toBe('present');
  });
});
