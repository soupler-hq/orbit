# Orbit Production Readiness — Agile Implementation Plan

**Source:** 360° Repository Audit · soupler-hq/orbit · March 28, 2026
**RHS Score:** 72 / 100 — Stable · Golden Path Candidate (Conditional)
**Goal:** Reach unconditional Golden Path status (RHS ≥ 85) by end of Sprint 3

---

## Score Summary

| Dimension | Score | Gap |
|-----------|-------|-----|
| Technical Health | 19 / 30 | −11 |
| Architectural Alignment | 21 / 25 | −4 |
| Security & Compliance | 16 / 25 | −9 |
| Strategic Utility | 16 / 20 | −4 |

---

## Sprint Overview

| Sprint | Theme | Duration | Target RHS |
|--------|-------|----------|-----------|
| Sprint 1 | Security Triage & Test Foundation | 1 week | 78 |
| Sprint 2 | Supply-Chain Hardening & Config Decoupling | 1 week | 84 |
| Sprint 3 | Runtime Parity & Verifiable Quality | 2 weeks | 88+ |

---

## Sprint 1 — Security Triage & Test Foundation
**Milestone:** `v2.5.0-security-baseline`
**Target completion:** April 4, 2026
**Severity:** Critical

---

### Issue #1 · Fix PII leak: hardcoded local path in README.md
**Labels:** `security` `critical` `sprint-1`
**Dimension:** Security & Compliance
**Points:** 1

**Problem:**
`README.md` contains a hardcoded contributor filesystem path (`/Users/sunnysrivastava/Documents/repos/...`) as an anchor link to `docs/eval-dataset.md`. This is a PII/OPSEC violation in a public repository.

**Acceptance Criteria:**
- [ ] Replace absolute path link with a relative path `docs/eval-dataset.md`
- [ ] Grep entire repo for `/Users/sunnysrivastava` and remove all occurrences
- [ ] Enable GitHub Secret Scanning + push protection on the repository
- [ ] Verify no other contributor-local paths exist in any `.md`, `.json`, or `.sh` file

**Files:** `README.md`

---

### Issue #2 · Fix stale repository URL in package.json
**Labels:** `bug` `critical` `sprint-1`
**Dimension:** Technical Health
**Points:** 1

**Problem:**
`package.json` declares `"url": "https://github.com/yourorg/orbit"` — a placeholder stub. This is published to GitHub Packages and renders as a broken link in the NPM registry.

**Acceptance Criteria:**
- [ ] Update `repository.url` to `https://github.com/soupler-hq/orbit`
- [ ] Verify `npm pack --dry-run` shows correct metadata
- [ ] Add a CI lint step that fails if `yourorg` appears in `package.json`

**Files:** `package.json`

---

### Issue #3 · Add SECURITY.md with responsible disclosure policy
**Labels:** `security` `critical` `sprint-1`
**Dimension:** Security & Compliance
**Points:** 2

**Problem:**
No `SECURITY.md` exists. This framework executes shell hooks (`pre-tool-use.sh`, `post-tool-use.sh`) on every agent tool call and writes to user filesystems — the attack surface demands a formal disclosure process.

**Acceptance Criteria:**
- [ ] Create `SECURITY.md` at repo root following the GitHub advisory template
- [ ] Define supported versions table (currently: v2.x)
- [ ] Provide a private disclosure email or GitHub Security Advisory intake link
- [ ] Reference `SECURITY.md` from `README.md` and `CONTRIBUTING.md`
- [ ] Enable GitHub private vulnerability reporting in repo settings

**Files:** `SECURITY.md` (new), `README.md`, `CONTRIBUTING.md`

---

### Issue #4 · Establish JS test harness with Vitest + CI gate
**Labels:** `testing` `critical` `sprint-1`
**Dimension:** Technical Health
**Points:** 5

**Problem:**
Zero automated tests. `bin/eval.sh` is a shell compliance harness, not a real test runner. Coverage is ~0% on the JS surface (`bin/install.js`, `bin/validate.sh` logic).

**Acceptance Criteria:**
- [ ] Add `vitest` as a dev dependency (`npm install -D vitest`)
- [ ] Write unit tests for `bin/install.js`: argument parsing, mode selection, tool routing
- [ ] Write unit tests for `bin/validate.sh` logic (port to a testable JS module if needed)
- [ ] Add `"test": "vitest run"` to `package.json` scripts
- [ ] Wire `npm test` as a required step in `orbit-sentinel.yml` — block merge on failure
- [ ] Target ≥60% branch coverage on `bin/` JS surface
- [ ] Add coverage report artifact to CI pipeline

