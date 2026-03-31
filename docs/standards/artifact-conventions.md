# Artifact Conventions

> Naming, placement, metadata, and traceability rules for Orbit documentation and durable artifacts.

## Goal

Orbit should make it obvious:

- what artifact belongs to which workflow step
- which issue or milestone it supports
- whether the artifact is active, historical, generated, or ephemeral
- how a human can reconstruct the path from plan to implementation to release

## Canonical Layout

Use the docs tree by artifact intent.

```text
docs/
  architecture/ stable canonical system-design and control-plane references
  operations/   playbooks, runbooks, error handling, and operator procedures
  quality/      eval frameworks, datasets, and quality gates
  integrations/ integration-specific guides such as MCP
  governance/   contributor and project-governance docs
  releases/     release notes, checklists, and summaries
  plans/        active and historical planning artifacts
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
- `docs/releases/release-notes.md` remains the canonical release-notes artifact consumed by the release pipeline.
- Docs artifacts extend those systems; they do not replace them.

## Naming Rules

Prefer lowercase kebab-case for all artifact filenames.

### Canonical Docs

Canonical docs keep stable semantic filenames inside the correct folder.

Recommended patterns:

- overview doc: `overview.md`
- concept/reference doc: `<topic>.md`
- guide: `<topic>-guide.md` only when the noun alone would be ambiguous
- runbook/playbook: `<topic>.md`
- folder index: `README.md`

Examples:

- `docs/architecture/overview.md`
- `docs/architecture/runtime-adapters.md`
- `docs/operations/playbooks.md`
- `docs/quality/evaluation-framework.md`

Stable canonical docs should not be renamed on every revision. Version in frontmatter and Git history provides traceability.

### Plans

Plans live in `docs/plans/`.

Recommended patterns:

- milestone or wave plan: `v<major>.<minor>.<patch>-wave-<n>-<slug>.md`
- issue implementation plan: `issue-<nnn>-<slug>.md`
- cross-cutting architecture plan: `issue-<nnn>-<slug>.md` unless the plan is intentionally milestone-wide

Examples:

- `v2.9.0-wave-0-release-bootstrap.md`
- `issue-125-provenance-driven-context-synthesis.md`
- `issue-130-orbit-enforcement-remediation.md`

Keep plan filenames stable. Store revision in plan metadata and Git history. Only create a new plan file when the scope materially changes or a new plan must coexist beside the old one.

### Releases

Release-specific docs live in `docs/releases/`.

Recommended patterns:

- release summary: `v<major>.<minor>.<patch>.md`
- release checklist: `v<major>.<minor>.<patch>-checklist.md`
- release retrospective: `v<major>.<minor>.<patch>-retrospective.md`

Examples:

- `v2.9.0.md`
- `v2.9.0-checklist.md`

Keep the concise cross-release release notes in `docs/releases/release-notes.md`. Put deeper release-operating artifacts under `docs/releases/`.

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
- Use `wave-<n>` for milestone-wave plans.
- Use `issue-<nnn>` for issue-scoped documents.
- Use suffixes like `-checklist`, `-review`, `-retrospective`, `-handoff` for lifecycle stage.
- Every folder with more than one durable artifact should maintain a `README.md` index with current and historical ordering.
- Issue numbers are traceability markers, not execution-order markers.
- When execution order differs from issue creation order, represent the true sequence in plan metadata and the folder index.

## Versioning Rules

- Stable canonical docs use semantic paths and frontmatter version fields.
- Time-series docs use versioned or issue-linked filenames.
- Do not encode version numbers in canonical architecture/operations/governance filenames unless multiple variants must coexist.
- If a canonical doc is superseded, keep the path stable and update the `version`, `last_updated`, and `status` metadata.

## Required Metadata

Canonical docs should include frontmatter with:

- `id`
- `doc_type`
- `status`
- `version`
- `last_updated`

Plans and issue docs should include at minimum:

- title
- scope or linked issue / milestone
- status
- version
- last updated
- phase
- rank
- priority
- depends_on
- blocks

## Required Content Structure

### Overview docs

- purpose
- scope
- current state or architecture
- diagrams or major component relationships
- related docs

### Reference docs

- purpose
- invariants or contract
- structured tables, schemas, or rules
- related docs

### Guide / runbook docs

- purpose
- prerequisites
- operating steps
- rollback or troubleshooting
- escalation / related docs

### Plan docs

- why this exists
- scope and non-goals
- current status
- execution order or phases
- dependency context
- successor / predecessor links when superseded

## Traceability Rules

Each durable artifact should include:

- title
- scope or linked issue / milestone
- status
- last updated date
- links to predecessor or successor artifacts when relevant

When a plan supersedes another artifact, add a short note pointing to the replacement instead of silently abandoning the older document.

For pull requests:

- keep the PR body aligned with the current branch scope
- update `Summary`, `Issues`, `Test plan`, and `Merge notes` whenever commits materially change implementation scope or verification evidence
- do not leave stale PR descriptions after follow-up commits

## Current Transition Rules

Orbit already has historical artifacts such as `docs/plans/v2.9.0-wave-0-release-bootstrap.md`.

Transition policy:

- do not rename stable historical artifacts just for cosmetic consistency once they have been normalized into the canonical folders
- all new durable artifacts should follow the conventions in this document
- legacy files should be linked from the new directory indexes so the path remains reconstructable

## Anti-Patterns

- root-level scratch files like `PLAN.md`, `plan-final.md`, `notes-new.md`
- filenames that encode personal context instead of project context
- duplicating issue state in both GitHub and repo docs without a clear reason
- mixing runtime state files with durable design docs
- creating multiple similarly named plan files without status or succession links
