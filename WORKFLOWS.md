# Orbit Workflows
> Standard execution paths for the framework

## Core Lifecycle
- `/orbit:new-project` - discover the problem, research options, and generate the initial project artifacts.
- `/orbit:plan [N]` - translate requirements into phase-level wave plans.
- `/orbit:build [N]` - execute phase tasks in dependency-ordered waves.
- `/orbit:verify [N]` - run automated checks and UAT against the planned deliverables.
- `/orbit:ship [N]` - review, deploy, and mark the phase complete.
- `/orbit:next` - detect the next logical step from state.
- `/orbit:resume` - recover context after compaction or a new session.

## Registry Discipline
- Workflow definitions live in `orbit.registry.json`.
- `/orbit:*` command docs are human-readable wrappers over the canonical workflow definitions.
- A workflow should define its required inputs, outputs, and verification gate.

## Quality Workflows
- `/orbit:quick <task>` - one-off task using the smallest correct workflow.
- `/orbit:debug <issue>` - reproduce, isolate, fix, and regress-test a bug.
- `/orbit:review` - structured code and architecture review.
- `/orbit:audit` - security review with explicit threat modeling.
- `/orbit:eval` - check routing, portability, and registry/doc consistency.
- `/orbit:monitor` - health, alerting, and observability checks.
- `/orbit:map-codebase` - inventory stack, boundaries, risks, and conventions.

## Forge Workflow
- Use `/orbit:forge <description>` when no existing agent covers the task well enough.
- Analyze the domain.
- Define triggers, rules, and outputs for the new agent.
- Register the new agent in the registry.
- Dispatch the task to the forged agent.

## Wave Execution Pattern
1. Plan the phase as a set of dependency-ordered waves.
2. Put independent tasks in the same wave.
3. Give each subagent a fresh context bundle.
4. Collect summaries after each wave.
5. Verify the full phase before shipping.
6. Update state after completion and before compaction.

## Artifact Chain
- Discovery produces `PROJECT.md`, `REQUIREMENTS.md`, and `ROADMAP.md`.
- Planning produces `PHASE-{N}-PLAN.md`.
- Execution produces task outputs and `SUMMARY.md`.
- Verification produces `PHASE-{N}-VERIFICATION.md` and `PHASE-{N}-UAT.md`.
- Shipping updates state and release metadata.

## Reasoning Framework Hierarchy
Two named frameworks operate at different levels — their precedence is explicit:

- **RIPER** (`skills/riper.md`) is the **outer loop** governing the full task lifecycle (Research → Innovate → Plan → Execute → Review). It applies to every non-trivial task.
- **RALPH** (`skills/reflection.md`) is the **inner recovery loop** — an error-correction reflex that fires automatically inside RIPER's Execute step when an attempt fails. You never invoke RALPH directly.

See `skills/riper.md` → *Relationship to RALPH* for the full hierarchy explanation and a side-by-side comparison table.
