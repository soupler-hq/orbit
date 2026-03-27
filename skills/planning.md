# SKILL: Planning & Execution Design
> Plans that can be handed to a fresh subagent and executed without ambiguity

## ACTIVATION
Auto-loaded whenever a plan, roadmap, or task breakdown is being created.

## PLAN STRUCTURE PRINCIPLES

### 1. Atomic Tasks
Each task must be completable in a **fresh 200k context window** in one session. If a task would take longer, split it. A task is atomic when:
- It has a single, clear output
- Its verification is unambiguous (either it passes or it fails)
- It can be assigned to a single subagent without coordination

### 2. Wave Design (Dependency Analysis)
Before writing task order, draw the dependency graph:
```
Task A (no deps) ─┐
Task B (no deps) ─┼─ WAVE 1 (parallel)
Task C (no deps) ─┘
Task D (needs A, B) ─┐
Task E (needs B)    ─┘─ WAVE 2 (parallel)
Task F (needs D, E) ──── WAVE 3 (sequential)
```
Tasks with no shared file dependencies CAN be parallelized.
Tasks writing the same file MUST be sequential.

### 3. XML Task Format
Every task is written in this exact format:
```xml
<task type="implement|design|research|configure|test">
  <n>Short task title (max 8 words)</n>
  <files>
    Exact file paths that will be created or modified
  </files>
  <action>
    Precise, unambiguous instructions. Specific library names, not "use a library".
    Specific function signatures, not "create a function".
    Exact behavior, not "handle errors".
    Reference architecture decisions by ADR number where relevant.
  </action>
  <verify>
    Exact commands to run.
    Exact expected output or behavior.
    No subjective criteria — every check is pass/fail.
  </verify>
  <done>
    One sentence defining the commit-ready completion state.
  </done>
</task>
```

## PHASE STRUCTURE
Every phase follows this structure:
```
Phase N: {Phase Title}
  Goal: {One sentence — what does this phase deliver?}
  
  Wave 1 (parallel):
    Task N.1.1 — {xml}
    Task N.1.2 — {xml}
  
  Wave 2 (parallel):
    Task N.2.1 — {xml}
  
  Wave 3 (sequential):
    Task N.3.1 — integration/verification
  
  Phase Done When:
    - {Testable criterion 1}
    - {Testable criterion 2}
```

## SCOPE DISCIPLINE
When writing requirements, sort everything into:
- **v1 (this milestone)** — must have to ship anything
- **v2 (next milestone)** — obviously important but not blocking v1
- **out of scope** — explicitly decided against (with rationale)

If you're not sure whether something is v1, it's v2.

## THE "JUNIOR ENGINEER TEST"
Before finalizing any plan: would an enthusiastic junior engineer with NO project context be able to execute this plan without asking a single question? If no, the plan is not detailed enough.

## CONTEXT FILES EVERY PLAN INCLUDES
Each phase plan is accompanied by:
- Link to ARCH.md (relevant sections only)
- Current STATE.md snapshot
- Tech stack reference
- Any relevant SUMMARY.md from previous phases