**Files:** `package.json`, `bin/`, `.github/workflows/orbit-sentinel.yml`, `tests/` (new)

---

### Issue #5 · Add ESLint + Prettier for the JS codebase
**Labels:** `dx` `sprint-1`
**Dimension:** Technical Health
**Points:** 2

**Problem:**
No linter or formatter is configured for the JS portion of the codebase. No `devDependencies` declared in `package.json`.

**Acceptance Criteria:**
- [ ] Add `eslint`, `prettier`, `eslint-config-prettier` as dev dependencies
- [ ] Add `.eslintrc.json` with recommended rules + `no-unused-vars`, `no-console` configured
- [ ] Add `.prettierrc` with project style (2-space indent, single quotes, trailing commas)
- [ ] Add `"lint": "eslint bin/"` and `"format:check": "prettier --check bin/"` scripts
- [ ] Wire lint as a required step in `orbit-sentinel.yml`

**Files:** `package.json`, `.eslintrc.json` (new), `.prettierrc` (new), `.github/workflows/orbit-sentinel.yml`

---

### Sprint 1 Definition of Done
- [ ] `git grep "/Users/sunnysrivastava"` returns zero results
- [ ] `package.json` repo URL points to `soupler-hq/orbit`
- [ ] `SECURITY.md` merged and linked
- [ ] `npm test` passes with ≥60% coverage
- [ ] `npm run lint` passes with zero errors
- [ ] All Sentinel CI jobs green on main

---

## Sprint 2 — Supply-Chain Hardening & Config Decoupling
**Milestone:** `v2.5.1-hardened`
**Target completion:** April 11, 2026
**Severity:** High

---

### Issue #6 · Add SCA pipeline: npm audit + Dependabot
**Labels:** `security` `high` `sprint-2`
**Dimension:** Security & Compliance
**Points:** 3

**Problem:**
No Software Composition Analysis in CI. No Dependabot configured. For a framework that installs lifecycle hooks that execute on every agent tool call, unpatched transitive dependencies are a supply-chain vector.

**Acceptance Criteria:**
- [ ] Add `npm audit --audit-level=high` as a required step in `orbit-sentinel.yml`
- [ ] Create `.github/dependabot.yml` with weekly updates for `npm` ecosystem
- [ ] Add CodeQL analysis workflow for JavaScript (`.github/workflows/codeql.yml`)
- [ ] Resolve any existing `npm audit` high/critical findings before merge
- [ ] Document the SCA gate in `CONTRIBUTING.md`

**Files:** `.github/workflows/orbit-sentinel.yml`, `.github/dependabot.yml` (new), `.github/workflows/codeql.yml` (new), `CONTRIBUTING.md`

---

### Issue #7 · Add checksum verification to install.sh
**Labels:** `security` `high` `sprint-2`
**Dimension:** Security & Compliance
**Points:** 5

**Problem:**
`install.sh` copies framework files (including hook scripts) to `~/.claude/` without verifying their integrity. A supply-chain compromise of the NPM package could silently inject malicious lifecycle hooks.

**Acceptance Criteria:**
- [ ] Generate a `SHASUM256.txt` manifest as part of the release process (`orbit-release.yml`)
- [ ] Add a `verify_checksums()` function in `install.sh` that validates copied files against the manifest before writing to destination
- [ ] Fail install loudly if any checksum mismatches
- [ ] Document the verification process in `docs/security-model.md`
- [ ] Add a `--skip-verify` flag (with a prominent warning) for dev/local use

**Files:** `install.sh`, `.github/workflows/orbit-release.yml`, `docs/security-model.md` (new)

---

### Issue #8 · Decouple model strings into orbit.config.json routing table
**Labels:** `architecture` `high` `sprint-2`
**Dimension:** Technical Health · Architectural Alignment
**Points:** 3

**Problem:**
Model routing is hardcoded in `CLAUDE.md` as concrete Anthropic model IDs (e.g., `claude-haiku-4-5-20251001`). These will silently become stale as models are deprecated. The `orbit.config.json` profiles override exists but is not prominent.

**Acceptance Criteria:**
- [ ] Add a `models.routing` block to `orbit.config.json` with semantic aliases:
  ```json
  "models": {
    "routing": {
      "classify": "claude-haiku-4-5-20251001",
      "standard": "claude-sonnet-4-6",
      "reasoning": "claude-opus-4-6",
      "security": "claude-opus-4-6"
    }
  }
  ```
