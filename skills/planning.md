# SKILL: Planning & Execution Design
> Plans that can be handed to a fresh subagent and executed without ambiguity

## ACTIVATION
Auto-loaded whenever a plan, roadmap, or task breakdown is being created.

## CORE PRINCIPLES
1. **Atomic Execution**: Tasks must fit in a single 200k context window and be independently verifiable.
2. **Wave Parallelization**: Maximize throughput by identifying and parallelizing independent work.
3. **Explicit Dependencies**: Every task must state its prerequisites; no hidden "tribal knowledge."
4. **Junior-Engineer Ready**: A plan is only good if a fresh subagent with no context can execute it.
5. **v1 Ruthlessness**: ruthlessly prioritize "must-haves" to deliver value faster.

## PATTERNS

### Wave Dependency Design
- **Wave 1**: Independent tasks with no shared file writes.
- **Wave 2+**: Tasks that depend on outputs or state changes from previous waves.
- **Sequential**: Integration, verification, and ship tasks.

### XML Task Definition
```xml
<task type="implement|design|research|configure|test">
  <n>Task title</n>
  <files>Absolute paths</files>
  <action>Precise instructions</action>
  <verify>Verification commands</verify>
  <done>Definition of done</done>
</task>
```

## CHECKLISTS

### Planning Readiness
- [ ] Project vision and goals explicitly stated
- [ ] Requirements sorted into v1/v2/Out-of-Scope
- [ ] Wave dependency analysis completed
- [ ] Every task is atomic and pass/fail verifiable
- [ ] Junior-Engineer Test passed (clear, unambiguous)
- [ ] Context files (ADRs, STATE.md) linked

## ANTI-PATTERNS
- **Mega-Tasks**: Tasks that span multiple context windows or require coordination.
- **Hidden Dependencies**: Sequential work masquerading as parallel waves.
- **Vague Actions**: Using "handle," "improve," or "optimize" without specific criteria.
- **Subjective Verification**: Verification steps that require human "feeling" instead of tests.
- **Context Rot**: Accumulating outdated information in the plan without updating STATE.md.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
