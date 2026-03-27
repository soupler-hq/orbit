# Runtime Adapters

> How non-native agent runtimes can use Orbit without changing the core control plane

## Purpose

Orbit is designed as a repo-native control plane. The core behavior lives in markdown instructions, reusable skills, workflows, hooks, and a machine-readable registry. A runtime adapter is the thin layer that maps a specific agent engine to that control plane.

## Support Levels

- `native` - the runtime automatically understands the framework entrypoints and lifecycle
- `compatible` - the runtime can use the framework with light mapping or wrapper logic
- `adapter-required` - the runtime needs a custom bridge before it can use the framework reliably

## Claude

Support level: `native`

- Reads `CLAUDE.md` directly
- Works with `/orbit:` commands and repo-local hook behavior
- Best fit for the current control-plane layout

## Codex

Support level: `compatible`

- Can use the same repo-local instructions and registry
- Should read `INSTRUCTIONS.md`, `SKILLS.md`, and `WORKFLOWS.md` as the operator surface
- Should map its own command or task surface into the `/orbit:` workflow model
- Can reuse the same agent registry and state files without changing the framework design

## Antigravity

Support level: `compatible`

- Can use the framework if it reads markdown instructions and can execute repo-local workflows
- Should consume `INSTRUCTIONS.md`, `WORKFLOWS.md`, and `orbit.registry.json`
- May need a launcher or adapter that maps Antigravity task routing into Orbit routing
- Should treat hooks and state files as the source of truth for lifecycle and recovery

## Adapter Contract

Every runtime adapter should answer these questions:

1. How does the runtime load the framework instructions?
2. How does it select agents from the registry?
3. How does it execute workflows or slash-command equivalents?
4. How does it persist state and recover after compaction or interruption?
5. How does it run hooks or safety checks?

## Recommended Adapter Shape

- A small bootstrap layer that loads the repo docs
- A command mapper that translates runtime-native commands into framework workflows
- A state bridge that writes to `STATE.md` and the pre-compact snapshot
- A validation step that confirms the runtime still honors the registry and workflow contract

## Practical Rule

If a runtime can follow the control plane without special casing the repository structure, it is a first-class compatible runtime. If it needs custom glue, that glue should be small and isolated.
