## Summary
- <!-- concise summary bullet -->

## Issues
- Closes #<!-- issue -->
- Relates to #<!-- optional -->

## Ship Decision
- Review: `/orbit:review`
- Head SHA: `<!-- replace with current branch head sha; update on every follow-up commit -->`
- Merge when checks are green

## Test plan
- `<!-- command -->`

## Merge notes
- <!-- optional notes / relevant exceptions -->

---

## Orbit Self-Review

> This framework reviews other projects' code. It must review its own.
> Run the relevant agent before raising this PR. Record the verdict below.
> If you push follow-up commits after opening the PR, refresh this body before requesting review again.

### Agent Review Verdict

**Command run**: <!-- e.g. /orbit:review, /orbit:audit, /orbit:plan -->

**Agent(s) dispatched**: <!-- e.g. reviewer, architect, security-engineer -->

**Ship decision**: <!-- APPROVED / APPROVED WITH CONDITIONS / BLOCKED -->

**Findings addressed** (paste critical/high findings and how you resolved them, or "none"):
```
(findings here)
```

---

## Checklist

### Branch
- [ ] This PR is from a feature branch, NOT a direct push to `develop` or `main`
- [ ] Branch name follows convention: `<type>/<slug>` such as `feat/143-pr-governance-enforcement` or `fix/145-context-minimal-dedup`
- [ ] If this PR changed after opening, the `Summary`, `Issues`, `Ship Decision`, `Test plan`, and `Merge notes` sections were refreshed before re-review

### Code
- [ ] Tests added or updated for changed behaviour
- [ ] `npm test` + `npm run lint` pass
- [ ] `bash bin/validate.sh` passes — registry integrity (catches missing files, broken references)
- [ ] `bash bin/validate-config.sh` passes — cross-file consistency (version, hooks, model IDs)
- [ ] No hardcoded model IDs — only semantic aliases from `orbit.config.json → models.routing`
- [ ] No hardcoded local paths (`/Users/...`)

### Architecture
- [ ] Does not duplicate content already in `orbit.registry.json` (registry is SSOT)
- [ ] New agents registered in both `orbit.registry.json` AND `CLAUDE.md`
- [ ] New skills added to the skills auto-loading table in `CLAUDE.md`
- [ ] Kernel/userland boundary respected — no vertical domain content in `skills/` or `agents/`

### Docs
- [ ] `CHANGELOG.md` updated with this version's entry
- [ ] `README.md` updated if behaviour or interface changed
- [ ] `STATE.md` anti-patterns list updated if a known issue was fixed or a new one introduced

### Release (only for version bumps)
- [ ] `package.json` version bumped — this is the single source of version truth
- [ ] `orbit.config.json` does NOT contain a `version` field (remove if present)
- [ ] CHANGELOG entry matches `package.json` version exactly
