## What
<!-- One sentence: what does this PR do? -->

## Why
<!-- Why is this change needed? Link issue or audit finding if applicable. -->

---

## Orbit Self-Review

> This framework reviews other projects' code. It must review its own.
> Run the relevant agent before raising this PR. Record the verdict below.

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

### Code
- [ ] Tests added or updated for changed behaviour
- [ ] CI passes locally (`npm test`, `npm run lint`, `bash bin/validate.sh`)
- [ ] `bash bin/validate-config.sh` passes (no version skew, no hook mismatches)
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
