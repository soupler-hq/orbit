# Registry & Branch Protection Guide 🔐

Orbit uses the **GitHub Flow / Release Candidate** branching model. This guide explains the branch structure, protection rules, and release process — for both maintainers and open-source contributors.

## 🌿 Branch Model

| Branch | Purpose | Who can push |
| :--- | :--- | :--- |
| `main` | Stable releases only. Every commit on `main` is a tagged release. | Merge from `develop` via PR only (no direct pushes) |
| `develop` | Integration branch. All feature and fix PRs target `develop`. | Merge via PR only (requires Sentinel CI green) |
| `feature/sprint-N/*` | Sprint work. Branch from `develop`, merge back to `develop`. | Author |
| `fix/*` | Bug fixes. Branch from `develop`, merge back to `develop`. | Author |
| `hotfix/*` | Urgent production fixes. Branch from last stable tag on `main`, merge to **both** `main` and `develop`. | Maintainer only |

### Flow Diagram

```
main ──────────────────────────────────── v2.5.0 ── v2.6.0 ──▶
                                              ↑          ↑
develop ──────────────────────────────────────┘──────────┘────▶
               ↑            ↑
feature/sprint-1/...   fix/auth-bug
```

### Hotfix Exception

When a critical bug is found in production:

```bash
# 1. Branch from the last stable tag (not develop)
git checkout v2.5.0
git checkout -b hotfix/critical-bug-description

# 2. Fix, test, commit
# 3. PR → main (triggers release)
# 4. After merge, cherry-pick or PR → develop too
```

---

## 🚀 1. Protect `develop` (Integration Gate)

Run the following command to protect the `develop` branch — all PRs must pass Orbit Sentinel CI before merging:

```bash
gh api -X PUT /repos/soupler-hq/orbit/branches/develop/protection --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "lint", "app_id": 15368 },
      { "context": "test", "app_id": 15368 },
      { "context": "validate", "app_id": 15368 },
      { "context": "compliance", "app_id": 15368 },
      { "context": "safety", "app_id": 15368 }
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false
}
EOF
```

> **Solo dev note**: `enforce_admins: false` lets maintainers merge their own PRs after CI passes without needing a second reviewer. When the project has multiple contributors, raise `required_approving_review_count` to `1`.

---

## 🔒 2. Protect `main` (Stable Gate)

`main` only accepts merges from `develop` via PR. No direct commits ever.

```bash
gh api -X PUT /repos/soupler-hq/orbit/branches/main/protection --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "lint", "app_id": 15368 },
      { "context": "test", "app_id": 15368 },
      { "context": "validate", "app_id": 15368 },
      { "context": "compliance", "app_id": 15368 },
      { "context": "safety", "app_id": 15368 }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF
```

---

## 🛠️ 3. Owner Bypass Ruleset (Required for Solo Devs)

Since `enforce_admins: true` is set on `main`, you need a **Repository Ruleset** to allow maintainers to merge `develop → main` without waiting for an external approval.

### Steps to Configure

1. Go to **Settings** > **Rules** > **Rulesets**.
2. Click **New branch ruleset**.
3. Name: `Lead-Dev-Bypass`.
4. **Bypass list**: Add **`soupler-labs`** (Role: Always).
5. **Target branches**: `main` and `develop`.
6. **Rules**:
   - ✅ **Require a pull request before merging**
   - ✅ **Required status checks**: `lint`, `test`, `validate`, `compliance`, `safety`
7. **Save changes**.

---

## 📦 4. Publishing a Release

Releases are cut from `develop` → `main` → tag. The release workflow triggers automatically on any `v*` tag.

### Release Steps

```bash
# 1. Ensure develop is green (all CI passes)
# 2. Open a PR: develop → main  (title: "Release vX.Y.Z")
# 3. After PR merges, tag main:
git checkout main && git pull origin main
npm version minor   # or patch / major
git push origin main --tags
```

The **Orbit Release** workflow (`orbit-release.yml`) will then:
1. Run `bin/validate.sh` (semantic lint)
2. Extract the latest release notes from `CHANGELOG.md`
3. Publish the package to `@soupler-hq/orbit` on GitHub Packages
4. Create a GitHub Release with the extracted notes

### Semantic Versioning

| Change type | Version bump |
| :--- | :--- |
| New feature (sprint deliverable) | `minor` — `2.5.0 → 2.6.0` |
| Bug fix only | `patch` — `2.5.0 → 2.5.1` |
| Breaking change | `major` — `2.5.0 → 3.0.0` |
| Hotfix to production | `patch` on `main`, then sync to `develop` |

---

## 🛡️ 5. Security Principles

- **Never force-push to `main` or `develop`**: Linear history is required for traceability.
- **Pass Sentinel**: All PRs must pass Orbit Sentinel CI before the "Merge" button activates.
- **No direct pushes**: All changes enter via pull request — this applies to maintainers too.
- **Tag integrity**: Every `v*` tag on `main` is a production release and must have a matching `CHANGELOG.md` entry.
- **Audit Logs**: Every release is documented in `CHANGELOG.md` per the Keep a Changelog format.
