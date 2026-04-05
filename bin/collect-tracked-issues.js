#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function readJsonLines(filePath) {
  const text = fs.readFileSync(path.resolve(filePath), 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const records = args.input ? readJsonLines(args.input) : [];
  process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  readJsonLines,
};
