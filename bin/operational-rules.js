#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OPERATIONAL_RULES_PATH = path.join(ROOT, '.orbit', 'state', 'OPERATIONAL-RULES.json');

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

function loadOperationalRules(filePath = OPERATIONAL_RULES_PATH) {
  if (!fs.existsSync(filePath)) {
    return { version: 1, rules: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    version: parsed.version || 1,
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
  };
}

function scopeValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function matchesScopeValue(ruleValue, actualValue) {
  const allowed = scopeValues(ruleValue);
  if (allowed.length === 0) return true;
  return Boolean(actualValue) && allowed.includes(actualValue);
}

function ruleSpecificity(rule) {
  const scope = rule.scope || {};
  return ['environment', 'tool', 'operation', 'route', 'runtime_command'].filter(
    (key) => scopeValues(scope[key]).length > 0
  ).length;
}

function findOperationalRule(rulesConfig, context) {
  const rules = Array.isArray(rulesConfig?.rules) ? rulesConfig.rules : [];
  return rules
    .filter((rule) => (rule.status || 'active') === 'active')
    .filter((rule) => {
      const scope = rule.scope || {};
      return (
        matchesScopeValue(scope.environment, context.environment) &&
        matchesScopeValue(scope.tool, context.tool) &&
        matchesScopeValue(scope.operation, context.operation) &&
        matchesScopeValue(scope.route, context.route) &&
        matchesScopeValue(scope.runtime_command, context.runtimeCommand)
      );
    })
    .sort((left, right) => ruleSpecificity(right) - ruleSpecificity(left))[0];
}

function formatRule(rule) {
  if (!rule) return '';
  const guidance = rule.guidance || {};
  const lines = [
    `Rule: ${rule.id}`,
    `Summary: ${rule.summary || '(none)'}`,
    `Preferred route: ${guidance.preferred_route || '(none)'}`,
  ];
  if (guidance.why) lines.push(`Why: ${guidance.why}`);
  if (guidance.fallback) lines.push(`Fallback: ${guidance.fallback}`);
  if (guidance.source_issue) lines.push(`Source: ${guidance.source_issue}`);
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rulesConfig = loadOperationalRules(args.file);
  const rule = findOperationalRule(rulesConfig, {
    environment: args.environment || '',
    tool: args.tool || '',
    operation: args.operation || '',
    route: args.route || '',
    runtimeCommand: args['runtime-command'] || '',
  });

  if (!rule) {
    process.stdout.write('No matching operational rule.\n');
    process.exit(0);
  }

  process.stdout.write(formatRule(rule) + '\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  OPERATIONAL_RULES_PATH,
  findOperationalRule,
  formatRule,
  loadOperationalRules,
  parseArgs,
};
