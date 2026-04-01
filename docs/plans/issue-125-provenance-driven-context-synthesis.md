---
id: issue-125-provenance-driven-context-synthesis
doc_type: plan
status: Active
version: v1
last_updated: 2026-04-01
scope: issue-125
phase: Recovery
rank: 020
priority: P1
depends_on:
  - issue-130
blocks: []
---

# Provenance-Driven Context Synthesis

> Detailed implementation plan for a self-healing context engine

## Why this exists

Orbit currently treats `.orbit/state/STATE.md` and `.orbit/context.db` as session state, but either can become stale, missing, or corrupted. The long-term fix is not a harder dependency on one file. The fix is a provenance-driven recovery model that can reconstruct context from the repository itself.

This plan formalizes that model and turns it into an implementable feature set.

## Core Principle

Use the repository as the evidence layer, `context.db` as the fast materialized cache, and `STATE.md` as the human-readable materialized view. Neither file is the canonical source of truth. They are projections.

## Current Reality

This plan is still the right architecture direction, but recent work exposed a practical prerequisite:

- Orbit can improve hooks, prompts, and workflow docs faster than it updates resumable state
- `.orbit/state/STATE.md`, `.orbit/state/pre-compact-snapshot.md`, and `context.db` can drift behind active branch and PR work
- resumability is not trustworthy enough unless state freshness is enforced as part of normal workflow completion

That means PDCS should be implemented with enforcement hardening in mind, not as a separate abstract recovery project.

## Current Dependency

PDCS now depends on the enforcement/state-reliability program becoming real first.

In practice, that means these issues are prerequisites or close companions:

- #132 — executable end-to-end enforcement coverage
- #142 — documented-vs-enforced closure epic
- #145 — automatic state freshness across command paths
- #146 — status block parity across documented commands
- #149 — adapter-backed plain-prompt enforcement
- #150 — executable `/orbit:next`

Without those, the system can still drift between what Orbit says it knows and what its materialized views actually contain.

## Design Goals

- Recover context when both `STATE.md` and `context.db` are missing or stale
- Prefer evidence with stronger provenance over human-written summaries
- Keep recovery deterministic, explainable, and safe
- Avoid hardcoding source precedence into scattered scripts
- Preserve Orbit's repo-native workflow and human reviewability

## Non-Goals

- Replacing Git as the persistence backbone
- Introducing a remote service as the primary context store
- Making GitHub Wiki the canonical source of truth
- Building a general-purpose knowledge graph for non-repo data

## Source-of-Truth Policy

The repo should keep a clear hierarchy:

1. Git history, commit metadata, and the working tree
2. GitHub issues and PRs
3. Project docs such as `README.md`, `docs/releases/release-notes.md`, and architecture docs
4. Materialized views such as `context.db` and `STATE.md`

GitHub Wiki can be used as a mirror or collaboration surface if needed, but not as the canonical store. It is detached from code review, commit history, and release automation.

## Relation To Issue #78

Issue #78 is the structural cleanup umbrella. This plan should be implemented alongside it because PDCS needs a clearer artifact layout and a disciplined place for generated planning material.

Recommended alignment:

- Keep generated or implementation-facing artifacts in `docs/plans/`
- Avoid adding more root-level one-off markdown files
- Use the structure cleanup from #78 to make the recovery engine easier to navigate
- Update docs so contributors know which artifacts are canonical and which are generated

## Proposed Architecture

### 1. Evidence Layer

Inputs:

- Git history
- Commit messages
- PR descriptions and issue metadata
- README and architecture docs
- Release notes and changelog
- Source tree and code symbols
- CI/workflow metadata

### 2. Extractor Layer

Each evidence source gets a dedicated extractor with a shared interface:

```text
Extractor -> Facts + provenance + confidence + freshness
```

Candidate extractors:

- Git history extractor
- GitHub issue/PR extractor
- Docs extractor
- Tree-sitter structural extractor
- Working-tree snapshot extractor

### 3. Provenance Ledger

Persist extracted facts in SQLite as an append-only ledger. Each fact records:

- source type
- source ref
- source hash
- extractor version
- timestamp
- confidence dimensions
- materialization targets

### 3a. Concrete SQLite Schema

Use portable SQLite types. Store structured payloads as JSON text so the design works with stock SQLite builds.

