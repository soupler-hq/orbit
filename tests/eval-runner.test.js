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
      expect(checks.get('workflow contract: /orbit:clarify defines inputs')).toBe(true);
      expect(checks.get('workflow contract: /orbit:clarify references agents')).toBe(true);
      expect(checks.get('workflow contract: /orbit:clarify agent refs exist')).toBe(true);
      expect(checks.get('workflow contract: /orbit:clarify doc exists')).toBe(true);
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
      expect(checks.get('config contract: distributed_mutex_warning boolean exists')).toBe(true);
      expect(checks.get('hook contract: pre-tool-use references clarification gate helper')).toBe(
        true
      );
      expect(checks.get('template contract: STATE.md includes clarification requests section')).toBe(
        true
      );
      expect(checks.get('template contract: STATE.md includes runtime events section')).toBe(true);
      expect(checks.get('template contract: STATE.md includes LOOP_DETECTED event example')).toBe(
        true
      );
      expect(checks.get('template contract: DECISIONS-LOG.md includes decision:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes made_at:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes version:')).toBe(true);
      expect(checks.get('template contract: DECISIONS-LOG.md includes rationale:')).toBe(true);
      expect(checks.get('template contract: OPERATIONAL-RULES.json exists')).toBe(true);
      expect(checks.get('template contract: OPERATIONAL-RULES.json includes "scope"')).toBe(true);
      expect(checks.get('template contract: OPERATIONAL-RULES.json includes "guidance"')).toBe(true);
      expect(checks.get('template contract: OPERATIONAL-RULES.json includes "preferred_route"')).toBe(
        true
      );
    },
    30000
  );
});
