# SKILL: Observability
> If you can't measure it, you can't fix it. If you can't see it, you don't own it.

## ACTIVATION
Auto-loaded for monitoring, alerting, logging, and production readiness tasks.

## CORE PRINCIPLES
1. **Measured Ownership**: If you can't measure it, you don't own it.
2. **Symptom-Based Alerting**: Alert on user-facing pain (latency, errors), not causes (CPU, memory).
3. **Structured Logs**: All logs must be machine-parseable JSON with correlation IDs.
4. **Design-In**: Observability is part of the feature design, not a post-ship task.

## PATTERNS

### The Three Pillars
1. **Logging**: Structured JSON events with metadata (who, what, when, result).
2. **Metrics**: Real-time counters and histograms (RED: Rate, Errors, Duration).
3. **Tracing**: End-to-end request propagation across service boundaries.

### Health & Readiness
- `/health`: Shallow check (is the process alive?).
- `/ready`: Deep check (are dependencies available?).
- `/metrics`: Exposed Prometheus-format business and technical metrics.

## CHECKLISTS

### Production Readiness
- [ ] Structured JSON logging with correlation IDs
- [ ] `/health` and `/ready` endpoints configured
- [ ] Business and technical metrics (SLIs) exposed
- [ ] Alerts defined for all SLOs (latency, error rate)
- [ ] Runbook written for every alert
- [ ] Dashboard created with critical health indicators
- [ ] Log retention and rotation configured

## ANTI-PATTERNS
- **Sentence Logging**: Logging "User logged in" instead of `{"event": "user.login"}`.
- **Cause-Based Paging**: Paging an engineer at 3 AM because CPU hit 80% without user impact.
- **Missing Correlation**: Spawning logs across services without a shared Trace/Correlation ID.
- **Blind Endpoints**: Deploying a service without metrics or health checks.
- **Silence on Success**: Only logging errors, making it impossible to calculate error rates.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
