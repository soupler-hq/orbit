import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runEval() {
  return JSON.parse(
    execFileSync('node', [path.join(ROOT, 'bin', 'eval-runner.js'), '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
  );
}

describe('eval-runner issue #85 coverage', () => {
  it(
    'keeps the assertion count above 100',
    () => {
      const report = runEval();
      expect(report.overall.total).toBeGreaterThanOrEqual(100);
    },
    30000
  );

  it(
    'covers the v2.9.0 contract surfaces called out in the issue',
    () => {
      const report = runEval();
      const checks = new Map(report.details.registry.map((entry) => [entry.check, entry.pass]));

      expect(checks.get('agent contract: data-engineer includes ## ANTI-PATTERNS')).toBe(true);
      expect(checks.get('agent contract: pedagogue skill refs are valid')).toBe(true);
      expect(
        checks.get('skill contract: skills/instructor.md includes VERIFICATION WORKFLOW')
      ).toBe(true);
      expect(
        checks.get('skill contract: skills/workflow-audit.md includes VERIFICATION WORKFLOW')
      ).toBe(true);
      expect(checks.get('workflow contract: /orbit:ask defines inputs')).toBe(true);
      expect(checks.get('workflow contract: /orbit:ask references agents')).toBe(true);
      expect(checks.get('workflow contract: /orbit:ask agent refs exist')).toBe(true);
      expect(checks.get('workflow contract: /orbit:eval defines outputs')).toBe(true);
      expect(checks.get('workflow contract: /orbit:eval references agents')).toBe(true);
      expect(checks.get('workflow contract: /orbit:eval agent refs exist')).toBe(true);
      expect(checks.get('workflow contract: /orbit:riper doc exists')).toBe(true);
      expect(checks.get('workflow contract: /orbit:riper references agents')).toBe(true);
      expect(checks.get('workflow contract: /orbit:riper agent refs exist')).toBe(true);
      expect(checks.get('config contract: loop_detection.enabled exists')).toBe(true);
      expect(checks.get('config contract: loop_detection.window_size exists')).toBe(true);
      expect(checks.get('config contract: loop_detection.threshold exists')).toBe(true);
      expect(checks.get('config contract: clarification_gate boolean exists')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes decision:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes made_at:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes version:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes rationale:')).toBe(true);
    },
    30000
  );
});
