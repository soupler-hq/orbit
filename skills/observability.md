# SKILL: Observability
> If you can't measure it, you can't fix it. If you can't see it, you don't own it.

## ACTIVATION
Auto-loaded for monitoring, alerting, logging, and production readiness tasks.

## THE THREE PILLARS

### 1. Structured Logging
Every log line must be machine-parseable. JSON, always.

```typescript
// WRONG
console.log(`User ${userId} logged in at ${new Date()}`);

// RIGHT
logger.info('user.login', {
  userId,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: req.headers['x-correlation-id'],
  durationMs: Date.now() - startTime,
});
```

**Every log line must include**:
- `correlationId` — same ID across all logs for one request/transaction
- `timestamp` — ISO 8601
- `level` — error/warn/info/debug
- `event` — what happened (not a sentence, an event name like `payment.processed`)
- Relevant context fields (userId, orderId, etc.)

**Log levels**:
- `error` — something failed, requires human attention
- `warn` — something unexpected happened, system recovered
- `info` — significant business event (login, payment, order created)
- `debug` — developer context, disabled in production

### 2. Metrics
Every service exposes a `/metrics` endpoint (Prometheus format) with:

```
# Business metrics (the ones that matter most)
orders_created_total
revenue_processed_usd_total
user_signups_total
failed_payments_total

# SLI metrics (Service Level Indicators)
http_request_duration_seconds{path, method, status}
http_requests_total{path, method, status}
database_query_duration_seconds{query_name}
queue_message_processing_duration_seconds{queue}
queue_message_lag{queue}  # critical for async systems

# Infrastructure metrics
process_cpu_seconds_total
process_resident_memory_bytes
nodejs_event_loop_lag_seconds  # or language equivalent
```

### 3. Distributed Tracing
Every request gets a trace. Trace propagates across service boundaries.

```typescript
// Attach to every incoming request
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateId();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  // Start a trace span
  const span = tracer.startSpan(req.path);
  req.span = span;
  
  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    span.finish();
  });
  next();
});
```

## ALERTING RULES

### SLO-Based Alerts (alert on symptoms, not causes)
```yaml
# Alert when users feel pain — not when CPU is high
- name: HighErrorRate
  condition: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
  severity: critical
  message: "Error rate >1% for 5 minutes — users are seeing failures"

- name: HighLatency
  condition: histogram_quantile(0.95, http_request_duration_seconds) > 2
  severity: warning
  message: "P95 latency >2s — slow responses for 5% of users"

- name: QueueLag
  condition: queue_message_lag > 1000
  severity: warning
  message: "Queue backing up — async processing falling behind"
```

### Alert Runbook Template
Every alert must have a runbook:
```markdown
## Alert: {AlertName}

**What it means**: {plain English explanation}
**Impact**: {who is affected and how}

### Immediate Response (first 5 minutes)
1. Check the dashboard: {link}
2. {specific command to run}
3. If X, do Y. If Z, do W.

### Escalation
If not resolved in 15 minutes: page {team/person}

### Root Cause Investigation
- Common causes: {list}
- Relevant logs query: {query}
- Historical incidents: {link}
```

## HEALTH CHECK ENDPOINT
Every service must expose `/health`:
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDb(),
    cache: await checkCache(),
    externalApi: await checkExternalApi(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});
```

## PRODUCTION READINESS CHECKLIST
- [ ] Structured JSON logging with correlation IDs
- [ ] `/health` endpoint with dependency checks
- [ ] `/metrics` endpoint with business + SLI metrics
- [ ] Distributed tracing configured
- [ ] Alerts defined for all SLOs (latency, error rate, availability)
- [ ] Runbook written for each alert
- [ ] Dashboard created with the 5 key business + 5 key technical metrics
- [ ] Log retention policy configured (30 days minimum)
