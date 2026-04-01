import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_EVIDENCE_BODY = [
  '## Summary',
  '## Issues',
  '## Ship Decision',
  '- Head SHA: `abc1234`',
  '## Test plan',
  '- `npm test`',
  '## Orbit Self-Review',
  '**Command run**: `/orbit:review`',
  '**Agent(s) dispatched**: reviewer',
  '**Ship decision**: APPROVED',
  '**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):',
  '```',
  'none',
  '```',
].join('\n');

const BLOCKED_REVIEW_EVIDENCE_BODY = REVIEW_EVIDENCE_BODY.replace(
  '**Ship decision**: APPROVED',
  '**Ship decision**: BLOCKED'
);

function makeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function buildFakeRuntime({ branch, dirty = false, prData = null }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-enforcement-e2e-'));
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const gitScript = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "rev-parse" && "$2" == "--abbrev-ref" && "$3" == "HEAD" ]]; then
  printf '%s\\n' '${branch}'
  exit 0
fi
if [[ "$1" == "status" && "$2" == "--porcelain" ]]; then
  if [[ "${dirty ? '1' : '0'}" == "1" ]]; then
    printf ' M src/example.js\\n'
  fi
  exit 0
fi
exit 1
`;

  const ghScript =
    prData === null
      ? `#!/usr/bin/env bash
set -euo pipefail
exit 1
`
      : `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  cat <<'EOF'
${JSON.stringify(prData)}
EOF
  exit 0