- [ ] Update `orbit.config.schema.json` to validate the new `models.routing` shape
- [ ] Update `CLAUDE.md` model routing table to reference the semantic aliases and point to `orbit.config.json` as the override source
- [ ] Add a `bin/validate.sh` check that warns if hardcoded model IDs appear in `CLAUDE.md`
- [ ] Document migration path for consumers in `CHANGELOG.md`

**Files:** `orbit.config.json`, `orbit.config.schema.json`, `CLAUDE.md`, `bin/validate.sh`, `CHANGELOG.md`

---

### Issue #9 · Publish SHASUM manifest on every release
**Labels:** `devops` `high` `sprint-2`
**Dimension:** Security & Compliance
**Points:** 2

**Problem:**
No integrity manifest is published alongside NPM releases. Consumers have no way to verify the authenticity of downloaded framework files.

**Acceptance Criteria:**
- [ ] Add a `generate_shasum()` step in `orbit-release.yml` that runs `shasum -a 256` on all installable files
- [ ] Upload `SHASUM256.txt` as a GitHub Release asset
- [ ] Reference the manifest in `README.md` under an "Integrity Verification" section
- [ ] Add verification instructions for consumers using `npx orbit init`

**Files:** `.github/workflows/orbit-release.yml`, `README.md`

---

### Sprint 2 Definition of Done
- [ ] `npm audit` returns zero high/critical vulnerabilities
- [ ] Dependabot PRs are opening automatically
- [ ] CodeQL scan passes on main
- [ ] `install.sh --verify` validates checksums before writing any file
- [ ] `orbit.config.json` contains `models.routing` and schema validates it
- [ ] `CLAUDE.md` uses semantic aliases, not raw model IDs
- [ ] Release workflow publishes `SHASUM256.txt` as a release asset

---

## Sprint 3 — Runtime Parity & Verifiable Quality
**Milestone:** `v2.6.0-golden-path`
**Target completion:** April 25, 2026
**Severity:** Medium

---

### Issue #10 · Implement Codex runtime adapter in install.sh
**Labels:** `feature` `medium` `sprint-3`
**Dimension:** Architectural Alignment
**Points:** 5

**Problem:**
`orbit.registry.json` documents Codex as a supported runtime but `install.sh` only implements `install_for_claude()`. The Codex adapter is a stub in `docs/runtime-adapters.md`. Runtime-agnosticism is currently aspirational, not functional.

**Acceptance Criteria:**
- [ ] Implement `install_for_codex()` function in `install.sh`
- [ ] Map Orbit's `CLAUDE.md` orchestrator to Codex's equivalent system prompt injection mechanism
- [ ] Map `commands/` to Codex's custom command surface (if applicable)
- [ ] Map hooks to Codex's lifecycle equivalent
- [ ] Test with `--tool codex` flag end-to-end in a throwaway project
- [ ] Update `docs/runtime-adapters.md` from stub to full specification
- [ ] Add Codex to the `install-all` script path

**Files:** `install.sh`, `docs/runtime-adapters.md`

---

### Issue #11 · Convert eval-dataset.md into a machine-executable eval suite
**Labels:** `testing` `medium` `sprint-3`
**Dimension:** Technical Health · Strategic Utility
**Points:** 8

**Problem:**
`docs/eval-dataset.md` is a human-readable dataset used for manual verification. There is no automated eval runner that produces verifiable metrics. The claim "production-grade" requires evidence from automated measurement.

**Acceptance Criteria:**
- [ ] Design an eval runner script (`bin/eval-runner.sh` or `bin/eval-runner.js`) that:
  - Reads test cases from `docs/eval-dataset.md` (or converts to `docs/eval-dataset.json`)
  - Runs each case against the framework's routing and workflow logic
  - Outputs pass/fail + a scored report to `stdout`
- [ ] Define three metric categories: routing accuracy, workflow coverage, portability score
- [ ] Integrate the eval runner into `orbit-sentinel.yml` as a `quality` job
- [ ] Publish eval results as a pipeline artifact (JSON report + badge)
- [ ] Add a `README.md` badge showing current eval score
- [ ] Target: ≥80% pass rate as the CI gate threshold

**Files:** `docs/eval-dataset.md`, `bin/eval-runner.js` (new), `.github/workflows/orbit-sentinel.yml`, `README.md`

---

### Issue #12 · Add Antigravity runtime adapter stub → full implementation
**Labels:** `feature` `medium` `sprint-3`
**Dimension:** Architectural Alignment
**Points:** 3

**Problem:**
Antigravity is listed in the registry as a supported runtime but has no install pathway. Unlike Codex, Antigravity's API surface is less well-known — this issue covers a faithful stub-to-spec completion.

