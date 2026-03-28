# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Active support |
| 1.x     | ❌ End of life |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Orbit installs shell lifecycle hooks that execute on every AI agent tool call and writes files to user filesystems. We take security reports seriously and aim to respond within 72 hours.

### Preferred Channel

Use [GitHub Private Vulnerability Reporting](https://github.com/soupler-hq/orbit/security/advisories/new) — this keeps the report confidential until a fix is released.

### What to Include

- A clear description of the vulnerability and its potential impact
- Steps to reproduce (minimal reproducer preferred)
- Affected version(s) and environment
- Any suggested mitigations you have identified

### What to Expect

| Timeline | Action |
|----------|--------|
| 72 hours | Acknowledgement and initial triage |
| 7 days   | Severity assessment and fix timeline communicated |
| 30 days  | Target patch release for critical/high findings |
| Post-fix | CVE filed (if applicable) and public advisory published |

We follow [Coordinated Vulnerability Disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). Reporters who follow responsible disclosure will be credited in the advisory unless they prefer anonymity.

## Threat Model

Orbit's primary attack surface:

| Surface | Risk |
|---------|------|
| `install.sh` — writes hook scripts to `~/.claude/` | Supply-chain compromise of the NPM package could inject malicious hook code |
| `pre-tool-use.sh` / `post-tool-use.sh` hooks | Executes on every Claude agent tool call — prompt injection vectors |
| `orbit.config.json` / `orbit.registry.json` | Config tampering could redirect model routing or disable safety gates |
| `bin/install.js` — executed as `npx orbit init` | Arbitrary code execution on consumer machines at install time |

Mitigations in place: `skills/prompt-safety.md`, `agents/safety-evaluator.md`, `hooks/pre-tool-use.sh` detection layer, and SHASUM manifest (in progress — see [#20](https://github.com/soupler-hq/orbit/issues/20)).

## Security Best Practices for Consumers

- **Pin your version**: use `@soupler-hq/orbit@x.y.z` in CI, not `@latest`
- **Verify checksums**: compare against `SHASUM256.txt` published with each release
- **Review hooks before install**: inspect `hooks/` before running `install.sh`
- **Restrict hook permissions**: hooks should not have network access unless your workflow requires it
- **Keep STATE.md out of version control**: it may contain sensitive task context

## Scope

In-scope for security reports:
- Remote code execution via any Orbit installation or hook vector
- Prompt injection bypassing `skills/prompt-safety.md` defences
- Supply-chain attacks against the NPM package or GitHub release artifacts
- Privilege escalation via `install.sh` or hook scripts
- Sensitive data leakage from STATE.md or agent outputs

Out of scope:
- Vulnerabilities in Claude / Anthropic's model API
- Social engineering attacks
- Issues requiring physical access to the target machine
