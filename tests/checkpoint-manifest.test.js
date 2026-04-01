import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCheckpointManifest,
  writeCheckpointManifest,
} from '../bin/checkpoint-manifest.js';

describe('checkpoint manifest', () => {
  it('builds the expected manifest shape and writes latest plus history entries', () => {
    const checkpointDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-checkpoint-'));
    const manifest = buildCheckpointManifest({
      args: {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        headSha: 'abc1234',
        changedFiles:
          'bin/runtime-command.js,tests/command-runtime.test.js,docs/quality/evaluation-framework.md,orbit.registry.json',
        verificationChecks: 'vitest:true,validate:true',
        requiredContext: 'PR_DESCRIPTION,TEST_LOGS',
      },
      profile: {
        command: '/orbit:quick',
        defaultPrimary: '/orbit:ship',
      },
      evidence: {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        reviewFindings: 'MEDIUM: persist findings into remediation state',
      },
      workflow: {
        state: 'pr_ready',
        nextCommand: '/orbit:ship',
        blockers: [],
      },
    });

    expect(manifest.metadata.issue).toBe('#181');
    expect(manifest.metadata.pr).toBe(null);
    expect(manifest.impact.scope).toEqual({
      logic: true,
      tests: true,
      docs: true,
      config: true,
    });
    expect(manifest.orchestration.current_state).toBe('pr_ready');
    expect(manifest.orchestration.recommended_next_step).toBe('/orbit:ship');
    expect(manifest.orchestration.review_findings).toBe(
      'MEDIUM: persist findings into remediation state'
    );
    expect(manifest.verification_summary.status).toBe('success');
    expect(manifest.verification_summary.checks).toEqual([
      { name: 'vitest', passed: true },
      { name: 'validate', passed: true },
    ]);

    const written = writeCheckpointManifest({
      checkpointDir,
      manifest,
      timestamp: '2026-04-01T00:00:00.000Z',
    });
    expect(fs.existsSync(written.latestPath)).toBe(true);
    expect(fs.existsSync(written.historyPath)).toBe(true);

    const latest = JSON.parse(fs.readFileSync(written.latestPath, 'utf8'));
    expect(latest.metadata.issue).toBe('#181');
    expect(latest.checkpoint).toBe('pr_ready');
  });

  it('treats command markdown as docs impact', () => {
    const manifest = buildCheckpointManifest({
      args: {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        headSha: 'abc1234',
        changedFiles: 'commands/commands.md',
      },
      profile: {
        command: '/orbit:quick',
      },
      evidence: {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
      },
      workflow: {
        state: 'implementation_done',
        nextCommand: '/orbit:review',
        blockers: [],
      },
    });

    expect(manifest.impact.scope.docs).toBe(true);
  });
});
