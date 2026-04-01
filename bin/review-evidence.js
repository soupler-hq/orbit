#!/usr/bin/env node
'use strict';

const ALLOWED_SHIP_DECISIONS = ['APPROVED', 'APPROVED WITH CONDITIONS', 'BLOCKED'];
const SHIP_DECISION_STATUS = {
  APPROVED: 'approved',
  'APPROVED WITH CONDITIONS': 'conditional',
  BLOCKED: 'blocked',
};

function extractSection(body, heading) {
  const lines = String(body || '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return '';

  const sectionLines = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) break;
    sectionLines.push(line);
  }

  return sectionLines.join('\n').trim();
}

function extractLabeledValue(body, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\*\\*${escapedLabel}\\*\\*:\\s*(.+)$`, 'im');
  const match = String(body || '').match(pattern);
  return match ? match[1].trim() : '';
}

function normalizeValue(value) {
  let result = String(value || '');
  let previous;

  do {
    previous = result;
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  } while (result !== previous);

  return result.replace(/`/g, '').trim();
}

function extractFindingsBlock(body) {
  const match = String(body || '').match(/\*\*Findings addressed\*\*[\s\S]*?```([\s\S]*?)```/im);
  return match ? match[1].trim() : '';
}

function extractTestCommands(body) {
  const section = extractSection(body, '## Test plan');
  if (!section) return [];
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- `') && line.endsWith('`'))
    .map((line) => line.replace(/^- `|`$/g, '').trim())
    .filter(Boolean);
}

function parseReviewEvidence(body) {
  return {
    reviewCommand: normalizeValue(extractLabeledValue(body, 'Command run')),
    agents: normalizeValue(extractLabeledValue(body, 'Agent(s) dispatched')),
    shipDecision: normalizeValue(extractLabeledValue(body, 'Ship decision')).toUpperCase(),
    findings: normalizeValue(extractFindingsBlock(body)),
    testCommands: extractTestCommands(body),
  };
}

function validateReviewEvidence(body) {
  const errors = [];
  const evidence = parseReviewEvidence(body);

  if (!evidence.reviewCommand || evidence.reviewCommand.includes('e.g.')) {
    errors.push(
      'PR body is missing executed review evidence: `Command run` must record the Orbit review command used.'
    );
  }

  if (!evidence.agents || evidence.agents.includes('e.g.')) {
    errors.push(
      'PR body is missing review evidence: `Agent(s) dispatched` must name the review agent(s) used.'
    );
  }

  if (!ALLOWED_SHIP_DECISIONS.includes(evidence.shipDecision)) {
    errors.push(
      `PR body is missing review evidence: \`Ship decision\` must be one of ${ALLOWED_SHIP_DECISIONS.join(', ')}.`
    );
  }

  if (!evidence.findings || evidence.findings === '(findings here)') {
    errors.push(
      'PR body is missing review evidence: `Findings addressed` must record findings handled or `none`.'
    );
  }

  return errors;
}

function validateTestEvidence(body) {
  const commands = extractTestCommands(body);
  if (!commands.length || commands.some((command) => command.includes('<!-- command -->'))) {
    return [
      'PR body is missing test evidence: `## Test plan` must list the verification commands that were actually run.',
    ];
  }
  return [];
}

function inferEvidenceStatus(body) {
  const reviewEvidence = parseReviewEvidence(body);
  return {
    reviewEvidenceStatus: validateReviewEvidence(body).length === 0 ? 'present' : 'missing',
    testEvidenceStatus: validateTestEvidence(body).length === 0 ? 'present' : 'missing',
    shipDecisionStatus: SHIP_DECISION_STATUS[reviewEvidence.shipDecision] || 'unknown',
  };
}

module.exports = {
  ALLOWED_SHIP_DECISIONS,
  extractSection,
  extractTestCommands,
  inferEvidenceStatus,
  parseReviewEvidence,
  SHIP_DECISION_STATUS,
  validateReviewEvidence,
  validateTestEvidence,
};
