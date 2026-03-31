# Plans Index

> Durable planning artifacts for Orbit.

## Purpose

Use `docs/plans/` for plans that should remain reviewable and traceable in git.

Naming rules are defined in [docs/standards/artifact-conventions.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/standards/artifact-conventions.md).

## Current Active Plans

| Priority | Artifact | Scope | Status | Version | Last updated | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | [issue-130-orbit-enforcement-remediation-v1.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/issue-130-orbit-enforcement-remediation-v1.md) | Enforcement-first runtime remediation | Active | v1 | 2026-03-31 | Current foundation plan for making Orbit implementation match its documented workflow contracts |
| P1 | [issue-125-provenance-driven-context-synthesis-v1.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/issue-125-provenance-driven-context-synthesis-v1.md) | PDCS recovery architecture | Active | v1 | 2026-03-31 | Cross-cutting recovery initiative that builds on the stronger execution base |

## Historical And Legacy Plans

| Sequence | Artifact | Scope | Status | Version | Notes |
| --- | --- | --- | --- | --- | --- |
| Wave 0 | [v2.9.0-wave-0-release-bootstrap-v1.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/v2.9.0-wave-0-release-bootstrap-v1.md) | v2.9.0 release bootstrap | Implemented | v1 | Historical wave plan moved from the repo root into the canonical plans folder |

## Rule Of Thumb

- Put new durable plans here.
- Keep filenames descriptive, lowercase, and traceable to milestone, wave, or issue.
- Use issue-linked filenames plus a revision suffix so the latest active plan revision is obvious from the folder listing.
- Use the `Priority` column and plan metadata for implementation order. Do not infer sequence from issue number alone.
- Link predecessor and successor plans when a plan is superseded.
