# Orbit Security Model

> How Orbit defends against supply-chain attacks, prompt injection, and hook abuse

## Threat Model Summary

Orbit installs lifecycle hooks that execute on every agent tool call. This gives it meaningful system access — and makes it a worthwhile supply-chain target. The following controls are in place.

| Threat                       | Control                                        | Where                                          |
| :--------------------------- | :--------------------------------------------- | :--------------------------------------------- |
| Malicious NPM package        | SHASUM256 manifest + install-time verification | `install.sh`, release workflow                 |
| Compromised hook script      | Checksum covers all `hooks/scripts/*.sh`       | `SHASUM256.txt`                                |
| Prompt injection             | Pre-tool-use hook detects adversarial patterns | `hooks/scripts/pre-tool-use.sh`                |
| Hardcoded secrets in commits | `secret_scan_on_commit` guard                  | `orbit.config.json`                            |
| Unpatched transitive deps    | npm audit gate + Dependabot weekly updates     | `orbit-sentinel.yml`, `.github/dependabot.yml` |
| Vulnerable JS patterns       | CodeQL static analysis on every PR             | `.github/workflows/codeql.yml`                 |
| Config tampering             | Schema validation on every CI run              | `bin/validate.sh`                              |

---

## 1. File Integrity Verification

Every release publishes a `SHASUM256.txt` manifest covering all installable framework files:

```
CLAUDE.md
INSTRUCTIONS.md  SKILLS.md  WORKFLOWS.md
orbit.registry.json  orbit.config.json  orbit.config.schema.json
install.sh
agents/*.md
skills/*.md
hooks/scripts/*.sh
```

### How it works

`install.sh` calls `verify_checksums()` before writing any files to `~/.claude/`:

1. Checks for a local `SHASUM256.txt` (present in release tarballs, absent in source checkouts)
2. Runs `shasum -a 256 --check` against the manifest
3. **Aborts with a non-zero exit code** if any file differs from the manifest
4. Skips silently for source installs (no manifest present)

### For consumers

```bash
# Verify manually after download
curl -sL https://github.com/soupler-hq/orbit/releases/download/vX.Y.Z/SHASUM256.txt -o SHASUM256.txt
shasum -a 256 --check SHASUM256.txt
```

### `--skip-verify` flag

Available for local development workflows where files change frequently:

```bash
bash install.sh --local --skip-verify
```

A prominent warning is printed. **Never use `--skip-verify` in automated or production installs.**

---

## 2. Hook Safety

Lifecycle hooks (`pre-tool-use.sh`, `post-tool-use.sh`, `pre-compact.sh`, `stop.sh`) execute on every agent action. They are:

- Covered by the SHASUM256 manifest — any modification is detectable
- Reviewed as part of every PR via the `safety` Sentinel gate (`bin/test-safety.sh`)
- Designed to fail silently (`2>/dev/null || true`) to prevent hook errors from breaking agent sessions

See `hooks/HOOKS.md` for the full hook specification.

---

## 3. Prompt Injection Defense

`pre-tool-use.sh` inspects every Bash command before execution and blocks patterns associated with:

- Base64-encoded payloads (`base64 -d`, `echo ... | bash`)
- Shell command chaining intended to escape sandbox (`$(...)`, backtick execution)
- Known adversarial tool-call injection patterns

See `skills/prompt-safety.md` for the full detection ruleset.

---

## 4. Software Composition Analysis

- **npm audit**: runs at `--audit-level=high` on every PR via the `sca` Sentinel job — blocks merge on high/critical findings
- **Dependabot**: opens weekly PRs for npm and GitHub Actions dependency updates, targeting `develop`
- **CodeQL**: static JavaScript analysis runs on every PR and on a weekly schedule, results visible in the Security tab

---

## 5. Responsible Disclosure

If you discover a vulnerability in Orbit, please **do not open a public GitHub issue**. Use GitHub Private Vulnerability Reporting:

[Report a vulnerability →](https://github.com/soupler-hq/orbit/security/advisories/new)

See [SECURITY.md](../SECURITY.md) for the full policy, response SLA, and in-scope/out-of-scope table.
