#!/usr/bin/env node
/**
 * Orbit runtime status formatter.
 * Shared shape for classification banners, progress blocks, and next-step footers.
 */

'use strict';

function formatClassification({ domain, complexity, agent, mode, issue }) {
  const lines = [
    '━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  Domain:     ${domain}`,
    `  Complexity: ${complexity}`,
    `  Agent:      ${agent}`,
    `  Mode:       ${mode}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];
  if (issue) lines.splice(5, 0, `  Issue:      ${issue}`);
  return lines.join('\n');
}

function formatWaveStart({ wave, taskCount, agentLabel = 'engineer' }) {
  return [
    '━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  Wave:       ${wave}`,
    `  Agents:     ${taskCount}`,
    `  Agent:      ${agentLabel}`,
    '  Status:     in progress',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

function formatWaveComplete({ wave, completed, blocked = 0, next }) {
  const lines = [`━━━ Wave ${wave} Complete ━━━━━━━━━━━━━━━━━━━`, `  ✓ Completed: ${completed}`];
  if (blocked > 0) lines.push(`  ✗ Blocked:   ${blocked}`);
  if (next) lines.push(`  Next:       ${next}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function formatProgressStatus({ command, agent, wave, status, details }) {
  const lines = [
    '━━━ Current Execution ━━━━━━━━━━━━━━━━━━━',
    `  Command:  ${command}`,
    `  Agent:    ${agent}`,
    `  Wave:     ${wave}`,
    `  Status:   ${status}`,
  ];
  if (details) lines.push(`  Details:  ${details}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function formatWorkflowGate({ state, prGate, nextTransition, nextCommand, blockers = [] }) {
  const lines = [
    '━━━ Workflow Gate ━━━━━━━━━━━━━━━━━━━━━',
    `  State:    ${state}`,
    `  PR Gate:  ${prGate}`,
    `  Next:     ${nextTransition || 'complete'}`,
  ];
  if (nextCommand) lines.push(`  Command:  ${nextCommand}`);
  if (blockers.length) lines.push(`  Blocker:  ${blockers.join(' ')}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function formatOperationalRule(rule) {
  const guidance = rule.guidance || {};
  const lines = [
    '━━━ Operational Rule ━━━━━━━━━━━━━━━━━━',
    `  Rule:     ${rule.id}`,
    `  Tool:     ${scopeDisplay(rule.scope?.tool)}`,
    `  Scope:    ${scopeDisplay(rule.scope?.operation)}`,
  ];
  if (guidance.preferred_route) {
    lines.push(`  Route:    ${guidance.preferred_route}`);
  }
  if (guidance.why) {
    lines.push(`  Why:      ${guidance.why}`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

function scopeDisplay(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value || '-';
}

function formatNextCommand({ primary, why, alternatives = [] }) {
  const altLines = alternatives.map((alt) => `- ${alt}`);
  return [
    '---',
    '## Recommended Next Command',
    '',
    `**Primary**: ${primary}`,
    `**Why**: ${why}`,
    '',
    '**Alternatives**:',
    ...altLines,
  ].join('\n');
}

module.exports = {
  formatClassification,
  formatNextCommand,
  formatOperationalRule,
  formatProgressStatus,
  formatWorkflowGate,
  formatWaveComplete,
  formatWaveStart,
};
