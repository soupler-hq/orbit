#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CHECKPOINT_DIR = path.join(ROOT, '.orbit', 'state', 'checkpoints');

function safeExec(args) {
  try {
    return execFileSync(args[0], args.slice(1), {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (_error) {
    return '';
  }
}

function normalizeChangedFiles(changedFiles) {
  if (Array.isArray(changedFiles)) {
    return changedFiles.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof changedFiles !== 'string') return [];
  return changedFiles
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function categorizeImpact(changedFiles) {
  const files = normalizeChangedFiles(changedFiles);
  return {
    logic: files.some(
      (file) =>
        /^(bin|agents|hooks\/scripts|skills|commands\/orbit)\//.test(file) &&
        !/\.test\./.test(file) &&
        !/\.md$/.test(file)
    ),
    tests: files.some((file) => /^tests\//.test(file) || /\.test\./.test(file)),
    docs: files.some(
      (file) =>
        /^docs\//.test(file) ||
        /^templates\//.test(file) ||
        ['README.md', 'INSTRUCTIONS.md', 'SKILLS.md', 'WORKFLOWS.md', 'CLAUDE.md'].includes(file)
    ),
    config: files.some((file) =>
      /(^|\/)(package\.json|orbit\.registry\.json|orbit\.config\.json|orbit\.config\.schema\.json)$/.test(
        file
      )
    ),
  };
}

function buildVerificationSummary(verificationChecks, verificationStatus = 'success') {
  const checks = String(verificationChecks || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, passed] = entry.split(':');
      return {
        name: String(name || '').trim(),
        passed:
          String(passed || '')
            .trim()
            .toLowerCase() === 'true',
      };
    })
    .filter((entry) => entry.name);
  return {
    status: verificationStatus,
    checks,
  };
}

function fallbackChangedFiles() {
  const output = safeExec(['git', 'diff', '--name-only', 'HEAD~1..HEAD']);
  return output
    ? output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function buildCheckpointManifest({ args = {}, profile = {}, evidence = {}, workflow = {} }) {
  const changedFiles = normalizeChangedFiles(args.changedFiles);
  const files = changedFiles.length ? changedFiles : fallbackChangedFiles();
  const headSha = args.headSha || safeExec(['git', 'rev-parse', '--short', 'HEAD']) || null;
  const branch = evidence.branch || args.branch || null;
  const currentBranch = safeExec(['git', 'rev-parse', '--abbrev-ref', 'HEAD']) || branch;
  const issue = args.issue || evidence.issue || null;
  const pr = args.pr || args.prNumber || evidence.prNumber || null;
  const dirtyOutput = safeExec(['git', 'status', '--porcelain']);
  const unrelatedLocalChanges = dirtyOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => !files.some((file) => line.endsWith(file)));

  return {
    orbit_version: args.orbitVersion || 'current',
    checkpoint:
      args.checkpoint || profile.checkpoint || workflow.state || 'implementation_complete',
    metadata: {
      issue: issue || null,
      branch,
      pr,
      head_sha: headSha,
      command: profile.command || args.command || null,
    },
    impact: {
      files_modified: files.length,
      changed_files: files,
      scope: categorizeImpact(files),
      registry_updated: files.includes('orbit.registry.json'),
      breaking_changes:
        args.breakingChanges === true ||
        String(args.breakingChanges || '').toLowerCase() === 'true',
    },
    verification_summary: buildVerificationSummary(
      args.verificationChecks,
      args.verificationStatus || 'success'
    ),
    workspace_integrity: {
      branch_matches_target: Boolean(branch) && currentBranch === branch,
      pr_head_matches_local: (args.headSha || headSha) === headSha,
      unrelated_local_changes: unrelatedLocalChanges,
      issue_bound: Boolean(issue),
      pr_known: Boolean(pr),
    },
    orchestration: {
      current_state: workflow.state || 'unknown',
      recommended_next_step:
        workflow.nextCommand || profile.defaultPrimary || args.recommendedNextStep || null,
      required_context: String(args.requiredContext || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      confidence:
        args.confidence !== undefined
          ? Number(args.confidence)
          : workflow.blockers && workflow.blockers.length
            ? 0.75
            : 0.95,
    },
  };
}

function writeCheckpointManifest({
  checkpointDir = DEFAULT_CHECKPOINT_DIR,
  manifest,
  timestamp = new Date().toISOString(),
}) {
  const dir = path.resolve(checkpointDir);
  fs.mkdirSync(dir, { recursive: true });
  const latestPath = path.join(dir, 'latest.json');
  const historyName = `${timestamp.replace(/[:.]/g, '-')}-${String(
    manifest.metadata.issue || 'untracked'
  ).replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
  const historyPath = path.join(dir, historyName);
  const payload = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(latestPath, payload);
  fs.writeFileSync(historyPath, payload);
  return { latestPath, historyPath };
}

module.exports = {
  DEFAULT_CHECKPOINT_DIR,
  buildCheckpointManifest,
  buildVerificationSummary,
  categorizeImpact,
  normalizeChangedFiles,
  writeCheckpointManifest,
};
