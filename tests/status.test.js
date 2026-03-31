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
    });

    expect(output).toContain('━━━ Orbit');
    expect(output).toContain('Domain:     ENGINEERING');
    expect(output).toContain('Issue:      #126');
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
});
