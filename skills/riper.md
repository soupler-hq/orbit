# Skill: RIPER Workflow
> Structured 5-mode thinking framework — prevents premature execution

## ACTIVATION
- Before starting any non-trivial task ("before you code, think").
- When requirements are ambiguous or the domain is unfamiliar.
- `/orbit:riper` command or explicit mention of RIPER.

## CORE PRINCIPLES
1. **Understand Before Acting**: Mode 1 (Research) is mandatory and must establish context BEFORE any solutions are proposed.
2. **Options over Opinions**: Mode 2 (Innovate) requires multiple viable approaches to prevent "single-path" bias.
3. **Plan the Work, Work the Plan**: Mode 3 (Plan) must be complete before any code is written.
4. **Zero Deviance**: Mode 4 (Execute) must strictly follow the plan; any discovered issues must trigger a return to Phase 3.
5. **Evidence-Based Completion**: Mode 5 (Review) requires documented proof (tests, audits) before declaring a task finished.

## PATTERNS

### The 5-Phase RIPER Workflow
1. **Research**: Knowledge extraction, dependency mapping, and unknown discovery.
2. **Innovate**: Generation of 3+ distinct approaches with trade-off analysis.
3. **Plan**: Wave-based task breakdown and test definition.
4. **Execute**: Atomic implementation, TDD discipline, and commit tracing.
5. **Review**: Verification against success criteria and security auditing.

### RIPER Lite (Quick Tasks)
For low-complexity, familiar tasks: Research (what I know) → Plan (3 tasks) → Execute → Verify.

## CHECKLISTS

### RIPER Maturity
- [ ] All modes declared sequentially (no skipping)
- [ ] Research phase identified ≥1 non-obvious constraint or unknown
- [ ] Innovate phase documented trade-offs for ≥3 viable options
- [ ] Plan phase is detailed enough for an external agent to execute
- [ ] Review phase includes passing tests and a security scan

## ANTI-PATTERNS
- **Mode Skipping**: Jumping straight to Code (Execute) without Research or Planning.
- **Single-Option Trap**: Moving from Research to Planning with only one approach analyzed.
- **Silent Pivot**: Changing the implementation strategy during Execute without updating the Plan.
- **Subjective Review**: Declaring a task done based on "testing it manually" without evidence.
- **Endless Research**: Collecting information without moving to the Innovate/Plan phases.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.

## Relationship to RALPH
RIPER is the **planning-and-execution spine** for any task — it governs the full lifecycle from research through review. RALPH (Reflect, Act, Learn, Persist, Halt) is the **error-correction reflex** that fires inside RIPER's Execute step when something goes wrong.

Think of it as: RIPER is the outer loop, RALPH is the inner recovery loop.

| Framework | Scope | When it fires |
|-----------|-------|---------------|
| RIPER | Full task lifecycle | Every non-trivial task |
| RALPH | Error recovery only | Inside Execute, on failure |

For `/orbit:quick` tasks: RIPER Lite (Research → Plan → Execute → Verify) applies. RALPH fires on any execution error within the Execute step. You never invoke RALPH directly — it activates autonomously when an execution attempt fails.
