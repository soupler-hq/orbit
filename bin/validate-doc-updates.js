#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const BEHAVIOR_CHANGE_PATTERNS = [
  /^bin\//,
  /^hooks\//,
  /^agents\//,
  /^skills\//,
  /^templates\//,
  /^commands\//,
  /^install\.sh$/,
  /^orbit\.registry\.json$/,
  /^orbit\.config\.json$/,
  /^package\.json$/,
];

const DOC_UPDATE_PATTERNS = [
  /^README\.md$/,
  /^CHANGELOG\.md$/,
  /^docs\//,
  /^INSTRUCTIONS\.md$/,
  /^WORKFLOWS\.md$/,
  /^SKILLS\.md$/,
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function parseChangedFiles(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractDocsUpdateSection(body) {
  const match = String(body || '').match(
    /(?:^|\n)## Docs update[ \t]*\n([\s\S]*?)(?=\n## |\n---\n|\s*$)/i
  );
  return match ? match[1].trim() : '';
}

function extractDocsStatus(body) {
  const section = extractDocsUpdateSection(body);
  const match = section.match(/(?:^|\n)- Status:\s*`?([A-Z]+)`?[ \t]*$/im);
  return match ? match[1].toUpperCase() : '';
}

function extractDocsNotes(body) {
  const section = extractDocsUpdateSection(body);
  const match = section.match(/(?:^|\n)- Notes:\s*(.+)$/im);
  return match ? match[1].trim() : '';
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pattern.test(file));
}

function summarizeRelevantFiles(files, patterns) {
  return files.filter((file) => matchesAny(file, patterns));
}

function validateDocUpdates({ body, changedFiles }) {
  const errors = [];
  const behaviorFiles = summarizeRelevantFiles(changedFiles, BEHAVIOR_CHANGE_PATTERNS);

  if (behaviorFiles.length === 0) {
    return errors;
  }

  const docFiles = summarizeRelevantFiles(changedFiles, DOC_UPDATE_PATTERNS);
  const status = extractDocsStatus(body);
  const notes = extractDocsNotes(body);

  if (!status) {
    errors.push(
      'PR body is missing required docs-update evidence: add `## Docs update` with `Status: UPDATED` or `Status: EXEMPT`.'
    );
    return errors;
  }

  if (!['UPDATED', 'EXEMPT'].includes(status)) {
    errors.push('PR docs-update status must be `UPDATED` or `EXEMPT`.');
  }

  if (status === 'UPDATED' && docFiles.length === 0) {
    errors.push(
      `PR body says docs were updated, but no contract docs changed. Behavior-sensitive files changed: ${behaviorFiles.join(', ')}.`
    );
  }

  if (status === 'EXEMPT') {
    const normalizedNotes = notes.toLowerCase();
    if (!notes || notes.includes('<!--') || normalizedNotes === 'notes here') {
      errors.push(
        'PR docs-update exemption requires explicit notes explaining why no docs update is needed.'
      );
    }
  }

  if (status === 'UPDATED' && (!notes || notes.includes('<!--'))) {
    errors.push('PR docs-update section must name the docs that were updated.');
  }

  if (docFiles.length === 0 && status !== 'EXEMPT') {
    errors.push(
      `Behavior-sensitive changes require docs updates or an explicit exemption. Changed files: ${behaviorFiles.join(', ')}.`
    );
  }

  return errors;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const body = args['body-file'] ? readText(args['body-file']) : args.body || '';
  const changedFilesText = args['changed-files-file']
    ? readText(args['changed-files-file'])
    : args['changed-files'] || '';
  const changedFiles = parseChangedFiles(changedFilesText);
  const errors = validateDocUpdates({ body, changedFiles });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log('✓ Docs-update governance passed');
}

if (require.main === module) {
  main();
}

module.exports = {
  BEHAVIOR_CHANGE_PATTERNS,
  DOC_UPDATE_PATTERNS,
  extractDocsNotes,
  extractDocsStatus,
  parseChangedFiles,
  validateDocUpdates,
};
