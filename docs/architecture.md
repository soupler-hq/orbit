---
id: architecture-v1
status: Final
version: v1
last_updated: 2026-03-30
---

# Orbit Architecture

> System design, control plane, wave execution model, and component layout.

### Architecture

Orbit separates orchestration policy from runtime implementation. The repository defines rules, roles, workflows, and persistence. The active agent runtime interprets those instructions.

### Compatibility

| Runtime     | Support level  | Notes                                                              |
| ----------- | -------------- | ------------------------------------------------------------------ |
| Claude Code | `native`       | Reads `CLAUDE.md` directly; hooks and slash commands work natively |
| Codex       | `stable`       | Uses `INSTRUCTIONS.md` + `policy.md`; no hook API                  |
| Antigravity | `experimental` | Partial; no stable hook lifecycle published yet                    |

See [runtime-adapters.md](runtime-adapters.md) for full adapter contracts.

### Flow Diagram

```mermaid
flowchart LR
    Request --> Classify --> Route --> Plan --> Execute --> Verify --> Persist --> Ship
```

### Component Diagram

```mermaid
flowchart TB
    subgraph ControlPlane[Control Plane]
        CLAUDE[CLAUDE.md]
        REG[orbit.registry.json]
        SKILLS[skills/]
        WORK[WORKFLOWS.md]
    end

    subgraph Execution[Execution Layer]
        CORE[Core Agents]
        SPEC[Specialist Agents]
        FORGE[Agent Forge]
    end

    subgraph Persistence[Persistence Layer]
        STATE[STATE.md]
        SNAP[pre-compact snapshot]
        GIT[Git history]
    end

    CLAUDE --> CORE
    REG --> CORE
    SKILLS --> CORE
    WORK --> CORE
    CORE --> SPEC
    CORE --> FORGE
    CORE --> STATE
    STATE --> SNAP
    STATE --> GIT
```

## Complex Scenario: Secure Feature Delivery

A product team requests a new admin billing export feature that must be audited, permissioned, and delivered without exposing customer data.

1. Classify as `SYNTHESIS`, `PROJECT`, `AUTONOMOUS`
2. Route to `strategist` first — work spans product, security, backend, delivery
3. Pull in `security-engineer`, `engineer`, `data-engineer`, `reviewer` in parallel
4. `planning.md` splits into waves: schema changes → API design → export job → permission checks → audit logging
5. `security.md` defines data-access rules, redaction, and failure handling before implementation
6. Each wave runs in fresh contexts — auth logic, export job, and UI concerns don't bleed together
7. Verify with tests, threat modeling, and review before shipping
8. Persist to `STATE.md`, commit atomically

Without the framework: single linear thread, review steps skipped, security decisions undocumented.
With the framework: roles, waves, and checks make security and delivery quality explicit.

---

## Control Plane

Orbit separates orchestration policy from runtime implementation. The repository defines rules, roles, workflows, and persistence. The active agent runtime interprets those instructions. The same repo works with Claude, Codex, or Antigravity — no rewrites required.

```
orbit.registry.json     ← machine-readable source of truth (agents, skills, workflows)
orbit.config.json       ← runtime config (model routing, hooks, git settings)
CLAUDE.md               ← session orchestrator for Claude-compatible runtimes
INSTRUCTIONS.md         ← generated equivalent for Codex and other runtimes
agents/                 ← specialist agent definitions
skills/                 ← reusable process frameworks (lazy-loaded)
hooks/                  ← lifecycle and safety gates
commands/               ← /orbit:* command surface
state/                  ← STATE.md templates and persistence layer
```

### Three Pillars

| Pillar            | Responsibility                                            | Core files                         |
| ----------------- | --------------------------------------------------------- | ---------------------------------- |
| Control Plane     | Routes requests, enforces safety, defines agent roles     | `orbit.registry.json`, `CLAUDE.md` |
| Execution Layer   | Specialist agents and skills that perform the actual work | `agents/`, `skills/`, `forge/`     |
| Persistence Layer | Makes long-running work resumable, every change traceable | `STATE.md`, `hooks/`, git history  |

### Flow

```mermaid
flowchart LR
    Request --> Classify --> Route --> Plan --> Execute --> Verify --> Persist --> Ship
```

1. **Classify** — domain (ENGINEERING/PRODUCT/DESIGN/…), complexity (QUICK/PHASE/PROJECT), mode (AUTONOMOUS/COLLABORATIVE)
2. **Route** — select agent from registry; if no agent matches ≥60%, trigger Agent Forge
3. **Plan** — decompose into dependency-ordered waves
4. **Execute** — parallel subagents, each with a fresh 200k context
5. **Verify** — tests, review, safety checks
6. **Persist** — STATE.md updated, atomic commit
7. **Ship** — PR, deploy, release tag

