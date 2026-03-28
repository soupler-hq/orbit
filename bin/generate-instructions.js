#!/usr/bin/env node
/**
 * Orbit Instruction Generator
 *
 * Generates a runtime-specific instruction file from templates/orbit.base.md.
 * Called by install.sh at install time — never ships pre-built runtime files.
 *
 * Usage:
 *   node bin/generate-instructions.js --runtime <name> [--output <path>]
 *
 * --runtime  Runtime name: claude | codex | antigravity (required)
 * --output   Output file path. Defaults to the runtime's instruction_file name.
 *
 * Runtimes are configured in orbit.config.json → runtimes.
 *
 * Placeholders replaced in template:
 *   {{RUNTIME_NAME}}     → runtime display name (e.g. "Claude")
 *   {{INSTRUCTION_FILE}} → runtime instruction filename (e.g. "CLAUDE.md")
 *
 * Examples:
 *   node bin/generate-instructions.js --runtime claude --output CLAUDE.md
 *   node bin/generate-instructions.js --runtime codex  --output .codex/INSTRUCTIONS.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let runtime = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--runtime') runtime = args[++i];
  if (args[i] === '--output') outputPath = args[++i];
}

if (!runtime) {
  console.error('Usage: node bin/generate-instructions.js --runtime <name> [--output <path>]');
  console.error('Available runtimes are defined in orbit.config.json → runtimes');
  process.exit(1);
}

// ── Load config ───────────────────────────────────────────────────────────────
// Framework files (config, template) are resolved relative to this script's
// directory so the generator works correctly regardless of cwd — whether
// invoked from install.sh (cwd = project dir) or via `npm run generate`
// (cwd = framework dir).

const frameworkRoot = path.join(__dirname, '..');
const configPath = path.join(frameworkRoot, 'orbit.config.json');
const templatePath = path.join(frameworkRoot, 'templates', 'orbit.base.md');

if (!fs.existsSync(configPath)) {
  console.error('❌ orbit.config.json not found');
  process.exit(1);
}

if (!fs.existsSync(templatePath)) {
  console.error('❌ templates/orbit.base.md not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const runtimes = config.runtimes || {};

if (!runtimes[runtime]) {
  console.error(`❌ Unknown runtime: "${runtime}"`);
  console.error(`   Available: ${Object.keys(runtimes).join(', ')}`);
  process.exit(1);
}

const runtimeConfig = runtimes[runtime];

// ── Generate ──────────────────────────────────────────────────────────────────

const template = fs.readFileSync(templatePath, 'utf8');

const output = template
  .replace(/\{\{RUNTIME_NAME\}\}/g, runtimeConfig.name)
  .replace(/\{\{INSTRUCTION_FILE\}\}/g, runtimeConfig.instruction_file);

const dest = outputPath || runtimeConfig.instruction_file;
const destDir = path.dirname(path.resolve(dest));

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(dest, output);
console.log(`✅ Generated ${dest} for runtime: ${runtimeConfig.name}`);
