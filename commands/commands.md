# STATE.md Update Protocol

> Standing rule — applies to every Orbit command, every session

STATE.md is Orbit's memory. It must stay current without being asked. Update it automatically whenever any of the following occur:

| Trigger                                       | What to write                                                    |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Issue completed (PR merged or task done)      | Move item from Todos to Last 5 Completed Tasks                   |
| Decision made (architecture, scope, approach) | Add row to Decisions Log with date, version, decision, rationale |
| New issue created                             | Add to appropriate wave/milestone in Todos                       |
| Blocker encountered                           | Add to Todos with `BLOCKED:` prefix and reason                   |
| Blocker resolved                              | Remove from Todos, add resolution to Decisions Log               |
| Clarification required                        | Add `CLARIFICATION_REQUESTED` entry under Clarification Requests |
| Milestone shipped                             | Update Active Milestone, Current Version, add to Decisions Log   |
| Session produces significant context          | Update Project Context if active phase/milestone changed         |

**Rules:**

- Never wait to be asked. Update STATE.md as part of completing any task.
- Decisions Log entries must include rationale — not just what was decided, but why.
- Last 5 Completed Tasks: always most recent first, always include issue number if applicable.
- If STATE.md does not exist, create it before doing any other work.

---

# Orbit Runtime Status Contract

> Standard live output emitted by Orbit commands and runtime helpers

Orbit should always surface what it is doing, not just the final result.

## Required blocks

### Start banner

Used by `/orbit:quick`, `/orbit:plan`, `/orbit:build`, and similar command entry points.

