import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

  const ghBody = JSON.stringify(prData ?? {});
  const ghScript = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  cat <<'EOF'
${ghBody}
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
});
