/**
 * Tests for bin/orchestrator.js
 * Covers: constructor, state lock, nexus path resolution, result aggregation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// We require() orchestrator because it uses CommonJS
let OrbitOrchestrator;
beforeEach(async () => {
  // Dynamically require after vi.resetModules() so mocks are fresh each test
  OrbitOrchestrator = (await import('../bin/orchestrator.js')).default;
});

// ─── Fixtures ──────────────────────────────────────────────────────────────

function buildFixtureRoot(tmpDir) {
  const registry = {
    agents: [
      { name: 'engineer', domains: ['ENGINEERING'] },
      { name: 'reviewer', domains: ['REVIEW'] },
      { name: 'security-engineer', domains: ['SECURITY'] },
    ],
  };
  const config = {
    models: {
      routing: {
        classify: 'claude-haiku-4-5-20251001',
        standard: 'claude-sonnet-4-5',
        reasoning: 'claude-opus-4-6',
        security: 'claude-opus-4-6',
      },
      profiles: {
        implement: { model: 'claude-sonnet-4-6' },
        architect: { model: 'claude-opus-4-6' },
      },
    },
    git: { worktree_per_task: false },
    loop_detection: {
      enabled: true,
      window_size: 8,
      threshold: 3,
    },
  };
  fs.writeFileSync(path.join(tmpDir, 'orbit.registry.json'), JSON.stringify(registry));
  fs.writeFileSync(path.join(tmpDir, 'orbit.config.json'), JSON.stringify(config));
  fs.mkdirSync(path.join(tmpDir, '.orbit', 'state'), { recursive: true });
  return tmpDir;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('OrbitOrchestrator — constructor', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-orch-'));
    buildFixtureRoot(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads registry and config on construction', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    expect(orch.registry.agents).toHaveLength(3);
    expect(orch.config.git.worktree_per_task).toBe(false);
  });

  it('isNexus is false when no orbit.nexus.json exists', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    expect(orch.isNexus).toBe(false);
    expect(orch.nexus).toBeNull();
  });

  it('isNexus is true when orbit.nexus.json exists', () => {
    const nexus = { workspace_mode: 'nexus', org: 'test-org', repos: [] };
    fs.writeFileSync(path.join(tmpDir, 'orbit.nexus.json'), JSON.stringify(nexus));
    const orch = new OrbitOrchestrator(tmpDir);
    expect(orch.isNexus).toBe(true);
    expect(orch.nexus.org).toBe('test-org');
  });

  it('falls back to default config if orbit.config.json missing', () => {
    fs.unlinkSync(path.join(tmpDir, 'orbit.config.json'));
    const orch = new OrbitOrchestrator(tmpDir);
    expect(orch.config.models.routing).toBe('auto');
    expect(orch.config.git.worktree_per_task).toBe(false);
  });
});

describe('OrbitOrchestrator — state lock', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-lock-'));
    buildFixtureRoot(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('acquireStateLock creates lock directory', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const lockPath = path.join(tmpDir, '.orbit', 'state', '.orbit.lock');
    orch.acquireStateLock();
    expect(fs.existsSync(lockPath)).toBe(true);
    orch.releaseStateLock();
  });

  it('releaseStateLock removes lock directory', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const lockPath = path.join(tmpDir, '.orbit', 'state', '.orbit.lock');
    orch.acquireStateLock();
    orch.releaseStateLock();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('releaseStateLock does not throw if lock already gone', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    expect(() => orch.releaseStateLock()).not.toThrow();
  });

  it('acquireStateLock throws after 10 failed attempts', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    orch.acquireStateLock(); // hold the lock
    // Second orchestrator on same root should fail to acquire
    const orch2 = new OrbitOrchestrator(tmpDir);
    expect(() => orch2.acquireStateLock()).toThrow('Could not acquire Orbit state lock');
    orch.releaseStateLock();
  });
});

describe('OrbitOrchestrator — resolveNexusPath', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-nexus-'));
    buildFixtureRoot(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns local path when not in nexus mode', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const result = orch.resolveNexusPath('some-repo', 'some/file.md');
    expect(result).toBe(path.join(tmpDir, 'some/file.md'));
  });

  it('resolves repo path from nexus registry', () => {
    const nexus = {
      workspace_mode: 'nexus',
      org: 'test-org',
      repos: [{ name: 'backend', path: './backend' }],
    };
    fs.writeFileSync(path.join(tmpDir, 'orbit.nexus.json'), JSON.stringify(nexus));
    const orch = new OrbitOrchestrator(tmpDir);
    const result = orch.resolveNexusPath('backend', 'src/index.js');
    expect(result).toBe(path.resolve(tmpDir, './backend', 'src/index.js'));
  });

  it('throws when repo not found in nexus registry', () => {
    const nexus = { workspace_mode: 'nexus', org: 'test-org', repos: [] };
    fs.writeFileSync(path.join(tmpDir, 'orbit.nexus.json'), JSON.stringify(nexus));
    const orch = new OrbitOrchestrator(tmpDir);
    expect(() => orch.resolveNexusPath('missing-repo', 'file.md')).toThrow(
      'Repo missing-repo not found in Nexus registry'
    );
  });
});

describe('OrbitOrchestrator — executeWave', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-wave-'));
    buildFixtureRoot(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('dispatches tasks and returns DISPATCHED results', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [{ agent: 'engineer', prompt: 'Build the auth module' }];
    const results = await orch.executeWave(tasks, 'w001');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('DISPATCHED');
    expect(results[0].agent).toBe('engineer');
    expect(results[0].model).toBe('claude-sonnet-4-5');
  });

  it('routes security work to the security model alias', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [{ agent: 'security-engineer', prompt: 'Review auth controls' }];
    const results = await orch.executeWave(tasks, 'w001-security');
    expect(results[0].model).toBe('claude-opus-4-6');
  });

  it('writes INSTRUCTIONS.md and METADATA.json for each task', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [{ agent: 'engineer', prompt: 'Implement feature X' }];
    const results = await orch.executeWave(tasks, 'w002');
    const taskDir = results[0].context;
    expect(fs.existsSync(path.join(taskDir, 'INSTRUCTIONS.md'))).toBe(true);
    expect(fs.existsSync(path.join(taskDir, 'METADATA.json'))).toBe(true);
    const metadata = JSON.parse(fs.readFileSync(path.join(taskDir, 'METADATA.json'), 'utf8'));
    expect(metadata.agent).toBe('engineer');
  });

  it('throws when agent is not found in registry', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [{ agent: 'nonexistent-agent', prompt: 'Do something' }];
    await expect(orch.executeWave(tasks, 'w003')).rejects.toThrow(
      'ERR-ORBIT-004'
    );
  });

  it('uses routing aliases when no domain-specific profile exists', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [{ agent: 'reviewer', prompt: 'Review the code' }];
    const results = await orch.executeWave(tasks, 'w004');
    expect(results[0].model).toBe('claude-sonnet-4-5');
  });

  it('emits workflow gate output when tracked work includes an issue', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const worktreeSpy = vi.spyOn(orch, 'setupWorktree');

    await orch.executeWave(
      [{ agent: 'engineer', issue: '#131', prompt: 'Implement workflow gates' }],
      'w005'
    );

    const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Workflow Gate');
    expect(output).toContain('State:    implementation_in_progress');
    expect(worktreeSpy).toHaveBeenCalledWith('task_w005_0', 'feat/orbit-task-w005-0');
    worktreeSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('detects repeated loop signatures and terminates the repeated task', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stateFile = path.join(tmpDir, '.orbit', 'state', 'STATE.md');

    const tasks = [
      {
        agent: 'engineer',
        issue: '#72',
        prompt: 'Retry autonomous bash step',
        toolName: 'bash_command',
        toolInput: { command: 'npm test' },
      },
      {
        agent: 'engineer',
        issue: '#72',
        prompt: 'Retry autonomous bash step',
        toolName: 'bash_command',
        toolInput: { command: 'npm test' },
      },
      {
        agent: 'engineer',
        issue: '#72',
        prompt: 'Retry autonomous bash step',
        toolName: 'bash_command',
        toolInput: { command: 'npm test' },
      },
    ];

    const results = await orch.executeWave(tasks, 'loop001');

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('DISPATCHED');
    expect(results[1].status).toBe('DISPATCHED');
    expect(results[2].status).toBe('LOOP_DETECTED');
    expect(results[2].loop.threshold).toBe(3);
    expect(results[2].loop.repeats).toBe(3);
    expect(results[2].context).toBeNull();
    expect(fs.existsSync(path.join(tmpDir, '.orbit', 'state', 'task_loop001_2'))).toBe(false);
    expect(fs.readFileSync(stateFile, 'utf8')).toContain('[LOOP_DETECTED]');
    expect(fs.readFileSync(stateFile, 'utf8')).toContain('wave: loop001');
    expect(fs.readFileSync(stateFile, 'utf8')).toContain('issue: #72');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('LOOP_DETECTED')
    );

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('does not detect loops before the configured threshold', async () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const tasks = [
      {
        agent: 'engineer',
        prompt: 'Retry autonomous bash step',
        toolName: 'bash_command',
        toolInput: { command: 'npm test' },
      },
      {
        agent: 'engineer',
        prompt: 'Retry autonomous bash step',
        toolName: 'bash_command',
        toolInput: { command: 'npm test' },
      },
    ];

    const results = await orch.executeWave(tasks, 'loop002');

    expect(results.map((result) => result.status)).toEqual(['DISPATCHED', 'DISPATCHED']);
  });

  it('explains the current workflow state and next transition', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const summary = orch.evaluateWorkflow({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'not_requested',
    });

    expect(summary.state).toBe('tests_green');
    expect(summary.nextTransition).toBe('review_required');
  });

  it('blocks pull request readiness until review is approved', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    expect(() =>
      orch.assertPullRequestReady({
        issue: '#131',
        branch: 'feat/131-enforce-workflow-state-machine',
        implementationStatus: 'done',
        testsStatus: 'passed',
        testEvidenceStatus: 'present',
        reviewStatus: 'pending',
      })
    ).toThrow('Pull request gate blocked');
  });

  it('renders a workflow gate block for status output', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const output = orch.renderWorkflowGate({
      issue: '#131',
      branch: 'feat/131-enforce-workflow-state-machine',
      implementationStatus: 'done',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'approved',
      reviewEvidenceStatus: 'present',
    });

    expect(output).toContain('Workflow Gate');
    expect(output).toContain('State:    pr_ready');
  });
});

describe('OrbitOrchestrator — aggregateResults', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-agg-'));
    buildFixtureRoot(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no SUMMARY.md files found', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const result = orch.aggregateResults('wave001');
    expect(result).toBeNull();
  });

  it('aggregates SUMMARY.md files into a wave summary', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const stateDir = path.join(tmpDir, '.orbit', 'state');
    const taskDir = path.join(stateDir, 'task_wave001_0');
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(path.join(taskDir, 'SUMMARY.md'), 'Work complete.');
    fs.writeFileSync(
      path.join(taskDir, 'METADATA.json'),
      JSON.stringify({ agent: 'engineer', model: 'claude-sonnet-4-6', path: tmpDir })
    );

    const result = orch.aggregateResults('wave001');
    expect(result).toContain('## Agent: engineer');
    expect(result).toContain('Work complete.');
    expect(result).toContain('✅ CONSENSUS MET');
  });

  it('marks consensus failed when reviewer does not include APPROVED', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const stateDir = path.join(tmpDir, '.orbit', 'state');
    const taskDir = path.join(stateDir, 'task_wave002_0');
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(path.join(taskDir, 'SUMMARY.md'), 'Issues found.');
    fs.writeFileSync(
      path.join(taskDir, 'METADATA.json'),
      JSON.stringify({ agent: 'reviewer', model: 'claude-sonnet-4-6', path: tmpDir })
    );

    const result = orch.aggregateResults('wave002');
    expect(result).toContain('❌ CONSENSUS FAILED');
  });

  it('marks consensus met when reviewer includes APPROVED', () => {
    const orch = new OrbitOrchestrator(tmpDir);
    const stateDir = path.join(tmpDir, '.orbit', 'state');
    const taskDir = path.join(stateDir, 'task_wave003_0');
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(path.join(taskDir, 'SUMMARY.md'), 'APPROVED — all checks pass.');
    fs.writeFileSync(
      path.join(taskDir, 'METADATA.json'),
      JSON.stringify({ agent: 'reviewer', model: 'claude-sonnet-4-6', path: tmpDir })
    );

    const result = orch.aggregateResults('wave003');
    expect(result).toContain('✅ CONSENSUS MET');
  });
});