```
━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Domain:     {DOMAIN}
  Complexity: {COMPLEXITY}
  Agent:      {AGENT}
  Mode:       {MODE}
  Working target: {Issue #{NNN}|untracked task}
  Branch:     {branch name}
  PR:         {#NNN|not opened yet}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Mid-session execution block

Used by `/orbit:progress` and `/orbit:resume` when work is already in progress.

```
━━━ Current Execution ━━━━━━━━━━━━━━━━━━━
  Command:  {command}
  Agent:    {agent}
  Wave:     {wave}
  Status:   {status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When the active task is tracked work, append the workflow gate block so Orbit explains the current lifecycle state and the next allowed transition:

```
━━━ Workflow Gate ━━━━━━━━━━━━━━━━━━━━━
  State:    {state}
  PR Gate:  {ready|blocked}
  Next:     {next transition}
  Command:  {next command}
  Blocker:  {reason if blocked}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Completion footer

Appended at the end of completed commands so the user has a concrete next step.

```
---
## Recommended Next Command

**Primary**: {next command}
**Why**: {one sentence}

**Alternatives**:
- {alt 1}
- {alt 2}
```

## Review residual rule

When `/orbit:review` ends with residual risks, Orbit must classify each one explicitly:

- `Tracked by #...` for a linked hardening or follow-up issue
- `Waived: ...` for an intentionally accepted risk with rationale
- `Operational: ...` for branch hygiene, CI timing, or other non-product follow-up work

Do not leave residual risks as unlabeled prose.

---

# Orbit Command: /orbit:new-project

> Initialize a brand new project from scratch

## PROCESS

Load `skills/brainstorming.md`. Then:

1. **Intent extraction** — Ask up to 5 targeted questions to understand the full scope. Never start before understanding: who uses this, what success looks like, what constraints exist, what already exists.

2. **Research** — Spawn a researcher subagent with this prompt:

   ```
   You are a Research Agent. Investigate the domain: {domain}.
   Research axes: ecosystem landscape, technology options, proven patterns, pitfalls at scale.
   Output: {N}-RESEARCH.md with executive summary, option comparison, recommendation, pitfalls.
   ```

3. **Produce project artifacts**:
   - `PROJECT.md` — vision, goals, constraints, success criteria
   - `REQUIREMENTS.md` — v1/v2/out-of-scope with rationale
   - `ROADMAP.md` — phases mapped to requirements
   - `.orbit/state/STATE.md` — initial state document

4. **Present roadmap** in sections for approval. Adjust based on feedback.

5. Once approved — output:
   ```
   Project initialized. Run /orbit:plan 1 to plan Phase 1.
   ```

---

# Orbit Command: /orbit:plan [N]

> Research + design + break into executable tasks for phase N

## PROCESS

**Emit at start:**

```
━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Domain:     {DOMAIN}
  Complexity: PHASE
  Agent:      architect + researcher
  Mode:       {COLLABORATIVE|AUTONOMOUS}
  Milestone:  {active milestone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Load `skills/planning.md`. If N not specified, use next unplanned phase from ROADMAP.md.

1. Read STATE.md + ROADMAP.md + REQUIREMENTS.md
2. Spawn researcher subagent for this phase's domain
3. Design wave execution for phase N (which tasks can parallelize?)
4. Produce phase plan as XML task definitions
5. Verify plan against requirements (can a fresh engineer execute this unambiguously?)
6. Output: `PHASE-{N}-PLAN.md` with wave-structured task XML

---

# Orbit Command: /orbit:build [N]

> Execute phase N using parallel wave architecture

## PROCESS

**Emit at start:**

```
━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Domain:     {DOMAIN}
  Complexity: PHASE
  Agent:      engineer (+ specialist agents per wave)
  Mode:       {COLLABORATIVE|AUTONOMOUS}
  Phase:      {N} — {phase name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Read `PHASE-{N}-PLAN.md`. For each wave:

**Dispatch subagents in parallel** (one per task in the wave):

```
Subagent context: {task XML} + {relevant ARCH.md sections} + {STATE.md} + {tech stack}
Subagent instruction: Execute exactly this task. Load the skills it requires. TDD always.
Commit atomically when done. Write SUMMARY.md.
```

**After each wave, emit:**

```
━━━ Wave {N} Complete ━━━━━━━━━━━━━━━━━━━
  ✓ {task 1 title} — committed
  ✓ {task 2 title} — committed
  ✗ {task 3 title} — BLOCKED: {reason}  (if applicable)
  Next: Wave {N+1} → {agent(s)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Collect SUMMARY.md files. Check for blockers before next wave.

After all waves: run verification subagent:

```
Verify: does the codebase deliver everything Phase N promised?
Check against REQUIREMENTS.md. Output: PHASE-{N}-VERIFICATION.md
```

Update STATE.md with phase completion.

**After completion, emit:**

```
---
**What's next**: /orbit:verify {N} — run UAT and automated verification
**Why**: build complete — verification required before ship
```

Logic: same decision table as `/orbit:resume` inference block — first matching rule wins.

---

# Orbit Command: /orbit:verify [N]

> Human + automated verification of phase N deliverables

## PROCESS

1. Extract testable deliverables from `PHASE-{N}-PLAN.md`
2. Run automated checks: all tests pass, linter passes, type checks pass
3. Present each user-facing deliverable for UAT:
   ```
   Deliverable: User can log in with email + password
   How to test: navigate to /login, enter credentials
   Pass? [yes/no/partially]
   ```
4. For any failures: spawn debug subagent to find root cause + create fix task
5. Output: `PHASE-{N}-UAT.md` with results

**After completion, emit:**

```
---
**What's next**: /orbit:ship {N} — ship phase {N} (UAT passed)
```

Logic: same decision table as `/orbit:resume` inference block — first matching rule wins.

---

# Orbit Command: /orbit:ship [N]

> Create PR, deploy to staging/prod, update release state

## PROCESS

Load `skills/deployment.md`. Requires PHASE-{N}-UAT.md to exist and pass.

1. Run reviewer subagent across all changes in this phase
2. Block ship on any CRITICAL findings
3. Create PR with auto-generated description:
   - What was built
   - How to test
   - Changes to infrastructure/config
4. If approved: deploy to staging → run smoke tests → deploy to prod
5. Tag release: `v{milestone}.{phase}`
6. Update STATE.md: phase marked shipped
7. Output: deployment summary + next phase hint

**After completion, emit:**

```
---
**What's next**: /orbit:plan — begin next phase  (or /orbit:milestone if all phases shipped)
**Why**: {one sentence — milestone state + what comes next}
```

Logic: same decision table as `/orbit:resume` inference block — first matching rule wins.

---

# Orbit Command: /orbit:next

> Auto-detect current state and recommend the next logical step

## PROCESS

Read STATE.md + ROADMAP.md. Determine:

- No project initialized → run `/orbit:new-project`
- Phase planned but not built → run `/orbit:build N`
- Phase built but not verified → run `/orbit:verify N`
- Phase verified but not shipped → run `/orbit:ship N`
- All phases complete → run `/orbit:milestone`
- Otherwise → show status and ask

The repo-local runtime entrypoint for `/orbit:next` must emit the standard status blocks and the recommended next command. Full automatic dispatch can remain a higher-level workflow concern.

Implementation order for the repo-local runtime:

1. If the current branch is a tracked feature branch with an active issue, derive the next step from live workflow evidence.
2. Otherwise, inspect `.orbit/state/STATE.md` and recommend the next open issue in the active `(CURRENT)` phase section.
3. If no tracked backlog remains, recommend `/orbit:plan`.
4. If no project state exists yet, recommend `/orbit:new-project`.

If open clarification requests exist in `.orbit/state/STATE.md`, `/orbit:next` should not advance autonomous work until `/orbit:clarify` resolves them.

---

# Orbit Command: /orbit:clarify

> Surface and resolve pending clarification requests that are blocking autonomous execution

## PROCESS

1. Read `.orbit/state/STATE.md`.
2. Parse the `## Clarification Requests` section.
3. Show all `[OPEN]` `CLARIFICATION_REQUESTED` entries in a structured queue.
4. If called with a resolution, mark the matching entry `[RESOLVED]`.
5. If any open requests remain, keep workflow state blocked.
6. If no open requests remain, recommend `/orbit:next`.

**Clarification event schema in `STATE.md`:**

```text
[OPEN] id: clarify-001 | requested_by: engineer | issue: #73 | command: /orbit:quick | question: Which staging dataset should be used? | reason: Missing required input | requested_at: 2026-04-01T00:00:00Z
[RESOLVED] id: clarify-001 | resolution: Use staging-fixture-a. | resolved_by: operator | resolved_at: 2026-04-01T00:05:00Z
```

**Rule:**

- If ambiguity blocks safe execution, the active agent must emit a `CLARIFICATION_REQUESTED` event and stop tool execution until it is resolved.
- `hooks/scripts/pre-tool-use.sh` is responsible for enforcing the pause when clarification gating is enabled.

---

# Orbit Rule: Implicit Routing For Plain Prompts

> If the active runtime supports plain-prompt routing and the user does not type an explicit `/orbit:*` command, Orbit must still classify intent and choose the nearest workflow.

## PROCESS

1. Inspect the plain prompt for intent:
   - implementation or fix request → treat as `/orbit:quick`
   - planning, roadmap, architecture direction, or large feature framing → treat as `/orbit:plan`
   - review or audit request → treat as `/orbit:review` or `/orbit:audit`
   - debugging or root-cause request → treat as `/orbit:debug`
   - resume / status / what-next request → treat as `/orbit:resume`, `/orbit:progress`, or `/orbit:next`
2. Emit the same classification/status framing Orbit would emit for the explicit command.
3. Proceed through the inferred workflow unless the user clearly asked only for explanation or feedback.
4. If the prompt is ambiguous between two workflows, choose the lower-risk path and state the inferred workflow in the response.

Explicit slash commands always override inferred routing. Runtimes without plain-prompt interception should require the documented explicit Orbit command path.

---

# Orbit Command: /orbit:quick <task description>

> Ad-hoc task with Orbit quality guarantees, no full planning

## PROCESS

For Orbit framework work, `/orbit:quick` is the default entrypoint. Do not start freeform implementation on `develop` for work that should be tracked as an Orbit task.

If the user gives a plain prompt that implies a tracked implementation task, Orbit should implicitly route it here and say so in the classification block.

**Emit at start (classification block):**

```
━━━ Orbit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Domain:     {ENGINEERING|PRODUCT|DESIGN|OPERATIONS|RESEARCH|REVIEW|SYNTHESIS}
  Complexity: QUICK
  Agent:      {selected agent}
  Mode:       {COLLABORATIVE|AUTONOMOUS}
  Working target: {Issue #{NNN}|untracked task}
  Branch:     {branch name}
  PR:         {#NNN|not opened yet}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

1. Classify: which agent handles this?
2. Confirm issue + branch discipline before edits:
   - identify the issue number or create one if missing
   - ensure work is on a feature branch from freshly pulled `develop`
   - keep scope limited to that issue
   - if the requested issue does not match the active feature-branch issue, stop and switch context before continuing
3. Define single XML task:
   ```xml
   <task type="...">
     <n>...</n>
     <files>...</files>
     <action>...</action>
     <verify>...</verify>
     <done>...</done>
   </task>
   ```
4. Execute with relevant skill loaded
5. Verify, commit, update STATE.md
6. If the task is review-ready, push branch, refresh the PR body if the branch scope changed, update the `Head SHA` marker, and then run `/orbit:review`
7. Before requesting review or ship progression, refresh the PR body evidence:
   - `## Test plan` lists the commands actually run
   - `Orbit Self-Review` records the review command, dispatched agents, ship decision, and findings handled

**After completion, emit:**

```
---
**What's next**: /orbit:quick #NNN — {next unblocked issue title}
**Why**: {one sentence — current milestone state + why this is next}
```

Logic: same decision table as `/orbit:resume` inference block — first matching rule wins.

---

# Orbit Command: /orbit:forge <description>

> Build a new specialized agent for a task no current agent covers

## PROCESS

Load `agents/forge.md`. Then:

1. Analyze the task description to identify domain
2. Check if any existing agent covers it (>60% fit?)
3. If no: design new agent using forge blueprint template
4. Write to `agents/{name}.md`
5. Register in CLAUDE.md
6. Dispatch the task to the new agent
7. Confirm agent is working correctly

---

# Orbit Command: /orbit:review

> Full structured code + architecture review of current state

## PROCESS

Use `/orbit:review` on the active feature branch before opening or finalizing the PR for that branch. Use a second `/orbit:review` on `develop` only for accumulated wave or milestone integration review.

Before requesting review again after follow-up commits, refresh the PR body so `Summary`, `Issues`, `Ship Decision`, `Test plan`, and `Merge notes` still match the branch truth, and update the `Head SHA` marker so CI can detect stale PR descriptions.

If the review ends with residual risks, Orbit must record their disposition before treating the review as complete:

- link an existing hardening issue if the risk is already covered
- create a new hardening issue if the risk is still untracked
- or explicitly explain why no tracking issue is required

Treat this as a strict `track-or-waive` rule for residual risks. For Orbit self-hosting work, prefer placing the follow-up in the hardening stack such as `#163`.

Load `agents/reviewer.md`. Spawn reviewer subagent with:

- All changed files since last ship
- ARCH.md (to verify architectural alignment)
- REQUIREMENTS.md (to verify spec compliance)

Output: structured review with CRITICAL/HIGH/MEDIUM/LOW findings.
CRITICAL findings must be fixed before next ship.

---

# Orbit Command: /orbit:riper <task>

> Structured RIPER analysis with an executable inner recovery loop when Execute fails

## PROCESS

1. Load `skills/riper.md` for the outer loop: Research → Innovate → Plan → Execute → Review.
2. If Execute succeeds, continue the normal task flow and emit the standard Orbit status blocks.
3. If Execute fails inside the repo-local RIPER runtime, Orbit invokes the recovery controller automatically.
   Hook and manual bridge path:
   - `node bin/recovery-loop.js --command /orbit:riper --phase execute --task "<task>" --error-message "<failure>"`
4. The recovery controller must:
   - write `.orbit/state/last_error.json`
   - append a deterministic recovery trace to `SUMMARY.md` when a summary path is supplied
   - decide `retry` for bounded repeated failures and `halt` after the same failure repeats 3 times
5. On `halt`, Orbit must stop autonomous retrying and request human help through `/orbit:review` or operator intervention.

Output:
- RIPER runtime status
- recovery-loop decision when Execute fails
- deterministic next command (`/orbit:riper` retry or `/orbit:review` halt path)

---

# Orbit Command: /orbit:audit

> Security + quality deep audit

## PROCESS

1. Spawn reviewer subagent with security focus:
   - OWASP Top 10 scan
   - Dependency vulnerability check
   - Secrets/credentials in codebase check
   - Auth/authz coverage check
2. Output: `SECURITY-AUDIT.md` with findings by severity

---

# Orbit Command: /orbit:eval

> Evaluate routing accuracy, workflow compliance, portability, and docs/registry consistency

## PROCESS

1. Run `bash bin/eval.sh` or the runtime adapter equivalent.
2. Check the README for the canonical positioning and runtime-agnostic story.
3. Verify the registry contains native and compatible runtime definitions.
4. Confirm the runtime adapter doc covers Claude, Codex, and Antigravity.
5. Confirm the eval doc and sample dataset cover routing, workflow compliance, registry integrity, and portability.
6. Output:
   - `.orbit/reports/eval/EVAL-REPORT.md` by default — human-readable pass/fail summary plus required follow-up actions
   - `.orbit/reports/eval/eval-report.json` by default — machine-readable eval runner output for CI/artifact consumers
   - `--output-dir <path>` may override the destination when an operator or CI job needs a custom artifact location

---

# Orbit Command: /orbit:monitor

> Observability + production health check

## PROCESS

Load `skills/observability.md`. Check:

- Health endpoints responding?
- Key metrics within normal ranges?
- Any alerts firing?
- Error rate trends?
- Latency trends?
  Output: `HEALTH-REPORT.md` with current state + any recommended actions

---

# Orbit Command: /orbit:debug <issue description>

> Systematic 4-phase root cause debugging

## PROCESS

Load `skills/debugging.md`. Then:

1. Reproduce: write a failing test that captures the bug
2. Isolate: binary search the call stack
3. Root cause: 5 whys analysis
4. Fix: root cause fix + regression test + related code scan

---

# Orbit Command: /orbit:map-codebase

> Deep analysis of existing repo before planning new work

## PROCESS

Spawn parallel analysis subagents:

- **Stack analyzer**: tech stack, frameworks, versions, dependencies
- **Architecture analyzer**: component boundaries, data flows, coupling
- **Quality analyzer**: test coverage, code smells, tech debt
- **Convention analyzer**: naming, patterns, error handling style

Output: `CODEBASE-MAP.md` — comprehensive snapshot that feeds into planning.

---

# Orbit Command: /orbit:progress

> Current project status — where are we, what's next, what's blocked

## PROCESS

Read STATE.md + ROADMAP.md. Output:

```
Project: {name}
Milestone: {M} — {name}
Phase status:
  ✅ Phase 1 — {name} (shipped)
  ✅ Phase 2 — {name} (shipped)
  🔄 Phase 3 — {name} (building, Wave 2 of 3)
  ⏳ Phase 4 — {name} (not started)
  ⏳ Phase 5 — {name} (not started)

Blockers: {list or "none"}
Next action: /orbit:build 3 to complete Wave 3
```

If called mid-session while a build or quick command is in progress, also emit:

```
━━━ Current Execution ━━━━━━━━━━━━━━━━━━━
  Command:  /orbit:{command}
  Agent:    {active agent}
  Wave:     {N} of {total}  (if applicable)
  Status:   {in progress|waiting for subagent|blocked}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

For tracked work, append the workflow gate block after the execution block so the operator can see whether the task is still in implementation, ready for review, or ready for PR.

Then append the recommended next command block from the runtime status contract.

---

# Orbit Command: /orbit:cost

> Show current model routing config and estimated token cost breakdown

## PROCESS

Read `orbit.config.json`. Output a table showing:

```
Model Routing (from orbit.config.json → models.routing)
──────────────────────────────────────────────────────
  classify   → {routing.classify}   (intent routing, simple lookups)
  standard   → {routing.standard}   (coding, debugging, most tasks)
  reasoning  → {routing.reasoning}  (architecture, complex reasoning)
  security   → {routing.security}   (threat modeling, adversarial)

Override: edit orbit.config.json → models.routing
Example:  examples/model-routing.config.json
```

If `orbit.config.json` is missing or has no `models.routing` key, warn:

```
⚠️  No models.routing found in orbit.config.json — using CLAUDE.md defaults.
   Run: cp examples/model-routing.config.json orbit.config.json
```

Then show session token usage if available from STATE.md or context metadata.

---

# Orbit Command: /orbit:resume

> Reload project state and continue from where we left off

## CALL MODES

**Session-start mode** (default — called at the beginning of a new session):
Full resume: read STATE.md + pre-compact-snapshot + git log + output full status summary + next command.

**Mid-session mode** (called while work is already in progress):
Diff mode: show only what changed in STATE.md since session started — new decisions, new todos, new blockers. Flag externally-added items clearly. Skip git log and snapshot re-read.

> Use mid-session mode when: another session may have merged a PR and updated STATE.md, or when switching context within the same session.

**Cross-session protocol:**

> **Switching sessions?** Always run `orbit:resume` first in the new session.
> `context.db` is the fast structured cache; `STATE.md` is the human-readable ledger and fallback. Any session that skips resume is working blind.

## PROCESS

1. If `.orbit/context.db` exists: run `node bin/context.js --load minimal` for fast partial context load (~300 tokens).
   Fallback: Read `.orbit/state/STATE.md` directly if context.db absent.
   Also read `.orbit/state/pre-compact-snapshot.md` if it exists.
2. Run `git log --oneline -5` to confirm what was last committed.
3. Output a status summary:
   - Active milestone + phase
   - Last 5 completed tasks
   - Open todos for current milestone
   - Any blockers

4. **Infer and output the Next Command block** using this decision table (first matching rule wins):

| STATE.md signal                                                                | Primary recommendation                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Active `/orbit:build [N]` in progress (wave incomplete)                        | `/orbit:build [N]` — continue wave execution       |
| Build complete, no `/orbit:review` recorded for current phase                  | `/orbit:review` — required before ship             |
| Review done, phase not yet shipped                                             | `/orbit:ship [N]` — open PR and deploy             |
| Last completed task was `/orbit:quick`, open issues remain in active milestone | `/orbit:quick #NNN <title>` — next unblocked issue |
| All milestone issues complete, next milestone defined                          | `/orbit:plan` — begin next milestone               |
| No active work / truly ambiguous                                               | `/orbit:next` — let Orbit auto-detect              |

Output format (always append this block):

```
---
## Recommended Next Command

**Primary**: /orbit:quick #NNN <issue title>
**Why**: <one sentence — current milestone state + why this is next>

**Alternatives**:
- /orbit:progress — review full milestone status
- /orbit:next — let Orbit auto-detect based on full state analysis
```

5. Continue work without requiring re-briefing.

6. Whenever a commit, push, stop, or pre-compact event occurs, refresh `context.db` from `STATE.md` so the structured cache stays current.

> **Tip**: Plain prompts are allowed. Orbit should infer the right workflow for tracked work. New scope still means a new Orbit task boundary, even when the user does not type the slash command explicitly.
> If the session is mid-flight, emit the current execution block and the completion footer before continuing.

---

# Orbit Command: /orbit:ask <question>

> Query project state mid-session — decisions, todos, blockers, version

## PROCESS

1. If `.orbit/context.db` exists: query it for the answer (uses structured tables).
   Falls back to `.orbit/state/STATE.md` if context.db not present — fully functional without context.db.
2. Read STATE.md (or context.db output) and answer the question directly.
3. Cite the source: decisions log, tasks table, or project facts.
4. If question references a decision, quote the rationale field verbatim.

**Examples:**

```
/orbit:ask what is blocking v2.9.0 wave 2?
/orbit:ask why did we choose SQLite for context.db?
/orbit:ask what did we complete today?
/orbit:ask what is the current version?
/orbit:ask what are the open todos this milestone?
```
