import { describe, expect, it } from 'vitest';

const {
  validateBranchName,
  validateBody,
  validateGovernance,
} = require('../bin/validate-pr-governance');

describe('validate-pr-governance', () => {
  it('accepts normal feature branches', () => {
    expect(validateBranchName('feat/143-pr-governance-enforcement', 'develop')).toEqual([]);
    expect(validateBranchName('fix/145-context-minimal-dedup', 'develop')).toEqual([]);
    expect(validateBranchName('docs/145-durable-state-context', 'develop')).toEqual([]);
    expect(validateBranchName('feat/orbit-task-w005-0', 'develop')).toEqual([]);
  });

  it('allows the develop -> main release bridge', () => {
    expect(validateBranchName('develop', 'main')).toEqual([]);
  });

  it('rejects invalid branch names', () => {
    const errors = validateBranchName('feature/bad-name', 'develop');
    expect(errors[0]).toContain("does not follow convention");
  });

  it('requires standard PR body sections and matching head sha', () => {
    const errors = validateBody(
      [
        '## Summary',
        '## Issues',
        '## Ship Decision',
        '- Head SHA: `abc1234`',
        '## Test plan',
      ].join('\n'),
      'abc1234'
    );
    expect(errors).toEqual([]);
  });

  it('fails when the head sha marker is stale', () => {
    const errors = validateBody(
      [
        '## Summary',
        '## Issues',
        '## Ship Decision',
        '- Head SHA: `abc1234`',
        '## Test plan',
      ].join('\n'),
      'def5678'
    );
    expect(errors.join('\n')).toContain('does not match current PR head');
  });

  it('validates a full pull_request payload', () => {
    const result = validateGovernance({
      pull_request: {
        body: [
          '## Summary',
          '## Issues',
          '## Ship Decision',
          '- Head SHA: `abc1234`',
          '## Test plan',
        ].join('\n'),
        head: { ref: 'feat/143-pr-governance-enforcement', sha: 'abc1234' },
        base: { ref: 'develop' },
      },
    });

    expect(result.ok).toBe(true);
  });
});