**Acceptance Criteria:**
- [ ] Research Antigravity's context injection and hook mechanism
- [ ] Implement `install_for_antigravity()` in `install.sh` or mark it `experimental` with clear documentation if the runtime spec is insufficient
- [ ] Update `orbit.registry.json` runtime entry to reflect actual support level (`stable` / `experimental` / `planned`)
- [ ] Update `docs/runtime-adapters.md` accordingly

**Files:** `install.sh`, `orbit.registry.json`, `docs/runtime-adapters.md`

---

### Issue #13 · Add integration tests for install.sh (idempotency + flag matrix)
**Labels:** `testing` `medium` `sprint-3`
**Dimension:** Technical Health
**Points:** 5

**Problem:**
`install.sh` is the most critical user-facing script but has no automated tests for idempotency, flag handling, or merge logic. A regression here breaks every downstream consumer.

**Acceptance Criteria:**
- [ ] Write a shell-based integration test suite (`tests/install.test.sh`) using `bats` or `bash` assertions
- [ ] Test matrix covers: `--local`, `--global`, `--tool claude`, `--tool codex`, `--all`, `--hooks-only`
- [ ] Test idempotency: running install twice produces the same result as running it once
- [ ] Test merge logic: existing `CLAUDE.md` is not overwritten without a flag
- [ ] Wire `bash tests/install.test.sh` as a step in `orbit-sentinel.yml`
- [ ] Run tests in a Docker container to avoid polluting the CI runner's `~/.claude/`

**Files:** `tests/install.test.sh` (new), `.github/workflows/orbit-sentinel.yml`

---

### Issue #14 · Surface model routing override UX prominently
**Labels:** `dx` `medium` `sprint-3`
**Dimension:** Strategic Utility
**Points:** 2

**Problem:**
The `orbit.config.json` model profile override mechanism exists but is buried. Platform teams deploying Orbit org-wide need a clear, discoverable pattern for routing customization.

**Acceptance Criteria:**
- [ ] Add a "Model Routing" section to `README.md` explaining semantic aliases and the override pattern
- [ ] Add an example `orbit.config.json` snippet in `examples/`
- [ ] Add a `/orbit:cost` command output that shows current model routing config
- [ ] Add a warning in `CLAUDE.md` if `orbit.config.json` has no `models.routing` key (fall back to defaults)

**Files:** `README.md`, `examples/model-routing.config.json` (new), `commands/orbit-cost.md`

---

### Sprint 3 Definition of Done
- [ ] `--tool codex` install completes end-to-end without errors
- [ ] Eval runner executes in CI and publishes a JSON report artifact
- [ ] Eval pass rate ≥80% — badge visible in README
- [ ] `install.sh` integration test suite passes in Docker
- [ ] `orbit.registry.json` runtime entries reflect true support levels
- [ ] RHS re-score estimated at ≥88

---

## Backlog (Post Sprint 3)

| Issue | Description | Dimension | Points |
|-------|-------------|-----------|--------|
| #15 | Add GPG signing to release artifacts | Security | 3 |
| #16 | Publish Orbit to public NPM registry (not just GitHub Packages) | Strategic Utility | 2 |
| #17 | Build a real eval dashboard (HTML report from CI artifacts) | Strategic Utility | 5 |
| #18 | Add `orbit.nexus.json` schema validation to Sentinel CI | Technical Health | 2 |
| #19 | Production deployment case study / reference customer docs | Strategic Utility | 3 |
| #20 | Migrate `CLAUDE.md` model routing to use `orbit.config.json` aliases at runtime | Architecture | 5 |

---

## Velocity & Capacity

| Sprint | Story Points | Issues |
|--------|-------------|--------|
| Sprint 1 | 11 | #1, #2, #3, #4, #5 |
| Sprint 2 | 13 | #6, #7, #8, #9 |
| Sprint 3 | 23 | #10, #11, #12, #13, #14 |
| **Total** | **47** | **14 issues** |

---

## Key Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Vitest incompatible with current shell-centric architecture | Medium | High | Scope tests to JS modules only; keep shell tests in bats |
| Codex runtime API insufficient to map Orbit hooks | High | Medium | Mark as `experimental`, document limitations clearly |
| npm audit finds transitive high CVEs in dev deps | Low | High | Run audit before adding any new dev dependency |
| Model ID deprecation breaks active consumers | Medium | High | Sprint 2 #8 decouples this — ship before any Anthropic deprecation |

---

*Plan owner: Soupler Engineering · Orbit Core Team*
*Generated from 360° Audit · RHS 72/100 · March 28, 2026*
