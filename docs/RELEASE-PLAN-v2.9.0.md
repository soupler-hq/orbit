# Orbit — Combined Release Plan v2.8.1 → v3.0.0
> Source: 360° Repo Audit · Agent Gap Analysis · SOTA Competitive Research (DeerFlow / MiroFish) · IDP Integration · Self-Orchestration
> Plan Date: 2026-03-29 | Repo: soupler-hq/orbit | RHS at plan time: 75/100

---

## The Prime Directive of This Release

**This plan is executed BY Orbit, not just about Orbit.**

Every issue is dispatched via Orbit's own slash commands. Every agent file is TDD'd. Every PR requires `/orbit:review`. Every session resumes from `STATE.md` via `/orbit:resume`.

The self-improvement cascade:

```
Wave 1 creates:    product-manager, business-analyst, qa-engineer, technical-writer
Wave 1.5 gate:     product-manager  → specs Wave 2 work
                   business-analyst → writes edge-case specs for Wave 3
                   qa-engineer      → writes TDD test plans for loop detection + clarification gate
                   technical-writer → documents all Wave 1 agents on day one

Wave 2 creates:    launch-planner (specced by product-manager just created)
Wave 3 creates:    loop detection (TDD'd by qa-engineer before hook is written)
Wave 4 creates:    IDP CI, repo structure, README (documented by technical-writer)
```

Each wave is better than the last because it uses agents that didn't exist when the wave was planned.
**The framework trains itself by feeding itself its own outputs.**

---

## Judge Review Summary (What Was Kept, Scoped, and Cut)

All inputs were filtered through an LLM judge pass before entering the roadmap.

### Cut (deviates from golden path or contradicts architecture)
| Item | Reason |
|------|--------|
| 14-layer middleware pipeline rewrite | DeerFlow's architecture transplanted onto incompatible soil. Orbit is a markdown+shell harness inside Claude Code, not a Python microservice. |
| IM channel integration (Slack/Telegram) | Requires Orbit to become a running service. Contradicts "harness" architecture. Separate product initiative. |
| Sandbox isolation (Docker/K8s) | Claude Code already provides sandboxing. Duplicates responsibility. |
| `customer-success` agent | Requires product analytics + human interaction data. Replaced with `user-onboarding.md` skill. |
| `legal-compliance` agent | LLMs should not produce legal determinations. Replaced with `compliance-checklist.md` skill (generates checklists for human review). |
| ACP orchestration | Premature — no public API surface yet. |
| Temporal STATE.md schema change | Breaking change for existing users. Replaced with additive `DECISIONS-LOG.md`. |

