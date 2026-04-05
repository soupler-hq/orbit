# Orbit Workflows
> Standard execution paths for the framework

## All Workflows
<!-- GENERATED:START workflows_list -->
{{GENERATED_WORKFLOWS_LIST}}
<!-- GENERATED:END workflows_list -->

## Registry Discipline
- Workflow definitions live in `orbit.registry.json`.
- `/orbit:*` command docs are human-readable wrappers over the canonical workflow definitions.
- A workflow should define its required inputs, outputs, and verification gate.

## Wave Execution Pattern
1. Plan the phase as a set of dependency-ordered waves.
2. Put independent tasks in the same wave.
3. Give each subagent a fresh context bundle.
4. Collect summaries after each wave.
5. Verify the full phase before shipping.
6. Update state after completion and before compaction.

## Artifact Chain
- `/orbit:discover` produces `DISCOVERY.md`.
- `/orbit:new-project` produces `PROJECT.md`, `REQUIREMENTS.md`, and `ROADMAP.md`.
- Planning produces `PHASE-{N}-PLAN.md`.
- Execution produces task outputs and `SUMMARY.md`.
- Verification produces `PHASE-{N}-VERIFICATION.md` and `PHASE-{N}-UAT.md`.
- Shipping updates state and release metadata.

## Reasoning Framework Hierarchy
Two named frameworks operate at different levels — their precedence is explicit:

- **RIPER** (`skills/riper.md`) is the **outer loop** governing the full task lifecycle (Research → Innovate → Plan → Execute → Review). It applies to every non-trivial task.
- **RALPH** (`skills/reflection.md`) is the **inner recovery loop** — an error-correction reflex that fires automatically inside RIPER's Execute step when an attempt fails. You never invoke RALPH directly.

See `skills/riper.md` → *Relationship to RALPH* for the full hierarchy explanation and a side-by-side comparison table.
