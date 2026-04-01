import { describe, it, expect } from 'vitest';
import status from '../bin/status.js';

describe('status formatter', () => {
  it('renders a classification banner', () => {
    const output = status.formatClassification({
      domain: 'ENGINEERING',
      complexity: 'PHASE',
      agent: 'engineer',
      mode: 'AUTONOMOUS',
      issue: '#126',
      branch: 'feat/126-example',
      pr: '#201',
    });

    expect(output).toContain('━━━ Orbit');
    expect(output).toContain('Domain:     ENGINEERING');
    expect(output).toContain('Working target: Issue #126');
    expect(output).toContain('Branch:     feat/126-example');
    expect(output).toContain('PR:         #201');
  });

  it('renders a current execution block', () => {
    const output = status.formatProgressStatus({
      command: '/orbit:quick',
      agent: 'engineer',
      wave: '1',
      status: 'in progress',
    });

    expect(output).toContain('Current Execution');
    expect(output).toContain('Command:  /orbit:quick');
    expect(output).toContain('Status:   in progress');
  });

  it('renders a next command footer', () => {
    const output = status.formatNextCommand({
      primary: '/orbit:verify',
      why: 'Wave complete.',
      alternatives: ['/orbit:progress'],
    });

    expect(output).toContain('Recommended Next Command');
    expect(output).toContain('**Primary**: /orbit:verify');
    expect(output).toContain('- /orbit:progress');
  });

  it('renders a workflow gate block', () => {
    const output = status.formatWorkflowGate({
      state: 'tests_green',
      prGate: 'blocked',
      nextTransition: 'review_required',
      nextCommand: '/orbit:review',
      blockers: ['Await review before opening a PR.'],
    });

    expect(output).toContain('Workflow Gate');
    expect(output).toContain('State:    tests_green');
    expect(output).toContain('PR Gate:  blocked');
    expect(output).toContain('Command:  /orbit:review');
  });
});