### Scoped Down
| Item | Scoped To |
|------|-----------|
| `product-marketing` agent | `launch-planner` — generates GTM templates, NOT performs market strategy |
| Per-agent memory | Extend existing MEMORY.md system with agent-scoped tags; no parallel infrastructure |
| `.orbit-skill` packaging | Deferred post-v3.0 (no skill marketplace yet; YAGNI) |
| Semantic eval | Optional `/orbit:eval --semantic` command, NOT a CI gate (API key dependency = Issue #46) |
| Distributed mutex | CI=true guard + documentation comment in orchestrator.js. Not Redis/DynamoDB. |
| AGENTS.md stale artifact | Delete it + .gitignore entry. (Intentionally eliminated 2026-03-28 per STATE.md.) |

### Deferred (valid, wrong timing)
SBOM generation, Codex security contract, ACP orchestration, `.orbit-skill` packaging — all post-v3.0.

---

## Self-Orchestration Protocol

### Every Session
```
/orbit:resume       → reads STATE.md + snapshot
                      Orbit knows the release state and picks up where it left off
```

### For Every Issue
```
/orbit:plan N       → product-manager (Wave 1+) specs requirements
                      business-analyst (Wave 1+) writes edge-case spec
                      architect reviews registry changes
                      → PHASE-N-PLAN.md

/orbit:build N      → engineer writes agent .md file
                      TDD: eval assertion BEFORE agent file
                      technical-writer (Wave 1+) writes documentation stub
                      → agents/*.md, skills/*.md, registry update, SUMMARY.md

/orbit:review       → reviewer + qa-engineer validate
                      MANDATORY before any PR

git push + PR       → orbit-sentinel CI (IDP pipeline.yml after Wave 4 #78)
                      All gates pass → merge to develop
```

### Wave 1.5 Gate (after Wave 1 merges, before Wave 2 starts)
```
/orbit:quick "Use product-manager to define requirements for launch-planner agent"
/orbit:quick "Use business-analyst to write edge-case spec for strategist scope narrowing"
/orbit:quick "Use qa-engineer to write TDD test plan for loop detection"
/orbit:quick "Use qa-engineer to write TDD test plan for clarification gate"
/orbit:quick "Use technical-writer to create documentation stubs for all Wave 1 agents"
```
This is the moment Orbit stops executing a human plan and starts evolving under its own intelligence.

### TDD Rule for Agent Files
```
1. Write eval-runner.js assertions for the new agent FIRST  (failing test)
2. Run eval-runner → confirm failure  (agent doesn't exist)
3. Write agents/{name}.md             (implementation)
4. Run eval-runner → confirm green    (TDD passes)
5. Commit: feat(agents): add {name} agent
6. PR → Sentinel CI → merge
```

### Agent Graduation Test
An agent is production-ready when:
- [ ] eval-runner assertions pass
- [ ] `/orbit:review` gives APPROVED (all CRITICAL/HIGH resolved)
- [ ] The agent was **used at least once** during the release that created it
- [ ] `technical-writer` has produced a documentation entry for it

---

## Milestone 1 — v2.8.1 "Housekeeping"
> Fix audit blockers, stale artifacts, establish IDP contract. No new features. Target: ≤1 week.

| # | Issue | Type | Effort |
|---|-------|------|--------|
| 57 | fix: align `package.json` license to `Apache-2.0` ← IDP promotion blocker | fix | 1h |
| 58 | chore: delete stale `AGENTS.md` artifact + add `.gitignore` entry | chore | 30m |
| 59 | chore: commit `package-lock.json` + add `npm ci --dry-run` CI gate | chore | 1h |
| 60 | fix(agents): trim safety-evaluator to load only `prompt-safety.md` | fix | 1h |
| 61 | chore(idp): create `metadata.yml` — adopt engineering-standards IDP contract | chore | 30m |

**RHS after v2.8.1: 77/100**

---

## Milestone 2 — v2.9.0 "Idea to Market"
> Complete agent roster for full product lifecycle. SOTA safety primitives. IDP adoption. Self-orchestrated by Orbit.
> Target: 4-5 weeks.

### Wave 0 — Release Bootstrap: Orbit Takes the Wheel
> Command: `/orbit:quick`

| # | Issue | Effort |
|---|-------|--------|
| 62 | feat(state): initialize v2.9.0 release STATE.md — prime Orbit with full release plan as tasks | 1h |
| 63 | docs(orbit): add "Building Orbit with Orbit" self-orchestration playbook to `docs/playbooks/` | 2h |

---

### Wave 1 — Agent Roster: Phase 1 & Build Gaps
> Command: `/orbit:build 1` | Agents: engineer (TDD), architect (registry), reviewer

| # | Issue | Outputs | Effort |
|---|-------|---------|--------|
| 64 | feat(agents): add `product-manager` agent | PRD.md, USER-STORIES.md, BACKLOG.md | 1d |
| 65 | feat(agents): add `business-analyst` agent | FUNCTIONAL-SPEC.md, USE-CASES.md, EDGE-CASES.md | 1d |
| 66 | feat(agents): add `qa-engineer` agent | TEST-PLAN.md, AUTOMATION-SPEC.md, QA-REPORT.md | 1d |
| 67 | feat(agents): add `technical-writer` agent | API-DOCS.md, USER-GUIDE.md, ONBOARDING.md | 1d |

---

### Wave 1.5 — Self-Improvement Gate *(sequential, no PR)*
Run immediately after Wave 1 merges. Use the 4 new agents to sharpen remaining waves before coding begins.

---

### Wave 2 — Phase 4 Agents + Strategist Refactor
> Command: `/orbit:build 2` | Agents: **product-manager**, **business-analyst**, engineer, reviewer

| # | Issue | Effort |
|---|-------|--------|
| 68 | feat(agents): add `launch-planner` agent (GTM templates, positioning canvas, launch checklists) | 1d |
| 69 | refactor(agents): narrow `strategist` scope — remove PRD/user-story triggers, offload to product-manager | 4h |
| 70 | feat(skills): add `user-onboarding.md` skill | 3h |
| 71 | feat(skills): add `compliance-checklist.md` skill (generates GDPR/regulatory checklists for human review) | 3h |

---

### Wave 3 — SOTA Safety Primitives + Workflows
> Command: `/orbit:build 3` | Agents: **qa-engineer** (TDD plans from 1.5 gate), engineer, security-engineer, reviewer

| # | Issue | Source | Effort |
|---|-------|--------|--------|
| 72 | feat(orchestrator): loop detection — break repetitive tool-call patterns in autonomous mode | DeerFlow | 1d |
| 73 | feat(hooks): clarification-gate hook event — pause wave when agent signals ambiguity | DeerFlow | 1d |
| 74 | feat(workflows): add `/orbit:discover` workflow (researcher + designer in user-research framing) | Agent gap audit | 4h |
| 75 | feat(workflows): add `/orbit:launch` workflow (launch-planner + technical-writer pipeline) | Agent gap audit | 4h |

---

### Wave 4 — State, IDP, Structure & Product Positioning
> Command: `/orbit:build 4` → `/orbit:ship 4` | Agents: **technical-writer**, **launch-planner**, devops, architect
> **This wave uses ALL new agents simultaneously for the first time**

| # | Issue | Source | Effort |
|---|-------|--------|--------|
| 76 | feat(state): add `DECISIONS-LOG.md` schema — temporal decision audit trail alongside STATE.md | MiroFish | 4h |
| 77 | fix(orchestrator): add `CI=true` guard for STATE.md mutex + documentation | Repo audit | 2h |
| 78 | chore(structure): clean repo root + GENERATED headers on generated views | Repo audit | 2h |
| 79 | feat(ci): replace orbit-sentinel.yml boilerplate with engineering-standards `pipeline.yml@v0.1.0` | IDP framework | 1d |
| 80 | chore(registry): consolidate `orbit.registry.json` for all v2.9.0 agents/skills/workflows | Registry sync | 3h |
| 81 | docs(readme): rewrite product positioning — Quick Start, "Who Is This For", competitive diff, idea-to-market story | Positioning audit | 1d |

**RHS after v2.9.0: ~88/100**

---

## Milestone 3 — v3.0.0 "Platform Standard"
> Quality evaluation, memory continuity, test hardening. Golden Path promotion candidate.
> Target: 6-8 weeks after v2.9.0.

| # | Issue | Source | Effort |
|---|-------|--------|--------|
| 82 | feat(eval): `/orbit:eval --semantic` — opt-in LLM quality evaluation (not a CI gate) | All three (gap) | 3d |
| 83 | feat(memory): extend auto-memory system with agent-scoped fact tagging | DeerFlow | 2d |
| 84 | test: E2E test suite — classify → dispatch → agent → STATE.md round-trip | Repo audit | 3d |
| 85 | test: expand eval-runner.js to 100+ assertions for v2.9.0 additions | Repo audit | 1d |
| 86 | docs: add "Hello World" trace walkthrough to README (target: new dev onboards in <20 min) | Repo audit | 4h |
| 87 | chore(config): name hook stages in `orbit.config.json` (loop-detect, clarify, guardrail, memory) | DeerFlow | 4h |

**RHS after v3.0.0: ~91/100 — Golden Path ✓**

---

## What Was NOT Adopted (and Why)

The following items from the competitive analysis were intentionally excluded:

| Rejected Item | Source | Reason |
|--------------|--------|--------|
| 14-layer middleware rewrite | DeerFlow | Orbit is markdown+shell; not a Python microservice. Transplanting DeerFlow's architecture is category error. |
| IM channel integration (Slack/Telegram) | DeerFlow | Requires running service. Contradicts Orbit's "harness" architecture. |
| Docker/K8s sandbox isolation | DeerFlow | Claude Code already sandboxes. Duplicates responsibility. |
| ACP agent orchestration | DeerFlow | Premature. No public API surface yet. YAGNI. |
| `.orbit-skill` packaging format | DeerFlow | No marketplace yet. YAGNI. |
| `customer-success` agent | Agent gap | LLM can't replace human CS. Replaced with skill. |
| `legal-compliance` agent | Agent gap | LLM legal advice is unsafe. Replaced with checklist skill. |
| Temporal STATE.md schema change | MiroFish | Breaking change for existing users. Additive DECISIONS-LOG.md instead. |
| SBOM in releases | Repo audit | Valid but deferred. No enterprise customers yet. |

---

## Issue Count & Scope

| Milestone | Issues | Waves | Target |
|-----------|--------|-------|--------|
| v2.8.1 — Housekeeping | 5 (#57–61) | 1 | ≤1 week |
| v2.9.0 — Idea to Market | 20 (#62–81) | 5 (incl. Wave 0 + 1.5 gate) | 4-5 weeks |
| v3.0.0 — Platform Standard | 6 (#82–87) | 2 | 6-8 weeks |
| **Total** | **31 issues** | | |

## RHS Projection

| Version | RHS | Classification |
|---------|-----|----------------|
| v2.8.0 (today) | 75/100 | Stable |
| v2.8.1 | 77/100 | Stable |
| v2.9.0 | ~88/100 | Near Golden Path |
| v3.0.0 | ~91/100 | **Golden Path** |

---

## Key Competitive Intelligence (Source: DeerFlow + MiroFish analysis)

### What Orbit has that neither competitor does
- Specialist persistent agent topology (architect, engineer, reviewer, strategist — persistent domain experts)
- Git-native workflow (atomic commits, worktrees, PR review gates) — deeply embedded
- Cost-optimized model routing (haiku/sonnet/opus by task complexity)
- Project lifecycle management (STATE.md, milestones, phases, DECISIONS-LOG.md)
- Agent Forge + promotion pathway (dynamic specialist creation)

### What was borrowed from DeerFlow
- Loop detection pattern (prevents autonomous spirals)
- Clarification gate concept (pause-and-ask before irreversible actions)
- Named hook stages (formalize existing hooks without rewriting)

### What was borrowed from MiroFish
- Temporal decision tracking concept → implemented as DECISIONS-LOG.md (without Zep Cloud dependency)

### The competitive positioning
Orbit and DeerFlow occupy different niches. DeerFlow = general-purpose task service (52k stars, ByteDance-backed). Orbit = engineering team framework with specialist topology, git discipline, and idea-to-market lifecycle. These are not direct competitors. Orbit's moat is the combination of things DeerFlow cannot replicate quickly: git-native workflow, specialist persistent roles, and the project lifecycle management layer.

---

*Plan authored via 360° audit process. LLM judge review applied before roadmap finalization.*
*Self-orchestration protocol: this plan is executed by Orbit using its own slash commands.*
