---
id: runtime-adapters-v1
doc_type: reference
status: Final
version: v1
last_updated: 2026-04-01
---

# Runtime Adapters

> How non-native agent runtimes can use Orbit without changing the core control plane

## Purpose

Orbit is designed as a repo-native control plane. The core behavior lives in markdown instructions, reusable skills, workflows, hooks, and a machine-readable registry. A runtime adapter is the thin layer that maps a specific agent engine to that control plane.

## Instruction Generation

Orbit ships a single source of truth — `templates/orbit.base.md` — and generates the runtime-specific instruction file at install time. There are no pre-built per-runtime files in the package.

```
templates/orbit.base.md          ← single source of truth (runtime-agnostic)
        ↓ bin/generate-instructions.js --runtime <name>
CLAUDE.md / INSTRUCTIONS.md / …  ← generated at install time for the target runtime
```

Runtimes are configured in `orbit.config.json` → `runtimes`. Adding a new runtime requires only a JSON config entry — no new markdown files.

To regenerate the framework's own `CLAUDE.md` after editing the template:
```bash
npm run generate
```

## Support Levels

- `native` — the runtime automatically understands the framework entrypoints and lifecycle
- `stable` — the runtime has a full install pathway; `install.sh --tool <name>` works end-to-end
- `experimental` — partial support; documented constraints; no production guarantee
- `planned` — on the roadmap; not yet implemented

---

## Claude

Support level: `native`

- Reads `CLAUDE.md` directly as the session orchestrator
- Works with `/orbit:` slash commands natively
- Supports plain-prompt Orbit workflow routing through the native instruction surface
- Lifecycle hooks (`PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`) run via `settings.json`
- Best fit for the current control-plane layout

**Install:** `bash install.sh --tool claude`

---

## Codex

Support level: `stable`

Codex does not read `CLAUDE.md`. Instead, Orbit maps the control plane to Codex's operator surface:

| Orbit concept | Claude mapping | Codex mapping |
| :--- | :--- | :--- |
| Session orchestrator | `CLAUDE.md` | `INSTRUCTIONS.md` + `policy.md` |
| Agent registry | `orbit.registry.json` | `orbit.registry.json` (same) |
| Workflow definitions | `WORKFLOWS.md` | `WORKFLOWS.md` (same) |
| Slash commands | `/orbit:` via `commands/` | Follow matching `WORKFLOWS.md` section |
| Plain prompt routing | Native via `CLAUDE.md` | Supported via generated `INSTRUCTIONS.md` + `policy.md` |
| Lifecycle hooks | `settings.json` hooks | Not mapped (Codex has no hook API) |
| State persistence | `.orbit/state/STATE.md` | `.codex/state/STATE.md` |

**Install:** `bash install.sh --tool codex`

This installs to `.codex/` (local) or `~/.codex/` (global) with:
- `INSTRUCTIONS.md` — operator surface (equivalent to `CLAUDE.md`)
- `policy.md` — injected system context pointing to the Orbit control plane
- `adapter.contract.json` — executable capability contract for routing and hook support
- `orbit.registry.json`, `orbit.config.json` — registry and config
- `agents/`, `skills/` — full agent and skill library
- `templates/STATE.md` — source state template copied into runtime state directories during install

**Adapter Contract:**

1. **Load instructions**: Codex reads `INSTRUCTIONS.md` as the system-level operator prompt at session start.
2. **Agent selection**: Codex reads `orbit.registry.json` to select the appropriate agent for the task.
3. **Workflow execution**: Codex follows the matching section in `WORKFLOWS.md` (e.g. for a multi-step task, follow the `plan → build → verify → ship` lifecycle).
4. **Plain prompts**: Codex infers the nearest Orbit workflow from plain prompts via `INSTRUCTIONS.md` and `policy.md`; explicit `/orbit:*` commands still take precedence.
5. **State persistence**: Codex writes session state to `.codex/state/STATE.md` at session end.
6. **Hooks**: Codex has no lifecycle hook API. Safety checks from `hooks/scripts/pre-tool-use.sh` are NOT enforced. Use Codex only in trusted environments.

---

## Antigravity

Support level: `experimental`

Antigravity can follow the Orbit control plane if it can read markdown instructions and execute repo-local workflows, but no stable hook or lifecycle API has been published. Orbit now installs a best-effort adapter package, but plain-prompt routing still remains unsupported.

