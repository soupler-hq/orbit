import { describe, it, expect } from 'vitest';
import progress from '../bin/progress.js';
import ship from '../bin/ship.js';

describe('runtime enforcement entrypoints', () => {
  it('progress runtime emits execution, workflow gate, and next command', () => {
    const output = progress.renderProgress({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
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

  it('ship runtime blocks PR progression when review is incomplete', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'pending',
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Pull request gate blocked');
    expect(result.output).toContain('/orbit:review');
  });

  it('ship runtime allows PR progression when tests and review are green', () => {
    const result = ship.renderShipDecision({
      json: JSON.stringify({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        reviewStatus: 'approved',
      }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('PR Gate:  ready');
    expect(result.output).toContain('/orbit:ship');
  });
});
