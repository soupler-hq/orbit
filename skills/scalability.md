# SKILL: Scalability Design
> Design for the scale you need in 18 months, not today — but not 5 years from now

## ACTIVATION
Auto-loaded when designing systems with growth requirements, performance constraints, or scale targets.

## CORE PRINCIPLES
1. **Design for the 18-Month Target**: Don't over-engineer for 5 years, but don't limit growth to next week.
2. **Bottleneck Identification**: Every system has one primary constraint (CPU, I/O, RAM, Network); find and scale it first.
3. **Statelessness**: Remove state from application instances to enable horizontal scaling.
4. **Don't Jump the Scale Ladder**: Use simpler methods (replicas, pooling) before complex ones (sharding, partitioning).
5. **Horizontal over Vertical**: Prefer adding more small instances over buying one massive, expensive server.

## PATTERNS

### Horizontal Scaling (stateless services)
```
Load Balancer
    ├── App Instance 1 (stateless)
    ├── App Instance 2 (stateless)
    └── App Instance N (stateless)
         ↓
Shared State Layer (DB, Redis, S3)
```
**Requirements for horizontal scaling**:
- No local disk writes (use object storage)
- No in-process session (use Redis/DB)
- No local cache that diverges (use shared cache)
- Idempotent request handling (safe to retry)

### Database Scaling Ladder
```
Level 0: Single Postgres instance                 — up to ~500 req/sec writes
Level 1: Read replicas (1-3)                      — up to ~5k req/sec reads
Level 2: Connection pooling (PgBouncer)           — same DB, more connections
Level 3: Vertical scaling (bigger instance)       — straightforward, costly
Level 4: Sharding / partitioning                  — complex, use last resort
Level 5: CQRS + separate read model               — for very read-heavy systems
```

### Caching Strategy
```
Browser cache (CDN) → Service cache (Redis) → DB cache (pg buffer pool)
       ↑                      ↑                          ↑
  Static assets          Session data               Query results
  TTL: 1 year            TTL: 15 min              TTL: 30 sec - 5 min
```

## CHECKLISTS

### Scalability Readiness
- [ ] Service is stateless (no local session or disk writes)
- [ ] Database queries are indexed and N+1 free
- [ ] Connection pooling is configured for the expected peak
- [ ] Read replicas are used for high-traffic read paths
- [ ] Slow/Spiky operations are moved to background queues
- [ ] Cache hit rates and TTLs are tuned for the workload
- [ ] Load testing at 2x expected peak successful

## ANTI-PATTERNS
- **Premature Sharding**: Adding sharding complexity before exhausting replicas or vertical scaling.
- **Unlimited TTL**: Caching data forever without an invalidation or expiration strategy.
- **Blocking the Request**: Performing slow, external, or non-critical tasks in the main user response path.
- **Local Caching**: Keeping state in-process, causing divergence between instances.
- **Blind Scaling**: Adding CPU/RAM without profiling to see if the bottleneck is actually I/O or locking.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
