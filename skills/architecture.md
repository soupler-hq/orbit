# SKILL: Architecture Design
> Every structural decision documented, justified, and reversible

## ACTIVATION
Auto-loaded when designing any system, subsystem, or making technology choices.

## ARCHITECTURE DECISION RECORD (ADR) FORMAT
Every significant decision gets an ADR. Significant = would take >1 day to reverse.

```markdown
# ADR-{N}: {Title}

**Date**: {YYYY-MM-DD}
**Status**: Proposed | Accepted | Superseded by ADR-{N}
**Deciders**: {who was involved}

## Context
What situation or problem forced this decision?
What constraints exist (team size, budget, timeline, existing systems)?

## Decision
What did we decide? State it clearly and specifically.

## Alternatives Considered

### Option A: {name}
Pros: ...
Cons: ...
Why rejected: ...

### Option B: {name} (CHOSEN)
Pros: ...
Cons: ...
Why chosen: ...

### Option C: {name}
Pros: ...
Cons: ...
Why rejected: ...

## Consequences
What becomes easier because of this decision?
What becomes harder?
What do we need to monitor or revisit?

## Review Trigger
When should this decision be revisited? (e.g., "when monthly active users exceed 100k")
```

## SYSTEM DESIGN CHECKLIST

### Boundaries & Ownership
- [ ] Every component has a single owner (team or service)
- [ ] Every data entity has exactly one system of record
- [ ] Every API has an explicit SLA (latency, availability, rate limits)
- [ ] Inter-service communication patterns documented (sync REST, async queue, event stream)

### Failure Modes
- [ ] What happens when each component fails?
- [ ] What is the degraded experience vs full failure?
- [ ] Is there a circuit breaker pattern for critical dependencies?
- [ ] What is the recovery procedure for each failure type?

### Security (embed, don't bolt on)
- [ ] Authentication: who can call this API?
- [ ] Authorization: what can they do?
- [ ] Data in transit: TLS everywhere
- [ ] Data at rest: encryption for PII/sensitive data
- [ ] Secrets: no hardcoded credentials, rotation policy defined
- [ ] Input validation: every external input validated and sanitized
- [ ] Audit logging: who did what, when

### Scalability
- [ ] What is the bottleneck at 10x current load?
- [ ] What scales horizontally vs requires sharding/partitioning?
- [ ] What are the cache invalidation boundaries?
- [ ] What are the database connection pool limits?

### Observability (design in from day 1)
- [ ] Structured logging with correlation IDs
- [ ] Key business metrics tracked (not just technical metrics)
- [ ] Distributed tracing for request flows
- [ ] Alerting thresholds defined before go-live
- [ ] Runbook for every alert

## TECHNOLOGY SELECTION FRAMEWORK
Score each candidate on: fit for requirements (1-5), team familiarity (1-5), ecosystem maturity (1-5), operational burden (1-5, higher = less burden), licensing (pass/fail).
Choose highest total score. Document it in ADR.

## COMMON ARCHITECTURE PATTERNS (with when to use)

| Pattern | Use When |
|---------|----------|
| Monolith | Team <10 engineers, domain well understood, shipping speed critical |
| Modular Monolith | Growing team, want service isolation without distributed systems complexity |
| Microservices | Teams are scaling independently, need independent deployment, clear domain boundaries |
| Event-Driven | Decoupling producers/consumers, audit trail needed, multiple consumers of same event |
| CQRS | Read and write models diverge significantly, high read:write ratio |
| Saga | Distributed transactions across services, eventual consistency acceptable |
| BFF (Backend for Frontend) | Multiple frontends with different data shape needs |
