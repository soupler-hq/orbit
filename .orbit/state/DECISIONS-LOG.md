# DECISIONS-LOG.md

> Temporal decision ledger for durable architectural and workflow choices.
> Add entries; do not overwrite history.

---

## 2026-04-05

### D-001 — Wave 0.5 Foundation Hardening as Wave 4 prerequisite

- **decision**: Insert Wave 0.5 Foundation Hardening before Wave 4 Ship + Positioning
- **made_at**: 2026-04-05
- **version**: v2.9.0
- **phase**: Wave 0.5
- **made_by**: Orbit
- **rationale**: 360° technical audit surfaced four systemic gaps — naming convention violations (PHASE-4-PLAN.md), missing event-sourced state, no documentation reading order, and no CI enforcement for artifact conventions. These are foundational prerequisites; shipping Wave 4 without them risks accumulating permanent technical debt against the project's own standards.
- **supersedes**: []
- **still_valid**: true

### D-002 — EVENT-LOG.jsonl as append-only source of truth; STATE.md as materialized view

- **decision**: Implement event-sourced state model — EVENT-LOG.jsonl records all typed state transitions; STATE.md is a derived view rebuilt by `bootstrap.js --replay`
- **made_at**: 2026-04-05
- **version**: v2.9.0
- **phase**: Wave 0.5
- **made_by**: Orbit
- **rationale**: SOTA LLM memory architecture maps to three layers: episodic (event stream), semantic (role/skill definitions), procedural (derived operating state). The event log survives .orbit/ deletion because it is git-tracked; replaying it reconstructs the materialized view. Same pattern as Redux/Kafka/EventStore — append-only source, derived projections.
- **supersedes**: []
- **still_valid**: true
