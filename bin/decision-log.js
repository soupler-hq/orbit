#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_LOG_PATH = path.join(ROOT, '.orbit', 'state', 'DECISIONS-LOG.md');

function stripQuotes(value) {
  const text = String(value || '').trim();
  const quoted = text.match(/^"(.*)"$/);
  return quoted ? quoted[1] : text;
}

function parseArrayValue(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === '[]') return [];
  const match = trimmed.match(/^\[(.*)\]$/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter(Boolean);
}

function parseBooleanValue(value) {
  if (value === true || value === false) return value;
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function normalizeDecisionEntry(entry) {
  return {
    decision: stripQuotes(entry.decision || ''),
    made_at: stripQuotes(entry.made_at || ''),
    version: stripQuotes(entry.version || ''),
    phase: stripQuotes(entry.phase || ''),
    made_by: stripQuotes(entry.made_by || ''),
    context: stripQuotes(entry.context || ''),
    rationale: stripQuotes(entry.rationale || ''),
    supersedes: Array.isArray(entry.supersedes)
      ? entry.supersedes
      : parseArrayValue(entry.supersedes),
    still_valid:
      typeof entry.still_valid === 'boolean'
        ? entry.still_valid
        : parseBooleanValue(entry.still_valid),
    invalidated_at: stripQuotes(entry.invalidated_at || ''),
  };
}

function parseDecisionLog(text) {
  const entries = [];
  let current = null;

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('```')) continue;

    if (line.startsWith('- decision:')) {
      if (current) entries.push(normalizeDecisionEntry(current));
      current = { decision: line.slice('- decision:'.length).trim() };
      continue;
    }

    if (!current) continue;
    const fieldMatch = line.match(/^([a-z_]+):\s*(.+)$/);
    if (!fieldMatch) continue;
    const [, key, value] = fieldMatch;
    current[key] = value.trim();
  }

  if (current) entries.push(normalizeDecisionEntry(current));
  return entries.filter((entry) => entry.decision && entry.made_at && entry.rationale);
}

function parseDecisionLogFile(filePath = DECISIONS_LOG_PATH) {
  if (!fs.existsSync(filePath)) return [];
  return parseDecisionLog(fs.readFileSync(filePath, 'utf8'));
}

function formatArray(values) {
  return `[${values.map((value) => `"${value}"`).join(', ')}]`;
}

function renderDecisionLog(entries) {
  const lines = [
    '# DECISIONS-LOG.md',
    '',
    '> Temporal decision ledger for durable architectural and workflow choices.',
    '> Add entries; do not overwrite history.',
    '',
  ];

  for (const entry of entries) {
    lines.push(`- decision: "${entry.decision}"`);
    lines.push(`  made_at: "${entry.made_at}"`);
    if (entry.version) {
      lines.push(`  version: "${entry.version}"`);
    }
    lines.push(`  phase: "${entry.phase || ''}"`);
    lines.push(`  made_by: "${entry.made_by || ''}"`);
    lines.push(`  context: "${entry.context || ''}"`);
    lines.push(`  rationale: "${entry.rationale}"`);
    lines.push(`  supersedes: ${formatArray(entry.supersedes || [])}`);
    lines.push(`  still_valid: ${entry.still_valid === false ? 'false' : 'true'}`);
    lines.push(`  invalidated_at: "${entry.invalidated_at || ''}"`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function parseStateDecisionTable(text) {
  const decisionSection = String(text || '').match(/## Decisions Log\n([\s\S]*?)(?=\n##|$)/);
  if (!decisionSection) return [];

  return decisionSection[1]
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Date'))
    .map((row) =>
      row
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((cols) => cols.length >= 4)
    .map((cols) => ({
      decision: cols[2],
      made_at: cols[0],
      version: cols[1] || '',
      phase: '',
      made_by: 'orbit',
      context: 'Migrated from STATE.md Decisions Log',
      rationale: cols[3],
      supersedes: [],
      still_valid: true,
      invalidated_at: '',
    }));
}

module.exports = {
  DECISIONS_LOG_PATH,
  parseDecisionLog,
  parseDecisionLogFile,
  parseStateDecisionTable,
  renderDecisionLog,
};
