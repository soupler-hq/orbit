## [2.9.0]

### Added
- **Universal context support**: Orbit now ships a shared `context.db` runtime with bootstrap, partial loads, checkpoint-aware recovery, and durable decision logging so sessions can resume from structured project state instead of raw transcript memory alone.
- **Executable tracked-workflow control plane**: lifecycle gates, quick auto-chain, PR evidence validation, explicit Orbit command dispatch, clarification gating, operational-route enforcement, recovery loop execution, and checkpoint manifests now run through repo-local commands instead of living only in documentation.
- **New command and role coverage**: `/orbit:ask`, `/orbit:clarify`, `/orbit:discover`, `/orbit:launch`, and `/orbit:riper` are added alongside new agents and skills for product, launch, onboarding, compliance, QA, and technical-writing work.
- **Eval artifact pipeline**: `/orbit:eval` now emits both `EVAL-REPORT.md` and `eval-report.json`, with expanded metric coverage for prompt routing, runtime enforcement, observability, registry integrity, and portability.

### Changed
- **Documentation architecture**: the docs set is reorganized into architecture, governance, integrations, operations, playbooks, plans, quality, and releases sections, while README is rewritten around Orbit’s Idea-to-Market positioning.
- **Runtime adapter contract**: Claude, Codex, and Antigravity now share a clearer adapter model with generated instruction surfaces, common state artifacts, and tested install/setup flows.
- **Governance enforcement**: Sentinel and release workflows now require fresher PR metadata, docs-update accountability, residual-risk labeling, and stronger release artifact discipline before publish.

### Fixed
- **Quick blocker handling**: `/orbit:quick` no longer drops issue-boundary or operational-route blockers after tests/review become green, and blocked approved-route flows keep recommending `/orbit:quick` instead of a misleading review handoff.
- **Eval contract reliability**: the eval artifact test budget now matches the executable eval flow, preventing false timeouts while keeping the end-to-end contract under test.

---

## [2.7.0]

### Added
- **bin/promote.sh**: `/orbit:promote` implementation - validates a forged agent or skill against the structural contract, checks for core conflicts, and prints a ready-to-use PR draft for upstreaming to soupler-hq/orbit. Wired as `npm run promote`. Documented in `docs/governance/contributing.md §Promoting a Forged Agent or Skill`.
- **Forge integrity metric**: `bin/eval-runner.js` now includes a `forge_integrity` metric (5th metric area). If `forge/` exists, all `.md` files are checked for required sections. If `forge/` is absent, the check passes as a valid empty state.
- **npm publish dry-run**: `publish-dry-run` gate added to `orbit-sentinel.yml` - runs `npm publish --dry-run` on every PR to validate the package is publishable without actually publishing.

### Changed
- **forge/ removed**: Pre-populated `ml-engineer.md`, `blockchain-engineer.md`, `mobile-engineer.md` removed from the repo. `forge/` is userland - agents are created on demand per project, not shipped in the framework kernel.
- **CLAUDE.md**: Removed "Forged Agents (pre-built for common domains)" table - these were test artifacts, not framework canon.
- **bin/validate.sh**: `forge/` removed from `required_dirs` (optional, userland). Added forge agent structural validation block (no-op if `forge/` is absent).
- **package.json**: `files` array cleaned - removed `forge/`, added `orbit.config.json` and `examples/`, removed redundant explicit sub-paths already covered by directory entries.
- **.orbit/state/STATE.md**: Updated to v2.6.0 with Sprints 1-3 decisions log, current tech stack, and active Sprint 4 todos.

---

## [2.6.0]

