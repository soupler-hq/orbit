# SKILL: Scalability Design
> Design for the scale you need in 18 months, not today — but not 5 years from now

## ACTIVATION
Auto-loaded when designing systems with growth requirements, performance constraints, or scale targets.

## CAPACITY PLANNING FRAMEWORK

### Step 1: Define the Numbers
Before any architecture decision, establish:
```
Current load:    _____ req/sec, _____ MAU, _____ GB data
6-month target:  _____ req/sec, _____ MAU, _____ GB data
18-month target: _____ req/sec, _____ MAU, _____ GB data
Peak multiplier: _____x (Black Friday, product launch, etc.)
```

### Step 2: Find the Bottleneck
Every system has one primary bottleneck. Find it before designing around it.
- **CPU-bound**: computation per request is high (ML inference, image processing, crypto)
- **I/O-bound**: waiting on DB/network (most web services)
- **Memory-bound**: large working sets (caching layers, session stores)
- **Network-bound**: large payloads, many downstream calls

### Step 3: Scale the Bottleneck
Scale the thing that's actually slow. Not everything.

---

## SCALING PATTERNS

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

**The rule**: don't jump levels. If reads are slow, add replicas first. If writes are slow, profile queries before partitioning.

### Caching Strategy
```
Browser cache (CDN) → Service cache (Redis) → DB cache (pg buffer pool)
       ↑                      ↑                          ↑
  Static assets          Session data               Query results
  TTL: 1 year            TTL: 15 min              TTL: 30 sec - 5 min
```

**Cache key design**:
```typescript
// Too broad — invalidation blows up too much
cacheKey = `user:${userId}`;

// Too narrow — too many cache entries, low hit rate
cacheKey = `user:${userId}:orders:page:${page}:limit:${limit}:status:${status}`;

// Right level — meaningful unit
cacheKey = `user:${userId}:order-summary:v2`;
// Version suffix (v2) lets you bust all entries when schema changes
```

**Cache invalidation rules**:
- Write-through: update cache on every write → strong consistency, more writes
- Cache-aside: read miss populates, TTL expires → simpler, eventual consistency
- Event-driven: invalidate on domain events → complex, most accurate

### Queue-Based Load Leveling
```
High-volume writes → Queue → Workers (auto-scaled) → DB
```
Use when:
- Write throughput spikes unpredictably (orders, notifications, analytics events)
- Processing is slow but doesn't need to block the user response
- You need retry logic for unreliable downstream systems

```typescript
// Instead of: processPayment() inline → blocks request, no retry
// Do: enqueue('payment.process', { orderId }) → return 202 Accepted
//     Worker: pick job, process, retry on failure, dead-letter after 3 attempts
```

### API Rate Limiting at Scale
```typescript
// Per-user rate limiting with Redis sliding window
const isRateLimited = async (userId: string, limit: number, windowSec: number) => {
  const key = `rate:${userId}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec * 2);
  return count > limit;
};
```

---

## PERFORMANCE PROFILING CHECKLIST

### Database Query Analysis
```sql
-- Find slow queries (Postgres)
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Spot missing indexes
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
-- Look for: Seq Scan on large tables, high actual rows vs estimated rows
```

### N+1 Query Detection
```typescript
// N+1: 1 query for orders, then 1 query per order for user
const orders = await getOrders();                           // 1 query
const enriched = orders.map(o => ({
  ...o,
  user: await getUser(o.userId)                            // N queries!
}));

// Fix: join or batch load
const orders = await getOrdersWithUsers();                  // 1 query with JOIN
// or
const userIds = orders.map(o => o.userId);
const users = await getUsersByIds(userIds);                 // 1 query, batch
const userMap = Object.fromEntries(users.map(u => [u.id, u]));
```

### Frontend Performance Budget
```
First Contentful Paint:   < 1.8s  (3G connection)
Largest Contentful Paint: < 2.5s
Total Blocking Time:      < 200ms
Cumulative Layout Shift:  < 0.1
JavaScript bundle (initial): < 200KB gzipped
```

---

## SCALABILITY DESIGN CHECKLIST

### Stateless Services
- [ ] No local file writes
- [ ] No in-process session state
- [ ] All configuration from environment
- [ ] Health check endpoint for load balancer

### Database
- [ ] All queries use indexes (EXPLAIN ANALYZE checked)
- [ ] N+1 queries eliminated
- [ ] Connection pooling configured
- [ ] Read replicas for read-heavy paths
- [ ] Query result caching for expensive read paths

### Async Processing
- [ ] Slow operations moved to background workers
- [ ] Queue retry policy defined
- [ ] Dead-letter queue for failed jobs
- [ ] Job idempotency ensured

### Caching
- [ ] Cache key naming convention established
- [ ] TTLs defined per cache entry type
- [ ] Cache invalidation strategy documented
- [ ] Cache hit rate monitored

### Load Testing
- [ ] Baseline performance benchmarked
- [ ] Load test at 2x expected peak before launch
- [ ] Bottleneck identified and documented
- [ ] Auto-scaling thresholds verified under load
