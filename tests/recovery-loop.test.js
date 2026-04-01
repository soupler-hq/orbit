import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordRecoveryAttempt, loadLastError, buildErrorSignature } from '../bin/recovery-loop.js';
import { renderRiper } from '../bin/riper.js';

describe('recovery loop', () => {
  it('records retry decisions before the max-attempt threshold', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-recovery-'));
    const stateDir = path.join(tmpDir, '.orbit', 'state');
    const errorDir = path.join(tmpDir, '.orbit', 'errors');
    const summaryFile = path.join(tmpDir, 'SUMMARY.md');

    const first = recordRecoveryAttempt({
      stateDir,
      errorDir,
      command: '/orbit:riper',
      phase: 'execute',
      task: 'implement auth',
      errorMessage: 'TypeError: missing dependency',
      summaryFile,
    });

    expect(first.attempt).toBe(1);
    expect(first.decision).toBe('retry');
    expect(loadLastError(stateDir)?.attempt).toBe(1);
    expect(fs.readFileSync(summaryFile, 'utf8')).toContain('## Recovery Loop');
    expect(fs.readFileSync(path.join(errorDir, `${first.recorded_at.slice(0, 10)}.log`), 'utf8')).toContain('RECOVERY LOOP');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('halts after the same error repeats three times', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-recovery-halt-'));
    const stateDir = path.join(tmpDir, '.orbit', 'state');

    let payload;
    for (let index = 0; index < 3; index += 1) {
      payload = recordRecoveryAttempt({
        stateDir,
        command: '/orbit:riper',
        phase: 'execute',
        task: 'implement auth',
        errorMessage: 'TypeError: missing dependency',
      });
    }

    expect(payload.attempt).toBe(3);
    expect(payload.decision).toBe('halt');
    expect(payload.next_command).toBe('/orbit:review');
    expect(loadLastError(stateDir)?.decision).toBe('halt');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('changes the signature when the failure shape changes', () => {
    const a = buildErrorSignature({
      command: '/orbit:riper',
      phase: 'execute',
      task: 'task',
      errorMessage: 'TypeError: bad input',
    });
    const b = buildErrorSignature({
      command: '/orbit:riper',
      phase: 'execute',
      task: 'task',
      errorMessage: 'ReferenceError: missing symbol',
    });

    expect(a).not.toBe(b);
  });

  it('riper runtime surfaces the recovery decision when execute fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-riper-runtime-'));
    const output = renderRiper({
      issue: '#147',
      branch: 'feat/147-executable-recovery-loop',
      implementationStatus: 'in_progress',
      task: 'implement recovery loop',
      'state-dir': path.join(tmpDir, '.orbit', 'state'),
      'error-dir': path.join(tmpDir, '.orbit', 'errors'),
      'error-message': 'TypeError: missing dependency',
    });

    expect(output).toContain('Command:  /orbit:riper');
    expect(output).toContain('━━━ Recovery Loop');
    expect(output).toContain('Decision: retry');
    expect(output).toContain('**Primary**: /orbit:riper');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('riper runtime automatically invokes recovery when an execute step fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-riper-auto-'));
    const stateDir = path.join(tmpDir, '.orbit', 'state');
    const output = renderRiper({
      issue: '#147',
      branch: 'feat/147-executable-recovery-loop',
      implementationStatus: 'in_progress',
      task: 'auto recovery step',
      'state-dir': stateDir,
      execute: JSON.stringify(['node', '-e', 'process.stderr.write("boom\\n"); process.exit(1)']),
    });

    expect(output).toContain('━━━ Recovery Loop');
    expect(output).toContain('Decision: retry');
    expect(output).toContain('Error:    boom');
    expect(loadLastError(stateDir)?.error_message).toBe('boom');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