### Added
- **install.sh Integration Tests**: `tests/install.test.sh` - 33 assertions covering flag matrix (`--tool claude`, `--tool codex`, `--all`), idempotency, STATE.md merge preservation, `--skip-verify`, hook executability, and `.gitignore` injection. Wired as `install-test` required gate in Orbit Sentinel CI.
- **Eval Runner**: `bin/eval-runner.js` - machine-executable eval suite reading `docs/quality/eval-dataset.md`. Checks routing accuracy, workflow coverage, registry integrity, and runtime portability across 79 assertions. Fails CI if overall pass rate < 80%. Publishes `eval-report.json` artifact. Wired as `quality` gate in Orbit Sentinel CI.
- **Codex Runtime Adapter**: `install_for_codex()` in `install.sh` maps the Orbit control plane to Codex's operator surface (`INSTRUCTIONS.md` + `policy.md`). `--tool codex` and `--all` flags install to `.codex/`. Adapter contract documented in `docs/architecture/runtime-adapters.md`.
- **Model Routing UX**: `orbit.config.json` `models.routing` semantic aliases (`classify/standard/reasoning/security`) documented in `README.md §Model Routing`, `/orbit:cost` command, and `examples/model-routing.config.json`.

### Changed
- `orbit.registry.json`: Antigravity marked `experimental` with honest constraints; Codex marked `stable` with `install_fn: "install_for_codex"`.
- `docs/architecture/runtime-adapters.md`: Full rewrite - support levels table (native/stable/experimental/planned), Codex full adapter contract, Antigravity experimental constraints and manual setup.
- `docs/quality/eval-dataset.md`: E06 routing corrected - ML inference tasks route via `forge` agent which instantiates `forge/ml-engineer.md` specialist.

---

## [2.5.1]

### Added
- **Model Routing Config**: `orbit.config.json` now has a `models.routing` object with semantic aliases (`classify`, `standard`, `reasoning`, `security`). `CLAUDE.md` references aliases instead of raw model IDs, preventing silent staleness on model deprecations.
- **SCA Pipeline**: `npm audit --audit-level=high` added as required `sca` gate in Orbit Sentinel CI. Dependabot configured for weekly npm and GitHub Actions updates targeting `develop`. CodeQL static analysis runs on every PR and weekly.
- **SHASUM256 Manifest**: Every release now generates and publishes `SHASUM256.txt` covering all installable framework files. `install.sh` verifies checksums before writing files to the destination.
- **Security Model Docs**: New `docs/architecture/security-model.md` documents the full threat model, integrity verification process, hook safety, prompt injection defense, and SCA controls.
- **`--skip-verify` flag**: `install.sh` accepts `--skip-verify` for local development (prints a prominent warning).

### Changed
- `orbit.config.schema.json`: `models.routing` type updated from `string` to a structured object with required `classify/standard/reasoning/security` keys.
- `bin/validate.sh`: Added model ID hygiene check - warns if hardcoded `claude-*` model strings appear in `CLAUDE.md`.
- `docs/governance/contributing.md`: SCA gate documented; local checklist updated to include `npm audit --audit-level=high`.

---

## [2.5.0]

### Added
- **Security Policy**: `SECURITY.md` with threat model, responsible disclosure process, supported versions table, and consumer best practices for hook verification.
- **Test Harness**: Vitest test framework (`vitest.config.js`, `tests/`) with 49 unit tests and 85% branch coverage on `bin/orchestrator.js`.
- **Code Quality**: ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc`) configured for `bin/`. `lint`, `lint:fix`, `format:check`, `format:write` npm scripts added.

### Changed
- **CI Pipeline**: `orbit-sentinel.yml` upgraded with `lint` and `test` jobs (blocking gates before `validate` and `compliance`). All actions upgraded from v3 -> v4. Node.js bumped to 22.
- **Package metadata**: Corrected `repository.url` from placeholder `yourorg/orbit` to `soupler-hq/orbit`. Added `bugs.url` and `homepage`.
- **`.gitignore`**: Added `coverage/`, `package-lock.json`, and `.claude/settings.local.json`.

### Fixed
- Removed hardcoded contributor filesystem paths (`/Users/sunnysrivastava/...`) from `README.md` and `docs/quality/evaluation-framework.md`.
- Fixed `eval.sh` compliance check to match emoji-prefixed README heading `## 🌌 What is Orbit?`.
- Fixed PII scan step in Sentinel CI self-matching its own grep pattern in the workflow file.
