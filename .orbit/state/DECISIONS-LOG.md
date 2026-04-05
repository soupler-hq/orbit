# DECISIONS-LOG.md

> Temporal decision ledger for durable architectural and workflow choices.
> Add entries; do not overwrite history.

- decision: "Insert Wave 0.5 Foundation Hardening before Wave 4 Ship + Positioning"
  made_at: "2026-04-05"
  version: "v2.9.0"
  phase: "Wave 0.5"
  made_by: "Orbit"
  context: "360 degree technical audit surfaced naming convention violations, missing event-sourced state, no docs reading order, and no CI enforcement for artifact conventions"
  rationale: "These are foundational prerequisites — shipping Wave 4 without them risks accumulating permanent technical debt against the project's own standards"
  supersedes: []
  still_valid: true
  invalidated_at: ""

- decision: "EVENT-LOG.jsonl as append-only source of truth; STATE.md as materialized view"
  made_at: "2026-04-05"
  version: "v2.9.0"
  phase: "Wave 0.5"
  made_by: "Orbit"
  context: "SOTA LLM memory architecture: episodic (event stream), semantic (role/skill definitions), procedural (derived operating state)"
  rationale: "The event log survives .orbit deletion because it is git-tracked; replaying it reconstructs the materialized view. Same pattern as Redux, Kafka, EventStore — append-only source, derived projections"
  supersedes: []
  still_valid: true
  invalidated_at: ""
