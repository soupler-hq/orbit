#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STATE_FILE = path.join(ROOT, '.orbit', 'state', 'STATE.md');
const SECTION_HEADING = '## Clarification Requests';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function ensureClarificationSection(text) {
  const content = String(text || '').trimEnd();
  if (content.includes(SECTION_HEADING)) {
    return content + '\n';
  }

  const section = [
    '',
    SECTION_HEADING,
    '```text',
    '[OPEN] id: clarify-001 | requested_by: engineer | issue: #000 | command: /orbit:quick | question: {the specific question} | reason: {why execution must pause} | requested_at: 2026-04-01T00:00:00Z',
    '[RESOLVED] id: clarify-001 | resolution: {answer} | resolved_by: operator | resolved_at: 2026-04-01T00:05:00Z',
    '```',
  ].join('\n');

  return `${content}${section}\n`;
}

function extractClarificationSection(text) {
  const match = String(text || '').match(
    /(?:^|\n)## Clarification Requests[ \t]*\n([\s\S]*?)(?=\n## |\s*$)/i
  );
  return match ? match[1].trim() : '';
}

function parseFields(segment) {
  const result = {};
  for (const piece of String(segment || '').split('|')) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim().toLowerCase().replace(/\s+/g, '_');
    const value = trimmed.slice(separator + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function isPlaceholderRequest(fields) {
  const values = Object.values(fields).join(' ').toLowerCase();
  return (
    values.includes('{the specific question}') ||
    values.includes('{why execution must pause}') ||
    values.includes('{answer}')
  );
}

function parseClarificationRequests(text) {
  const section = extractClarificationSection(text);
  if (!section) return [];
  const lines = section.split(/\r?\n/);
  const entries = [];
  let inFence = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!trimmed.startsWith('[OPEN]') && !trimmed.startsWith('[RESOLVED]')) continue;

    const status = trimmed.startsWith('[RESOLVED]') ? 'resolved' : 'open';
    const fields = parseFields(trimmed.replace(/^\[(OPEN|RESOLVED)\]\s*/i, ''));
    const entry = {
      status,
      id: fields.id || '',
      requestedBy: fields.requested_by || '',
      issue: fields.issue || '',
      command: fields.command || '',
      question: fields.question || '',
      reason: fields.reason || '',
      requestedAt: fields.requested_at || '',
      resolution: fields.resolution || '',
      resolvedBy: fields.resolved_by || '',
      resolvedAt: fields.resolved_at || '',
    };
    if (entry.id && !isPlaceholderRequest(entry)) {
      entries.push(entry);
    }
  }

  return entries;
}

function loadClarificationRequests(stateFile = DEFAULT_STATE_FILE) {
  if (!fs.existsSync(stateFile)) return [];
  return parseClarificationRequests(fs.readFileSync(stateFile, 'utf8'));
}

function pendingClarificationRequests(stateFile = DEFAULT_STATE_FILE) {
  return loadClarificationRequests(stateFile).filter((entry) => entry.status === 'open');
}

function buildClarificationLine(fields, status = 'OPEN') {
  const ordered = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    ordered.push(`${key}: ${value}`);
  }
  return `[${status}] ${ordered.join(' | ')}`.trim();
}

function nextClarificationId(existing) {
  const maxId = existing.reduce((max, entry) => {
    const match = entry.id.match(/clarify-(\d+)/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `clarify-${String(maxId + 1).padStart(3, '0')}`;
}

function appendClarificationRequest(stateFile, fields) {
  const existingText = fs.existsSync(stateFile)
    ? fs.readFileSync(stateFile, 'utf8')
    : '# Orbit State\n';
  const seeded = ensureClarificationSection(existingText);
  const nextId = fields.id || nextClarificationId(parseClarificationRequests(seeded));
  const requestedAt = fields.requested_at || new Date().toISOString();
  const line = buildClarificationLine(
    {
      id: nextId,
      requested_by: fields.requested_by,
      issue: fields.issue,
      command: fields.command,
      question: fields.question,
      reason: fields.reason,
      requested_at: requestedAt,
    },
    'OPEN'
  );
  const updated = seeded.replace(SECTION_HEADING, `${SECTION_HEADING}\n${line}`);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, updated);
  return nextId;
}

function resolveClarificationRequest(stateFile, id, resolution, resolvedBy = 'operator') {
  const text = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : '';
  const lines = text.split(/\r?\n/);
  const resolvedAt = new Date().toISOString();
  let replaced = false;
  let inFence = false;
  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    if (!line.startsWith('[OPEN]')) return line;
    if (!line.includes(`id: ${id}`)) return line;
    replaced = true;
    const fields = parseFields(line.replace(/^\[OPEN\]\s*/i, ''));
    return buildClarificationLine(
      {
        id: fields.id || id,
        resolution,
        resolved_by: resolvedBy,
        resolved_at: resolvedAt,
      },
      'RESOLVED'
    );
  });

  if (!replaced) {
    throw new Error(`clarification request not found: ${id}`);
  }

  fs.writeFileSync(stateFile, updated.join('\n'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stateFile = args['state-file'] || DEFAULT_STATE_FILE;

  if (args.emit) {
    const id = appendClarificationRequest(stateFile, {
      id: args.id,
      requested_by: args['requested-by'] || 'engineer',
      issue: args.issue || '',
      command: args.command || '',
      question: args.question || '',
      reason: args.reason || '',
      requested_at: args['requested-at'] || '',
    });
    process.stdout.write(`${id}\n`);
    return;
  }

  if (args.resolve) {
    if (!args.answer) {
      throw new Error('--answer is required with --resolve');
    }
    resolveClarificationRequest(
      stateFile,
      args.resolve,
      args.answer,
      args['resolved-by'] || 'operator'
    );
    process.stdout.write(`${args.resolve}\n`);
    return;
  }

  const pending = pendingClarificationRequests(stateFile);
  if (args['pending-count']) {
    process.stdout.write(`${pending.length}\n`);
    return;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ pending }, null, 2) + '\n');
    return;
  }

  process.stdout.write(`${pending.length}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_STATE_FILE,
  SECTION_HEADING,
  appendClarificationRequest,
  ensureClarificationSection,
  extractClarificationSection,
  loadClarificationRequests,
  parseClarificationRequests,
  pendingClarificationRequests,
  resolveClarificationRequest,
};
