#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'orbit.config.json'), 'utf8'));

const STATIC_HOOK_SUPPORT = {
  codex: {
    pre_tool_use: false,
    post_tool_use: false,
    pre_compact: false,
    stop: false,
  },
  antigravity: {
    pre_tool_use: false,
    post_tool_use: false,
    pre_compact: false,
    stop: false,
  },
};

const POLICY_FILES = {
  claude: null,
  codex: 'policy.md',
  antigravity: null,
};

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

function buildRuntimeAdapterContract(runtime) {
  const runtimeConfig = CONFIG.runtimes?.[runtime];
  if (!runtimeConfig) {
    throw new Error(`Unknown runtime: ${runtime}`);
  }

  const implicitPromptRouting = runtimeConfig.capabilities?.implicit_prompt_routing === true;
  const policyFile = POLICY_FILES[runtime] || null;
  const instructionFile = runtimeConfig.instruction_file;
  const operatorSurfaces = [instructionFile];
  if (policyFile) operatorSurfaces.push(policyFile);

  const hookSupport =
    runtime === 'claude'
      ? {
          pre_tool_use: CONFIG.hooks?.pre_tool_use === true,
          post_tool_use: CONFIG.hooks?.post_tool_use === true,
          pre_compact: CONFIG.hooks?.pre_compact === true,
          stop: CONFIG.hooks?.stop === true,
        }
      : STATIC_HOOK_SUPPORT[runtime] || STATIC_HOOK_SUPPORT.codex;

  return {
    runtime,
    name: runtimeConfig.name,
    instruction_file: instructionFile,
    install_path: runtimeConfig.install_path,
    capabilities: {
      implicit_prompt_routing: implicitPromptRouting,
      routing_mechanism: runtimeConfig.capabilities?.routing_mechanism || 'unknown',
      explicit_command_preferred: !implicitPromptRouting,
    },
    operator_surfaces: operatorSurfaces,
    required_files: operatorSurfaces,
    policy_file: policyFile,
    hook_support: hookSupport,
  };
}

function writeRuntimeAdapterContract(outputPath, runtime) {
  const contract = buildRuntimeAdapterContract(runtime);
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(`${resolved}`, `${JSON.stringify(contract, null, 2)}\n`);
  return contract;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.runtime || !args.output) {
    console.error('Usage: node bin/runtime-adapter.js --runtime <name> --output <path>');
    process.exit(1);
  }
  const contract = writeRuntimeAdapterContract(args.output, args.runtime);
  console.log(`✅ Wrote ${args.output} for runtime: ${contract.name}`);
}

module.exports = {
  buildRuntimeAdapterContract,
  writeRuntimeAdapterContract,
};
