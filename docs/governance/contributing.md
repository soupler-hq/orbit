---
id: contributing-v1
doc_type: guide
status: Final
version: v1
last_updated: 2026-03-31
---

# Contributing to Orbit

Thank you for your interest in contributing. Orbit is an open-source project and welcomes contributions of all kinds: new agents, skills, bug fixes, documentation improvements, and new runtime adapters.

## Before You Start

- Read [CLAUDE.md](../../CLAUDE.md) to understand the framework's philosophy and architecture.
- Check [open issues](https://github.com/soupler-hq/orbit/issues) to see if your idea is already tracked.
- For significant changes (new agents, new skills, workflow changes), open an issue first to align on direction before investing time in an implementation.

## Security Disclosures

Do **not** open a public GitHub issue for security vulnerabilities. See [SECURITY.md](../../SECURITY.md) for the responsible disclosure process.

---

## Branching Model: GitHub Flow

Orbit uses a **GitHub Flow / Release Candidate** model. All development happens on `develop`; `main` is reserved for stable tagged releases only.

```text
main       ── v2.5.0 ─────────────────── v2.6.0 ──▶  (tagged releases)
                  \                        ↑
develop    ─────── ──────────────────────────────▶  (integration branch)
                      ↑           ↑
               feature/sprint-N   fix/some-bug
```

### Branch Naming

| Type | Pattern | Example |
| :--- | :--- | :--- |
| Sprint feature | `feature/sprint-N/<short-description>` | `feature/sprint-2/ml-agent` |
| Bug fix | `fix/<short-description>` | `fix/registry-path-resolution` |
| Hotfix (production) | `hotfix/<short-description>` | `hotfix/install-crash-node22` |
| Documentation | `docs/<short-description>` | `docs/mcp-guide-update` |

---

## Fork-and-Pull Workflow (External Contributors)

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/orbit.git
   cd orbit
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/soupler-hq/orbit.git
   ```
4. **Sync with upstream `develop`** before starting work:
   ```bash
   git fetch upstream
   git checkout -b feature/sprint-N/my-change upstream/develop
   ```
5. **Make your changes** following the quality checklist below.
6. **Push** to your fork:
   ```bash
   git push origin feature/sprint-N/my-change
   ```
7. **Open a Pull Request** targeting `soupler-hq/orbit:develop` (not `main`).

## Pull Request Hygiene

Use the repo-standard PR body sections:

- `Summary`
- `Issues`
- `Ship Decision`
- `Test plan`
- `Merge notes` when relevant

Branch names should follow `<type>/<slug>` such as `feat/143-pr-governance-enforcement` or `fix/145-context-minimal-dedup`.

If the branch evolves after the PR is opened, update the PR body before the next review request. The PR body is part of the control plane and must stay aligned with the actual branch scope, verification steps, and issue linkage. Keep the `Head SHA` marker aligned with the current branch head so CI can detect stale PR bodies before re-review. PR progression also requires evidence: `## Test plan` must list the commands actually run, and `Orbit Self-Review` must record the executed review command, dispatched agents, ship decision, and findings handled.

When review leaves residual risks, classify each one explicitly instead of leaving it implied:

- `Tracked by #...`
- `Waived: ...`
- `Operational: ...`

Use `Operational` for branch-behind sync work, stale-check reruns, or other workflow hygiene that is not a product hardening issue.
Also record the disposition before treating the review as complete:

- link an existing hardening issue if the risk is already covered
- create a new hardening issue if the risk is not yet tracked
- or explicitly document why no issue is required

For Orbit self-hosting work, prefer adding the follow-up to the hardening stack rather than letting it disappear between sessions.

---

## Quality Checklist

Run these locally before pushing. CI will enforce them, but it's faster to catch issues early:

```bash
npm install

# Lint
npm run lint

# Format check
npm run format:check

# Tests + coverage
npm run test:coverage

# Orbit semantic validation
bash bin/eval.sh

# Dependency security audit
npm audit --audit-level=high
```

All six Sentinel checks must be green: `lint`, `test`, `validate`, `compliance`, `safety`, `sca`.

**SCA gate**: The `sca` job runs `npm audit --audit-level=high`. If you add a new dependency with a known high/critical vulnerability, your PR will be blocked. Resolve the finding or justify an exception in the PR description.

---

## What Makes a Good Contribution

### New Agent

- Place the file in `agents/` (core/specialist) or `forge/` (domain-specific).
- Follow the structure in existing agents: role, triggers, rules, skills, outputs, anti-patterns.
- Register in `orbit.registry.json`.
- Reference in `AGENTS.md` and `SKILLS.md` if applicable.
- The key question: does this encode genuine domain expertise, or is it generic advice that belongs in a skill?

### New Skill

- Place in `skills/`.
- Follow the structure in existing skills: purpose, when to load, protocol, verification workflow.
- Register in `orbit.registry.json`.
- Add the auto-loading trigger to the skills table in `CLAUDE.md`.

### Bug Fix

- Include a test that would have caught the bug.
- Keep the fix minimal - don't refactor surrounding code unless directly related.

### Documentation

- Keep examples in `examples/` consistent with actual framework behavior.
- If you change a workflow, update `WORKFLOWS.md` and the relevant `/orbit:` command doc in `commands/`.
