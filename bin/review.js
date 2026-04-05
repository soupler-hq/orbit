#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');

function renderReview(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:review',
    domain: 'REVIEW',
    complexity: 'TASK',
    agent: 'reviewer',
    progressAgent: 'reviewer',
    defaultPrimary: '/orbit:ship',
    defaultWhy: 'Review should resolve into either blocked findings or ship readiness.',
    details: 'branch review',
  });
}

if (require.main === module) {
  process.stdout.write(renderReview(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderReview,
};
