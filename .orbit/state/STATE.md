# Orbit Project State
> Persistent release ledger for Orbit's v2.9.0 self-orchestrated milestone. Read before every session and update after meaningful progress.

## Project Vision
Orbit gives AI coding agents a durable operating system for shipping real product work: specialist roles, executable workflows, resumable state, and governance that survives thread switches and long release cycles.

## Project Context
- **Active Milestone**: v2.9.0 — Idea to Market (self-orchestrated by Orbit)
- **Active Phase**: Wave 0 → Wave 1 → Wave 1.5 → Wave 2 → Wave 3 → Wave 0.5 → Wave 4
- **Current Focus**: Wave 0.5 — Foundation Hardening
- **Current Version**: v2.8.1
- **Current Branch**: develop
- **Active PR**: none
- **Directive**: This release is executed by Orbit using its own slash commands. TDD for every agent file. /orbit:review before every PR.
- **Plan**: `docs/plans/v2.9.0-wave-4-ship-positioning.md`

## Phase Status

| Wave | Name | Status | Notes |
|------|------|--------|-------|
| 0 | Release Bootstrap | 🔄 in progress | Prime repo state, document self-orchestration, and keep `/orbit:resume` truthful. |
| 1 | Agent Roster | 🔄 in progress | Core product-lifecycle agents mostly landed; technical-writer remains open on the board. |
| 1.5 | Productization Layer | 🔄 in progress | GTM and specialist-skill follow-through still have open board items. |
| 2 | Safety + Workflow Primitives | ✅ shipped | Clarification gate, loop detection, launch/discover workflows, and decisions log are landed. |
| 3 | Structure + Registry Discipline | 🔄 in progress | Repo cleanup landed; registry consolidation is still open. |
| 0.5 | Foundation Hardening | 🔄 in progress | Prerequisite to Wave 4. Event-sourced state ✅, docs index, naming enforcement, plan relocation ✅. |
| 4 | Ship + Positioning | ⏳ blocked on Wave 0.5 | 7 audit-sourced issues (#205–#211) + #79, #81. Cannot start until Wave 0.5 complete. |

## Decision Ledger
See `.orbit/state/DECISIONS-LOG.md` for the additive decision history.
Use this file to summarize the current release surface, not to duplicate the full log.

## Blockers
```text
[OPEN] PR #190 — strict top-level Orbit command dispatch enforcement is still in flight.
[OPEN] Wave 4 is BLOCKED on Wave 0.5 Foundation Hardening (#214, #215 remain open).
[OPEN] Wave 4 CI hardening (#79) additionally blocked on test suite green (#205).
```

## Recently Completed (last 5 tasks)
```text
✅ #213 feat(state): implement event-sourced state model — EVENT-LOG.jsonl + bootstrap --replay — Wave 0.5
✅ #212 chore(plans): move PHASE-4-PLAN.md to docs/plans/ and rename per artifact-conventions.md — Wave 0.5
✅ #76 feat(state): add DECISIONS-LOG.md schema for temporal decision tracking - Wave 3
✅ #74 feat(workflows): add /orbit:discover workflow - Wave 2
✅ #75 feat(workflows): add /orbit:launch workflow - Wave 2
```

## Todos + Seeds

### v2.9.0 — Idea to Market

#### Wave 0 — Release Bootstrap (CURRENT)
- [ ] #62 — feat(state): initialize v2.9.0 release STATE.md — prime Orbit with full release plan
- [ ] #63 — docs(orbit): add 'Building Orbit with Orbit' self-orchestration playbook

#### Wave 1 — Agent Roster
- [x] #64 — feat(agents): add product-manager agent
- [x] #65 — feat(agents): add business-analyst agent
- [x] #66 — feat(agents): add qa-engineer agent
- [ ] #67 — feat(agents): add technical-writer agent

#### Wave 1.5 — Productization Layer
- [ ] #68 — feat(agents): add launch-planner agent (GTM templates, not strategy)
- [x] #69 — refactor(agents): narrow strategist scope — offload PRD/user-story triggers to product-manager
- [ ] #70 — feat(skills): add user-onboarding.md skill
- [ ] #71 — feat(skills): add compliance-checklist.md skill

#### Wave 2 — Safety + Workflow Primitives
- [x] #72 — feat(orchestrator): add loop detection for autonomous mode
- [x] #73 — feat(hooks): add clarification-gate — pause wave on agent ambiguity signal
- [x] #74 — feat(workflows): add /orbit:discover workflow
- [x] #75 — feat(workflows): add /orbit:launch workflow

#### Wave 3 — Structure + Registry Discipline
- [x] #76 — feat(state): add DECISIONS-LOG.md schema for temporal decision tracking
- [x] #77 — fix(orchestrator): add CI=true guard for STATE.md mutex with documentation
- [x] #78 — chore(structure): clean repo root + add GENERATED headers + restructure templates
- [ ] #80 — chore(registry): consolidate orbit.registry.json for all v2.9.0 agents/skills/workflows

#### Wave 0.5 — Foundation Hardening (CURRENT)
- [x] #212 — chore(plans): move PHASE-4-PLAN.md to docs/plans/ and rename per artifact-conventions.md
- [x] #213 — feat(state): implement event-sourced state model — typed event log + STATE.md as materialized view
- [ ] #214 — feat(docs): create documentation index with reading order and folder contracts
- [ ] #215 — feat(ci): add docs artifact naming gate to Sentinel — enforce artifact-conventions.md at commit time

#### Wave 4 — Ship + Positioning (Audit-Expanded — BLOCKED on Wave 0.5)
- [ ] #205 — fix(tests): resolve 2 failing command-runtime assertions — PR isolation + branch-mismatch format
- [ ] #206 — feat(security): enforce orbit.config.json schema validation at orchestrator startup
- [ ] #207 — fix(security): flip identity_separation default to true
- [ ] #208 — feat(test): expand vitest coverage surface to safety-evaluator and prompt-dispatch
- [ ] #211 — fix(ci): add Windows C:\Users\ path pattern to Sentinel PII scan
- [ ] #79 — feat(ci): adopt engineering-standards pipeline.yml — replace sentinel boilerplate
- [ ] #81 — docs(readme): rewrite product positioning for idea-to-market audience

## Seeds (Forward Ideas)
```text
[Post-v2.9.0] Close Issue #181 by making explicit Orbit-command dispatch autonomous across every supported runtime.
[v3.0.0] Expand memory continuity beyond checkpoint manifests into full provenance-driven recovery.
[v3.0.0] #209 — chore(refactor): split eval-runner.js into per-domain modules (1,882 LOC, 5 concerns)
[v3.0.0] #210 — feat(orchestrator): replace .orbit.lock directory mutex with CI-safe distributed locking (WAL strategy)
```

## Open Questions
```text
- Should open board items #67 and #68 be reconciled against already-landed agent surfaces before the milestone is marked complete?
- Which final release branch/cut process should own the v2.9.0 ship wave once README and CI modernization land?
```
