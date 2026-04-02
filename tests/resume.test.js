import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const RESUME_BIN = path.join(ROOT, 'bin', 'resume.sh');

describe('resume.sh', () => {
  it('rehydrates from STATE.md when no snapshot exists', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-resume-state-'));
    const stateDir = path.join(tmpRoot, '.orbit', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'STATE.md'),
      [
        '# Orbit Project State',
        '## Project Context',
        '- **Active Milestone**: v2.9.0 — Idea to Market (self-orchestrated by Orbit)',
        '- **Active Phase**: Wave 0 → Wave 1 → Wave 1.5 → Wave 2 → Wave 3 → Wave 4',
        '',
        '## Todos + Seeds',
        '### v2.9.0 — Idea to Market',
        '#### Wave 0 — Release Bootstrap (CURRENT)',
        '- [ ] #62 — feat(state): initialize v2.9.0 release STATE.md — prime Orbit with full release plan',
      ].join('\n')
    );

    const output = execFileSync('bash', [RESUME_BIN], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ORBIT_ROOT_DIR: tmpRoot,
      },
    });

    expect(output).toContain('🔋 Rehydrating Orbit session...');
    expect(output).toContain('✅ Orbit rehydrated.');

    const prompt = fs.readFileSync(path.join(stateDir, 'RESUME_PROMPT.md'), 'utf8');
    expect(prompt).toContain('STATE.md fallback');
    expect(prompt).toContain('v2.9.0 — Idea to Market');
    expect(prompt).toContain('#62');
  });
});
