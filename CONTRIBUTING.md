# Contributing to Orbit

Thank you for your interest in contributing. Orbit is an open-source project and welcomes contributions of all kinds: new agents, skills, bug fixes, documentation improvements, and new runtime adapters.

## Before You Start

- Read [CLAUDE.md](CLAUDE.md) to understand the framework's philosophy and architecture.
- Check [open issues](https://github.com/soupler-hq/orbit/issues) to see if your idea is already tracked.
- For significant changes (new agents, new skills, workflow changes), open an issue first to align on direction before investing time in an implementation.

## Security Disclosures

Do **not** open a public GitHub issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

---

## Branching Model: GitHub Flow

Orbit uses a **GitHub Flow / Release Candidate** model. All development happens on `develop`; `main` is reserved for stable tagged releases only.

```
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
- Keep the fix minimal — don't refactor surrounding code unless directly related.

### Documentation

- Keep examples in `examples/` consistent with actual framework behavior.
- If you change a workflow, update `WORKFLOWS.md` and the relevant `/orbit:` command doc in `commands/`.

---

## Commit Style

```
feat(scope): short description
fix(scope): short description
docs(scope): short description
test(scope): short description
chore(scope): short description
```

- Present tense, imperative mood ("add" not "added").
- Keep the subject under 72 characters.
- Reference the issue number in the body if applicable: `Closes #123`.

---

## Promoting a Forged Agent or Skill

If you have built a domain-specific agent or skill in your project using `/orbit:forge` and believe it would benefit the broader community, you can propose it for inclusion in the Orbit core.

**Rules:**
- Forged agents live in your project — they are **not** added to `orbit.registry.json` by default (that is the kernel; forged agents are userland).
- A forged agent becomes a promotion candidate when it is genuinely generalizable — useful across projects, not just your domain.

**How to promote:**

```bash
# Validate your forged agent meets the structural contract
npm run promote -- agents/my-agent.md --dry-run

# If validation passes, follow the PR instructions printed above
```

The promote script checks for all required sections (`TRIGGERS ON`, `DOMAIN EXPERTISE`, `OPERATING RULES`, `SKILLS LOADED`, `OUTPUT FORMAT`) and prints a ready-to-use PR title and body. Open the PR against `soupler-hq/orbit` targeting `develop`.

---

## Maintainer Review SLA

- Maintainers aim to triage new PRs within **5 business days**.
- PRs that pass all CI checks and follow this guide will be prioritized.
- If you haven't heard back after 7 days, feel free to ping the issue thread.
