<div align="center">
  <img src="https://github.com/soupler-hq/orbit/raw/main/docs/assets/orbit-logo.png" alt="Orbit Logo" width="120" />
  <h1>Orbit — AI Agent Orchestration Framework</h1>
  <p><strong>Orbit gives your AI coding assistant a team structure, a memory, and a path from idea to shipped product.</strong></p>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Standard](https://img.shields.io/badge/standard-Soupler_Engineering-black)](#)

</div>

---

Orbit is a repo-native control plane for teams who want more than "one assistant in one chat." It turns Claude, Codex, or other compatible coding agents into a coordinated product-delivery system with specialist routing, workflow boundaries, durable memory, and Git-native review discipline. If you want to go from rough idea to researched plan, implementation, QA, launch prep, and shipped release without rebuilding process from scratch in every repo, Orbit is built for that path.

## What is Orbit?

Orbit is a tool-agnostic orchestration layer that turns compatible coding agents into a structured delivery system. It adds specialist routing, workflow boundaries, durable project memory, and repo-native review discipline so teams can move from idea to shipped product with less prompt drift and less process rebuilding.

## Who Is This For?

Orbit is built for teams who:

- want a coding assistant to behave more like a staffed product-engineering team than a single autocomplete surface
- need issue-backed, branch-backed, review-backed workflows instead of ad-hoc prompting
- are shipping full lifecycle work: discovery, planning, implementation, QA, launch, docs, and release
- care about continuity across sessions, branches, worktrees, and long-running tasks
- operate across one repo today but may need multi-repo coordination, shared standards, or platform-wide orchestration next

Common fits:

- product teams moving from idea to market in one repo
- platform teams standardizing AI-assisted delivery across multiple repos
- identity-heavy or IDP/auth-sensitive teams that need explicit review and workflow boundaries
- agencies or consultancies that need repeatable delivery structure across projects
- teams that like Claude or Codex, but want a stronger operating model around them

## Why Orbit?

Orbit is not trying to replace your preferred coding agent. It gives that agent a control plane.

| Capability                        | Claude/Codex alone | DeerFlow | Orbit |
| --------------------------------- | ------------------ | -------- | ----- |
| Specialist agent topology         | ✗                  | ✗        | ✓     |
| Git-native workflow boundaries    | ✗                  | ✗        | ✓     |
| Idea-to-market lifecycle coverage | ✗                  | ✗        | ✓     |
| Cost-optimized model routing      | ✗                  | ✗        | ✓     |
| Project memory across sessions    | ✗                  | Partial  | ✓     |

Three practical differences matter most:

1. Orbit is workflow-first, not prompt-first. It gives you `/orbit:discover`, `/orbit:plan`, `/orbit:build`, `/orbit:verify`, `/orbit:ship`, and `/orbit:launch` instead of expecting one prompt to carry everything.
2. Orbit is repo-native. Branch naming, PR evidence, validation, docs updates, and review gates live inside the repository, not as sidecar habits.
3. Orbit covers the full idea-to-market path. It does not stop at "generate code"; it includes product-definition agents, QA, technical writing, launch planning, and release support.

## Why Use This Framework

### With Orbit

- Requests route through explicit workflows and specialist agents instead of one long undifferentiated chat
- Teams get continuity across sessions, branches, worktrees, and review cycles
- Launch, QA, docs, and release work are part of the same system as implementation
- Git-native governance keeps evidence, docs updates, and review state close to the code

### Without Orbit

- Work tends to collapse into one assistant thread with fuzzy ownership boundaries
- Review, docs, and release handling become habits instead of enforced surfaces
- Cross-session continuity is weaker and harder to recover
- Idea-to-market work usually gets split across tools and ad-hoc prompt conventions

## Quick Start

You should be able to try Orbit in under 5 minutes.

**Prerequisites:** Node.js >=18, `npm`, `gh` CLI authenticated.

```bash
git clone https://github.com/soupler-hq/orbit.git && cd orbit
npm install
bash install.sh --local --tool claude
```

Open your Claude Code or compatible runtime in the repo, then run:

```text
/orbit:quick review this repo and tell me what to improve first
```

If you want the next structured step instead:

```text
/orbit:next
```

If you are resuming a previous session:

```text
/orbit:resume
```

> Slash commands (`/orbit:*`) are only available after install. If `/orbit:resume` shows "Unknown skill", rerun the install command for your mode and open a new session.

### Developer Install (Direct)

If you are contributing to Orbit itself, this is the direct development path:

```bash
git clone https://github.com/soupler-hq/orbit.git && cd orbit
npm install
bash install.sh --local --tool claude
```

Core development follows Orbit-on-Orbit rules: start from an issue, cut a branch from freshly pulled `develop`, enter through an Orbit workflow command, run review on the feature branch, and keep PR evidence truthful.

## Orbit as IDP Reference Implementation

Orbit is the reference Node package for Soupler's shared `engineering-standards` platform. We now split CI in two deliberate layers:

- `.github/workflows/orbit-sentinel.yml` calls `soupler-hq/engineering-standards/.github/workflows/pipeline.yml@v0.1.0` for generic Node, policy, and assurance pillars
- `.github/workflows/standards-enforcement.yml` reuses the platform's `pr-lint` and `commit-lint` composite actions
- Orbit keeps repo-specific checks local:
  - `pr-governance`
  - `human-views-drift`
  - `quality` via `bin/eval-runner.js`
  - `validate.sh` / `validate-config.sh`
  - `safety`
  - `publish-dry-run`

That split is intentional: Golden Path platform behavior should come from the platform, while Orbit-specific orchestration, contract, and safety guarantees stay owned by this repo.

## Advanced: Nexus Mode

Nexus Mode is Orbit's multi-repo differentiator.

It lets Orbit coordinate across a portfolio of repos such as `api`, `web`, `standards`, or `platform`, so the agent is not blind to cross-repo context. Instead of treating each repo as an island, Nexus gives you a meta-orchestrator that can route work, enforce standards, and carry intent across the stack.

Use it when you need:

- shared delivery rules across multiple repos
- platform-wide planning and rollout coordination
- repo-aware execution for frontend, backend, and standards repos together
- one control plane for an org instead of one prompt pattern per repo

Architecture details live in [docs/architecture/overview.md](docs/architecture/overview.md).

## How It Works

Orbit adds a thin but opinionated control plane around compatible coding agents:

1. classify the intent and complexity
2. route to the right specialist agent
3. execute through the matching workflow boundary
4. persist state for resume and handoff
5. verify before the work is considered done

At a glance:

- **Agent routing:** Orbit chooses from specialists such as `product-manager`, `business-analyst`, `qa-engineer`, `technical-writer`, `launch-planner`, `architect`, and `devops`
- **Workflow boundaries:** work moves through commands like `/orbit:discover`, `/orbit:plan`, `/orbit:build`, `/orbit:verify`, and `/orbit:ship`
- **Memory and continuity:** `STATE.md`, checkpoints, and resume flows help long-running work survive context compaction and session changes
- **Cost discipline:** model routing keeps smaller work on cheaper models and reserves heavier reasoning for tasks that need it
- **Safety and governance:** review gates, docs-update evidence, PR governance, and validation keep repo changes auditable

For the detailed architecture, see:

- [docs/architecture/overview.md](docs/architecture/overview.md)
- [docs/architecture/core-concepts.md](docs/architecture/core-concepts.md)
- [docs/architecture/runtime-adapters.md](docs/architecture/runtime-adapters.md)

## Idea to Market

Orbit's current milestone is built around a full product lifecycle, not just implementation.

The core story is:

1. validate the opportunity with `/orbit:discover`
2. turn it into a project with `/orbit:new-project`
3. break work into phases with `/orbit:plan`
4. execute the implementation with `/orbit:build`
5. test, review, and QA it with `/orbit:verify`
6. package, release, and launch it with `/orbit:ship` and `/orbit:launch`

That lifecycle is reflected in the current agent roster:

- `product-manager` for PRDs, requirements, user stories, and backlog shaping
- `business-analyst` for functional specs, use cases, and edge cases
- `qa-engineer` for test strategy, regression planning, and release gates
- `technical-writer` for changelogs, onboarding docs, guides, and README updates
- `launch-planner` for launch plans, GTM assets, and rollout support

Orbit is especially strong when you want one system to carry the product from rough concept to shipped release without switching process every time the work type changes.

### IDP and Auth-Heavy Teams

Orbit is also a strong fit for IDP, auth, and identity-sensitive products where workflow discipline matters as much as code generation. Those teams typically need architecture review, QA gates, docs updates, and security-aware release handling to stay explicit rather than conversational.

## Agent Roster

| Agent              | Best used for                                               |
| ------------------ | ----------------------------------------------------------- |
| `architect`        | system design, tradeoffs, scalability, architecture reviews |
| `engineer`         | coding, debugging, refactoring, implementation              |
| `strategist`       | milestones, sequencing, roadmaps, OKRs                      |
| `product-manager`  | PRDs, requirements, user stories, feature specs             |
| `business-analyst` | functional specs, use cases, process maps, edge cases       |
| `qa-engineer`      | QA strategy, regression suites, release gates               |
| `reviewer`         | code review, audit, quality gate                            |
| `devops`           | CI/CD, deployment, monitoring, infrastructure               |
| `researcher`       | feasibility, comparison, unknown domains                    |
| `designer`         | flows, IA, UX direction                                     |
| `technical-writer` | API docs, onboarding docs, changelogs, README updates       |
| `launch-planner`   | launch planning, GTM support, rollout messaging             |

See the broader contract surfaces in [docs/architecture/core-concepts.md](docs/architecture/core-concepts.md).

## Slash Commands

```text
/orbit:new-project     Start a project from scratch
/orbit:discover        Validate problem, user, and go-to-market readiness
/orbit:plan [N]        Research + spec + task breakdown for phase N
/orbit:build [N]       Execute phase N with parallel wave architecture
/orbit:verify [N]      Test + UAT + review phase N
/orbit:ship [N]        PR + deploy + release tagging
/orbit:launch          Launch planning + GTM artifacts
/orbit:next            Auto-detect and run the next step
/orbit:quick <task>    Ad-hoc task with full quality guarantees
/orbit:riper <task>    Structured Research→Innovate→Plan→Execute→Review
/orbit:forge <desc>    Build a new specialized agent on demand
/orbit:review          Code + architecture review
/orbit:audit           Security audit via security-engineer
/orbit:debug <issue>   4-phase systematic root-cause debugging
/orbit:resume          Reload STATE.md after compaction or new session
/orbit:progress        Current project status
/orbit:worktree        Manage git worktrees for parallel wave execution
/orbit:help            All commands and usage
```

## Token Optimization

Orbit is designed to keep agentic work practical, not just clever.

- smaller tasks route to cheaper models
- longer work is broken into waves and fresh subagent contexts
- durable state reduces the need to restate everything every session
- skills are lazy-loaded instead of dumped into every prompt

Read more in [docs/architecture/token-optimization.md](docs/architecture/token-optimization.md).

## Documentation

| Doc                                                                                                                        | Contents                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [docs/architecture/overview.md](docs/architecture/overview.md)                                                             | Control plane, wave execution model, model routing, repo layout, Nexus, Sentinel CI |
| [docs/architecture/core-concepts.md](docs/architecture/core-concepts.md)                                                   | Agents, skills, workflows, STATE.md, hooks, Agent Forge                             |
| [docs/architecture/token-optimization.md](docs/architecture/token-optimization.md)                                         | Six-layer token strategy, cost estimates, model profiles                            |
| [docs/architecture/security-model.md](docs/architecture/security-model.md)                                                 | Integrity verification, hook safety, prompt injection defense, SCA                  |
| [docs/architecture/runtime-adapters.md](docs/architecture/runtime-adapters.md)                                             | Claude (native), Codex (stable), Antigravity (experimental) adapter contracts       |
| [docs/operations/playbooks.md](docs/operations/playbooks.md)                                                               | Runbooks for common scenarios                                                       |
| [docs/playbooks/self-orchestration.md](docs/playbooks/self-orchestration.md)                                               | How Orbit uses Orbit to evolve itself across issues, waves, and review loops        |
| [docs/quality/evaluation-framework.md](docs/quality/evaluation-framework.md)                                               | Eval framework and scoring methodology                                              |
| [docs/quality/eval-dataset.md](docs/quality/eval-dataset.md)                                                               | Representative prompt set for regression testing                                    |
| [docs/plans/issue-125-provenance-driven-context-synthesis.md](docs/plans/issue-125-provenance-driven-context-synthesis.md) | Detailed recovery-engine plan and implementation waves                              |
| [docs/standards/artifact-conventions.md](docs/standards/artifact-conventions.md)                                           | Naming, placement, and traceability rules for plans, releases, and issue docs       |
| [docs/integrations/mcp-guide.md](docs/integrations/mcp-guide.md)                                                           | MCP server integration                                                              |
| [docs/operations/error-codes.md](docs/operations/error-codes.md)                                                           | ERR-ORBIT-NNN registry with runbooks                                                |
| [docs/governance/contributing.md](docs/governance/contributing.md)                                                         | How to add skills, agents, or patterns                                              |
| [docs/governance/code-of-conduct.md](docs/governance/code-of-conduct.md)                                                   | Community behavior and enforcement expectations                                     |
| [docs/releases/release-notes.md](docs/releases/release-notes.md)                                                           | Top-level release notes used for GitHub releases                                    |
| [SECURITY.md](SECURITY.md)                                                                                                 | Vulnerability reporting and threat model                                            |

## Contributing

Contributors should treat Orbit as a self-hosted framework:

For contributors working on Orbit itself, start with [docs/playbooks/self-orchestration.md](docs/playbooks/self-orchestration.md). It explains the issue-backed, state-backed workflow Orbit uses to build Orbit with Orbit.

---

- create or identify the issue first
- branch from freshly pulled `develop`
- use an Orbit command as the task entrypoint
- review the branch before considering it done
- keep PR body evidence and docs-update status truthful

Further guidance:

- [docs/governance/contributing.md](docs/governance/contributing.md)
- [docs/standards/artifact-conventions.md](docs/standards/artifact-conventions.md)

## Sample Eval Set

Use [docs/quality/eval-dataset.md](docs/quality/eval-dataset.md) to verify routing, workflow, and portability claims after changes. Representative prompts include product requirements, QA strategy, launch messaging, security reviews, and unknown-domain research.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
