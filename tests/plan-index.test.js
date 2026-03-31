import { describe, it, expect } from 'vitest';
import planIndex from '../bin/generate-plan-index.js';

describe('plan index generator', () => {
  it('requires dependency-first metadata for each plan', () => {
    const plans = planIndex.getPlanFiles().map(planIndex.normalizePlan);

    for (const plan of plans) {
      expect(plan.doc_type).toBe('plan');
      expect(plan.phase).toBeTruthy();
      expect(plan.rank).toMatch(/^\d{3}$/);
      expect(plan.priority).toMatch(/^P\d+$/);
      expect(Array.isArray(plan.depends_on)).toBe(true);
      expect(Array.isArray(plan.blocks)).toBe(true);
    }
  });

  it('renders active plans in rank order', () => {
    const plans = planIndex.getPlanFiles().map(planIndex.normalizePlan);
    const rendered = planIndex.renderIndex(plans);

    const enforcementIndex = rendered.indexOf('issue-130-orbit-enforcement-remediation.md');
    const pdcsIndex = rendered.indexOf('issue-125-provenance-driven-context-synthesis.md');

    expect(enforcementIndex).toBeGreaterThan(-1);
    expect(pdcsIndex).toBeGreaterThan(-1);
    expect(enforcementIndex).toBeLessThan(pdcsIndex);
    expect(rendered).toContain('| 010 | Foundations | P0 |');
    expect(rendered).toContain('| 020 | Recovery | P1 |');
    expect(rendered).toContain('[issue-130-orbit-enforcement-remediation.md](docs/plans/issue-130-orbit-enforcement-remediation.md)');
    expect(rendered).not.toContain('/Users/');
  });

  it('renders historical wave plans in the completed section', () => {
    const plans = planIndex.getPlanFiles().map(planIndex.normalizePlan);
    const rendered = planIndex.renderIndex(plans);

    expect(rendered).toContain('## Historical Wave And Completed Plans');
    expect(rendered).toContain('v2.9.0-wave-0-release-bootstrap.md');
    expect(rendered).toContain('| 000 | Foundations | P0 |');
  });
});
