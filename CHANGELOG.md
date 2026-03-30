# Orbit Changelog

All notable changes to the Orbit framework will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.8.1] - 2026-03-30

### Added

- **`docs/architecture.md`**: Control plane overview, three-pillars table, wave execution model, model routing, repo layout, kernel/userland design, Nexus mode, and Sentinel CI gates — extracted from README to a dedicated architecture reference.
- **`docs/concepts.md`**: Full conceptual reference for agents, skills, wave execution, STATE.md, hooks, Agent Forge, and workflows.
- **`docs/error-codes.md`**: ERR-ORBIT-001 through ERR-ORBIT-006 registry with structured runbooks.
- **`metadata.yml`**: IDP contract for the Soupler engineering-standards platform strategy engine.
- **`orbit:resume` next-command inference**: The resume output now includes a recommended next command inferred from STATE.md phase, wave, and blocker state — six-rule decision table defined in `commands/commands.md`.
- **YAML frontmatter** (`id`, `status`, `version`, `last_updated`) added to all `docs/*.md` files for IDP indexing.

### Changed

- **README restructured**: Reduced from 679 → 124 lines. Product pitch, install, slash commands, and docs index only. All technical depth moved to `docs/`.
- **`bin/eval.sh`**: Compliance checks split — positioning sections checked in `README.md`, architecture diagram sections checked in `docs/architecture.md`.
- **`CLAUDE.md` git discipline**: Branch naming (`type/NNN-description`), mandatory `git pull` before branch cut, rebase instruction, and `(#NNN)` issue reference in all commit messages.
- **`bin/orchestrator.js`**: ERR-ORBIT error codes on all three throw paths (ERR-ORBIT-003, ERR-ORBIT-004, ERR-ORBIT-006).

### Fixed

- **License**: `package.json` corrected from `MIT` to `Apache-2.0`. `bin/validate-config.sh` now asserts this at `[6/6]`.
- **`package-lock.json`**: Committed and tracked; `.gitignore` entry removed. Sentinel CI uses `npm ci` with a `lock-check` gate.
- **`AGENTS.md`**: Suppressed in `.gitignore` — was a stale manually-maintained copy, replaced by runtime-specific generation.
- **Issue auto-close**: Added `.github/workflows/close-issues-on-merge.yml` — GitHub only auto-closes on merge to default branch; this workflow handles `develop`.
- **`bin/validate-config.sh`**: All check headers corrected to `[N/6]`; `[ERR-ORBIT-006]` prefix added to model ID failure message.

### Fixed

- **Self-audit branch guard**: `bin/validate-config.sh` now treats `pull_request` runs as valid for protected release branches, so the `develop -> main` Sentinel PR no longer fails the self-audit gate.
- **Model routing in `bin/orchestrator.js`**: task dispatch now resolves models from the registry's `domains` array and routing aliases instead of a nonexistent `agent.domain` field.
- **Installer consolidation**: `bin/install.js` now delegates install flows to `install.sh` instead of maintaining a second installer implementation. The Claude command path stays aligned with `commands/orbit`.
- **Installer drift in `bin/install.js`**: removed the stale `AGENTS.md` copy step and aligned the Claude command path with `commands/orbit`.
- **Commit-time secret scan**: `hooks/scripts/pre-commit.sh` now blocks commits that contain obvious secrets or private keys.
- **README/version drift**: updated the public version banner and capability summary to match the current release and registry shape.

## [2.8.0] - 2026-03-29

### Added

- **Runtime instruction generation**: `templates/orbit.base.md` is now the single source of truth for all runtime instruction files. `bin/generate-instructions.js` generates the runtime-specific file at install time — no pre-built per-runtime files ship in the package. Adding a new runtime requires only a JSON config entry in `orbit.config.json` → `runtimes`.
- **Human-view generation**: `INSTRUCTIONS.md`, `SKILLS.md`, and `WORKFLOWS.md` are generated from `orbit.registry.json` and `templates/*.tpl.md`. `bin/generate-instructions.js --human-views` regenerates the operator docs, and Sentinel CI now blocks drift.
- **`npm run generate`**: Regenerates `CLAUDE.md` from the template. Run after editing `templates/orbit.base.md`.
- **`skills/workflow-audit.md`**: New skill encoding CI/CD pipeline best practices — release step ordering contract, trigger hygiene, idempotency patterns. Auto-loaded by the devops agent.
- **`actionlint` gate in Sentinel**: Static analysis of all workflow files on every PR. Catches duplicate triggers, shell errors, and invalid workflow syntax before merge.

### Changed

- **`orbit.config.json`**: Added `runtimes` block configuring name, instruction file, and install path for each supported runtime (`claude`, `codex`, `antigravity`).
- **`install.sh`**: `install_for_claude()` and `install_for_codex()` now call `generate-instructions.js` instead of copying static files. Install footprint is clean — only the target runtime's instruction file is written.
- **`CLAUDE.md` routing rule**: PRs touching `.github/workflows/` now explicitly route through the devops agent for pipeline architecture review.
- **`docs/runtime-adapters.md`**: Documents the template-based instruction generation model and how to add new runtimes.

### Removed

- **`AGENTS.md`**: Eliminated — was a manually-maintained copy of `CLAUDE.md` for non-Claude runtimes, drifting every sprint. Replaced by runtime-specific generation from `templates/orbit.base.md`.
- **`AGILE_PLAN.md`**: Removed — project planning artifact, not framework canon.

### Fixed

