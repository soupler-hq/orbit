#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');

function renderNext(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:next',
    domain: 'OPERATIONS',
    complexity: 'TASK',
    agent: 'strategist',
    progressAgent: 'strategist',
    defaultPrimary: '/orbit:resume',
    defaultWhy: 'Orbit auto-detected the nearest next workflow from current branch and PR state.',
    details: 'auto-detected next step',
  });
}

if (require.main === module) {
  process.stdout.write(renderNext(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderNext,
};
