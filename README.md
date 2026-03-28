<div align="center">
  <img src="https://github.com/soupler-hq/orbit/raw/main/docs/assets/orbit-logo.png" alt="Orbit Logo" width="120" />
  <h1>Orbit — The SOTA AI Agent Orchestrator</h1>
  <p><strong>A production-grade, repo-native control plane for enterprise agentic software delivery.</strong></p>

  [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
  [![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
  [![Standard](https://img.shields.io/badge/standard-Soupler_Engineering-black)](#)
</div>

---

## 🌌 What is Orbit?

> **The Mental Model**: Imagine a massive construction site. You have hundreds of workers (the Agent models). Without a **Site Manager** and a **Blueprint** (Orbit), every worker might try to build the kitchen in a different spot. Orbit is the site office—providing the specific blueprints, safety protocols, and coordination needed to build a skyscraper instead of a pile of bricks.

Orbit is a tool-agnostic, production-grade control plane for agent-driven development. It helps any compatible coding agent behave like a coordinated engineering team with specialized roles for architecture, implementation, strategy, review, security, DevOps, data engineering, and research.

It is designed to work across runtimes, not just one assistant. Claude, Codex, and Antigravity can all use the same repository-level instructions, skills, workflows, hooks, and registry.

Key capabilities:

- Smart agent routing - classifies intent, selects the best agent, and falls back to Agent Forge
- Agent Forge - dynamically creates new specialized agents when none fits well enough
- Wave execution - parallel subagent dispatch with fresh contexts and no context rot
- Model routing - low-cost routing for classify, implement, and complex reasoning tasks
- Context preservation - pre-compact hooks plus `/orbit:resume` protect long-running work
- RIPER workflow - Research -> Innovate -> Plan -> Execute -> Review for disciplined execution
- Prompt injection defense - hook-based detection for risky or adversarial input
- 17 domain skills - TDD, architecture, security, deployment, AI systems, RIPER, git worktrees, prompt safety, and more
- Language-specific reviewers - TypeScript, Python, and Go specialists instead of a generic reviewer only
- Production state - persistent STATE.md memory, atomic commits, and project-level operational memory
- Machine-readable registries - agent, skill, and workflow metadata live in `orbit.registry.json`

### Compatibility

Orbit is intentionally runtime-agnostic:

- Claude Code - first-class support through `CLAUDE.md`, hooks, and slash commands
- Codex - works with Codex-managed sessions and repository instructions
- Antigravity - compatible with any agent runtime that can read markdown instructions and execute repo-local workflows
- Other runtimes - if the tool can follow repo instructions, run scripts, and respect hook policies, it can use this framework

### Architecture

```mermaid
flowchart TB
    U[Developer / User]
    R[Orbit Repo]
    C[Runtime Agent]
    P[CLAUDE.md / INSTRUCTIONS.md]
    G[orbit.registry.json]
    S[Skills]
    A[Specialist Agents]
    W[Workflows]
    H[Hooks]
    M[STATE.md / pre-compact snapshot]
    T[Tools / Git / MCP / Shell]

    U --> C
    C --> P
    P --> G
    P --> S
    P --> W
    G --> A
    C --> H
    H --> M
    C --> T
    A --> T
    W --> A
    R --- P
    R --- G
    R --- S
    R --- W
```

#### 🧭 Architecture Narrated
1. **The User** (top) sends a request to the **Runtime Agent** (Claude Code, Antigravity, etc.).
2. **The Runtime** pulls its "DNA" from the **Registry** (`orbit.registry.json`) and **Instructions**.
3. **Intent Classification** determines which **Specialist Agent** should handle the work.
4. **Safety Gates** are enforced via **Hooks** (H) before any tools are touched.
5. **Persistence** ensures that even if the session ends, the **STATE.md** (M) allows the next agent to resume exactly where the last one finished.

### Flow Diagram

```mermaid
flowchart LR
    Request[User request]
    Classify[Classify domain, complexity, and mode]
    Route[Select agent or forge new one]
    Plan[Plan work in waves]
    Execute[Run fresh subagent contexts]
    Verify[Verify output, tests, and safety]
    Persist[Update STATE.md and snapshots]
    Ship[Commit, deploy, or hand off]

    Request --> Classify --> Route --> Plan --> Execute --> Verify --> Persist --> Ship
```

#### 🌊 The Execution Wave (Step-by-Step)
- **Classify**: Orbit maps your request to a `Domain` (e.g. ENGINEERING) and `Mode` (e.g. AUTONOMOUS).
- **Route**: If a specialist exists, it is dispatched. If not, **Agent Forge** builds a new one.
- **Plan**: Work is split into parallel **Waves** using `skills/planning.md`.
- **Execute**: Subagents spin up in fresh contexts—no "context rot" from old conversations.
- **Verify**: The **RALPH** self-correction loop (`skills/reflection.md`) catches errors before they reach you.
- **Persist**: The final state is burned into **STATE.md** and committed as an atomic unit.

### Component Diagram

```mermaid
flowchart TB
    subgraph ControlPlane[Control Plane]
        CLAUDE[CLAUDE.md]
        INSTR[INSTRUCTIONS.md]
        SKILLS[SKILLS.md]
        WORK[WORKFLOWS.md]
        REG[orbit.registry.json]
    end

    subgraph Runtime[Runtime Layer]
        AGENT[Runtime Agent]
        CLI[/Slash Commands/]
        HOOKS[Hooks]
    end

    subgraph Execution[Execution Layer]
        CORE[Core Agents]
        SPEC[Specialist Agents]
        FORGE[Agent Forge]
    end

    subgraph Persistence[Persistence Layer]
        STATE[STATE.md]
        SNAP[pre-compact snapshot]
        GIT[Git history]
    end

    CLAUDE --> AGENT
    INSTR --> AGENT
    SKILLS --> AGENT
    WORK --> AGENT
    REG --> AGENT
    CLI --> AGENT
    HOOKS --> STATE
    AGENT --> CORE
    AGENT --> SPEC
    AGENT --> FORGE
    AGENT --> STATE
    STATE --> SNAP
    STATE --> GIT
```

#### 🏗️ The Three Pillars of Orbit
Orbit is architected around three fundamental layers that ensure stability and scalability:

| Pillar | Responsibility | Core Files |
| :--- | :--- | :--- |
| **1. Control Plane** | The "Rules of the House." Governs routing, safety, and agent roles. | `orbit.registry.json`, `CLAUDE.md`, `INSTRUCTIONS.md` |
| **2. Execution Layer** | The "Workers." Specialized agents and reusable skills that perform the actual work. | `agents/`, `skills/`, `forge/` |
| **3. Persistence Layer** | The "Memory." Ensures long-running tasks are resumable and every change is traceable. | `STATE.md`, `hooks/`, `Git History` |

### Tool-Agnostic Control Plane

The framework separates orchestration policy from runtime implementation:

- The repository defines the rules, roles, workflows, and persistence format
- The active agent runtime interprets those instructions
- The same repo structure can be used by Claude, Codex, or Antigravity without rewriting the workflow model
- The framework is not tied to one model vendor or one CLI surface
- Platform-specific behavior should live in adapters, not in the core control plane

---

## 🚀 Installation & Setup

Orbit v2.4.0 is distributed as a scoped NPM package via **GitHub Packages** and operates through our **Nexus SOTA Architecture**.

### 1. Enterprise Nexus Installation (Recommended)
To use Orbit across your organization and orchestrate multiple repositories, initialize the Nexus Workspace.

```bash
# Add to your .npmrc file
@soupler-hq:registry=https://npm.pkg.github.com

# Install as a global or workspace dev dependency
npm install @soupler-hq/orbit --save-dev

# Initialize the Orbit Control Plane in your root directory
npx orbit nexus init --tool claude

# Synchronize your multi-repo workspace
npx orbit nexus sync
```

### 2. Manual/Legacy Installation
If you are contributing to the Orbit core:
```bash
git clone https://github.com/soupler-hq/orbit.git
cd orbit
npm install
bash bin/install.sh --local --tool claude
```

## Repository Sovereignty: Public vs. Private

Orbit behaves differently based on your repository's visibility to ensure maximum security.

| Feature | Public Repo 🌐 | Private Repo 🔒 |
| :--- | :--- | :--- |
| **Registry Auth** | No token needed for `npm install`. | **Required**: PAT with `read:packages` in `.npmrc`. |
| **Nexus Discovery** | Syncs all public peer repos. | Requires a token with cross-repo `repo` scope. |
| **Agent Forge** | Forged agents are public if committed. | All forged patterns stay behind your firewall. |
| **CI/CD** | `GITHUB_TOKEN` is sufficient for Sentinel. | `GPR_TOKEN` secret must be provided for Release. |

> [!IMPORTANT]
> **Private Repo Setup**: To install Orbit in a private repo, you MUST provide an `_authToken` in your `.npmrc`:
> `//npm.pkg.github.com/:_authToken=YOUR_PAT_TOKEN`

### Verify

Start a Claude Code session in your project and type `/orbit:help`. You should see the full command list.

---

## Repository Layout

The repository is organized as a control plane:

- `CLAUDE.md` is the session orchestrator for Claude-compatible runtimes
- `orbit.config.json` and `orbit.config.schema.json` define runtime config and validation
- `orbit.registry.json` is the machine-readable source of truth for agents, skills, and workflows
- `INSTRUCTIONS.md`, `SKILLS.md`, and `WORKFLOWS.md` are the human-readable control-plane docs
- `agents/` and `forge/` hold the role-based agent definitions
- `skills/` holds reusable process frameworks that get loaded on demand
- `hooks/` contains the lifecycle and safety hooks
- `commands/` defines the `/orbit:` command surface
- `state/` and `examples/` show how long-running work is persisted and resumed
- `docs/` contains supporting guidance for token optimization, MCP usage, and playbooks
- `install.sh` wires the framework into a target project
- `tests/` unit test suite (Vitest) — `npm test` to run
- `eslint.config.mjs` and `.prettierrc` define code quality rules — `npm run lint`, `npm run format:check`
- `SECURITY.md` vulnerability reporting and threat model

---

## Core Concepts

### 1. Orbit Orchestrator

The `CLAUDE.md` file is the brain for Claude Code sessions, but the same control-plane idea works in other runtimes too. It classifies your request, selects the right agent, designs parallel execution, and dispatches work with proper context.

### 2. Agents

Specialized agents with deep domain expertise. Each has:

- Clear triggers for when it activates
- Domain-specific operating rules
- Required skills to load
- Defined output formats
- Quality standards and anti-patterns

### 3. Skills

Reusable process frameworks. Skills are loaded into subagent contexts when needed - lazy, targeted, not everything at once. TDD is always loaded for code. Security is always loaded for architecture. Planning is always loaded for roadmaps.

### 4. Wave Execution

Work is broken into dependency-ordered waves. Tasks within a wave run in parallel, each in a fresh context. No accumulated context rot. Your main session stays light while subagents do the heavy lifting.

### 5. Agent Forge

When no existing agent covers your task well enough, `/orbit:forge` creates a new specialized agent on the spot. It defines it, registers it, and dispatches your task to it - all in one step.

---

## Slash Commands

```bash
# Project lifecycle
/orbit:new-project         # Start a project from scratch (brainstorm -> spec -> roadmap)
/orbit:plan [N]            # Research + design + task breakdown for phase N
/orbit:build [N]           # Execute phase N with parallel wave architecture
/orbit:verify [N]          # Test + UAT + review phase N
/orbit:ship [N]            # PR + deploy + release tagging
/orbit:next                # Auto-detect state and run the next logical step
/orbit:milestone           # Archive milestone, tag release, start next

# Quick work
/orbit:quick <task>        # Ad-hoc task with full Orbit quality guarantees
/orbit:riper <task>        # Structured thinking: Research->Innovate->Plan->Execute->Review

# Agent management
/orbit:forge <description> # Build a new specialized agent for this domain

# Code quality
/orbit:review              # Full code + architecture review (language-specific specialists)
/orbit:audit               # Security audit via security-engineer agent (OWASP/STRIDE)
/orbit:debug <issue>       # 4-phase systematic root cause debugging

# Infrastructure
/orbit:deploy <env>        # Deploy to staging or production
/orbit:rollback            # Revert last deployment
/orbit:monitor             # Production health check + observability report

# Context + cost
/orbit:resume              # Reload STATE.md after context compaction (or new session)
/orbit:progress            # Current project status
/orbit:cost                # Token usage + estimated cost for session
/orbit:worktree            # Manage git worktrees for parallel wave execution

# Navigation
/orbit:map-codebase        # Deep analysis of existing repo
/orbit:help                # All commands and usage
```

---

## Usage Examples

### Start a new project

```
User: I want to build an e-commerce platform for handmade goods
Orbit: [loads brainstorming skill, asks 5 targeted questions]
       [spawns researcher subagent - domain, stack options, pitfalls]
       [produces PROJECT.md, REQUIREMENTS.md, ROADMAP.md]
       [presents roadmap for approval in sections]
       Ready. Run /orbit:plan 1 to plan Phase 1.
```

### Build a feature with parallel execution

```
User: /orbit:build 2
Orbit: [reads PHASE-2-PLAN.md]
       [Wave 1: spawns 3 parallel engineer subagents]
         -> Subagent A: User model + migrations (fresh context)
         -> Subagent B: Auth endpoints (fresh context)
         -> Subagent C: Email service (fresh context)
       [Wave 1 complete. Collecting SUMMARY.md files.]
       [Wave 2: spawns 2 parallel subagents]
         -> Subagent D: Checkout flow (reads Wave 1 outputs)
         -> Subagent E: Payment integration (reads Wave 1 outputs)
       [Verification subagent: all requirements met?]
       Phase 2 complete. 47 files changed, 312 tests passing.
```

### Create a custom agent

```
User: /orbit:forge "Build and optimize Rust WebAssembly modules for a game engine"
Orbit: [loads agents/forge.md]
       [analyzes domain: Rust, WASM, game engine patterns, performance]
       [designs wasm-engineer agent with Rust/WASM-specific rules]
       [writes agents/wasm-engineer.md]
       [registers in the agent registry and instruction set]
       Agent forged. Dispatching your task now...
```

### Ad-hoc quick task

```
User: /orbit:quick Add rate limiting to all auth endpoints
Orbit: [classifies: ENGINEERING, QUICK, engineer agent]
       [loads skills/security.md for rate limit patterns]
       [writes failing test for rate limiting behavior]
       [implements with express-rate-limit per security.md pattern]
       [all tests green, committed: feat(security): add auth endpoint rate limiting]
       Done. 3 files changed, 8 tests added.
```

---

## Complex Scenario: Secure Feature Delivery

Scenario: a product team asks for a new admin billing export feature that must be audited, permissioned, and delivered without exposing customer data.

How Orbit handles it:

1. Classify the request as `SYNTHESIS`, `PROJECT`, and `AUTONOMOUS`.
2. Route to `strategist` first because the work spans product, security, backend, and delivery.
3. Pull in `security-engineer`, `engineer`, `data-engineer`, and `reviewer` in parallel once the scope is clear.
4. Use `planning.md` to split the work into waves: schema changes, API design, export job, permission checks, and audit logging.
5. Let `security.md` define data-access rules, redaction rules, and failure handling before any implementation starts.
6. Execute each wave in fresh contexts so the auth logic, export job, and UI concerns do not bleed into each other.
7. Verify with tests, threat modeling, and review before shipping the feature.
8. Persist the result to `STATE.md`, then commit atomically so the next session can resume cleanly.

Why this matters:

- Without the framework, the team would likely build the feature in a single linear thread, miss a review step, and leave security decisions undocumented.
- With the framework, the same work is decomposed into roles, waves, and checks so security, data handling, and delivery quality are all explicit.

---

## Token Optimization Strategy

Orbit is designed from the ground up to minimize token consumption:

| Strategy               | Implementation                                                               |
| ---------------------- | ---------------------------------------------------------------------------- |
| Model routing          | Haiku for classify/extract, Sonnet for implement, Opus for complex reasoning |
| Lazy skill loading     | Only load SKILL.md relevant to current task - not all skills                 |
| Subagent isolation     | Fresh context per task - no accumulated conversation history                 |
| XML structured prompts | Claude processes XML task definitions with higher fidelity and fewer tokens  |
| Targeted file loading  | Only load files directly referenced in the task - never full codebase        |
| STATE.md as memory     | Cross-session memory without bloating context                                |
| Prompt caching         | System prompt + skills are stable - eligible for prompt caching              |

---

## Why Use This Framework

### With Orbit

- Requests are classified before execution, so the right agent gets the right job
- Complex work is decomposed into waves instead of being forced through one long context
- Skills create repeatable standards for TDD, architecture, security, and deployment
- Hooks and STATE.md make long-running work resumable
- The same repo can work across Claude, Codex, and Antigravity with minimal adaptation

### Without Orbit

- The assistant tends to jump straight into implementation
- Important review and planning steps can be skipped under pressure
- Context grows until older decisions become fuzzy
- Security and operational concerns often depend on memory instead of explicit process
- Multi-step work is harder to resume and harder to audit

---

## Sample Eval Set

Use [docs/eval-dataset.md](docs/eval-dataset.md) to check whether routing, workflow choice, and portability claims still hold after changes.

Representative prompts:

- Add rate limiting to auth endpoints
- Design a multi-region active-active architecture
- Review this React auth component for bugs
- Create a CI/CD rollback plan for production
- Unknown domain with high uncertainty

---

## Adding Your Own Skills

Create a new skill file in `skills/`:

```markdown
# SKILL: {Domain Name}

> One-line description of what this skill governs

## ACTIVATION

When is this skill loaded? What triggers it?

## CORE PRINCIPLES

{Domain-specific rules, not generic advice}

## PATTERNS

{Code examples, templates, decision frameworks}

## CHECKLISTS

{Verifiable criteria for quality work in this domain}

## ANTI-PATTERNS

{What NOT to do, with specific consequences}
```

Then register it in `CLAUDE.md` under "SKILLS AUTO-LOADING".

---

## Orbit Nexus Mode (Multi-Repo Orchestration)

Orbit's **Nexus Mode** allows it to act as a meta-orchestrator for an entire organization. It bridges the intelligence gap between independent repositories (e.g., `api`, `frontend`, `standards`).

### Nexus Architecture

```mermaid
graph TD
    subgraph NexusRoot[Logical Root: soupler-hq]
        NREG[orbit.nexus.json]
        NST[NEXUS-STATE.md]
    end

    NexusRoot --> R1[Repo: engineering-standards]
    NexusRoot --> R2[Repo: soupler-marketing]
    NexusRoot --> R3[Repo: orbit]

    R1 --- R1_Agents[IDP Agents]
    R2 --- R2_Agents[UI Agents]
```

### Nexus Flow Example: Cross-Repo Consistency
1. **Initiate**: `node orbit/bin/install.js nexus init` in the workspace root.
2. **Synchronize**: `node orbit/bin/install.js nexus sync` auto-discovers and indexes all sub-repos.
3. **Query**: Ask the orchestrator: *"Does our central IDP support the new Auth requirements in the Marketing repo?"*
4. **Wave Execution**:
   - **Wave 1**: Orchestrator spawns a subagent in `engineering-standards` to extract IDP specs.
   - **Wave 2**: Orchestrator spawns a subagent in `soupler-marketing` to extract React Auth demands.
   - **Wave 3**: The **Nexus Architect** performs gap analysis.
5. **Persistence**: Findings are burned into `workspace/NEXUS-STATE.md`.

---

## Architecture: Kernel vs. Userland

Orbit v2.3.0 enforces a **"Lean Kernel"** design to prevent framework bloat.

- **Orbit Kernel**: Fundamental "Pillar" agents (`Architect`, `Engineer`, `Forge`, etc.) and core skills.
- **Project Userland**: Specialized specialists created via `agent-forge` live in the project's `.orbit/` directory.

### Knowledge Propagation: `/orbit:promote`
When a project-local agent or skill discovers a generalizable pattern, use `/orbit:promote` to push it back to the Core.

1. **Tag**: Add `promotion_candidate: true` to the agent/skill frontmatter.
2. **Promote**: Run `node bin/install.js promote`.
3. **Merge**: Orbit Sentinel validates the change and prepares it for a Core release.

## Sentinel CI/CD: Automated Sovereignty

Every commit to the Orbit core is guarded by the **Orbit Sentinel** (`.github/workflows/orbit-sentinel.yml`):

- **Semantic Linting**: Validates registry and agent consistency.
- **SOTA Compliance**: Ensures the framework meets the Soupler Engineering Standard.
- **Safety Audit**: Automated adversarial testing against prompt injections.

---

## Philosophy

- Systematic over ad-hoc - process beats guessing every time
- Parallel over sequential - wherever tasks are independent, run them simultaneously
- Fresh context over accumulated rot - subagents start clean, finish clean
- Evidence over claims - verify before declaring done
- Atomic commits - every task traceable, independently reversible
- YAGNI + DRY - build what's needed, reuse what exists
- TDD always - tests before implementation, without exception
- Security by design - authentication, authorization, and audit logging designed in, not bolted on

---

---

## 🤔 Anticipatory FAQ

**Q: Is Orbit a new LLM or Model?**
> **A:** No. Orbit is a **Control Plane** that sits on top of your existing models (like Claude 3.5 Sonnet or GPT-4o). It provides the "Operating System" that guides those models to work together.

**Q: This repo seems complex. Do I need to learn all these files?**
> **A:** No. As a developer, Orbit handles the complexity for you. You just use `/orbit:` commands. The files in this repo are the "Internal Logic" that the AI uses to keep your project high-quality.

**Q: How do I add a new agent?**
> **A:** You can use `/orbit:forge "description of agent"` to have the framework build it for you, or manually add a new `.md` file to `agents/` and register it in `orbit.registry.json`.

**Q: What if the AI makes a mistake during a Wave?**
> **A:** The **RALPH Loop** (`skills/reflection.md`) is designed to catch these mistakes. The AI will "Reflect" on the error, try an alternative "Action," and only interrupt you if it stays stuck after 3 attempts.

---

## 🤝 Community & Open Source

Orbit is officially an **Open Source SOTA framework**. We invite teams, developers, and organizations to contribute and promote their localized agent intelligence to the core.

- **[Contributing Guide](CONTRIBUTING.md)**: Add skills, agents, or patterns to the framework. The core principle: Does this encode genuine domain expertise, or is it generic advice?
- **[Code of Conduct](CODE_OF_CONDUCT.md)**: We enforce a harassment-free and inclusive environment for all engineers and agent-operators.
- **[Security Policy](SECURITY.md)**: Report vulnerabilities via GitHub Private Advisories. Do not open public issues for security concerns.

### License

**Orbit is licensed under the Apache License 2.0**.
This provides full patent protections, making it safe for enterprise adoption. See the [LICENSE](LICENSE) file for the full text.

---
<div align="center">
  <i>Orbit: Standardizing the future of agentic orchestration. Brought to you by Soupler Labs.</i>
</div>
