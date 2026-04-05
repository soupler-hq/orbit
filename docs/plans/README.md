<!-- GENERATED FILE - DO NOT EDIT MANUALLY -->
<!-- Source: docs/plans/*.md frontmatter -->
<!-- Regenerate: node bin/generate-plan-index.js -->

# Plans Index

> Durable planning artifacts for Orbit.

## Purpose

Use `docs/plans/` for plans that should remain reviewable and traceable in git.

Naming rules are defined in [artifact-conventions.md](../standards/artifact-conventions.md).

## Current Active Plans

| Rank | Phase | Priority | Artifact | Depends on | Blocks | Status | Version | Last updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 010 | Foundations | P0 | [issue-130-orbit-enforcement-remediation.md](issue-130-orbit-enforcement-remediation.md) | none | issue-125 | Active | v1 | 2026-04-01 |
| 020 | Recovery | P1 | [issue-125-provenance-driven-context-synthesis.md](issue-125-provenance-driven-context-synthesis.md) | issue-130 | none | Active | v1 | 2026-04-01 |

## Historical Wave And Completed Plans

| Rank | Phase | Priority | Artifact | Depends on | Blocks | Status | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 000 | Foundations | P0 | [v2.9.0-wave-0-release-bootstrap.md](v2.9.0-wave-0-release-bootstrap.md) | none | none | Implemented | v1 |

## Rule Of Thumb

- Put new durable plans here.
- Keep filenames descriptive, lowercase, and traceable to milestone, wave, or issue.
- Use stable issue-linked or wave-linked filenames. Put revision in metadata, not in the plan filename.
- Use the `Rank`, `Phase`, `Priority`, `Depends on`, and `Blocks` columns for implementation order. Do not infer sequence from issue number alone.
- Link predecessor and successor plans when a plan is superseded.
