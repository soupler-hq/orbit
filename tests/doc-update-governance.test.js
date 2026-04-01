import { describe, expect, it } from 'vitest';

const { validateDocUpdates, parseChangedFiles } = require('../bin/validate-doc-updates');

describe('validate-doc-updates', () => {
  it('passes when behavior-sensitive changes include docs updates with UPDATED status', () => {
    const errors = validateDocUpdates({
      body: [
        '## Summary',
        '## Docs update',
        '- Status: `UPDATED`',
        '- Notes: Updated README.md and docs/operations/playbooks.md',
      ].join('\n'),
      changedFiles: ['bin/context.js', 'README.md', 'docs/operations/playbooks.md'],
    });

    expect(errors).toEqual([]);
  });

  it('parses the real docs-update section instead of summary text that mentions it', () => {
    const errors = validateDocUpdates({
      body: [
        '## Summary',
        '- require PR bodies to record `## Docs update` as either `UPDATED` or `EXEMPT`',
        '',
        '## Issues',
        '- Relates to #151',
        '',
        '## Test plan',
        '- `bash bin/validate.sh`',
        '',
        '## Docs update',
        '- Status: `UPDATED`',
        '- Notes: Updated README.md and docs/governance/contributing.md',
        '',
        '## Merge notes',
        '- governance follow-through',
      ].join('\n'),
      changedFiles: ['bin/validate-doc-updates.js', 'README.md', 'docs/governance/contributing.md'],
    });

    expect(errors).toEqual([]);
  });

  it('treats command contract markdown as a valid docs update', () => {
    const errors = validateDocUpdates({
      body: [
        '## Summary',
        '## Docs update',
        '- Status: `UPDATED`',
        '- Notes: Updated commands/commands.md',
      ].join('\n'),
      changedFiles: ['bin/runtime-command.js', 'commands/commands.md'],
    });

    expect(errors).toEqual([]);
  });

  it('requires explicit exemption when behavior-sensitive changes lack doc updates', () => {
    const errors = validateDocUpdates({
      body: ['## Summary', '## Docs update', '- Status: `UPDATED`', '- Notes: Updated README.md'].join(
        '\n'
      ),
      changedFiles: ['bin/context.js'],
    });

    expect(errors.join('\n')).toContain('no contract docs changed');
  });

  it('passes with EXEMPT status when notes explain why docs were not needed', () => {
    const errors = validateDocUpdates({
      body: [
        '## Summary',
        '## Docs update',
        '- Status: `EXEMPT`',
        '- Notes: Internal-only schema normalization; no user-facing behavior or contract changed.',
      ].join('\n'),
      changedFiles: ['bin/db.js'],
    });

    expect(errors).toEqual([]);
  });

  it('does not require docs-update evidence for non-behavior-sensitive changes', () => {
    const errors = validateDocUpdates({
      body: '## Summary',
      changedFiles: ['tests/context.test.js'],
    });

    expect(errors).toEqual([]);
  });

  it('parses changed-files text cleanly', () => {
    expect(parseChangedFiles('bin/context.js\nREADME.md\n\n')).toEqual([
      'bin/context.js',
      'README.md',
    ]);
  });
});
