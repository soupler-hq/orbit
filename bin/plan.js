#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');

function renderPlan(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:plan',
    domain: 'SYNTHESIS',
    complexity: 'PHASE',
    agent: 'architect + researcher',
    progressAgent: 'architect',
    defaultPrimary: '/orbit:quick #NNN',
    defaultWhy: 'Planning output should hand off into tracked implementation work.',
    details: 'phase planning',
  });
}

if (require.main === module) {
  process.stdout.write(renderPlan(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderPlan,
};
