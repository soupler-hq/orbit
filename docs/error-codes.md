---
id: error-codes-v1
status: Final
version: v1
last_updated: 2026-03-30
---

# Orbit Error Code Registry

> Stable identifiers for orchestrator, registry, and safety failures.
> Every structured error emitted by Orbit begins with `[ERR-ORBIT-NNN]`.

## Why error codes

Raw JS errors (`throw new Error('Could not acquire lock')`) are not searchable, not greppable across logs, and carry no stable identity across versions. ERR-ORBIT-NNN codes give operators a single token to search, alert on, and document runbooks for.

## Registry

| Code | Trigger condition | Source |
|------|------------------|--------|
| `ERR-ORBIT-001` | Loop detected in autonomous mode — execution halted to prevent runaway | `bin/orchestrator.js` (issue #72) |
| `ERR-ORBIT-002` | Clarification requested by agent — wave execution paused awaiting operator input | `bin/orchestrator.js` (issue #73) |
| `ERR-ORBIT-003` | STATE.md mutex acquisition failed after 10 retries — another process holds the lock | `bin/orchestrator.js` |
| `ERR-ORBIT-004` | No agent in registry matched the task at ≥60% threshold — Agent Forge required | `bin/orchestrator.js` |
| `ERR-ORBIT-005` | Pre-tool-use safety gate blocked the action — prompt injection or policy violation detected | `hooks/scripts/pre-tool-use.sh` |
| `ERR-ORBIT-006` | Registry or config validation failed — structural inconsistency detected | `bin/validate-config.sh`, `bin/orchestrator.js` |

## Format

All errors follow this format:

```
[ERR-ORBIT-NNN] <human-readable message>
```

Example:
```
[ERR-ORBIT-003] Could not acquire Orbit state lock after 10 retries. Another process may be writing STATE.md. Delete .orbit/state/.orbit.lock manually if the lock is stale.
```

## Runbooks

### ERR-ORBIT-003 — Stale lock
```bash
# Check if the lock directory exists
ls .orbit/state/.orbit.lock

# If the process that created it is dead, remove it
rm -rf .orbit/state/.orbit.lock
```

### ERR-ORBIT-004 — No agent match
Run `/orbit:forge <task description>` to create a specialist agent for the domain.

### ERR-ORBIT-005 — Safety gate blocked
Review the flagged tool call in the pre-tool-use hook output. If the block is a false positive, adjust `hooks/scripts/pre-tool-use.sh` and file an issue with the pattern that triggered it.

### ERR-ORBIT-006 — Registry validation failed
Run `bash bin/validate-config.sh` locally to see the full finding. Common causes:
- Hardcoded model ID in `agents/` or `skills/` (use semantic aliases from `orbit.config.json → models.routing`)
- `orbit.config.json` contains a `version` field (remove it — `package.json` is the single source)
- `package.json` license is not `Apache-2.0`