```sql
CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,           -- git_commit, file, issue, pr, tree_sitter, etc.
    source_ref TEXT NOT NULL,            -- commit hash, file path, issue URL, etc.
    source_hash TEXT NOT NULL,           -- SHA-256 of raw source payload
    freshness_anchor TEXT,               -- commit hash or timestamp used for drift comparison
    extractor_version TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    fact_key TEXT NOT NULL,              -- e.g. active_milestone, open_issue_count
    fact_value TEXT NOT NULL,             -- JSON text
    entity_type TEXT,                    -- optional grouping: task, module, release, etc.
    authority REAL NOT NULL DEFAULT 1.0,
    integrity REAL NOT NULL DEFAULT 1.0,
    freshness REAL NOT NULL DEFAULT 1.0,
    coherence REAL NOT NULL DEFAULT 1.0,
    aggregate_score REAL NOT NULL DEFAULT 1.0,
    materialization_target TEXT NOT NULL DEFAULT 'context.db',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE materializations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target TEXT NOT NULL,                -- context.db, STATE.md
    target_path TEXT NOT NULL,
    source_commit TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    materialized_at INTEGER NOT NULL DEFAULT (unixepoch()),
    checksum TEXT NOT NULL,
    confidence_summary TEXT NOT NULL      -- JSON text
);

CREATE TABLE drift_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target TEXT NOT NULL,
    drift_type TEXT NOT NULL,            -- fresh, stale, human-edited, corrupt, unknown
    detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
    details TEXT NOT NULL,               -- JSON text
    resolved INTEGER NOT NULL DEFAULT 0
);
```

Recommended indexes:

```sql
CREATE INDEX idx_facts_key_created ON facts(fact_key, created_at DESC);
CREATE INDEX idx_sources_ref ON sources(source_ref);
CREATE INDEX idx_materializations_target ON materializations(target, materialized_at DESC);
CREATE INDEX idx_drift_target ON drift_events(target, detected_at DESC);
```

### 4. Recovery Orchestrator

The orchestrator performs:

1. Drift detection
2. Source prioritization
3. Reconstruction
4. Conflict resolution
5. Materialization
6. Safety checks

### 5. Materialized Views

The orchestrator outputs:

- `context.db` for fast agent reads
- `STATE.md` for human-readable recovery and session resumption

## Drift Policy

Recovery should trigger when one or more of the following are true:

- `context.db` is missing
- `STATE.md` is missing
- `STATE.md` hash does not match the last materialized hash
- `context.db` last materialized commit does not match `HEAD`
- required facts are absent from the cache

Additional practical trigger:

- the active branch / PR / issue stack reflected in recent workflow work is not represented in `STATE.md`, the pre-compact snapshot, or the materialized context cache

The engine should classify drift as:

- `fresh`
- `stale`
- `human-edited`
- `corrupt`
- `unknown`

## Recovery Ladder

Recovery should prefer stronger evidence first:

1. Structural inference from the source tree and code parsing
2. Temporal reconstruction from git history and PR/issue history
3. Semantic reconstruction from docs and release notes
4. Salvage of any partial `STATE.md`

Conflict resolution should prefer:

- code structure over docs
- git history over summaries
- issues/PRs over stale state files
- human state only when it does not contradict stronger evidence

## Planned Work Wavelength

### Wave 1: Ledger foundation

- Define the context ledger schema
- Define provenance and confidence fields
- Add drift metadata to materialized views
- Add tests for missing and stale state
- Include explicit facts for active branch, active PR, current issue/epic, and last durable task boundary

### Wave 2: Recovery orchestration

- Implement the recovery state machine
- Add git-based and docs-based recovery paths
- Add confidence scoring and conflict resolution
- Add explicit error modes for low-confidence recovery
- Verify that `/orbit:resume` can recover the current enforcement stack even if local session memory is missing

### Wave 3: Source extractors

- Implement Git history extraction
- Implement docs extraction
- Implement issue/PR extraction
- Add tree-sitter structural extraction

### Wave 4: Materialization and safety

- Materialize `context.db`
- Materialize `STATE.md`
- Protect human edits with drift detection
- Add recovery diff output and explicit merge prompts

### Wave 5: Documentation and navigation

- Update `README.md` with the new recovery model
- Update `docs/architecture/overview.md` with the source hierarchy
- Update `docs/architecture/core-concepts.md` with the ledger/view split
- Update `docs/operations/playbooks.md` with recovery and drift recovery steps
- Update `templates/orbit.base.md` and runtime docs so the guidance matches the model

## Suggested File Layout

- `docs/plans/` for implementation blueprints and wave plans
- `docs/specs/` for architecture RFCs and durable design decisions
- `docs/operations/playbooks.md` for operator procedures
- `docs/architecture/overview.md` for control-plane design

This keeps generated and planning artifacts out of the repo root without relying on an external wiki.

## Acceptance Criteria

- Missing `STATE.md` and missing `context.db` can both be reconstructed from repo evidence
- The recovery engine can explain why it chose a source
- Human edits are detected and handled conservatively
- `context.db` is always the fast read path when available
- `STATE.md` remains readable, consistent, and reviewable
- active branch / PR / current issue stack survive into resumable context without relying on chat history
- Documentation explains where artifacts belong and which files are canonical
- Repo structure aligns with the cleanup goals in issue #78

## Open Questions

- Should GitHub Wiki be mirrored automatically, or remain optional documentation only?
- Should the ledger be append-only forever, or compacted periodically into snapshots?
- Should tree-sitter be mandatory for supported languages or conditional per runtime?
- Which fact precedence rules are strict vs configurable?
