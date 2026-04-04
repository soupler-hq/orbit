import { describe, expect, it } from 'vitest';

import {
  buildPullRequestBody,
  deriveDocsUpdate,
  syncPullRequest,
  validatePullRequestArtifacts,
} from '../bin/pull-request-controller.js';
const { validateBody } = require('../bin/validate-pr-governance');
const { validateDocUpdates } = require('../bin/validate-doc-updates');

describe('pull-request controller', () => {
  it('derives UPDATED docs status when command docs changed', () => {
    expect(deriveDocsUpdate(['commands/commands.md'])).toEqual({
      status: 'UPDATED',
      notes: 'Updated commands/commands.md',
    });
  });

  it('builds a governance-shaped PR body', () => {
    const body = buildPullRequestBody({
      issue: '#181',
      branch: 'feat/181-quick-review-pr-autochain',
      headSha: 'abc1234',
      summaryLines: ['auto-chain PR sync for #181'],
      verificationCommands: ['bash bin/validate.sh', 'npm run format:check'],
      changedFiles: ['commands/commands.md'],
    });

    expect(body).toContain('## Summary');
    expect(body).toContain('## Issues');
    expect(body).toContain('## Ship Decision');
    expect(body).toContain('Head SHA: `abc1234`');
    expect(body).toContain('## Test plan');
    expect(body).toContain('## Docs update');
    expect(body).toContain('## Orbit Self-Review');
    expect(body).toContain('## PR Metadata');
    expect(body).toContain('- Branch: feat/181-quick-review-pr-autochain');
    expect(body).toContain('- Head SHA: `abc1234`');
  });

  it('emits a PR body that passes local governance validators', () => {
    const body = buildPullRequestBody({
      issue: '#181',
      branch: 'feat/181-quick-review-pr-autochain',
      headSha: 'abc1234',
      summaryLines: ['auto-chain PR sync for #181'],
      verificationCommands: ['bash bin/validate.sh', 'npm run format:check'],
      changedFiles: ['bin/runtime-command.js', 'commands/commands.md'],
      reviewCommand: '/orbit:review on PR #184',
      reviewAgents: 'reviewer',
      shipDecision: 'APPROVED',
      findingsAddressed: 'none',
      residualRisks: ['Waived: narrow auto-chain slice only; broader orchestration remains out of scope.'],
    });

    expect(validateBody(body, 'abc1234')).toEqual([]);
    expect(
      validateDocUpdates({
        body,
        changedFiles: ['bin/runtime-command.js', 'commands/commands.md'],
      })
    ).toEqual([]);
    expect(body).not.toContain('```text');
  });

  it('fails local preflight before mutating a PR when governance would reject the body', () => {
    expect(() =>
      validatePullRequestArtifacts({
        body: buildPullRequestBody({
          issue: '#181',
          branch: 'bad branch',
          headSha: 'abc1234',
          summaryLines: ['auto-chain PR sync for #181'],
          verificationCommands: ['bash bin/validate.sh'],
          changedFiles: ['bin/runtime-command.js'],
        }),
        branch: 'bad branch',
        headSha: 'abc1234',
        changedFiles: ['bin/runtime-command.js'],
      })
    ).toThrow(/PR preflight failed/);
  });

  it('creates a PR when none exists for the branch', () => {
    const calls = [];
    const result = syncPullRequest(
      {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        title: 'feat(workflow): auto-chain issue #181',
        verificationCommands: ['bash bin/validate.sh'],
        changedFiles: ['commands/commands.md'],
      },
      {
        ghRunner: (args) => {
          calls.push(args);
          if (args[0] === 'pr' && args[1] === 'list') return '[]';
          if (args[0] === 'pr' && args[1] === 'create')
            return 'https://github.com/soupler-hq/orbit/pull/999';
          if (args[0] === 'pr' && args[1] === 'edit') return '';
          throw new Error(`unexpected gh args: ${args.join(' ')}`);
        },
      }
    );

    expect(result).toEqual({
      action: 'created',
      number: 999,
      url: 'https://github.com/soupler-hq/orbit/pull/999',
    });
    expect(calls.some((args) => args[0] === 'pr' && args[1] === 'create')).toBe(true);
    expect(calls.some((args) => args[0] === 'pr' && args[1] === 'edit' && args[2] === '999')).toBe(
      true
    );
  });

  it('updates an existing open PR for the branch', () => {
    const calls = [];
    const result = syncPullRequest(
      {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        title: 'feat(workflow): auto-chain issue #181',
        verificationCommands: ['bash bin/validate.sh'],
        changedFiles: ['commands/commands.md'],
      },
      {
        ghRunner: (args) => {
          calls.push(args);
          if (args[0] === 'pr' && args[1] === 'list') {
            return JSON.stringify([
              {
                number: 321,
                title: 'existing',
                url: 'https://github.com/soupler-hq/orbit/pull/321',
              },
            ]);
          }
          if (args[0] === 'pr' && args[1] === 'edit') return '';
          throw new Error(`unexpected gh args: ${args.join(' ')}`);
        },
      }
    );

    expect(result).toEqual({
      action: 'updated',
      number: 321,
      url: 'https://github.com/soupler-hq/orbit/pull/321',
    });
    expect(calls.some((args) => args[0] === 'pr' && args[1] === 'edit')).toBe(true);
  });
});