## Wave Execution Model

Work is broken into dependency-ordered waves. Tasks within a wave run in parallel. Each subagent gets a fresh context — no accumulated rot from prior conversation turns.

```
WAVE 1 (parallel): independent tasks → Subagent A, B, C
WAVE 2 (parallel): depends on Wave 1 → Subagent D, E
WAVE 3 (sequential): integration → verify → commit → STATE.md update
```

### Parallelism levels

| Mode                              | How                                                                 |
| --------------------------------- | ------------------------------------------------------------------- |
| Single session                    | Waves run sequentially, one agent at a time (default)               |
| Multiple sessions + git worktrees | True parallelism via `skills/git-worktree.md`                       |
| External orchestrator             | Anthropic API called concurrently per subagent — production pattern |

`recommended_parallel_sessions` in `orbit.config.json` sets the concurrency target for external orchestration.

## Model Routing

Tasks are routed to the minimum sufficient model. IDs are configured in `orbit.config.json → models.routing` — never hardcoded in agent or skill files.

| Alias       | Used for                              | Cost tier               |
| ----------- | ------------------------------------- | ----------------------- |
| `classify`  | Intent routing, simple lookups        | Cheapest (~20x cheaper) |
| `standard`  | Coding, debugging, most tasks         | Default                 |
| `reasoning` | Architecture, system design           | Highest                 |
| `security`  | Threat modeling, adversarial analysis | Highest                 |

Override: edit `orbit.config.json → models.routing`. See `examples/model-routing.config.json`.

## Repository Layout

```
CLAUDE.md / INSTRUCTIONS.md   ← session orchestrator (generated from templates/)
orbit.registry.json            ← machine-readable agent/skill/workflow registry
orbit.config.json              ← runtime config and model routing
orbit.config.schema.json       ← JSON schema for config validation
agents/                        ← role-based agent definitions
skills/                        ← reusable process frameworks
hooks/                         ← lifecycle hooks (pre-tool-use, pre-compact, stop)
commands/                      ← /orbit:* slash command definitions
docs/plans/                    ← implementation blueprints and wave plans
templates/                     ← orbit.base.md source of truth for generated files
state/                         ← STATE.md template and persistence format
examples/                      ← model routing config, skill examples
docs/                          ← architecture, concepts, playbooks, error codes
bin/                           ← orchestrator, eval runner, validators, generators
tests/                         ← Vitest unit tests
install.sh                     ← canonical install engine
metadata.yml                   ← IDP contract (engineering-standards platform)
```

## Kernel vs. Userland

Orbit enforces a **Lean Kernel** design to prevent bloat.

- **Kernel** — foundational agents (`architect`, `engineer`, `forge`, etc.) and horizontal skills
- **Userland** — project-specific agents created via `/orbit:forge` live in `.orbit/` and are never committed to core

### Knowledge promotion

When a project-local agent encodes a genuinely reusable pattern, tag it `promotion_candidate: true` and run `/orbit:promote` to upstream it to the Orbit core.

## Nexus Mode (Multi-Repo Orchestration)

Nexus mode lets Orbit act as a meta-orchestrator across an entire org. It bridges the intelligence gap between independent repos (`api`, `frontend`, `standards`).

```bash
node bin/install.js nexus init   # initialise workspace
node bin/install.js nexus sync   # auto-discover and index all sub-repos
```

Cross-repo queries spawn wave subagents in each repo, aggregate findings in `NEXUS-STATE.md`, and surface a gap analysis.

## Sentinel CI

Every PR is guarded by `.github/workflows/orbit-sentinel.yml`:

| Gate                | What it checks                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| `lock-check`        | `npm ci --dry-run` — lock file freshness                                |
| `lint`              | ESLint + Prettier                                                       |
| `test`              | Vitest unit tests (≥60% coverage)                                       |
| `validate`          | `bin/validate.sh` — semantic registry consistency                       |
| `compliance`        | `bin/eval.sh` — SOTA compliance (≥80% eval score)                       |
| `safety`            | `bin/test-safety.sh` — adversarial / prompt injection                   |
| `sca`               | `npm audit --audit-level=high`                                          |
| `self-audit`        | `bin/validate-config.sh` — version, hook, model ID, license checks      |
| `human-views-drift` | Generated `INSTRUCTIONS.md`, `SKILLS.md`, `WORKFLOWS.md` match registry |
| `publish-dry-run`   | Package is publishable                                                  |
