#!/usr/bin/env node
'use strict';

const { buildRuntimeCommandOutput, parseArgs } = require('./runtime-command');

function renderVerify(args = {}) {
  return buildRuntimeCommandOutput(args, {
    command: '/orbit:verify',
    domain: 'QUALITY',
    complexity: 'PHASE',
    agent: 'reviewer + engineer',
    progressAgent: 'reviewer',
    defaultPrimary: '/orbit:ship',
    defaultWhy: 'Verification should lead into ship only after evidence is green.',
    details: 'verification phase',
  });
}

if (require.main === module) {
  process.stdout.write(renderVerify(parseArgs(process.argv.slice(2))) + '\n');
}

module.exports = {
  renderVerify,
};
