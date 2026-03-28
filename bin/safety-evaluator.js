#!/usr/bin/env node

/**
 * Orbit Safety Evaluator v1.0
 * Context-aware security hook for proposed commands.
 */

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const PROPOSED_COMMAND = ARGS[0];
const _AGENT_CONTEXT = ARGS[1] || process.cwd();

if (!PROPOSED_COMMAND) {
  console.error('Usage: safety-evaluator <command> [context_path]');
  process.exit(1);
}

// 1. Load Registry and State
const projectRoot = findProjectRoot(process.cwd());
const _registry = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'orbit.registry.json'), 'utf8')
);

// 2. Intelligent Heuristics (Bridging to LLM)
// In a full implementation, this sends the command + context to a model.
// Here we implement the "Governor" logic.

function findProjectRoot(start) {
  let curr = start;
  while (curr !== path.parse(curr).root) {
    if (fs.existsSync(path.join(curr, 'orbit.registry.json'))) return curr;
    curr = path.dirname(curr);
  }
  return start;
}

function evaluateRisk(command) {
  // Common bypass patterns that static grep might miss
  const bypassPatterns = [
    /\$\(.*\)/, // command substitution
    /`.*`/, // backticks
    /base64 --decode/, // obfuscation
    /curl.*\|.*sh/, // pipe to shell
    />.*\/etc\//, // overwriting system files
    /chmod \+x/, // making files executable
    /sh -c/, // nested shells
  ];

  for (const pattern of bypassPatterns) {
    if (pattern.test(command)) {
      return { score: 9, rationale: `Dangerous shell pattern detected: ${pattern}` };
    }
  }

  // Check for prompt injection or system override attempts
  const injectionPatterns = [
    /ignore.*previous.*instructions/i,
    /disregard.*your.*instructions/i,
    /system.*prompt/i,
  ];
  if (injectionPatterns.some((p) => p.test(command))) {
    return {
      score: 9,
      rationale: 'Prompt injection or system-instruction override attempt detected.',
    };
  }

  // Check for sensitive file access
  const sensitivePaths = [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/sudoers',
    '.ssh/',
    '.bash_history',
    '.aws/',
  ];
  if (sensitivePaths.some((p) => command.includes(p))) {
    return { score: 8, rationale: 'Access to sensitive system or credential file detected.' };
  }

  // Check for destructive commands in chained strings
  const destructive = ['rm', 'mkfs', 'dd', 'format', 'shutdown', 'reboot', 'init'];
  const components = command.split(/;|&&|\|\||\|/);

  for (const comp of components) {
    const baseCmd = comp.trim().split(/\s+/)[0].toLowerCase();
    const isDestructive = destructive.some((d) => baseCmd === d || baseCmd.startsWith(d + '.'));
    if (isDestructive) {
      return { score: 8, rationale: `Destructive command detected in chain: ${baseCmd}` };
    }
  }

  return { score: 0, rationale: 'Command appears benign.' };
}

// Main Execution
const evaluation = evaluateRisk(PROPOSED_COMMAND);

if (evaluation.score >= 7) {
  console.error(`\n❌ SECURITY BLOCK [Risk Score: ${evaluation.score}]`);
  console.error(`Rationale: ${evaluation.rationale}`);
  console.error(`Command: ${PROPOSED_COMMAND}\n`);
  process.exit(evaluation.score);
} else {
  console.log(`✅ [Safety Evaluator] Command allowed (Score: ${evaluation.score})`);
  process.exit(0);
}
