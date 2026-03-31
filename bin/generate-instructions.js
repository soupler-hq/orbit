#!/usr/bin/env node
/**
 * Orbit Instruction Generator
 *
 * Two modes:
 *
 * 1. Runtime instruction file (default):
 *    Generates a runtime-specific instruction file from templates/orbit.base.md.
 *    Called by install.sh at install time — never ships pre-built runtime files.
 *
 *    Usage:
 *      node bin/generate-instructions.js --runtime <name> [--output <path>]
 *
 *    --runtime  Runtime name: claude | codex | antigravity (required)
 *    --output   Output file path. Defaults to the runtime's instruction_file name.
 *
 *    Placeholders replaced in template:
 *      {{RUNTIME_NAME}}     → runtime display name (e.g. "Claude")
 *      {{INSTRUCTION_FILE}} → runtime instruction filename (e.g. "CLAUDE.md")
 *
 *    Examples:
 *      node bin/generate-instructions.js --runtime claude --output CLAUDE.md
 *      node bin/generate-instructions.js --runtime codex  --output .codex/INSTRUCTIONS.md
 *
 * 2. Human-view files (--human-views):
 *    Generates INSTRUCTIONS.md, SKILLS.md, and WORKFLOWS.md from
 *    orbit.registry.json + their corresponding templates/*.tpl.md.
 *    Run this after any change to the registry or the .tpl.md templates.
 *    CI (orbit-sentinel.yml) checks these files for drift.
 *
 *    Usage:
 *      node bin/generate-instructions.js --human-views
 *
 *    Placeholders replaced in each template:
 *      {{GENERATED_ROUTING_RULES}}   → agent routing table (INSTRUCTIONS.md)
 *      {{GENERATED_SKILLS_LIST}}     → skill list (SKILLS.md)
 *      {{GENERATED_AGENT_SKILL_MAP}} → agent → skills map (SKILLS.md)
 *      {{GENERATED_WORKFLOWS_LIST}}  → workflow command list (WORKFLOWS.md)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let runtime = null;
let outputPath = null;
let humanViews = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--runtime') runtime = args[++i];
  if (args[i] === '--output') outputPath = args[++i];
  if (args[i] === '--human-views') humanViews = true;
}

if (!runtime && !humanViews) {
  console.error('Usage:');
  console.error('  node bin/generate-instructions.js --runtime <name> [--output <path>]');
  console.error('  node bin/generate-instructions.js --human-views');
  console.error('');
  console.error('Runtimes are defined in orbit.config.json → runtimes');
  process.exit(1);
}

// ── Paths ─────────────────────────────────────────────────────────────────────
// All paths are resolved relative to this script's directory so the generator
// works correctly regardless of cwd.

const frameworkRoot = path.join(__dirname, '..');
const configPath = path.join(frameworkRoot, 'orbit.config.json');
const registryPath = path.join(frameworkRoot, 'orbit.registry.json');
const templatePath = path.join(frameworkRoot, 'templates', 'orbit.base.md');

if (!fs.existsSync(configPath)) {
  console.error('❌ orbit.config.json not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ── Mode: --human-views ───────────────────────────────────────────────────────

if (humanViews) {
  if (!fs.existsSync(registryPath)) {
    console.error('❌ orbit.registry.json not found');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  // ── Build generated sections ──────────────────────────────────────────────

  // GENERATED_ROUTING_RULES: one bullet per agent with triggers
  const routingRules = registry.agents
    .filter((a) => a.triggers && a.triggers.length > 0)
    .map((a) => `- Use \`${a.name}\` for: ${a.triggers.join(', ')}.`)
    .join('\n');

  // GENERATED_SKILLS_LIST: one bullet per skill (file + purpose)
  const skillsList = registry.skills.map((s) => `- \`${s.file}\` — ${s.purpose}.`).join('\n');

  // GENERATED_AGENT_SKILL_MAP: one bullet per agent listing its skills
  const agentSkillMap = registry.agents
    .filter((a) => a.skills && a.skills.length > 0)
    .map((a) => `- \`${a.name}\` loads: ${a.skills.join(', ')}.`)
    .join('\n');

  // GENERATED_WORKFLOWS_LIST: one bullet per workflow
  const workflowsList = registry.workflows
    .map((w) => {
      const inputs = w.inputs && w.inputs.length ? ` — inputs: ${w.inputs.join(', ')}` : '';
      const outputs = w.outputs && w.outputs.length ? ` → outputs: ${w.outputs.join(', ')}` : '';
      const mode = w.mode ? ` [${w.mode}]` : '';
      return `- \`${w.command}\`${mode}${inputs}${outputs}`;
    })
    .join('\n');

  const substitutions = {
    '{{GENERATED_ROUTING_RULES}}': routingRules,
    '{{GENERATED_SKILLS_LIST}}': skillsList,
    '{{GENERATED_AGENT_SKILL_MAP}}': agentSkillMap,
    '{{GENERATED_WORKFLOWS_LIST}}': workflowsList,
  };

  // ── Render each template ──────────────────────────────────────────────────

  const views = [
    { template: 'INSTRUCTIONS.tpl.md', output: 'INSTRUCTIONS.md' },
    { template: 'SKILLS.tpl.md', output: 'SKILLS.md' },
    { template: 'WORKFLOWS.tpl.md', output: 'WORKFLOWS.md' },
  ];

  const banner =
    '<!-- This file is auto-generated by bin/generate-instructions.js --human-views\n' +
    '     Source: orbit.registry.json + templates/*.tpl.md\n' +
    '     DO NOT edit by hand — edit the template or the registry instead. -->\n\n';

  for (const view of views) {
    const tplPath = path.join(frameworkRoot, 'templates', view.template);
    if (!fs.existsSync(tplPath)) {
      console.error(`❌ Template not found: templates/${view.template}`);
      process.exit(1);
    }

    let content = fs.readFileSync(tplPath, 'utf8');

    for (const [placeholder, value] of Object.entries(substitutions)) {
      // Replace bare placeholder
      content = content.replace(placeholder, value);
    }

    const destPath = path.join(frameworkRoot, view.output);
    fs.writeFileSync(destPath, banner + content);
    console.log(`✅ Generated ${view.output} from templates/${view.template}`);
  }

  process.exit(0);
}

// ── Mode: --runtime ───────────────────────────────────────────────────────────

if (!fs.existsSync(templatePath)) {
  console.error('❌ templates/orbit.base.md not found');
  process.exit(1);
}

const runtimes = config.runtimes || {};

if (!runtimes[runtime]) {
  console.error(`❌ Unknown runtime: "${runtime}"`);
  console.error(`   Available: ${Object.keys(runtimes).join(', ')}`);
  process.exit(1);
}

const runtimeConfig = runtimes[runtime];
const implicitPromptRouting = runtimeConfig.capabilities?.implicit_prompt_routing === true;
const routingMechanism =
  runtimeConfig.capabilities?.routing_mechanism || 'its runtime instruction surface';
const implicitRoutingRule = implicitPromptRouting
  ? `This runtime supports Orbit workflow inference for plain prompts via ${routingMechanism}. If the user does not explicitly prefix a request with an Orbit command, infer the nearest workflow and continue through that boundary. Explicit \`/orbit:*\` commands still take precedence.`
  : `This runtime does not provide reliable plain-prompt interception. For tracked work, prefer explicit \`/orbit:*\` commands or the runtime's documented Orbit workflow equivalent. If a plain prompt arrives anyway, route conservatively and do not overstate native workflow interception.`;
const implicitRoutingBullet = implicitPromptRouting
  ? 'If the user gives a plain prompt instead of a slash command, infer the correct Orbit workflow and act through that workflow boundary.'
  : "If the user gives a plain prompt instead of a slash command, prefer the runtime's documented explicit Orbit command path because this runtime does not guarantee plain-prompt interception.";

const template = fs.readFileSync(templatePath, 'utf8');

const output = template
  .replace(/\{\{RUNTIME_NAME\}\}/g, runtimeConfig.name)
  .replace(/\{\{INSTRUCTION_FILE\}\}/g, runtimeConfig.instruction_file)
  .replace(/\{\{IMPLICIT_ROUTING_RULE\}\}/g, implicitRoutingRule)
  .replace(/\{\{IMPLICIT_ROUTING_BULLET\}\}/g, implicitRoutingBullet);

const dest = outputPath || runtimeConfig.instruction_file;
const destDir = path.dirname(path.resolve(dest));

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(dest, output);
console.log(`✅ Generated ${dest} for runtime: ${runtimeConfig.name}`);