**Current constraints:**
- Best-effort `install_for_antigravity()` exists in `install.sh`, but the runtime contract still prefers explicit Orbit commands
- Hook injection mechanism is unspecified in Antigravity's public docs
- State persistence pathway is untested
- Plain-prompt Orbit workflow routing is not currently supported as a reliable runtime capability

**Manual setup (best-effort):**
1. Point Antigravity at `CLAUDE.md` as its operator context.
2. Provide `orbit.registry.json` and `WORKFLOWS.md` as reference documents.
3. Write session state manually to `.orbit/state/STATE.md`.
4. Skip hook-based safety checks until Antigravity publishes a lifecycle API.

Every installed adapter must also ship `adapter.contract.json`, which is the machine-readable source of truth for:
- instruction/operator surfaces
- plain-prompt routing support
- explicit-command fallback requirements
- hook support

**Tracking:** Full implementation tracked in [issue #17](https://github.com/soupler-hq/orbit/issues/17). When Antigravity publishes a stable hook/lifecycle API, `install_for_antigravity()` will be added and the support level will be upgraded to `stable`.

---

## Adapter Contract

Every runtime adapter must answer:

1. How does the runtime load the framework instructions?
2. How does it select agents from the registry?
3. How does it execute workflows or slash-command equivalents?
4. How does it persist state and recover after compaction or interruption?
5. How does it run hooks or safety checks?

## Practical Rule

If a runtime can follow the control plane without special-casing the repository structure, it is a first-class compatible runtime. Custom glue should be small, isolated, and documented here.

## Verification Checklist

Use this checklist when a user asks whether vague/plain prompts should be intercepted by Orbit first.

### 1. Confirm the installed adapter contract

Inspect the runtime's installed `adapter.contract.json`.

- Claude:
  - `.claude/adapter.contract.json`
  - expect `"implicit_prompt_routing": true`
- Codex:
  - `.codex/adapter.contract.json`
  - expect `"implicit_prompt_routing": true`
  - expect `"policy_file": "policy.md"`
- Antigravity:
  - `.antigravity/adapter.contract.json`
  - expect `"implicit_prompt_routing": false`
  - expect `"explicit_command_preferred": true`

If the installed contract does not match the runtime expectation, treat that as an Orbit install/runtime bug.

### 2. Confirm the required operator files exist

- Claude:
  - `CLAUDE.md`
- Codex:
  - `INSTRUCTIONS.md`
  - `policy.md`
- Antigravity:
  - `CLAUDE.md`

If a required file is missing, vague-prompt routing should not be treated as trustworthy even if the config claims support.

### 3. Confirm the runtime category

- `native` or `stable` plus `"implicit_prompt_routing": true`:
  - Orbit should classify the vague prompt first
- `experimental` or `"implicit_prompt_routing": false`:
  - prefer explicit `/orbit:*` commands

### 4. Confirm expected prompt behavior

Examples of vague prompts that should be classified first on supported runtimes:

- `pick next task`
- `go ahead`
- `what next`
- `continue`
- `review this`

Expected workflow mapping examples:

- `pick next task` → `/orbit:next` or `/orbit:resume`
- `go ahead` after active issue context → `/orbit:quick <active issue>`
- `review this` on an active branch → `/orbit:review`

Priority rule:
- explicit Orbit commands such as `orbit:quick #145` or `orbit:review on PR #189` must be classified as exact-command dispatch before any vague-prompt inference runs
- explicit next-task prompts must override an active PR review lane once the current branch is already `review_clean`, `pr_ready`, or `pr_open`
- supported runtimes should classify `pick next task` into backlog selection, not repeat the current PR review cycle

### 5. Confirm unsupported-runtime fallback

If the runtime contract says plain-prompt routing is unsupported:

- do not claim Orbit intercepted the prompt natively
- prefer explicit `/orbit:*` commands
- explain that the runtime is explicit-command-first

### 6. Use this to separate failure modes

If vague-prompt routing appears wrong, classify the problem as one of:

- install problem:
  - required adapter files missing
- contract problem:
  - `adapter.contract.json` is wrong or stale
- runtime-support limitation:
  - runtime explicitly does not support implicit routing
- inference problem:
  - supported runtime is installed correctly, but Orbit mapped the prompt to the wrong workflow
