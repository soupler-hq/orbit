import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  loadPayload,
  parseTrackedIssueRefs,
  validateBranchName,
  validateBody,
  validateResidualRisks,
  validateTrackedIssueMetadata,
  validateGovernance,
} = require('../bin/validate-pr-governance');

describe('validate-pr-governance', () => {
  const compliantBody = [
    '## Summary',
    '## Issues',
    '## Ship Decision',
    '- Head SHA: `abc1234`',
    '## Test plan',
    '- `npm test`',
    '## Merge notes',
    '## Orbit Self-Review',
    '**Command run**: `/orbit:review`',
    '**Agent(s) dispatched**: reviewer',
    '**Ship decision**: APPROVED',
    '**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):',
    '```',
    'none',
    '```',
    '**Residual risks** (use one label per item: `Tracked by #...`, `Waived: ...`, or `Operational: ...`, or `none`):',
    '```',
    'Operational: normal CI timing and merge queue behavior may still delay green checks.',
    '```',
  ].join('\n');

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
    const errors = validateBody(compliantBody, 'abc1234');
    expect(errors).toEqual([]);
  });

  it('fails when the head sha marker is stale', () => {
    const errors = validateBody(compliantBody, 'def5678');
    expect(errors.join('\n')).toContain('does not match current PR head');
  });

  it('validates a full pull_request payload', () => {
    const result = validateGovernance({
      pull_request: {
        body: compliantBody,
        head: { ref: 'feat/143-pr-governance-enforcement', sha: 'abc1234' },
        base: { ref: 'develop' },
      },
    });

    expect(result.ok).toBe(true);
  });

  it('accepts explicitly labeled residual risks', () => {
    expect(
      validateResidualRisks(
        [
          '**Residual risks**',
          '```',
          'Tracked by #145: minimal context still depends on task-table quality.',
          'Waived: Acceptable for this internal-only refactor.',
          'Operational: Merge queue timing may still delay final green state.',
          '```',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it('extracts tracked issue refs from the residual-risk block', () => {
    expect(parseTrackedIssueRefs(compliantBody)).toEqual([]);
    expect(
      parseTrackedIssueRefs(
        [
          '**Residual risks**',
          '```',
          'Tracked by #145: minimal context still depends on task-table quality.',
          'Operational: merge queue timing may still delay final green state.',
          'Tracked by #163',
          '```',
        ].join('\n')
      )
    ).toEqual(['#145', '#163']);
  });

  it('accepts `none` as a valid residual-risk disposition', () => {
    expect(
      validateResidualRisks(
        ['**Residual risks**', '```', 'none', '```'].join('\n')
      )
    ).toEqual([]);
  });

  it('fails when residual risks are unlabeled prose', () => {
    const errors = validateResidualRisks(
      ['**Residual risks**', '```', 'Need to revisit later.', '```'].join('\n')
    );

    expect(errors.join('\n')).toContain('Residual risks must be labeled');
  });

  it('fails when a tracked residual issue is closed or missing', () => {
    const body = [
      '**Residual risks**',
      '```',
      'Tracked by #145: still needs follow-up',
      'Tracked by #163: governance follow-through',
      '```',
    ].join('\n');

    const errors = validateTrackedIssueMetadata(body, [
      { issue_ref: '#145', state: 'CLOSED', title: 'old follow-up' },
    ]);

    expect(errors.join('\n')).toContain('#145 must point to an open follow-up issue');
    expect(errors.join('\n')).toContain('#163 is not backed by loaded issue metadata');
  });

  it('overlays a provided body file on top of event payload data', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-pr-body-'));
    const fixturePath = path.join(tempDir, 'body.md');
    fs.writeFileSync(fixturePath, compliantBody, { mode: 0o600 });

    const payload = loadPayload({
      'body-file': fixturePath,
      'head-ref': 'feat/143-pr-governance-enforcement',
      'head-sha': 'abc1234',
      'base-ref': 'develop',
    });

    expect(payload.pull_request.body).toContain('## Summary');
    expect(payload.pull_request.head.sha).toBe('abc1234');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails when test and review evidence are still placeholders', () => {
    const errors = validateBody(
      [
        '## Summary',
        '## Issues',
        '## Ship Decision',
        '- Head SHA: `abc1234`',
        '## Test plan',
        '- `<!-- command -->`',
        '## Orbit Self-Review',
        '**Command run**: <!-- e.g. /orbit:review -->',
        '**Agent(s) dispatched**: <!-- e.g. reviewer -->',
        '**Ship decision**: <!-- APPROVED / APPROVED WITH CONDITIONS / BLOCKED -->',
        '**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):',
        '```',
        '(findings here)',
        '```',
        '**Residual risks** (use one label per item: `Tracked by #...`, `Waived: ...`, or `Operational: ...`, or `none`):',
        '```',
        '(residual risks here)',
        '```',
      ].join('\n'),
      'abc1234'
    );

    expect(errors.join('\n')).toContain('missing test evidence');
    expect(errors.join('\n')).toContain('missing executed review evidence');
    expect(errors.join('\n')).toContain('missing review evidence: `Agent(s) dispatched`');
    expect(errors.join('\n')).toContain('Residual risks must be labeled');
  });
});
