# Orbit Changelog

All notable changes to the Orbit framework will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-03-28
### Added
- **Security Policy**: `SECURITY.md` with threat model, responsible disclosure process, supported versions table, and consumer best practices for hook verification.
- **Test Harness**: Vitest test framework (`vitest.config.js`, `tests/`) with 49 unit tests and 85% branch coverage on `bin/orchestrator.js`.
- **Code Quality**: ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc`) configured for `bin/`. `lint`, `lint:fix`, `format:check`, `format:write` npm scripts added.

### Changed
- **CI Pipeline**: `orbit-sentinel.yml` upgraded with `lint` and `test` jobs (blocking gates before `validate` and `compliance`). All actions upgraded from v3 → v4. Node.js bumped to 22.
- **Package metadata**: Corrected `repository.url` from placeholder `yourorg/orbit` to `soupler-hq/orbit`. Added `bugs.url` and `homepage`.
- **`.gitignore`**: Added `coverage/`, `package-lock.json`, and `.claude/settings.local.json`.

### Fixed
- Removed hardcoded contributor filesystem paths (`/Users/sunnysrivastava/...`) from `README.md` and `docs/evals.md`.
- Fixed `eval.sh` compliance check to match emoji-prefixed README heading `## 🌌 What is Orbit?`.
- Fixed PII scan step in Sentinel CI self-matching its own grep pattern in the workflow file.

## [2.4.0] - 2026-03-28
### Added
- **Hardened Branch Protection**: Implemented mandatory status checks locked to GitHub Actions App ID (`15368`).
- **Owner Sovereignty**: Added `.github/CODEOWNERS` for `@soupler-labs` to enforce review requirements.
- **Bypass Protocol**: Defined Repository Ruleset for `@soupler-labs` to enable autonomous merging while maintaining CI enforcement.
- **Protection Guide**: New `.github/PROTECTION_GUIDE.md` for team onboarding and incident response.

### Fixed
- **Validation Consistency**: Resolved missing `VERIFICATION WORKFLOW` sections in `nexus.md` and `sota-architecture.md`.

## [2.3.0] - 2026-03-28
### Added
- **Nexus SOTA Architecture**: Support for logical workspace meta-orchestration across multiple repositories.
- **Auto-Discovery CLI**: New `orbit nexus init` and `orbit nexus sync` commands in `bin/install.js`.
- **Worksapce Consciousness**: Enhanced `orchestrator.js` to resolve cross-repo paths and manage global state.
- **Nexus Skill**: New `skills/nexus.md` encoding multi-repo coordination principles.
- **Sentinel CI/CD**: Automated SOTA governance via GitHub Actions (`orbit-sentinel.yml`).
- **Promote Capability**: New `promote` command for knowledge propagation from projects to the Orbit core.
- **Release Automation**: One-shot publishing to GitHub Packages and GitHub Releases.

## [2.2.0] - 2026-03-27
### Added
- **Persistence Pattern**: Implemented `bin/snapshot.sh` and `bin/resume.sh` for serialization and rehydration of session state.
- **Multi-Agent Consensus**: Orchestrator now enforces "Consensus Check" requiring `APPROVED` status from Reviewer/Security agents during wave aggregation.
- **Continuous Governance**: Integrated Git Pre-commit hook (`hooks/scripts/pre-commit.sh`) to enforce validation on every local commit.
- **RALPH Loop Integration**: Added `skills/reflection.md` for autonomous error correction and loop persistence.

## [2.1.0] - 2026-03-27
### Added
- **Atomic State Consistency**: Implemented filesystem-based mutex locking (`.orbit.lock`) to prevent `STATE.md` corruption during parallel aggregation.
- **Git Worktree Handoff**: Automated task isolation via `git worktree add` for parallel wave execution.
- **Model Routing Intelligence**: Orchestrator now enforces `orbit.config.json` model profiles based on agent domain (e.g., Haiku for classification, Sonnet for implementation).

## [2.0.0] - 2026-03-27
### Added
- **Intelligent Safety Layer**: Context-aware `safety-evaluator.js` agent that analyzes intent and chain-of-commands before execution.
- **Wave Orchestration**: Automated parallel subagent management via `bin/orchestrator.js`.
- **Structural Validation**: Upgraded `bin/validate.sh` with Semantic & Logical consistency checks.
- **Verification Suite**: `bin/test-safety.sh` for automated adversarial and injection testing.
- **Consistency Enforcement**: Mandatory `VERIFICATION WORKFLOW` in all 17+ core skills.
- **Context Synthesis**: Automated retrieval and aggregation of subagent outputs into single `SUMMARY.md`.

### Changed
- Refactored `pre-tool-use.sh` into a multi-layered defense-in-depth hook.
- Standardized all `agents/*.md` and `skills/*.md` with mandatory uppercase semantic headers.
- Harmonized `orbit.registry.json` with direct skill-dependency mapping.

### Fixed
- Fixed "Logical Consistency" weakness where the Forge could build a skill without a test path.
- Fixed vulnerability to Base64-obfuscated payloads and shell command chaining bypasses.
- Corrected path-resolution issues in the orchestration control plane.

## [1.0.0] - 2026-03-10
### Added
- **Orbit Orchestrator**: Initial release of the agent framework.
- **Agent Forge**: Basic autonomous agent/skill generation protocol.
- **Agent Registry**: Centralized control plane for identity management.
- **Basic Hooks**: Initial pre/post tool hooks for command interception.

### Changed
- Initial directory structure for `agents/`, `skills/`, and `hooks/`.
- Basic JSON schema for `orbit.registry.json`.

---
*Orbit: Standardizing the future of agentic orchestration.*
