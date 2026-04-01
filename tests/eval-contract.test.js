import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');

describe('eval artifact contract', () => {
  it('writes EVAL-REPORT.md and eval-report.json to the requested output directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-eval-contract-'));

    execFileSync('bash', [path.join(ROOT, 'bin/eval.sh'), '--output-dir', outputDir], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const markdownPath = path.join(outputDir, 'EVAL-REPORT.md');
    const jsonPath = path.join(outputDir, 'eval-report.json');

    expect(fs.existsSync(markdownPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    expect(markdown).toContain('# EVAL-REPORT');
    expect(markdown).toContain('## Artifact Contract');
    expect(markdown).toContain('## Follow-up Actions');
    expect(json.gate).toBe('pass');
    expect(json.overall.score).toBeDefined();

    fs.rmSync(outputDir, { recursive: true, force: true });
  });
});
