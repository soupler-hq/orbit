---
id: concepts-v1
doc_type: reference
status: Final
version: v1
last_updated: 2026-03-30
---

# Orbit Core Concepts

> Agents, skills, workflows, state, hooks, and the forge — how the pieces fit together.

---

## Agents

Specialized roles with deep domain expertise. Each agent has clear trigger conditions, a defined skill set it loads, and output formats it must produce. The orchestrator selects the best-fit agent by matching the request domain and complexity against the registry.

### Core agents

| Agent | Domain | Triggers on |
|-------|--------|-------------|
| `architect` | ENGINEERING | System design, tech selection, scalability, architecture review |
| `engineer` | ENGINEERING | Coding, TDD, debugging, refactoring, API integration |
| `strategist` | PRODUCT | Project planning, roadmaps, milestones, OKRs |
| `product-manager` | PRODUCT | PRDs, user stories, feature specs, backlog prioritization |
| `reviewer` | REVIEW | Code review, QA, performance — TS/Python/Go language axes |
| `devops` | OPERATIONS | CI/CD, Docker, K8s, cloud infra, monitoring, deployment |
| `researcher` | RESEARCH | Domain research, feasibility, competitive analysis, tech eval |
| `designer` | DESIGN | UX flows, information architecture, component specs |
| `security-engineer` | REVIEW | Security audits, threat modeling, OWASP, STRIDE |
| `data-engineer` | ENGINEERING | ETL/ELT pipelines, dbt, Kafka, Spark, warehousing |
| `forge` | SYNTHESIS | Dynamic agent creation when no agent fits ≥60% |

### Selection rules

```
Single clear match           → dispatch that agent
TypeScript/Python/Go review  → reviewer with language context
Security concern             → security-engineer (always parallel)
PR touches .github/workflows → devops (always parallel)
PRDs / user stories / feature specs → product-manager
Spans 2-3 domains            → parallel wave, merge results
All domains                  → strategist first, then parallelize
No agent ≥60% match          → trigger Agent Forge
```

### Kernel vs. userland

Orbit enforces a **Lean Kernel** design. Core agents are the kernel. Project-specific agents created via `/orbit:forge` live in `.orbit/agents/` and are never committed to the core repo. When a forged agent encodes a genuinely reusable pattern, tag it `promotion_candidate: true` and run `/orbit:promote` to upstream it.

---

## Skills

Reusable process frameworks that encode domain expertise. Skills are **lazy-loaded** — each subagent receives only the skills directly relevant to its task. Loading all skills into every context wastes tokens and degrades output quality.

### Loading rules

| Situation | Skill |
|-----------|-------|
| Writing any code | `skills/tdd.md` |
| System design | `skills/architecture.md` |
| Creating a plan | `skills/planning.md` |
| Debugging | `skills/debugging.md` |
| Creating new agent | `skills/forge.md` |
| Code review | `skills/review.md` |
| Deploying | `skills/deployment.md` |
| CI/CD workflows | `skills/workflow-audit.md` |
| Starting a project | `skills/brainstorming.md` |
| Monitoring | `skills/observability.md` |
| AI/ML systems | `skills/ai-systems.md` |
| IDP/Auth | `skills/security-and-identity.md` |
| Security audit | `skills/security-and-identity.md` + `skills/prompt-safety.md` |
| Parallel execution | `skills/git-worktree.md` |
| Long context / new session | `skills/context-management.md` |
| Ambiguous requirements | `skills/riper.md` |
| Multi-repo orchestration | `skills/nexus.md` |
| Framework hardening | `skills/sota-architecture.md` |

### Adding a skill

Create `skills/{name}.md` following the standard format: `ACTIVATION`, `CORE PRINCIPLES`, `PATTERNS`, `CHECKLISTS`, `ANTI-PATTERNS`. Register the load trigger in `CLAUDE.md` under SKILLS AUTO-LOADING.

---

## Wave Execution

Work is broken into dependency-ordered waves. Tasks within a wave run in parallel. Each subagent gets a **fresh 200k context** — no accumulated rot from the main session.

```
WAVE 1 (parallel): independent tasks  → Subagent A, B, C
WAVE 2 (parallel): depends on Wave 1  → Subagent D, E
WAVE 3 (sequential): integration → verify → atomic commit → STATE.md update
```

Each subagent receives only: task XML + relevant `ARCH` sections + `STATE.md` snapshot + specific skill files. Typical subagent input is 8–15k tokens. The main session never sees the subagent's working context.

### Parallelism levels

| Mode | How |
|------|-----|
| Single session | Waves run sequentially, one agent at a time (default) |
| Multiple sessions + git worktrees | True parallelism via `skills/git-worktree.md` |
| External orchestrator | Anthropic API called concurrently per subagent — production pattern |

`recommended_parallel_sessions` in `orbit.config.json` sets the concurrency target for external orchestration.

---

## STATE.md (Persistence Layer)

`STATE.md` is the cross-session memory. Every session reads `.orbit/state/STATE.md` first and writes to it on completion. A new session starts with ~5k tokens of full context instead of loading conversation history.

Contents:
- Project vision (1-paragraph)
- Active milestone + phase number
- Decisions log (rationale, not just outcomes)
- Tech stack snapshot
- Blockers and resolutions
- Todos and seeds (forward ideas)
- Last 5 completed tasks

If `STATE.md` is missing, the orchestrator creates it before doing anything else.

---

## Hooks

Lifecycle hooks run on every agent action via `settings.json`. They are covered by the `SHASUM256.txt` integrity manifest — any modification is detectable.

| Hook | Fires | Purpose |
|------|-------|---------|
| `PreToolUse` | Before every tool call | Prompt injection detection, dangerous-pattern blocking |
| `PostToolUse` | After every tool call | Audit logging, output validation |
| `PreCompact` | Before context compaction | Writes `STATE.md` + `pre-compact-snapshot.md` |
| `Stop` | Session end | Final STATE.md flush |

Hooks are designed to fail silently (`2>/dev/null || true`) to prevent hook errors from breaking agent sessions. See `hooks/HOOKS.md` for the full specification.

---

## Agent Forge

When no existing agent covers a task at ≥60% match, `/orbit:forge` creates a new specialized agent:

1. Load `agents/forge.md`
2. Analyze required domain knowledge
3. Define: name, role, triggers, skills, constraints, examples
4. Write to `agents/{name}.md`
5. Register in `CLAUDE.md` and `orbit.registry.json`
6. Dispatch task to the new agent
7. Agent persists for all future project tasks

Forged agents are project-local by default (`.orbit/agents/`). If the pattern is generalizable, tag with `promotion_candidate: true` and run `/orbit:promote`.

---

## Workflows

Orbit has three complexity tiers, each with a defined workflow:

**QUICK** — single task, under 30 minutes:
```
classify → select → execute → verify → commit
```

**PHASE** — multi-task, wave execution:
```
/orbit:plan  → brainstorm + spec + task breakdown
/orbit:build → wave execution (parallel subagents)
/orbit:verify → test + UAT + review
/orbit:ship  → PR + deploy + STATE update
```

**PROJECT** — multi-phase, weeks of work:
```
/orbit:new-project → vision + requirements + roadmap
repeat PHASE per phase until milestone complete
/orbit:milestone   → archive + tag + next milestone
```

See `WORKFLOWS.md` for the full machine-readable workflow definitions.
