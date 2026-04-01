import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  appendClarificationRequest,
  pendingClarificationRequests,
  resolveClarificationRequest,
} from '../bin/clarification-gate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('clarification gate', () => {
  it('emits and resolves clarification requests in STATE.md', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-clarification-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(stateFile, '# Orbit State\n');

    const id = appendClarificationRequest(stateFile, {
      requested_by: 'engineer',
      issue: '#73',
      command: '/orbit:quick',
      question: 'Which staging dataset should be used?',
      reason: 'Missing required input',
    });

    expect(id).toBe('clarify-001');
    expect(pendingClarificationRequests(stateFile)).toHaveLength(1);

    resolveClarificationRequest(stateFile, id, 'Use staging-fixture-a.', 'operator');

    expect(pendingClarificationRequests(stateFile)).toHaveLength(0);
    expect(fs.readFileSync(stateFile, 'utf8')).toContain('[RESOLVED] id: clarify-001');
  });

  it('pre-tool-use blocks command execution when a clarification is pending', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-clarification-hook-'));
    fs.mkdirSync(path.join(tmpDir, '.orbit', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'bin'), { recursive: true });
    fs.copyFileSync(
      path.join(ROOT, 'bin', 'clarification-gate.js'),
      path.join(tmpDir, 'bin', 'clarification-gate.js')
    );
    fs.writeFileSync(
      path.join(tmpDir, 'orbit.config.json'),
      JSON.stringify({ clarification_gate: true }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.orbit', 'state', 'STATE.md'),
      [
        '# Orbit State',
        '## Clarification Requests',
        '[OPEN] id: clarify-001 | requested_by: engineer | issue: #73 | command: /orbit:quick | question: Which staging dataset should be used? | reason: Missing required input | requested_at: 2026-04-01T00:00:00Z',
      ].join('\n')
    );

    const hook = path.join(ROOT, 'hooks', 'scripts', 'pre-tool-use.sh');
    const input = JSON.stringify({
      tool_name: 'bash_command',
      tool_input: { command: 'npm test' },
    });
    const result = spawnSync('bash', [hook], {
      cwd: tmpDir,
      input,
      encoding: 'utf8',
      env: { ...process.env, ORBIT_PROJECT_ROOT: tmpDir },
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Pending clarification request detected');
  });

  it('pre-tool-use allows the clarify path to proceed while requests are pending', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-clarification-bypass-'));
    fs.mkdirSync(path.join(tmpDir, '.orbit', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'bin'), { recursive: true });
    fs.copyFileSync(
      path.join(ROOT, 'bin', 'clarification-gate.js'),
      path.join(tmpDir, 'bin', 'clarification-gate.js')
    );
    fs.writeFileSync(
      path.join(tmpDir, 'orbit.config.json'),
      JSON.stringify({ clarification_gate: true }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpDir, '.orbit', 'state', 'STATE.md'),
      [
        '# Orbit State',
        '## Clarification Requests',
        '[OPEN] id: clarify-001 | requested_by: engineer | issue: #73 | command: /orbit:quick | question: Which staging dataset should be used? | reason: Missing required input | requested_at: 2026-04-01T00:00:00Z',
      ].join('\n')
    );

    const hook = path.join(ROOT, 'hooks', 'scripts', 'pre-tool-use.sh');
    const input = JSON.stringify({
      tool_name: 'bash_command',
      tool_input: { command: 'node bin/clarify.js --state-file .orbit/state/STATE.md' },
    });
    const result = spawnSync('bash', [hook], {
      cwd: tmpDir,
      input,
      encoding: 'utf8',
      env: { ...process.env, ORBIT_PROJECT_ROOT: tmpDir },
    });

    expect(result.status).toBe(0);
  });
});
