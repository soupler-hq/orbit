#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');

function renderQuick(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:quick',
    domain: 'ENGINEERING',
    complexity: 'TASK',
    agent: 'engineer',
    progressAgent: 'engineer',
    defaultPrimary: '/orbit:review',
    defaultWhy: 'Tracked implementation work should flow to review once the branch is ready.',
    details: 'tracked implementation',
    enforceIssueBoundary: true,
  });
}

if (require.main === module) {
  process.stdout.write(renderQuick(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderQuick,
};
