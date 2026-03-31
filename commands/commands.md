# STATE.md Update Protocol
> Standing rule — applies to every Orbit command, every session

STATE.md is Orbit's memory. It must stay current without being asked. Update it automatically whenever any of the following occur:

| Trigger | What to write |
|---------|---------------|
| Issue completed (PR merged or task done) | Move item from Todos to Last 5 Completed Tasks |
| Decision made (architecture, scope, approach) | Add row to Decisions Log with date, version, decision, rationale |
| New issue created | Add to appropriate wave/milestone in Todos |
| Blocker encountered | Add to Todos with `BLOCKED:` prefix and reason |
| Blocker resolved | Remove from Todos, add resolution to Decisions Log |
| Milestone shipped | Update Active Milestone, Current Version, add to Decisions Log |
| Session produces significant context | Update Project Context if active phase/milestone changed |

**Rules:**
- Never wait to be asked. Update STATE.md as part of completing any task.
- Decisions Log entries must include rationale — not just what was decided, but why.
- Last 5 Completed Tasks: always most recent first, always include issue number if applicable.
- If STATE.md does not exist, create it before doing any other work.

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

Read `PHASE-{N}-PLAN.md`. For each wave:

**Dispatch subagents in parallel** (one per task in the wave):
```
Subagent context: {task XML} + {relevant ARCH.md sections} + {STATE.md} + {tech stack}
Subagent instruction: Execute exactly this task. Load the skills it requires. TDD always.
Commit atomically when done. Write SUMMARY.md.
```

After each wave: collect SUMMARY.md files. Check for blockers before next wave.

After all waves: run verification subagent:
```
Verify: does the codebase deliver everything Phase N promised?
Check against REQUIREMENTS.md. Output: PHASE-{N}-VERIFICATION.md
```

Update STATE.md with phase completion.

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

---

# Orbit Command: /orbit:next
> Auto-detect current state and run the next logical step

## PROCESS

Read STATE.md + ROADMAP.md. Determine:
- No project initialized → run `/orbit:new-project`
- Phase planned but not built → run `/orbit:build N`
- Phase built but not verified → run `/orbit:verify N`
- Phase verified but not shipped → run `/orbit:ship N`
- All phases complete → run `/orbit:milestone`
- Otherwise → show status and ask

---

# Orbit Command: /orbit:quick <task description>
> Ad-hoc task with Orbit quality guarantees, no full planning

## PROCESS

1. Classify: which agent handles this?
2. Define single XML task:
   ```xml
   <task type="...">
     <n>...</n>
     <files>...</files>
     <action>...</action>
     <verify>...</verify>
     <done>...</done>
   </task>
   ```
3. Execute with relevant skill loaded
4. Verify, commit, update STATE.md

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

Load `agents/reviewer.md`. Spawn reviewer subagent with:
- All changed files since last ship
- ARCH.md (to verify architectural alignment)
- REQUIREMENTS.md (to verify spec compliance)

Output: structured review with CRITICAL/HIGH/MEDIUM/LOW findings.
CRITICAL findings must be fixed before next ship.

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
6. Output: `EVAL-REPORT.md` with pass/fail results and any required follow-up actions.

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
> STATE.md is the source of truth. Any session that skips resume is working blind.

## PROCESS

1. Read `.orbit/state/STATE.md`. If it exists, also read `.orbit/state/pre-compact-snapshot.md`.
2. Run `git log --oneline -5` to confirm what was last committed.
3. Output a status summary:
   - Active milestone + phase
   - Last 5 completed tasks
   - Open todos for current milestone
   - Any blockers

4. **Infer and output the Next Command block** using this decision table (first matching rule wins):

| STATE.md signal | Primary recommendation |
|----------------|----------------------|
| Active `/orbit:build [N]` in progress (wave incomplete) | `/orbit:build [N]` — continue wave execution |
| Build complete, no `/orbit:review` recorded for current phase | `/orbit:review` — required before ship |
| Review done, phase not yet shipped | `/orbit:ship [N]` — open PR and deploy |
| Last completed task was `/orbit:quick`, open issues remain in active milestone | `/orbit:quick #NNN <title>` — next unblocked issue |
| All milestone issues complete, next milestone defined | `/orbit:plan` — begin next milestone |
| No active work / truly ambiguous | `/orbit:next` — let Orbit auto-detect |

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
