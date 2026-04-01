# DECISIONS-LOG.md
> Temporal decision ledger for durable architectural and workflow choices.
> Add entries; do not overwrite history.

Example entry shape:

```md
- decision: "Adopt SQLite for local state caching"
  made_at: "2026-04-01"
  version: "v2.8.1"
  phase: "Enforcement Hardening"
  made_by: "orbit"
  context: "Structured project memory bootstrap"
  rationale: "SQLite keeps state local, queryable, and dependency-light."
  supersedes: []
  still_valid: true
  invalidated_at: ""
```
