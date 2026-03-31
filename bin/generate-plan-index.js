#!/usr/bin/env node
/**
 * Orbit plan index generator and validator.
 *
 * Reads docs/plans/*.md frontmatter, validates required metadata, and
 * generates docs/plans/README.md in dependency-first order.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLANS_DIR = path.join(ROOT, 'docs', 'plans');
const README_PATH = path.join(PLANS_DIR, 'README.md');

function parseArgs(argv) {
  return {
    check: argv.includes('--check'),
  };
}

function readFile(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

function parseFrontmatter(content, relPath) {
  if (!content.startsWith('---\n')) {
    throw new Error(`${relPath} is missing required frontmatter`);
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error(`${relPath} has an unterminated frontmatter block`);
  }

  const block = content.slice(4, end);
  const body = content.slice(end + 5);
  const meta = {};
  let currentKey = null;

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    const keyMatch = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      currentKey = key;
      const value = rawValue.trim();
      if (value === '') {
        meta[key] = [];
      } else if (value === '[]') {
        meta[key] = [];
      } else {
        meta[key] = value;
      }
      continue;
    }

    const arrayMatch = trimmed.match(/^- (.+)$/);
    if (arrayMatch && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(arrayMatch[1].trim());
      continue;
    }

    throw new Error(`${relPath} has an invalid frontmatter line: ${rawLine}`);
  }

  return { meta, body };
}

function extractTitle(body, relPath) {
  const match = body.match(/^#\s+(.+)$/m);
  if (!match) {
    throw new Error(`${relPath} is missing a top-level heading`);
  }
  return match[1].trim();
}

function normalizePlan(relPath) {
  const absPath = path.join(ROOT, relPath);
  const content = readFile(absPath);
  const { meta, body } = parseFrontmatter(content, relPath);
  const title = extractTitle(body, relPath);
  const required = [
    'id',
    'doc_type',
    'status',
    'version',
    'last_updated',
    'scope',
    'phase',
    'rank',
    'priority',
    'depends_on',
    'blocks',
  ];

  for (const key of required) {
    if (!(key in meta)) {
      throw new Error(`${relPath} frontmatter is missing required field: ${key}`);
    }
  }

  if (meta.doc_type !== 'plan') {
    throw new Error(`${relPath} must declare doc_type: plan`);
  }

  if (!/^\d{3}$/.test(String(meta.rank))) {
    throw new Error(`${relPath} rank must be a 3-digit string like 010`);
  }

  if (!/^P\d+$/.test(String(meta.priority))) {
    throw new Error(`${relPath} priority must look like P0, P1, ...`);
  }

  if (!Array.isArray(meta.depends_on)) {
    throw new Error(`${relPath} depends_on must be a YAML-style array`);
  }

  if (!Array.isArray(meta.blocks)) {
    throw new Error(`${relPath} blocks must be a YAML-style array`);
  }

  return {
    relPath,
    fileName: path.basename(relPath),
    title,
    ...meta,
  };
}

function getPlanFiles() {
  return fs
    .readdirSync(PLANS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => path.join('docs', 'plans', file))
    .sort();
}

function comparePlans(a, b) {
  return Number(a.rank) - Number(b.rank) || a.fileName.localeCompare(b.fileName);
}

function formatList(items) {
  return items.length === 0 ? 'none' : items.join(', ');
}

function planLink(relPath) {
  return `[${path.basename(relPath)}](${path.basename(relPath)})`;
}

function renderIndex(plans) {
  const active = plans.filter((plan) => plan.status === 'Active').sort(comparePlans);
  const historical = plans.filter((plan) => plan.status !== 'Active').sort(comparePlans);

  const activeRows =
    active.length === 0
      ? '| - | - | - | - | - | - | - | - | - |\n'
      : active
          .map(
            (plan) =>
              `| ${plan.rank} | ${plan.phase} | ${plan.priority} | ${planLink(plan.relPath)} | ${formatList(plan.depends_on)} | ${formatList(plan.blocks)} | ${plan.status} | ${plan.version} | ${plan.last_updated} |`
          )
          .join('\n') + '\n';

  const historicalRows =
    historical.length === 0
      ? '| - | - | - | - | - | - | - | - |\n'
      : historical
          .map(
            (plan) =>
              `| ${plan.rank} | ${plan.phase} | ${plan.priority} | ${planLink(plan.relPath)} | ${formatList(plan.depends_on)} | ${formatList(plan.blocks)} | ${plan.status} | ${plan.version} |`
          )
          .join('\n') + '\n';

  return `<!-- GENERATED FILE - DO NOT EDIT MANUALLY -->
<!-- Source: docs/plans/*.md frontmatter -->
<!-- Regenerate: node bin/generate-plan-index.js -->

# Plans Index

> Durable planning artifacts for Orbit.

## Purpose

Use \`docs/plans/\` for plans that should remain reviewable and traceable in git.

Naming rules are defined in [artifact-conventions.md](../standards/artifact-conventions.md).

## Current Active Plans

| Rank | Phase | Priority | Artifact | Depends on | Blocks | Status | Version | Last updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${activeRows}
## Historical Wave And Completed Plans

| Rank | Phase | Priority | Artifact | Depends on | Blocks | Status | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
${historicalRows}
## Rule Of Thumb

- Put new durable plans here.
- Keep filenames descriptive, lowercase, and traceable to milestone, wave, or issue.
- Use stable issue-linked or wave-linked filenames. Put revision in metadata, not in the plan filename.
- Use the \`Rank\`, \`Phase\`, \`Priority\`, \`Depends on\`, and \`Blocks\` columns for implementation order. Do not infer sequence from issue number alone.
- Link predecessor and successor plans when a plan is superseded.
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const plans = getPlanFiles().map(normalizePlan);
  const rendered = renderIndex(plans);

  if (args.check) {
    const current = readFile(README_PATH);
    if (current !== rendered) {
      console.error('docs/plans/README.md is out of date. Run: node bin/generate-plan-index.js');
      process.exit(1);
    }
    return;
  }

  fs.writeFileSync(README_PATH, rendered);
  console.log(`✅ Generated ${path.relative(ROOT, README_PATH)} from plan frontmatter`);
}

if (require.main === module) {
  main();
}

module.exports = {
  getPlanFiles,
  normalizePlan,
  renderIndex,
};
