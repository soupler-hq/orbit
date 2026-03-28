# Registry & Branch Protection Guide 🔐

To achieve **State-of-the-Art (SOTA)** security and ensure the integrity of the `@soupler-hq/orbit` registry, you must enforce Branch Protection on the `main` branch.

## 🚀 1. Automated Branch Protection

Run the following command in your terminal using the **GitHub CLI (`gh`)** to automatically lock the `main` branch:

```bash
gh api -X PUT /repos/soupler-hq/orbit/branches/main/protection --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": [
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

## 🛠️ 2. Owner Bypass Ruleset (Required for Solo Devs)

Since `enforce_admins` is `true`, you will need a **Repository Ruleset** to allow yourself to merge your own PRs without needing an external approval, while still blocking others.

### Steps to Configure:
1. Go to **Settings** > **Rules** > **Rulesets**.
2. Create a **New branch ruleset**.
3. Name: `Lead-Dev-Bypass`.
4. **Bypass list**: Add **`soupler-labs`** (Role: Always).
5. **Target branches**: Include the default branch.
6. **Rules**:
   - ✅ **Require a pull request before merging**.
   - ✅ **Required approvals**: Set to `1`.
   - ✅ **Required status checks**: Add `validate`, `compliance`, and `safety`.
7. **Save changes**.

## 📦 3. Publishing to GitHub Packages

Orbit is now configured to publish to the **GitHub NPM Registry**.

### One-Time Setup:
1. Ensure you have a **Personal Access Token (PAT)** with `read:packages` scope to install.
2. The **`.github/workflows/orbit-release.yml`** will handle publishing automatically when you push a tag.

### Release Workflow:
1. Increment version: `npm version patch` (or `minor`/`major`).
2. Push the tag: `git push origin --tags`.
3. **Orbit Release** workflow will:
   - Run `bin/validate.sh` (Semantic Lint).
   - Publish the package to `@soupler-hq/orbit`.

## 🛡️ 3. Security Principles

- **Never force-push to `main`**: This breaks the linear history required for SOTA traceability.
- **Pass Sentinel**: All PRs must pass the **Orbit Sentinel** CI before the "Merge" button becomes active.
- **Review Requirement**: Only **@soupler-labs** (and designated owners) can approve changes.
- **Audit Logs**: Every release is documented in `CHANGELOG.md` as per the **Documentation Habit** rule.