fi
exit 1
`;

  makeExecutable(path.join(binDir, 'git'), gitScript);
  makeExecutable(path.join(binDir, 'gh'), ghScript);

  return {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
    },
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

function runCli(binName, runtime, args = []) {
  return spawnSync('node', [path.join(ROOT, 'bin', binName), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: runtime.env,
  });
}

function initGitRepo(repoDir) {
  fs.mkdirSync(repoDir, { recursive: true });
  spawnSync('git', ['init'], { cwd: repoDir, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Orbit Test'], { cwd: repoDir, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'orbit-tests@example.com'], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# test\n');
  spawnSync('git', ['add', 'README.md'], { cwd: repoDir, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoDir, encoding: 'utf8' });
}

function resolveHooksDir(repoDir) {
  const result = spawnSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  const hooksPath = result.stdout.trim();
  return path.isAbsolute(hooksPath) ? hooksPath : path.join(repoDir, hooksPath);
}

describe('enforcement end-to-end command paths', () => {
  it('progress CLI renders the workflow gate from live git/github evidence', () => {
    const runtime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      prData: {
        state: 'CLOSED',
        reviewDecision: 'REVIEW_REQUIRED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
    });

    try {
      const output = execFileSync(
        'node',
        [path.join(ROOT, 'bin', 'progress.js'), '--agent', 'engineer', '--wave', '1'],
        {
          cwd: ROOT,
          encoding: 'utf8',
          env: runtime.env,
        }
      );

      expect(output).toContain('Current Execution');
      expect(output).toContain('Workflow Gate');
      expect(output).toContain('State:    review_required');
      expect(output).toContain('Command:  /orbit:review');
    } finally {
      runtime.cleanup();
    }
  });

  it('ship CLI blocks progression when review is still required', () => {
    const runtime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      prData: {
        state: 'CLOSED',
        reviewDecision: 'REVIEW_REQUIRED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
    });

    try {
      const result = spawnSync('node', [path.join(ROOT, 'bin', 'ship.js')], {
        cwd: ROOT,
        encoding: 'utf8',
        env: runtime.env,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Pull request gate blocked');
      expect(result.stderr).toContain('/orbit:review');
    } finally {
      runtime.cleanup();
    }
  });

  it('ship CLI allows progression once tests and review are green', () => {
    const runtime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      prData: {
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        body: REVIEW_EVIDENCE_BODY,
      },
    });

    try {
      const result = spawnSync('node', [path.join(ROOT, 'bin', 'ship.js')], {
        cwd: ROOT,
        encoding: 'utf8',
        env: runtime.env,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('PR Gate:  ready');
      expect(result.stdout).toContain('/orbit:progress');
    } finally {
      runtime.cleanup();
    }
  });

  it('walks the closed loop from implementation to review gate to PR-open tracking', () => {
    const implementationRuntime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      dirty: true,
      prData: null,
    });
    const reviewRuntime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      prData: {
        state: 'CLOSED',
        reviewDecision: 'REVIEW_REQUIRED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
    });
    const prOpenRuntime = buildFakeRuntime({
      branch: 'feat/132-enforcement-e2e',
      prData: {
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        body: REVIEW_EVIDENCE_BODY,
      },
    });

    try {
      const implementation = runCli('progress.js', implementationRuntime, [
        '--agent',
        'engineer',
        '--wave',
        '1',
      ]);
      expect(implementation.status).toBe(0);
      expect(implementation.stdout).toContain('State:    implementation_in_progress');

      const reviewGate = runCli('progress.js', reviewRuntime, ['--agent', 'engineer', '--wave', '1']);
      expect(reviewGate.status).toBe(0);
      expect(reviewGate.stdout).toContain('State:    review_required');
      expect(reviewGate.stdout).toContain('Command:  /orbit:review');

      const blockedShip = runCli('ship.js', reviewRuntime);
      expect(blockedShip.status).toBe(1);
      expect(blockedShip.stderr).toContain('Pull request gate blocked');
      expect(blockedShip.stderr).toContain('/orbit:review');

      const prOpen = runCli('ship.js', prOpenRuntime);
      expect(prOpen.status).toBe(0);
      expect(prOpen.stdout).toContain('State:    pr_open');
      expect(prOpen.stdout).toContain('**Primary**: /orbit:progress');
    } finally {
      implementationRuntime.cleanup();
      reviewRuntime.cleanup();
      prOpenRuntime.cleanup();
    }
  });
});

describe('runtime capability generation', () => {
  it('renders different plain-prompt guidance for supported and unsupported runtimes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-routing-e2e-'));
    const codexOut = path.join(tmpDir, 'codex.md');
    const antigravityOut = path.join(tmpDir, 'antigravity.md');

    try {
      execFileSync(
        'node',
        [path.join(ROOT, 'bin', 'generate-instructions.js'), '--runtime', 'codex', '--output', codexOut],
        { cwd: ROOT, encoding: 'utf8' }
      );
      execFileSync(
        'node',
        [
          path.join(ROOT, 'bin', 'generate-instructions.js'),
          '--runtime',
          'antigravity',
          '--output',
          antigravityOut,
        ],
        { cwd: ROOT, encoding: 'utf8' }
      );

      const codexText = fs.readFileSync(codexOut, 'utf8');
      const antigravityText = fs.readFileSync(antigravityOut, 'utf8');

      expect(codexText).toContain('supports Orbit workflow inference for plain prompts');
      expect(codexText).toContain('infer the correct Orbit workflow');
      expect(antigravityText).toContain('does not provide reliable plain-prompt interception');
      expect(antigravityText).toContain("prefer the runtime's documented explicit Orbit command path");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes different adapter contracts for supported and unsupported runtimes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-contract-e2e-'));
    const codexOut = path.join(tmpDir, 'codex.contract.json');
    const antigravityOut = path.join(tmpDir, 'antigravity.contract.json');

    try {
      execFileSync(
        'node',
        [path.join(ROOT, 'bin', 'runtime-adapter.js'), '--runtime', 'codex', '--output', codexOut],
        { cwd: ROOT, encoding: 'utf8' }
      );
      execFileSync(
        'node',
        [
          path.join(ROOT, 'bin', 'runtime-adapter.js'),
          '--runtime',
          'antigravity',
          '--output',
          antigravityOut,
        ],
        { cwd: ROOT, encoding: 'utf8' }
      );

      const codexContract = JSON.parse(fs.readFileSync(codexOut, 'utf8'));
      const antigravityContract = JSON.parse(fs.readFileSync(antigravityOut, 'utf8'));

      expect(codexContract.capabilities.implicit_prompt_routing).toBe(true);
      expect(codexContract.policy_file).toBe('policy.md');
      expect(codexContract.required_files).toContain('policy.md');

      expect(antigravityContract.capabilities.implicit_prompt_routing).toBe(false);
      expect(antigravityContract.capabilities.explicit_command_preferred).toBe(true);
      expect(antigravityContract.policy_file).toBe(null);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('blocks PR-open progression when review evidence is missing from the body', () => {
    const runtime = buildFakeRuntime({
      branch: 'feat/144-review-ship-evidence',
      prData: {
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        body: '## Summary\n## Issues\n## Ship Decision\n- Head SHA: `abc1234`\n## Test plan\n- `npm test`',
      },
    });

    try {
      const result = spawnSync('node', [path.join(ROOT, 'bin', 'ship.js')], {
        cwd: ROOT,
        encoding: 'utf8',
        env: runtime.env,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Review evidence missing');
      expect(result.stderr).toContain('/orbit:review');
    } finally {
      runtime.cleanup();
    }
  });

  it('blocks PR-open progression when the self-review verdict is blocked', () => {
    const runtime = buildFakeRuntime({
      branch: 'feat/144-review-ship-evidence',
      prData: {
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
        body: BLOCKED_REVIEW_EVIDENCE_BODY,
      },
    });

    try {
      const result = spawnSync('node', [path.join(ROOT, 'bin', 'ship.js')], {
        cwd: ROOT,
        encoding: 'utf8',
        env: runtime.env,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Orbit self-review is blocked');
      expect(result.stderr).toContain('/orbit:review');
    } finally {
      runtime.cleanup();
    }
  });
});

describe('install and setup enforcement paths', () => {
  it('installs git hooks in a normal repo through install.sh', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-install-e2e-'));
    const projectDir = path.join(tmpDir, 'repo');
    initGitRepo(projectDir);

    try {
      execFileSync('bash', [path.join(ROOT, 'install.sh'), '--local', '--skip-verify', '--tool', 'claude'], {
        cwd: projectDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const hooksDir = resolveHooksDir(projectDir);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-commit')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-push')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'post-commit')).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('installs git hooks in a linked worktree through install.sh', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-worktree-e2e-'));
    const rootRepo = path.join(tmpDir, 'root');
    const worktreeRepo = path.join(tmpDir, 'worktree');
    initGitRepo(rootRepo);

    try {
      spawnSync('git', ['worktree', 'add', worktreeRepo, '-b', 'feat/test-hooks'], {
        cwd: rootRepo,
        encoding: 'utf8',
      });

      execFileSync('bash', [path.join(ROOT, 'install.sh'), '--local', '--skip-verify', '--tool', 'claude'], {
        cwd: worktreeRepo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const hooksDir = resolveHooksDir(worktreeRepo);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-commit')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-push')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'post-commit')).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('setup path still produces an install with active git hooks', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-setup-e2e-'));
    const projectDir = path.join(tmpDir, 'repo');
    initGitRepo(projectDir);

    try {
      execFileSync('bash', [path.join(ROOT, 'bin', 'setup.sh'), '--tool', 'claude'], {
        cwd: projectDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const hooksDir = resolveHooksDir(projectDir);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-commit')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'pre-push')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(hooksDir, 'post-commit')).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
