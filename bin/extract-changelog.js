#!/usr/bin/env node
/**
 * Orbit Changelog Extractor
 * Usage: node bin/extract-changelog.js [version]
 */

const fs = require('fs');
const path = require('path');

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const notesPath = path.join(process.cwd(), 'RELEASE_NOTES.md');

if (!fs.existsSync(changelogPath)) {
  console.error('❌ CHANGELOG.md not found');
  process.exit(1);
}

const version = process.argv[2] || process.env.GITHUB_REF_NAME || 'HEAD';
const cleanVersion = version.replace(/^v/, '');

console.log(`▸ Extracting notes for version: ${cleanVersion}...`);

const fullChangelog = fs.readFileSync(changelogPath, 'utf8');
const lines = fullChangelog.split('\n');

let releaseNotes = [];
let foundVersion = false;

// Regex to find headers like "## [2.3.0]" or "## 2.3.0"
const versionHeaderRegex = /^##\s+\[?([\d\.]+)\]?/;

for (const line of lines) {
  const match = line.match(versionHeaderRegex);
  
  if (match) {
    if (match[1] === cleanVersion) {
      foundVersion = true;
      continue;
    } else if (foundVersion) {
      // Hit the next version header, we're done
      break;
    }
  }

  if (foundVersion) {
    releaseNotes.push(line);
  }
}

const output = releaseNotes.join('\n').trim();

if (!foundVersion || output === '') {
  console.error(`❌ Could not find release notes for version ${cleanVersion}`);
  process.exit(1);
}

fs.writeFileSync(notesPath, output);
console.log(`✅ Release notes written to: ${notesPath}`);
