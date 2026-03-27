#!/usr/bin/env bash
# Orbit validation
# Ensures the repo contains the expected orchestration surface and that core config parses.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_files=(
  "AGENTS.md"
  "CLAUDE.md"
  "README.md"
  "INSTRUCTIONS.md"
  "SKILLS.md"
  "WORKFLOWS.md"
  "orbit.registry.json"
  "orbit.config.schema.json"
  "docs/runtime-adapters.md"
  "docs/evals.md"
  "docs/eval-dataset.md"
  "commands/commands.md"
  "commands/orbit/eval.md"
  "hooks/HOOKS.md"
  "install.sh"
  "package.json"
  "orbit.config.json"
  "state/STATE.template.md"
  "bin/install.js"
  "bin/eval.sh"
)

required_dirs=(
  "agents"
  "skills"
  "commands"
  "hooks/scripts"
  "docs"
  "examples"
  "forge"
  "state"
  "bin"
)

missing=()

for item in "${required_files[@]}"; do
  if [[ ! -f "$ROOT_DIR/$item" ]]; then
    missing+=("$item")
  fi
done

for item in "${required_dirs[@]}"; do
  if [[ ! -d "$ROOT_DIR/$item" ]]; then
    missing+=("$item/")
  fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  printf 'Missing required framework files:\n' >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const configPath = path.join(root, 'orbit.config.json');
const registryPath = path.join(root, 'orbit.registry.json');
const schemaPath = path.join(root, 'orbit.config.schema.json');
const packagePath = path.join(root, 'package.json');
const runtimeAdaptersPath = path.join(root, 'docs', 'runtime-adapters.md');
const evalsPath = path.join(root, 'docs', 'evals.md');
const evalDatasetPath = path.join(root, 'docs', 'eval-dataset.md');
const evalCommandPath = path.join(root, 'commands', 'orbit', 'eval.md');

JSON.parse(fs.readFileSync(configPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const runtimeAdapters = fs.readFileSync(runtimeAdaptersPath, 'utf8');
const evals = fs.readFileSync(evalsPath, 'utf8');
const evalDataset = fs.readFileSync(evalDatasetPath, 'utf8');

if (!pkg.scripts || pkg.scripts.validate !== 'bash bin/validate.sh') {
  throw new Error('package.json must define scripts.validate as "bash bin/validate.sh"');
}

if (!pkg.scripts || pkg.scripts.eval !== 'bash bin/eval.sh') {
  throw new Error('package.json must define scripts.eval as "bash bin/eval.sh"');
}

if (!Array.isArray(registry.runtimes) || registry.runtimes.length < 3) {
  throw new Error('registry must define native and compatible runtimes');
}

for (const name of ['claude', 'codex', 'antigravity']) {
  if (!registry.runtimes.some(runtime => runtime && runtime.name === name)) {
    throw new Error(`registry missing runtime entry: ${name}`);
  }
}

if (!runtimeAdapters.includes('Support level: `native`') || !runtimeAdapters.includes('Support level: `compatible`')) {
  throw new Error('runtime adapters doc must describe native and compatible support levels');
}

if (!evals.includes('Routing Accuracy') || !evals.includes('Workflow Compliance') || !evals.includes('Portability')) {
  throw new Error('evals doc must cover routing, workflow compliance, and portability');
}

if (!evalDataset.includes('Sample Eval Dataset') || !evalDataset.includes('Expected Agent') || !evalDataset.includes('Expected Workflow')) {
  throw new Error('eval dataset must define expected agent and workflow columns');
}

if (!fs.existsSync(evalCommandPath)) {
  throw new Error('missing /orbit:eval command wrapper');
}

for (const agent of registry.agents || []) {
  if (!fs.existsSync(path.join(root, agent.file))) {
    throw new Error(`Missing agent file referenced in registry: ${agent.file}`);
  }
}

for (const skill of registry.skills || []) {
  if (!fs.existsSync(path.join(root, skill.file))) {
    throw new Error(`Missing skill file referenced in registry: ${skill.file}`);
  }
}

for (const workflow of registry.workflows || []) {
  if (typeof workflow.command !== 'string' || !workflow.command.startsWith('/orbit:')) {
    throw new Error(`Invalid workflow command in registry: ${workflow.name || 'unknown'}`);
  }
}
NODE

printf 'Orbit validation passed.\n'
