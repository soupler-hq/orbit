# Skill: RIPER Workflow
> Structured 5-mode thinking framework — prevents premature execution

## When to Activate
- Before starting any non-trivial task ("before you code, think")
- When user says "think through this", "explore options", "research before building"
- When requirements are ambiguous
- When the task involves an unfamiliar domain
- `/orbit:riper` command or explicit mention of RIPER

## The 5 Modes

RIPER forces sequential mode transitions. You cannot skip modes. Each mode has a declaration format.

---

### MODE 1: RESEARCH
> Understand before acting

**Declaration**: `[RIPER: RESEARCH]`

**What to do**:
- Read all relevant files, docs, and context
- Identify: what exists, what's broken, what's missing
- Map dependencies: what does this touch?
- Identify constraints: performance, security, backwards compat
- Surface unknowns: what do I not know that could block me?

**Output**: Bullet-point findings. No solutions yet.

**Forbidden**: Proposing solutions, writing code, making assumptions

**Exit criteria**: You can answer: "What is the exact problem and what context exists?"

---

### MODE 2: INNOVATE
> Generate options without committing

**Declaration**: `[RIPER: INNOVATE]`

**What to do**:
- Generate 3-5 distinct approaches
- For each: describe the approach in 1-2 sentences
- For each: list pros/cons/trade-offs
- For each: estimate implementation complexity (S/M/L/XL)
- For each: identify risks

**Output**: Options table. No recommendation yet.

**Forbidden**: Picking a solution, writing code, dismissing options without analysis

**Exit criteria**: You have ≥3 viable options with explicit trade-offs documented

---

### MODE 3: PLAN
> Design the solution in detail

**Declaration**: `[RIPER: PLAN]`

**What to do**:
- Select one option (state rationale explicitly)
- Break into atomic tasks (each independently testable)
- Define wave structure (which tasks are parallel, which sequential)
- Identify files that will change
- Define tests that will verify completion
- Surface risks and mitigations

**Output**: XML task plan (Orbit format)

**Forbidden**: Writing implementation code (pseudocode is ok), skipping test definition

**Exit criteria**: Plan is detailed enough for a junior engineer to execute without questions

---

### MODE 4: EXECUTE
> Implement exactly as planned

**Declaration**: `[RIPER: EXECUTE]`

**What to do**:
- Implement precisely what the plan specifies
- TDD: write tests first (RED), then implementation (GREEN), then refactor
- Atomic commits per task
- No scope creep — if you discover a new problem, add it to the plan, don't fix it inline

**Output**: Working code + passing tests + commit

**Forbidden**: Deviating from the plan without declaring a plan update, adding unplanned features

**Exit criteria**: All planned tasks complete, all tests passing, code committed

---

### MODE 5: REVIEW
> Verify completeness and quality

**Declaration**: `[RIPER: REVIEW]`

**What to do**:
- Verify every planned task is complete
- Run all tests (unit, integration, e2e if applicable)
- Check against original requirements
- Security scan (at minimum: no secrets, input validated, auth correct)
- Document what was built and why decisions were made

**Output**: REVIEW.md with completion checklist

**Forbidden**: Declaring done without evidence, skipping tests, skipping requirement check

**Exit criteria**: All tasks complete, all tests passing, no unresolved findings

---

## Mode Transition Rules

```
RESEARCH → INNOVATE: Only after findings are documented
INNOVATE → PLAN:     Only after ≥3 options analyzed
PLAN → EXECUTE:      Only after plan is reviewed (by human in collaborative mode)
EXECUTE → REVIEW:    Only after all tasks committed
REVIEW → done:       Only after all checks pass
```

## Shortcut: RIPER Lite (for QUICK tasks)
When complexity is QUICK and domain is familiar:
```
[RIPER-LITE]
Research:  (2-3 bullets — what I know)
Plan:      (1-3 tasks)
Execute:   (do it)
Verify:    (confirm it works)
```

## Anti-Patterns RIPER Prevents
- **Jump to code** — skipping research → wrong solution, rework
- **Analysis paralysis** — stuck in research → INNOVATE forces generation
- **Scope creep** — discovery in EXECUTE → must go back to PLAN
- **Declare done without evidence** — REVIEW is mandatory, not optional
- **Single option thinking** — INNOVATE requires ≥3 options

## Integration with Orbit
```
/orbit:new-project  → always starts with RIPER RESEARCH phase
/orbit:plan         → produces RIPER PLAN output (XML tasks)
/orbit:quick        → uses RIPER-LITE
/orbit:debug        → RESEARCH → PLAN (skip INNOVATE for bugs) → EXECUTE → REVIEW
```
