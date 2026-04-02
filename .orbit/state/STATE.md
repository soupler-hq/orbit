# Orbit Project State
> Persistent release ledger for Orbit's v2.9.0 self-orchestrated milestone. Read before every session and update after meaningful progress.

## Project Vision
Orbit gives AI coding agents a durable operating system for shipping real product work: specialist roles, executable workflows, resumable state, and governance that survives thread switches and long release cycles.

## Project Context
- **Active Milestone**: v2.9.0 — Idea to Market (self-orchestrated by Orbit)
- **Active Phase**: Wave 0 → Wave 1 → Wave 1.5 → Wave 2 → Wave 3 → Wave 4
- **Current Focus**: Wave 0 — Release Bootstrap
- **Current Version**: v2.8.1
- **Current Branch**: develop
- **Active PR**: none
- **Directive**: This release is executed by Orbit using its own slash commands. TDD for every agent file. /orbit:review before every PR.

## Phase Status

| Wave | Name | Status | Notes |
|------|------|--------|-------|
| 0 | Release Bootstrap | 🔄 in progress | Prime repo state, document self-orchestration, and keep `/orbit:resume` truthful. |
| 1 | Agent Roster | 🔄 in progress | Core product-lifecycle agents mostly landed; technical-writer remains open on the board. |
| 1.5 | Productization Layer | 🔄 in progress | GTM and specialist-skill follow-through still have open board items. |
| 2 | Safety + Workflow Primitives | ✅ shipped | Clarification gate, loop detection, launch/discover workflows, and decisions log are landed. |
| 3 | Structure + Registry Discipline | 🔄 in progress | Repo cleanup landed; registry consolidation is still open. |
| 4 | Ship + Positioning | ⏳ not started | Final release posture depends on CI modernization and README positioning completion. |

## Decision Ledger
See `.orbit/state/DECISIONS-LOG.md` for the additive decision history.
Use this file to summarize the current release surface, not to duplicate the full log.

## Blockers
```text
[OPEN] PR #190 — strict top-level Orbit command dispatch enforcement is still in flight and should merge before relying on command routing as fully autonomous.
[OPEN] README positioning and CI modernization remain open release risks in Wave 4 (#79, #81).
```

## Recently Completed (last 5 tasks)
```text
✅ #76 feat(state): add DECISIONS-LOG.md schema for temporal decision tracking - Wave 3, committed on develop
✅ #74 feat(workflows): add /orbit:discover workflow - Wave 2, committed on develop
✅ #75 feat(workflows): add /orbit:launch workflow - Wave 2, committed on develop
✅ #72 feat(orchestrator): add loop detection for autonomous mode - Wave 2, committed on develop
✅ #73 feat(hooks): add clarification-gate — pause wave on agent ambiguity signal - Wave 2, committed on develop
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

#### Wave 4 — Ship + Positioning
- [ ] #79 — feat(ci): adopt engineering-standards pipeline.yml — replace sentinel boilerplate
- [ ] #81 — docs(readme): rewrite product positioning for idea-to-market audience

## Seeds (Forward Ideas)
```text
[Post-v2.9.0] Close Issue #181 by making explicit Orbit-command dispatch autonomous across every supported runtime.
[v3.0.0] Expand memory continuity beyond checkpoint manifests into full provenance-driven recovery.
```

## Open Questions
```text
- Should open board items #67 and #68 be reconciled against already-landed agent surfaces before the milestone is marked complete?
- Which final release branch/cut process should own the v2.9.0 ship wave once README and CI modernization land?
```
