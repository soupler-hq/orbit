#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_BRANCH_RE =
  /^(feat|fix|docs|chore|refactor|test|release|hotfix)\/(?:\d+-)?[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_HEADINGS = ['## Summary', '## Issues', '## Ship Decision', '## Test plan'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function loadPayload(args) {
  let payload = null;

  if (args['event-file']) {
    payload = JSON.parse(fs.readFileSync(path.resolve(args['event-file']), 'utf8'));
  } else if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  }

  const body = args['body-file']
    ? fs.readFileSync(path.resolve(args['body-file']), 'utf8')
    : args.body || '';

  if (payload?.pull_request) {
    if (body) {
      payload.pull_request.body = body;
    }
    if (args['head-ref']) {
      payload.pull_request.head = payload.pull_request.head || {};
      payload.pull_request.head.ref = args['head-ref'];
    }
    if (args['head-sha']) {
      payload.pull_request.head = payload.pull_request.head || {};
      payload.pull_request.head.sha = args['head-sha'];
    }
    if (args['base-ref']) {
      payload.pull_request.base = payload.pull_request.base || {};
      payload.pull_request.base.ref = args['base-ref'];
    }
    return payload;
  }

  return {
    pull_request: {
      body,
      head: {
        ref: args['head-ref'] || '',
        sha: args['head-sha'] || '',
      },
      base: {
        ref: args['base-ref'] || '',
      },
    },
  };
}

function isReleaseBridge(headRef, baseRef) {
  return headRef === 'develop' && baseRef === 'main';
}

function validateBranchName(headRef, baseRef) {
  if (isReleaseBridge(headRef, baseRef)) return [];
  if (ALLOWED_BRANCH_RE.test(headRef)) return [];
  return [
    `Branch '${headRef}' does not follow convention. Expected <type>/<slug> such as feat/143-pr-governance-enforcement or fix/145-context-minimal-dedup.`,
  ];
}

function validateBody(body, headSha) {
  const errors = [];
  const normalizedBody = body || '';

  for (const heading of REQUIRED_HEADINGS) {
    if (!normalizedBody.includes(heading)) {
      errors.push(`PR body is missing required section: ${heading}`);
    }
  }

  const shaMatch = normalizedBody.match(/Head SHA:\s*`?([0-9a-f]{7,40})`?/i);
  if (!shaMatch) {
    errors.push('PR body is missing required freshness marker: `Head SHA: <current sha>`');
  } else if (headSha && shaMatch[1] !== headSha && !headSha.startsWith(shaMatch[1])) {
    errors.push(
      `PR body Head SHA (${shaMatch[1]}) does not match current PR head (${headSha}). Refresh the body before re-review.`
    );
  }

  return errors;
}

function validateGovernance(payload) {
  const pr = payload.pull_request;
  if (!pr) {
    return {
      ok: true,
      errors: [],
      skipped: true,
    };
  }

  const headRef = pr.head?.ref || '';
  const baseRef = pr.base?.ref || '';
  const headSha = pr.head?.sha || '';
  const body = pr.body || '';

  const errors = [...validateBranchName(headRef, baseRef), ...validateBody(body, headSha)];

  return {
    ok: errors.length === 0,
    errors,
    skipped: false,
    headRef,
    baseRef,
    headSha,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = loadPayload(args);
  const result = validateGovernance(payload);

  if (result.skipped) {
    console.log('PR governance check skipped: no pull_request payload available.');
    return;
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `✓ PR governance passed for ${result.headRef} -> ${result.baseRef} at ${result.headSha || 'unknown-sha'}`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  ALLOWED_BRANCH_RE,
  REQUIRED_HEADINGS,
  isReleaseBridge,
  loadPayload,
  validateBranchName,
  validateBody,
  validateGovernance,
};
