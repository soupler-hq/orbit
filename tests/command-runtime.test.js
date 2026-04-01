import { describe, expect, it } from 'vitest';
import { renderQuick } from '../bin/quick.js';
import { renderPlan } from '../bin/plan.js';
import { renderReview } from '../bin/review.js';
import { renderVerify } from '../bin/verify.js';
import { renderNext } from '../bin/next.js';

function expectParity(output, command) {
  expect(output).toContain('━━━ Orbit');
  expect(output).toContain('Current Execution');
  expect(output).toContain(`Command:  ${command}`);
  expect(output).toContain('Workflow Gate');
  expect(output).toContain('## Recommended Next Command');
}

describe('runtime command status parity', () => {
  const trackedArgs = {
    issue: '#146',
    branch: 'feat/146-runtime-status-parity',
    implementationStatus: 'done',
    testsStatus: 'passed',
    testEvidenceStatus: 'present',
    reviewStatus: 'approved',
    reviewEvidenceStatus: 'present',
    shipDecisionStatus: 'approved',
    prStatus: 'not_open',
  };

  it('quick runtime emits the standard status blocks', () => {
    expectParity(renderQuick(trackedArgs), '/orbit:quick');
  });

  it('plan runtime emits the standard status blocks', () => {
    expectParity(renderPlan(trackedArgs), '/orbit:plan');
  });

  it('review runtime emits the standard status blocks', () => {
    expectParity(renderReview(trackedArgs), '/orbit:review');
  });

  it('verify runtime emits the standard status blocks', () => {
    expectParity(renderVerify(trackedArgs), '/orbit:verify');
  });

  it('next runtime emits the standard status blocks', () => {
    expectParity(renderNext(trackedArgs), '/orbit:next');
  });
});
