# Issue Docs Index

> Issue docs are optional, durable supporting artifacts for complex GitHub issues.

## Canonical Source

GitHub Issues remain the source of truth for issue status, comments, and ownership.

Use `docs/issues/` only when an issue needs durable repo-local design or execution context that should survive beyond the GitHub thread.

## Naming Convention

- `issue-<nnn>-<slug>.md`

Examples:

- `issue-78-repo-artifact-layout.md`
- `issue-125-context-recovery-ledger.md`

## When To Create One

- the issue has a meaningful design brief
- the implementation spans multiple PRs
- the artifact will be useful during future maintenance

If the GitHub issue body already captures everything needed, do not duplicate it here.
