#!/usr/bin/env node
/**
 * Orbit Changelog Extractor
 *
 * Extracts release notes from CHANGELOG.md for a version range.
 *
 * Usage:
 *   node bin/extract-changelog.js --to <version> [--from <version>]
 *   node bin/extract-changelog.js <version>          (legacy single-version mode)
 *
 * --to   The version being released (inclusive). Required.
 * --from The last published version (exclusive). If omitted, only --to is extracted.
 *
 * When --from is provided, all changelog sections in (from, to] are combined
 * in order (newest first) into docs/RELEASE_NOTES.md. This covers the case where
 * multiple sprint versions have accumulated on develop before landing on main.
 *
 * Examples:
 *   # Only v2.7.0 notes
 *   node bin/extract-changelog.js --to 2.7.0
 *
 *   # All changes since v2.4.0 (last release) up to and including v2.7.0
 *   node bin/extract-changelog.js --to 2.7.0 --from 2.4.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let toVersion = null;
let fromVersion = null;

if (args[0] && !args[0].startsWith('--')) {
  // Legacy positional: extract-changelog.js <version>
  toVersion = args[0].replace(/^v/, '');
} else {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--to') toVersion = (args[++i] || '').replace(/^v/, '');
    if (args[i] === '--from') fromVersion = (args[++i] || '').replace(/^v/, '');
  }
}

if (!toVersion) {
  toVersion = (process.env.GITHUB_REF_NAME || '').replace(/^v/, '');
}

if (!toVersion) {
  console.error('Usage: node bin/extract-changelog.js --to <version> [--from <version>]');
  process.exit(1);
}

// ── Parse CHANGELOG.md into version blocks ────────────────────────────────────

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const notesPath = path.join(process.cwd(), 'docs', 'RELEASE_NOTES.md');

if (!fs.existsSync(changelogPath)) {
  console.error('❌ CHANGELOG.md not found');
  process.exit(1);
}

const fullChangelog = fs.readFileSync(changelogPath, 'utf8');
const lines = fullChangelog.split('\n');
const versionHeaderRe = /^##\s+\[?([\d.]+)\]?/;

// Build ordered list of { version, lines[] } blocks (order = newest first, as in CHANGELOG)
const blocks = [];
let current = null;

for (const line of lines) {
  const m = line.match(versionHeaderRe);
  if (m) {
    if (current) blocks.push(current);
    current = { version: m[1], lines: [] };
  } else if (current) {
    current.lines.push(line);
  }
}
if (current) blocks.push(current);

// ── Semver helpers ────────────────────────────────────────────────────────────

function semverParts(v) {
  return v.split('.').map(Number);
}

function semverGt(a, b) {
  const pa = semverParts(a);
  const pb = semverParts(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// ── Select blocks in range (fromVersion, toVersion] ──────────────────────────
// Include: version <= toVersion AND version > fromVersion (or all if no fromVersion)

const selected = blocks.filter(({ version }) => {
  const lteTarget = version === toVersion || semverGt(toVersion, version);
  const gteBase = !fromVersion || semverGt(version, fromVersion);
  return lteTarget && gteBase;
});

if (selected.length === 0) {
  const range = fromVersion ? `>${fromVersion} to ${toVersion}` : toVersion;
  console.error(`❌ No changelog entries found for range: ${range}`);
  process.exit(1);
}

// ── Build output ──────────────────────────────────────────────────────────────

const rangeLabel = fromVersion ? `v${fromVersion} → v${toVersion}` : `v${toVersion}`;
console.log(`▸ Extracting changelog range: ${rangeLabel}`);
console.log(`  Versions included: ${selected.map((b) => `v${b.version}`).join(', ')}`);

const parts = selected.map(({ version, lines: vlines }) => {
  const body = vlines.join('\n').trim();
  return `## [${version}]\n\n${body}`;
});

const output = parts.join('\n\n---\n\n').trim();

fs.writeFileSync(notesPath, output);
console.log(`✅ Release notes written to: ${notesPath} (${selected.length} version(s))`);
