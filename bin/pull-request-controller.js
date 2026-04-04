#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateBody, validateBranchName } = require('./validate-pr-governance');
const { validateDocUpdates } = require('./validate-doc-updates');

function runGh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function splitCommands(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return String(value || '')
    .split('||')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function shortHeadSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (_error) {
    return '';
  }
}

function latestCommitSubject() {
  try {
    return execFileSync('git', ['log', '-1', '--pretty=%s'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (_error) {
    return '';
  }
}

function deriveDocsUpdate(changedFiles = [], args = {}) {
  if (args.docsUpdateStatus) {
    return {
      status: args.docsUpdateStatus,
      notes: args.docsUpdateNotes || 'Provided by runtime arguments.',
    };
  }

  const docsFiles = changedFiles.filter(
    (file) =>
      /^docs\//.test(file) ||
      /^commands\/.*\.md$/.test(file) ||
      ['README.md', 'INSTRUCTIONS.md', 'WORKFLOWS.md', 'SKILLS.md', 'CLAUDE.md'].includes(file)
  );

  if (docsFiles.length > 0) {
    return {
      status: 'UPDATED',
      notes: `Updated ${docsFiles.join(', ')}`,
    };
  }

  return {
    status: 'EXEMPT',
    notes: 'No contract docs changed in this slice.',
  };
}

function buildPullRequestBody({
  issue,
  branch = '',
  prNumber = '#TBD',
  headSha,
  summaryLines,
  verificationCommands,
  changedFiles = [],
  reviewCommand = '/orbit:review',
  reviewAgents = 'reviewer',
  shipDecision = 'APPROVED',
  findingsAddressed = 'none',
  residualRisks = ['none'],
  mergeNotes = [],
  args = {},
}) {
  const docsUpdate = deriveDocsUpdate(changedFiles, args);
  const mergeNoteLines = mergeNotes.length
    ? mergeNotes
    : ['Auto-generated from `/orbit:quick` clean review state.'];
  const findingsBlock = Array.isArray(findingsAddressed)
    ? findingsAddressed.join('\n')
    : String(findingsAddressed || 'none');
  const residualLines =
    Array.isArray(residualRisks) && residualRisks.length ? residualRisks : ['none'];
  const tests = splitCommands(verificationCommands);

  return [
    '## Summary',
    ...summaryLines.map((line) => `- ${line}`),
    '',
    '## Issues',
    `- Relates to ${issue}`,
    '',
    '## Ship Decision',
    `- Review: \`${reviewCommand}\``,
    `- Head SHA: \`${headSha}\``,
    '- Merge when checks are green',
    '',
    '## Test plan',
    ...tests.map((command) => `- \`${command}\``),
    '',
    '## Merge notes',
    ...mergeNoteLines.map((line) => `- ${line}`),
    '',
    '## Docs update',
    `- Status: \`${docsUpdate.status}\``,
    `- Notes: ${docsUpdate.notes}`,
    '',
    '---',
    '',
    '## Orbit Self-Review',
    '',
    '### Agent Review Verdict',
    '',
    `**Command run**: \`${reviewCommand}\``,
    '',
    `**Agent(s) dispatched**: \`${reviewAgents}\``,
    '',
    `**Ship decision**: \`${shipDecision}\``,
    '',
    '**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):',
    '```',
    findingsBlock,
    '```',
    '',
    '**Residual risks** (use one label per item: `Tracked by #...`, `Waived: ...`, or `Operational: ...`, or `none`):',
    '```',
    ...residualLines,
    '```',
    '',
    '## PR Metadata',
    `- Issue: ${issue}`,
    `- Branch: ${branch}`,
    `- PR: ${prNumber}`,
    `- Head SHA: ${headSha}`,
  ].join('\n');
}

function validatePullRequestArtifacts({ body, branch, baseRef = 'develop', headSha, changedFiles }) {
  const errors = [
    ...validateBranchName(branch || '', baseRef),
    ...validateBody(body, headSha),
    ...validateDocUpdates({ body, changedFiles }),
  ];

  if (errors.length > 0) {
    throw new Error(`PR preflight failed:\n- ${errors.join('\n- ')}`);
  }
}

function syncPullRequest(
  {
    issue,
    branch,
    title,
    verificationCommands,
    changedFiles = [],
    args = {},
    prAction = 'create_or_update_ready',
  },
  deps = {}
) {
  const gh = deps.ghRunner || runGh;
  const resolvedTitle = title || latestCommitSubject() || `Tracked work for ${issue}`;
  const headSha = shortHeadSha();
  const baseRef = args.baseRef || 'develop';
  const summaryLines = [
    `auto-chain PR sync for ${issue}`,
    'refreshes the PR body from clean review + verification state',
  ];
  const initialBody = buildPullRequestBody({
    issue,
    branch,
    headSha,
    summaryLines,
    verificationCommands,
    changedFiles,
    args,
  });
  validatePullRequestArtifacts({
    body: initialBody,
    branch,
    baseRef,
    headSha,
    changedFiles,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-pr-body-'));
  const bodyFile = path.join(tmpDir, 'pr.md');
  fs.writeFileSync(bodyFile, initialBody);

  try {
    const existing = JSON.parse(
      gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,title,url'])
    );

    if (existing.length > 0) {
      const pr = existing[0];
      const updateBody = buildPullRequestBody({
        issue,
        branch,
        prNumber: `#${pr.number}`,
        headSha,
        summaryLines,
        verificationCommands,
        changedFiles,
        args,
      });
      validatePullRequestArtifacts({
        body: updateBody,
        branch,
        baseRef,
        headSha,
        changedFiles,
      });
      fs.writeFileSync(bodyFile, updateBody);
      gh(['pr', 'edit', String(pr.number), '--title', resolvedTitle, '--body-file', bodyFile]);
      return { action: 'updated', number: pr.number, url: pr.url };
    }

    const url = gh([
      'pr',
      'create',
      '--base',
      'develop',
      '--head',
      branch,
      '--title',
      resolvedTitle,
      '--body-file',
      bodyFile,
    ]);
    const match = url.match(/\/pull\/(\d+)$/);
    if (match) {
      const createdBody = buildPullRequestBody({
        issue,
        branch,
        prNumber: `#${match[1]}`,
        headSha,
        summaryLines,
        verificationCommands,
        changedFiles,
        args,
      });
      validatePullRequestArtifacts({
        body: createdBody,
        branch,
        baseRef,
        headSha,
        changedFiles,
      });
      fs.writeFileSync(bodyFile, createdBody);
      gh(['pr', 'edit', String(match[1]), '--title', resolvedTitle, '--body-file', bodyFile]);
    }
    return {
      action: prAction === 'update_existing_pr' ? 'updated' : 'created',
      number: match ? Number(match[1]) : null,
      url,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  buildPullRequestBody,
  deriveDocsUpdate,
  splitCommands,
  syncPullRequest,
  validatePullRequestArtifacts,
};
