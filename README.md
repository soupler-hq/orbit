<div align="center">
  <img src="https://github.com/soupler-hq/orbit/raw/main/docs/assets/orbit-logo.png" alt="Orbit Logo" width="120" />
  <h1>Orbit — AI Agent Orchestration Framework</h1>
  <p><strong>Production-grade, repo-native control plane for agentic software delivery.</strong></p>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Standard](https://img.shields.io/badge/standard-Soupler_Engineering-black)](#)

</div>

---

## What is Orbit?

Orbit is a tool-agnostic control plane that turns any compatible coding agent (Claude, Codex, Antigravity) into a coordinated engineering team. It classifies intent, routes to specialist agents, executes work in parallel waves with fresh contexts, and persists state across sessions — all from your repository.

**Key capabilities:** smart agent routing · Agent Forge · wave execution · model-cost routing · prompt injection defense · 21 reusable skills · STATE.md persistence · multi-repo Nexus mode

Supported runtimes can infer workflow intent from plain prompts. Users do not have to prefix every request with `/orbit:*` when the adapter supports it; explicit commands still override inference.

### Compatibility

Orbit works across runtimes — Claude Code (native), Codex (stable), Antigravity (experimental). Any agent that can read markdown instructions and run repo-local scripts can use the same registry, skills, and workflows without changes. See [docs/architecture/runtime-adapters.md](docs/architecture/runtime-adapters.md).

---

## Install

**Prerequisites:** Node.js ≥18, `npm`, `gh` CLI authenticated.

```bash
# VS Code / IDE — installs into project .claude/
bash install.sh --local --tool claude

# Terminal claude CLI — installs into ~/.claude/
bash install.sh --global --tool claude

# Both
bash install.sh --all --tool claude
```

> Slash commands (`/orbit:*`) are only available after install. If `/orbit:resume` shows "Unknown skill", run the install command for your mode and open a new session.

Verify: open a Claude Code session and type `/orbit:help`.

For local repo installs, Orbit also links git lifecycle hooks for `pre-commit`, `post-commit`, and `pre-push` when a Git worktree is detected, including linked worktrees.

**Contributing / core development:**

```bash
git clone https://github.com/soupler-hq/orbit.git && cd orbit
npm install
bash install.sh --local --tool claude
```

Core development follows Orbit-on-Orbit rules: create or identify the issue, cut a feature branch from freshly pulled `develop`, use an Orbit workflow command as the task entrypoint, run review on the feature branch, and open a PR using the repo's standard body structure.

---

## Slash commands

```
/orbit:new-project     Start a project from scratch
/orbit:plan [N]        Research + spec + task breakdown for phase N
/orbit:build [N]       Execute phase N with parallel wave architecture
/orbit:verify [N]      Test + UAT + review phase N
/orbit:ship [N]        PR + deploy + release tagging
/orbit:next            Auto-detect and run the next step
/orbit:quick <task>    Ad-hoc task with full quality guarantees
/orbit:riper <task>    Structured Research→Innovate→Plan→Execute→Review
/orbit:forge <desc>    Build a new specialized agent on demand
/orbit:review          Code + architecture review (language-specific)
/orbit:audit           Security audit via security-engineer (OWASP/STRIDE)
/orbit:debug <issue>   4-phase systematic root-cause debugging
/orbit:resume          Reload STATE.md after compaction or new session
/orbit:progress        Current project status
/orbit:worktree        Manage git worktrees for parallel wave execution
/orbit:help            All commands and usage
```

---

## Documentation

| Doc                                                                                                    | Contents                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [docs/architecture/overview.md](docs/architecture/overview.md)                                         | Control plane, wave execution model, model routing, repo layout, Nexus, Sentinel CI |
| [docs/architecture/core-concepts.md](docs/architecture/core-concepts.md)                               | Agents, skills, workflows, STATE.md, hooks, Agent Forge                             |
| [docs/architecture/token-optimization.md](docs/architecture/token-optimization.md)                     | Six-layer token strategy, cost estimates, model profiles                            |
| [docs/architecture/security-model.md](docs/architecture/security-model.md)                             | Integrity verification, hook safety, prompt injection defense, SCA                  |
| [docs/architecture/runtime-adapters.md](docs/architecture/runtime-adapters.md)                         | Claude (native), Codex (stable), Antigravity (experimental) adapter contracts       |
| [docs/operations/playbooks.md](docs/operations/playbooks.md)                                           | Runbooks for common scenarios                                                       |
| [docs/quality/evaluation-framework.md](docs/quality/evaluation-framework.md)                           | Eval framework and scoring methodology                                              |
| [docs/quality/eval-dataset.md](docs/quality/eval-dataset.md)                                           | Representative prompt set for regression testing                                    |
| [docs/plans/issue-125-provenance-driven-context-synthesis-v1.md](docs/plans/issue-125-provenance-driven-context-synthesis-v1.md) | Detailed recovery-engine plan and implementation waves |
| [docs/standards/artifact-conventions.md](docs/standards/artifact-conventions.md)                       | Naming, placement, and traceability rules for plans, releases, and issue docs       |
| [docs/integrations/mcp-guide.md](docs/integrations/mcp-guide.md)                                       | MCP server integration                                                              |
| [docs/operations/error-codes.md](docs/operations/error-codes.md)                                       | ERR-ORBIT-NNN registry with runbooks                                                |
| [docs/governance/contributing.md](docs/governance/contributing.md)                                     | How to add skills, agents, or patterns                                              |
| [docs/governance/code-of-conduct.md](docs/governance/code-of-conduct.md)                               | Community behavior and enforcement expectations                                     |
| [docs/releases/release-notes.md](docs/releases/release-notes.md)                                       | Top-level release notes used for GitHub releases                                    |
| [SECURITY.md](SECURITY.md)                                                                             | Vulnerability reporting and threat model                                            |

Planning artifacts belong in `docs/plans/`. Release support artifacts belong in `docs/releases/`. Durable issue briefs belong in `docs/issues/` only when needed. Canonical documentation is grouped by intent under `docs/architecture/`, `docs/operations/`, `docs/quality/`, `docs/integrations/`, and `docs/governance/`. Naming and ordering rules live in `docs/standards/artifact-conventions.md`.

---

## Why Use This Framework

### With Orbit

- Requests are classified before execution — the right agent gets the right job
- Complex work is decomposed into waves instead of being forced through one long context
- Skills create repeatable standards for TDD, architecture, security, and deployment
- Hooks and STATE.md make long-running work resumable across sessions
- The same repo works across Claude, Codex, and Antigravity without rewrites

### Without Orbit

- The assistant jumps straight into implementation, skipping planning and review
- Context accumulates until earlier architectural decisions become fuzzy
- Security and operational concerns depend on memory rather than explicit process
- Multi-step work is harder to resume, audit, or hand off

---

## Sample Eval Set

Use [docs/quality/eval-dataset.md](docs/quality/eval-dataset.md) to verify routing, workflow, and portability claims after changes. Representative prompts: add rate limiting to auth endpoints · design a multi-region active-active architecture · review a React auth component · create a CI/CD rollback plan · unknown domain with high uncertainty.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE). Full patent protections for enterprise adoption.
