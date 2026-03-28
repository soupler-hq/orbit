# Workflow Audit Skill

## ACTIVATION

Load this skill whenever reviewing or authoring `.github/workflows/` files, release pipelines, or CI/CD configuration. Auto-loaded by devops agent on any PR touching workflow files.

---

## CORE PRINCIPLES

1. **Workflows are production infrastructure** — treat them with the same rigour as application code. Step ordering bugs cause real incidents.
2. **Releases are irreversible** — once a package is published or a tag is pushed, they cannot be fully undone. Order operations defensively.
3. **Every step must be idempotent or skippable** — pipelines fail and re-run. Design for it.
4. **Triggers must be minimal and non-overlapping** — duplicate triggers cause duplicate CI runs and race conditions.

---

## PATTERNS

### Release Step Ordering Contract

The correct order for any release job is:

```
1. Validate (gates)        — fail fast before any side effects
2. Push tag                — point of no return; if this fails nothing is published
3. Check if already published — idempotency guard before any publish
4. Publish package         — only after tag is confirmed
5. Create GitHub Release   — only after package is confirmed
```

**Why tag before publish:** A failed tag push means the release hasn't been announced. Re-running is safe — no package is live yet. A failed publish after a successful tag push means only the package step needs retrying, not the whole release.

### Trigger Hygiene

```yaml
# ✗ Wrong — fires twice on PRs (push + pull_request)
on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop, main]

# ✓ Correct — pull_request covers all PR activity
on:
  pull_request:
    branches: [develop, main]
```

Only add `push` trigger if you explicitly need CI to run on direct pushes to protected branches with no PR (rare — usually only for release branches).

### Idempotency Guards

Every destructive or external operation needs a check-before-act:

```yaml
# Tag: check before pushing
- name: Check if tag exists
  id: tag_check
  run: |
    if git rev-parse "refs/tags/$TAG" --verify > /dev/null 2>&1; then
      echo "exists=true" >> "$GITHUB_OUTPUT"
    else
      echo "exists=false" >> "$GITHUB_OUTPUT"
    fi

# Publish: check before publishing
- name: Check if version published
  id: pkg_check
  run: |
    if npm view package@$VERSION version 2>/dev/null | grep -q "$VERSION"; then
      echo "published=true" >> "$GITHUB_OUTPUT"
    else
      echo "published=false" >> "$GITHUB_OUTPUT"
    fi
```

### Tag Lockdown + CI Bypass

If using a tag protection ruleset with `creation` restricted:
- `GITHUB_TOKEN` cannot bypass ruleset rules
- Use a fine-grained PAT (stored as `RELEASE_TOKEN`) owned by a user in the bypass actors list
- Scope the PAT to `Contents: Read and write` on the repo only

---

## CHECKLISTS

### Before merging any release workflow change

- [ ] Release steps are in order: validate → tag → publish check → publish → GitHub Release
- [ ] Tag push uses `RELEASE_TOKEN`, not `GITHUB_TOKEN`, if tag lockdown is active
- [ ] Publish step has idempotency guard (skip if version already exists)
- [ ] Tag step has idempotency guard (skip if tag already exists)
- [ ] No duplicate triggers (push + pull_request on same branch)
- [ ] `actionlint` passes locally before pushing

### Before merging any sentinel/CI workflow change

- [ ] No redundant triggers
- [ ] New jobs have `needs:` declared if they depend on prior gates
- [ ] No new jobs duplicate work already done by existing jobs
- [ ] Artifact uploads use `if: always()` so failures still produce reports

---

## ANTI-PATTERNS

| Anti-pattern | Risk | Fix |
|---|---|---|
| `npm publish` before `git push tag` | Package live before release announced; re-run causes 409 | Push tag first |
| `push` + `pull_request` triggers on same branch | Every PR runs CI twice | Use `pull_request` only |
| `GITHUB_TOKEN` for tag push with lockdown active | Pipeline fails at tag step | Use `RELEASE_TOKEN` PAT |
| No idempotency guard on publish | Re-run crashes with 409 Conflict | Check version exists before publishing |
| `enforce_admins: true` with no bypass | Repo owner can't merge their own PRs | Disable enforce_admins, use ruleset bypass instead |

---

## VERIFICATION WORKFLOW

1. **Run actionlint** — `actionlint` on all workflow files before pushing
2. **Trace the release job** — manually walk through every step in order and ask: "if this step fails, what is the state of the world? Is it safe to re-run?"
3. **Check triggers** — for each workflow, verify no two `on:` events can fire simultaneously on the same commit
4. **Verify bypass actors** — for any tag/branch ruleset, confirm the CI identity (PAT or bot) is in bypass actors before assuming it can push
