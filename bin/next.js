#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildEvidence } = require('./progress');
const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');
const { evaluateWorkflowState } = require('./workflow-state');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STATE_PATH = path.join(ROOT, '.orbit', 'state', 'STATE.md');

function sanitizeTitleForCommand(title) {
  return String(title || '')
    .replace(/^[\s-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSectionLabel(label) {
  return String(label || '')
    .replace(/\s+\((?:CURRENT|COMPLETE|PAUSED.*?)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStateBacklog(text) {
  const lines = String(text || '').split(/\r?\n/);
  const result = {
    activeMilestone: null,
    activePhase: null,
    currentBranch: null,
    activePr: null,
    currentSection: null,
    openIssues: [],
  };

  for (const line of lines) {
    let match = line.match(/^\s*-\s+\*\*Active Milestone\*\*:\s*(.+)$/);
    if (match) {
      result.activeMilestone = match[1].trim();
      continue;
    }

    match = line.match(/^\s*-\s+\*\*Active Phase\*\*:\s*(.+)$/);
    if (match) {
      result.activePhase = match[1].trim();
      continue;
    }

    match = line.match(/^\s*-\s+\*\*Current Branch\*\*:\s*`?([^`]+?)`?\s*$/);
    if (match) {
      result.currentBranch = match[1].trim();
      continue;
    }

    match = line.match(/^\s*-\s+\*\*Active PR\*\*:\s*(.+)$/);
    if (match) {
      result.activePr = match[1].trim();
      continue;
    }

    match = line.match(/^####\s+(.+?)(?:\s+\(CURRENT\))?\s*$/);
    if (match) {
      const rawSection = match[1].trim();
      const normalizedSection = normalizeSectionLabel(rawSection);
      const normalizedActivePhase = normalizeSectionLabel(result.activePhase);
      result.currentSection =
        line.includes('(CURRENT)') ||
        (normalizedActivePhase && normalizedSection === normalizedActivePhase)
          ? rawSection
          : null;
      continue;
    }

    if (!result.currentSection) continue;

    match = line.match(/^- \[ \] (#\d+)\s+[—-]\s+(.+)$/);
    if (match) {
      result.openIssues.push({
        issue: match[1].trim(),
        title: match[2].trim(),
        section: result.currentSection,
      });
    }
  }

  return result;
}

function readStateSummary(statePath = DEFAULT_STATE_PATH) {
  if (!fs.existsSync(statePath)) return null;
  return parseStateBacklog(fs.readFileSync(statePath, 'utf8'));
}

function resolveNextAction(args = {}, deps = {}) {
  const evidence = buildEvidence(args, deps.runtimeDeps);
  const workflow = evaluateWorkflowState(evidence);
  const branch = evidence.branch || '';
  const isTrackedBranch =
    workflow.evidence.issue && branch && !['develop', 'main', 'master', 'HEAD'].includes(branch);

  if (isTrackedBranch) {
    return {
      workflow,
      primary: workflow.nextCommand || '/orbit:resume',
      why:
        workflow.blockers[0] ||
        `Orbit resolved the next step from active branch ${branch} and tracked issue state.`,
      details: evidence.branch || 'tracked branch',
    };
  }

  const stateSummary = readStateSummary(args.stateFile || args['state-file'] || DEFAULT_STATE_PATH);
  if (!stateSummary) {
    return {
      workflow: {
        state: 'untracked',
        prGate: 'blocked',
        nextTransition: 'issue_ready',
        nextCommand: '/orbit:new-project',
        blockers: ['No STATE.md or tracked branch context found; initialize project state first.'],
      },
      primary: '/orbit:new-project',
      why: 'No STATE.md or active tracked work was found, so project initialization is the next step.',
      details: 'no project state detected',
    };
  }

  const nextIssue = stateSummary.openIssues[0] || null;
  if (nextIssue) {
    const title = sanitizeTitleForCommand(nextIssue.title);
    return {
      issue: nextIssue.issue,
      workflow: {
        state: 'issue_ready',
        prGate: 'blocked',
        nextTransition: 'branch_ready',
        nextCommand: `/orbit:quick ${nextIssue.issue} ${title}`,
        blockers: [
          `The active phase ${nextIssue.section} still has open tracked work; start the next unblocked issue.`,
        ],
      },
      primary: `/orbit:quick ${nextIssue.issue} ${title}`,
      why: `The active phase ${nextIssue.section} still has open tracked work, and ${nextIssue.issue} is the next visible issue in STATE.md.`,
      details: `${nextIssue.section} backlog`,
    };
  }

  return {
    issue: null,
    workflow: {
      state: 'planning_required',
      prGate: 'blocked',
      nextTransition: 'planned',
      nextCommand: '/orbit:plan',
      blockers: [
        `No open issues remain in ${stateSummary.activePhase || 'the active phase'}; plan the next milestone slice.`,
      ],
    },
    primary: '/orbit:plan',
    why: `No open tracked issues remain in ${stateSummary.activePhase || 'the active phase'}, so planning the next milestone slice is the safest next step.`,
    details: stateSummary.activeMilestone || stateSummary.activePhase || 'state-led planning',
  };
}

function renderNext(args = {}, deps = {}) {
  const resolution = resolveNextAction(args, deps);
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:next',
    domain: 'OPERATIONS',
    complexity: 'TASK',
    agent: 'strategist',
    progressAgent: 'strategist',
    defaultPrimary: resolution.primary,
    defaultWhy: resolution.why,
    details: resolution.details,
    classificationIssue: resolution.issue || args.issue || null,
    workflowOverride: resolution.workflow,
  });
}

if (require.main === module) {
  process.stdout.write(renderNext(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  parseStateBacklog,
  readStateSummary,
  resolveNextAction,
  renderNext,
};
