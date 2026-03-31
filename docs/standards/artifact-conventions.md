# Artifact Conventions

> Naming, placement, and traceability rules for planning, release, and issue-adjacent artifacts in Orbit.

## Goal

Orbit should make it obvious:

- what artifact belongs to which workflow step
- which issue or milestone it supports
- whether the artifact is active, historical, generated, or ephemeral
- how a human can reconstruct the path from plan to implementation to release

## Canonical Layout

Use the docs tree by artifact type.

```text
docs/
  plans/        active and historical planning artifacts
  releases/     release-specific notes, checklists, and summaries
  issues/       durable issue briefs or design notes when GitHub issue text is not enough
  standards/    meta-rules, naming conventions, and governance docs
```

Use `.orbit/state/` only for runtime state and session artifacts.

```text
.orbit/state/
  STATE.md
  pre-compact-snapshot.md
  sessions.log
  compact.log
  tool-usage.log
```

## Source Of Truth

- GitHub Issues remain the canonical tracker for issue status, discussion, and assignment.
- `STATE.md` remains the canonical human-readable project ledger for current framework state.
- `context.db` remains the fast structured cache.
- `RELEASE_NOTES.md` remains the canonical top-level changelog.
- Docs artifacts extend those systems; they do not replace them.

## Naming Rules

Prefer lowercase kebab-case for all artifact filenames.

### Plans

Plans live in `docs/plans/`.

Recommended patterns:

- milestone or wave plan: `v<major>.<minor>.<patch>-wave-<n>-<slug>.md`
- issue implementation plan: `issue-<nnn>-<slug>.md`
- cross-cutting architecture plan: `<slug>.md` only when the document is a long-lived named initiative

Examples:

- `v2.9.0-wave-0-release-bootstrap.md`
- `issue-125-provenance-driven-context-synthesis.md`
- `provenance-driven-context-synthesis.md`

Use the simpler named-initiative form only when the document is expected to stay relevant across multiple issues or waves.

### Releases

Release-specific docs live in `docs/releases/`.

Recommended patterns:

- release summary: `v<major>.<minor>.<patch>.md`
- release checklist: `v<major>.<minor>.<patch>-checklist.md`
- release retrospective: `v<major>.<minor>.<patch>-retrospective.md`

Examples:

- `v2.9.0.md`
- `v2.9.0-checklist.md`

Keep the concise cross-release changelog in `RELEASE_NOTES.md`. Put deeper release-operating artifacts under `docs/releases/`.

### Issues

Issue-specific supporting docs live in `docs/issues/` only when the issue needs durable design or execution context that should outlive the GitHub thread.

Recommended pattern:

- `issue-<nnn>-<slug>.md`

Examples:

- `issue-78-repo-artifact-layout.md`
- `issue-125-context-recovery-ledger.md`

Do not mirror every GitHub issue into the repo. Create an issue doc only when it adds durable implementation value.

## Ordering Rules

Ordering should be visible from the filename whenever sequence matters.

- Use milestone/version prefix first for release-scoped plans.
- Use `wave-<n>` for dependency order.
- Use `issue-<nnn>` for issue-scoped documents.
- Use suffixes like `-checklist`, `-review`, `-retrospective`, `-handoff` for lifecycle stage.

## Traceability Rules

Each durable artifact should include:

- title
- scope or linked issue / milestone
- status
- last updated date
- links to predecessor or successor artifacts when relevant

When a plan supersedes another artifact, add a short note pointing to the replacement instead of silently abandoning the older document.

## Current Transition Rules

Orbit already has legacy artifacts such as `PHASE-0-PLAN.md` and `RELEASE_NOTES.md`.

Transition policy:

- do not rename stable historical artifacts just for cosmetic consistency
- all new durable artifacts should follow the conventions in this document
- legacy files should be linked from the new directory indexes so the path remains reconstructable

## Anti-Patterns

- root-level scratch files like `PLAN.md`, `plan-final.md`, `notes-new.md`
- filenames that encode personal context instead of project context
- duplicating issue state in both GitHub and repo docs without a clear reason
- mixing runtime state files with durable design docs
- creating multiple similarly named plan files without status or succession links