- **Release pipeline step ordering**: Tag push now precedes npm publish — tag is the point of no return. If tag push fails, nothing is published and re-run is clean.
- **Idempotent npm publish**: Added package version check before publishing — skips with a warning if version already exists in GitHub Packages (prevents 409 crash on pipeline re-run).
- **`RELEASE_TOKEN` for tag push**: Release workflow uses owner PAT to satisfy tag lockdown bypass. `GITHUB_TOKEN` cannot bypass repository tag rulesets.
- **Sentinel duplicate CI runs**: Removed `push: branches: [develop]` trigger — Sentinel now runs once per PR, not twice.
- **Unused `vi` imports**: Removed from `tests/install.test.js` and `tests/orchestrator.test.js` (flagged by GitHub Advanced Security / CodeQL).
- **SC2002 shellcheck**: Replaced `cat package.json | jq` with `jq < package.json` in both workflow files.

## [2.7.0] - 2026-03-28

### Added

- **bin/promote.sh**: `/orbit:promote` implementation — validates a forged agent or skill against the structural contract, checks for core conflicts, and prints a ready-to-use PR draft for upstreaming to soupler-hq/orbit. Wired as `npm run promote`. Documented in `CONTRIBUTING.md §Promoting a Forged Agent or Skill`.
- **Forge integrity metric**: `bin/eval-runner.js` now includes a `forge_integrity` metric (5th metric area). If `forge/` exists, all `.md` files are checked for required sections. If `forge/` is absent, the check passes as a valid empty state.
- **npm publish dry-run**: `publish-dry-run` gate added to `orbit-sentinel.yml` — runs `npm publish --dry-run` on every PR to validate the package is publishable without actually publishing.

### Changed

- **forge/ removed**: Pre-populated `ml-engineer.md`, `blockchain-engineer.md`, `mobile-engineer.md` removed from the repo. `forge/` is userland — agents are created on demand per project, not shipped in the framework kernel.
- **CLAUDE.md**: Removed "Forged Agents (pre-built for common domains)" table — these were test artifacts, not framework canon.
- **bin/validate.sh**: `forge/` removed from `required_dirs` (optional, userland). Added forge agent structural validation block (no-op if `forge/` is absent).
- **package.json**: `files` array cleaned — removed `forge/`, added `orbit.config.json` and `examples/`, removed redundant explicit sub-paths already covered by directory entries.
- **.orbit/state/STATE.md**: Updated to v2.6.0 with Sprints 1-3 decisions log, current tech stack, and active Sprint 4 todos.

## [2.6.0] - 2026-03-28

### Added

- **install.sh Integration Tests**: `tests/install.test.sh` — 33 assertions covering flag matrix (`--tool claude`, `--tool codex`, `--all`), idempotency, STATE.md merge preservation, `--skip-verify`, hook executability, and `.gitignore` injection. Wired as `install-test` required gate in Orbit Sentinel CI.
- **Eval Runner**: `bin/eval-runner.js` — machine-executable eval suite reading `docs/eval-dataset.md`. Checks routing accuracy, workflow coverage, registry integrity, and runtime portability across 79 assertions. Fails CI if overall pass rate < 80%. Publishes `eval-report.json` artifact. Wired as `quality` gate in Orbit Sentinel CI.
- **Codex Runtime Adapter**: `install_for_codex()` in `install.sh` maps the Orbit control plane to Codex's operator surface (`INSTRUCTIONS.md` + `policy.md`). `--tool codex` and `--all` flags install to `.codex/`. Adapter contract documented in `docs/runtime-adapters.md`.
- **Model Routing UX**: `orbit.config.json` `models.routing` semantic aliases (`classify/standard/reasoning/security`) documented in `README.md §Model Routing`, `/orbit:cost` command, and `examples/model-routing.config.json`.

### Changed

- `orbit.registry.json`: Antigravity marked `experimental` with honest constraints; Codex marked `stable` with `install_fn: "install_for_codex"`.
- `docs/runtime-adapters.md`: Full rewrite — support levels table (native/stable/experimental/planned), Codex full adapter contract, Antigravity experimental constraints and manual setup.
- `docs/eval-dataset.md`: E06 routing corrected — ML inference tasks route via `forge` agent which instantiates `forge/ml-engineer.md` specialist.

## [2.5.1] - 2026-03-28

### Added

- **Model Routing Config**: `orbit.config.json` now has a `models.routing` object with semantic aliases (`classify`, `standard`, `reasoning`, `security`). `CLAUDE.md` references aliases instead of raw model IDs, preventing silent staleness on model deprecations.
- **SCA Pipeline**: `npm audit --audit-level=high` added as required `sca` gate in Orbit Sentinel CI. Dependabot configured for weekly npm and GitHub Actions updates targeting `develop`. CodeQL static analysis runs on every PR and weekly.
- **SHASUM256 Manifest**: Every release now generates and publishes `SHASUM256.txt` covering all installable framework files. `install.sh` verifies checksums before writing files to the destination.
- **Security Model Docs**: New `docs/security-model.md` documents the full threat model, integrity verification process, hook safety, prompt injection defense, and SCA controls.
- **`--skip-verify` flag**: `install.sh` accepts `--skip-verify` for local development (prints a prominent warning).

### Changed

- `orbit.config.schema.json`: `models.routing` type updated from `string` to a structured object with required `classify/standard/reasoning/security` keys.
- `bin/validate.sh`: Added model ID hygiene check — warns if hardcoded `claude-*` model strings appear in `CLAUDE.md`.
- `CONTRIBUTING.md`: SCA gate documented; local checklist updated to include `npm audit --audit-level=high`.

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

_Orbit: Standardizing the future of agentic orchestration._
