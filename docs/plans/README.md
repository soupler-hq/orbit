# Plans Index

> Durable planning artifacts for Orbit.

## Purpose

Use `docs/plans/` for plans that should remain reviewable and traceable in git.

Naming rules are defined in [docs/standards/artifact-conventions.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/standards/artifact-conventions.md).

## Current Active Plans

| Rank | Phase | Priority | Artifact | Depends on | Status | Version | Last updated | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 010 | Foundations | P0 | [issue-130-orbit-enforcement-remediation.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/issue-130-orbit-enforcement-remediation.md) | none | Active | v1 | 2026-03-31 | Current foundation plan for making Orbit implementation match its documented workflow contracts |
| 020 | Recovery | P1 | [issue-125-provenance-driven-context-synthesis.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/issue-125-provenance-driven-context-synthesis.md) | issue-130 | Active | v1 | 2026-03-31 | Cross-cutting recovery initiative that builds on the stronger execution base |

## Historical Wave Plans

| Rank | Phase | Artifact | Depends on | Status | Version | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 000 | Foundations | [v2.9.0-wave-0-release-bootstrap.md](/Users/sunnysrivastava/Documents/repos/Soupler/soupler-hq/orbit/docs/plans/v2.9.0-wave-0-release-bootstrap.md) | none | Implemented | v1 | Historical wave plan moved from the repo root into the canonical plans folder |

## Rule Of Thumb

- Put new durable plans here.
- Keep filenames descriptive, lowercase, and traceable to milestone, wave, or issue.
- Use stable issue-linked or wave-linked filenames. Put revision in metadata, not in the plan filename.
- Use the `Rank`, `Phase`, `Priority`, and `Depends on` columns for implementation order. Do not infer sequence from issue number alone.
- Link predecessor and successor plans when a plan is superseded.
