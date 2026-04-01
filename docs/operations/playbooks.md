---
id: playbooks-v1
doc_type: runbook
status: Final
version: v1
last_updated: 2026-03-30
---

# Orbit Workflow Playbooks

> Pre-defined execution paths for common project archetypes

---

## Runtime Telemetry

Orbit should expose live progress, not just end-state summaries.

- `orbit:progress` should show the current command, agent, wave, and status when work is in flight
- tracked work should also surface the workflow gate state, blockers, and next allowed transition
- `orbit:resume` should surface a next-command footer after loading state so the user knows what to do next
- command completion should end with a recommended next step, not a silent success

The telemetry layer is documentation-backed in `commands/commands.md` and enforced by eval coverage.

For vague or plain prompt routing checks, use the verification checklist in [docs/architecture/runtime-adapters.md](../architecture/runtime-adapters.md#verification-checklist) before treating the behavior as a runtime bug.

## Clarification Gate

When autonomous execution hits ambiguity that makes continued tool use unsafe, Orbit should pause instead of guessing.

Use the clarification gate for situations such as:
- missing required input that changes implementation behavior
- conflicting operator requirements
- destructive action pending without explicit approval
- unresolved environment or deployment target selection

The clarification gate contract is:
- the active agent emits a `CLARIFICATION_REQUESTED` entry under `## Clarification Requests` in `.orbit/state/STATE.md`
- `hooks/scripts/pre-tool-use.sh` blocks further tool execution while open clarification requests exist
- `/orbit:clarify` shows the pending queue and can resolve requests so execution can continue

This keeps clarification as a lightweight state-and-hook primitive rather than a separate middleware system.

## Operational Rule Memory

When a repeated operational failure pattern is observed, promote it into `.orbit/state/OPERATIONAL-RULES.json` instead of relying on conversational memory alone.

Use operational rules for patterns such as:
- environment-specific tool routing, for example GitHub CLI network actions that must use an approved route first
- repeated execution constraints that should block the wrong path before the tool is invoked
- known runtime friction that should be surfaced as explicit operator guidance

Operational rules should stay:
- machine-readable
- scoped by environment, tool, command, or operation
- inspectable by operators
- connected to a source issue when possible

## Playbook 1: Full-Stack SaaS Product

**Typical phases**: Auth → Core Domain → Payments → Admin → Launch

### Phase Structure

```
Phase 1: Foundation (Auth + User Model)
  Wave 1: Database schema migration | User model | Auth tokens schema
  Wave 2: Registration endpoint | Login endpoint | Refresh token endpoint
  Wave 3: Auth middleware | Protected route wrapper | Integration tests
  Ships: Working auth system, users can register and log in

Phase 2: Core Domain
  Wave 1: Domain models + migrations | Core business logic (unit tested)
  Wave 2: CRUD API endpoints | Domain service layer
  Wave 3: Input validation | Error handling | API integration tests
  Ships: Core product feature working end-to-end

Phase 3: Billing (Stripe)
  Wave 1: Stripe webhook handler | Customer/subscription models
  Wave 2: Checkout flow | Payment intent API | Pricing page API
  Wave 3: Subscription management UI flows | Webhook event tests
  Ships: Users can subscribe and pay

Phase 4: Admin + Observability
  Wave 1: Admin authentication + RBAC | Structured logging
  Wave 2: Admin CRUD operations | Metrics + health check endpoints
  Wave 3: Dashboard view | Alert rules config
  Ships: Team can manage the system

Phase 5: Production Launch
  Wave 1: Performance audit + fixes | Security audit + fixes
  Wave 2: CI/CD pipeline | Docker + deployment config
  Wave 3: Staging deploy + smoke tests | Production deploy + monitoring
  Ships: Running in production
```

### Agents Used Per Phase

| Phase | Primary Agent | Supporting Agents                                         |
| ----- | ------------- | --------------------------------------------------------- |
| 1     | engineer      | architect (schema), reviewer (auth security)              |
| 2     | engineer      | architect (domain model), strategist (scope)              |
| 3     | engineer      | researcher (Stripe patterns), reviewer (payment security) |
| 4     | devops        | engineer (admin UI)                                       |
| 5     | devops        | reviewer (security audit), architect (infra)              |

---

## Playbook 2: AI Agent System

**Typical phases**: Agent Design → Core Tools → Orchestration → Evaluation → Production

### Phase Structure

```
Phase 1: Agent Architecture
  Wave 1: Agent system prompt design | Tool schema definitions | Model routing config
  Wave 2: Memory/state management | Context management system
  Wave 3: Evaluation framework setup (Evals)
  Ships: Agent can run with basic tools, passes initial evals

Phase 2: Tool Implementation
  Wave 1: Search tool | Code execution tool | File I/O tool
  Wave 2: Web browsing tool | Database query tool | API integration tools
  Wave 3: Tool tests | Tool composition tests
  Ships: Full tool library, each tool tested independently

Phase 3: Orchestration Layer
  Wave 1: Multi-agent router | Subagent dispatch system
  Wave 2: Parallel execution engine | Result synthesis
  Wave 3: State persistence | Session management
  Ships: Multi-agent workflows running reliably

Phase 4: Evaluation + Safety
  Wave 1: Eval dataset creation | Automated eval runner
  Wave 2: Guardrails (output validation, content filtering)
  Wave 3: Red team testing | Edge case handling
  Ships: Agent passes evals, has guardrails, handles adversarial inputs

Phase 5: Production + Cost Control
  Wave 1: Token usage tracking | Cost monitoring + alerts
  Wave 2: Rate limiting | Caching layer for repeated queries
  Wave 3: Observability dashboard | Production deployment
  Ships: Running in production with cost controls
```

### Key Skills Per Phase

| Phase | Skills Loaded                       |
| ----- | ----------------------------------- |
| 1     | `ai-systems.md`, `architecture.md`  |
| 2     | `tdd.md`, `ai-systems.md`           |
| 3     | `ai-systems.md`, `planning.md`      |
| 4     | `review.md`, `debugging.md`         |
| 5     | `observability.md`, `deployment.md` |

---

## Playbook 3: E-Commerce Platform

**Typical phases**: Catalog → Cart+Checkout → Payments → Orders → Fulfillment

### Phase Structure

```
Phase 1: Catalog
  Wave 1: Product model | Category hierarchy | Variant system
  Wave 2: Catalog API (list, search, filter, product detail)
  Wave 3: Inventory model | Price model (multi-currency support)
  Ships: Catalog browsable, products searchable

Phase 2: Cart + Checkout
  Wave 1: Cart session (anonymous + authenticated) | Cart item model
  Wave 2: Add/remove/update cart items | Cart persistence across sessions
  Wave 3: Checkout flow API | Address validation | Shipping rate calc
  Ships: Users can build a cart and reach checkout

Phase 3: Payments
  Wave 1: Stripe integration (PaymentIntent) | Idempotency keys
  Wave 2: Webhook handler (payment.succeeded, payment.failed)
  Wave 3: Order creation on payment success | Inventory decrement
  Ships: End-to-end purchase working, no double charges

Phase 4: Order Management
  Wave 1: Order state machine | Order history API
  Wave 2: Order confirmation email (via queue) | Receipt generation
  Wave 3: Order admin views | Customer order tracking
  Ships: Orders visible, customers get confirmations

Phase 5: Fulfillment
  Wave 1: Fulfillment status model | Shipping carrier integration
  Wave 2: Shipment tracking updates | Customer notification system
  Wave 3: Returns/refund flow | Inventory reconciliation
  Ships: Full order lifecycle from purchase to delivery
```

### Non-Negotiables (from `skills/ecommerce.md`)

- Stripe idempotency keys on every payment operation
- Inventory uses optimistic locking — no overselling
- Order confirmation via queue — never inline
- All payment-related state changes are audited

---

## Playbook 4: IDP / Identity Framework

**Typical phases**: Core Auth → MFA → SSO → Multi-Tenancy → Compliance

### Phase Structure

```
Phase 1: Core Authentication
  Wave 1: User model + password hashing (bcrypt cost=12)
  Wave 2: JWT (RS256) + refresh token rotation
  Wave 3: Session management | Audit log schema
  Ships: Secure login/logout with proper token lifecycle

Phase 2: MFA + Account Security
  Wave 1: TOTP implementation (Google Authenticator compatible)
  Wave 2: Account lockout | Rate limiting on auth endpoints
  Wave 3: Password reset flow (time-limited, one-time tokens)
  Ships: MFA working, accounts protected from brute force

Phase 3: OAuth2 + Social Login
  Wave 1: OAuth2 authorization code flow + PKCE
  Wave 2: Google, GitHub providers
  Wave 3: Token exchange | Account linking (social → existing account)
  Ships: Users can sign in with Google/GitHub

Phase 4: Enterprise SSO (SAML/OIDC)
  Wave 1: SAML SP implementation | IdP metadata ingestion
  Wave 2: OIDC provider implementation
  Wave 3: SSO configuration UI | Domain-to-IdP routing
  Ships: Enterprise customers can configure SSO

Phase 5: Multi-Tenancy + RBAC
  Wave 1: Tenant model + isolation (RLS)
  Wave 2: Role system + permission inheritance
  Wave 3: Tenant admin UI | User invitation flow
  Ships: Full multi-tenant auth with granular permissions
```

---

## Playbook 5: Microservices Decomposition

For teams breaking apart a monolith or building a new distributed system.

### Decomposition Strategy

```
Step 1: /orbit:map-codebase
  → Identify domain boundaries (Bounded Contexts)
  → Find the seams (low-coupling interfaces between domains)
  → Identify the strangler fig candidates (easiest to extract first)

Step 2: /orbit:plan — Extraction roadmap
  → Extract one service at a time, starting with least-coupled
  → Keep monolith running throughout (strangler fig pattern)
  → Each extracted service: own DB, own deploy, own API contract

Step 3: Per-service extraction phases
  Wave 1: Define API contract (OpenAPI spec) | Create service skeleton
  Wave 2: Migrate domain logic | Write integration tests against contract
  Wave 3: Deploy service | Route monolith traffic to new service
  Wave 4: Remove extracted code from monolith

Step 4: Cross-cutting concerns
  → Service discovery (Consul, Kubernetes service mesh)
  → Distributed tracing (correlate requests across services)
  → Centralized logging (aggregate structured logs)
  → API gateway (single entry point, auth at edge)
```

### When NOT to Decompose

```
Orbit will flag and warn if:
- Team is <10 engineers (monolith is almost always better)
- Domain boundaries are unclear (premature decomposition = a mess)
- You want to "scale" but haven't profiled the bottleneck
- Latency between services is not measured/acceptable for your SLA
```

---

## Operational Playbooks

### One command per task

Each `orbit:quick` or `orbit:build` is a discrete task boundary.

- **Follow-up questions / clarifications**: plain prompts are fine.
- **Follow-up work that changes scope**: on runtimes that support plain-prompt routing, Orbit should infer a new task boundary even if the user does not type `/orbit:quick`.
- **Rule of thumb**: if the output should produce a commit, Orbit should treat the prompt as an Orbit workflow request when the runtime supports implicit routing; otherwise require the explicit command path.

When in doubt: if you would write a commit message for it, route the prompt through an Orbit command path, whether explicit or implicit for that runtime.

### Session Switching Protocol

Always run `orbit:resume` at the start of each new session. STATE.md is the source of truth — any session that skips resume is working blind.

If STATE.md was updated externally while you were in a session (e.g., another session merged a PR and updated STATE.md), run `orbit:resume` again mid-session to reload.

```
New session → orbit:resume (always)
Switching context mid-session → orbit:resume (reload)
Parallel sessions → each runs orbit:resume independently
```

---

## Using Playbooks

Playbooks are not templates to follow blindly. They are starting points.

When you run `/orbit:new-project`, Orbit will:

1. Identify which playbook archetype fits best
2. Present the relevant phase structure
3. Ask what to customize for your specific context
4. Adapt wave design to your tech stack
5. Generate the actual ROADMAP.md from the customized playbook

To use a playbook explicitly:

```
/orbit:new-project --playbook saas
/orbit:new-project --playbook ecommerce
/orbit:new-project --playbook ai-agent
/orbit:new-project --playbook idp
/orbit:new-project --playbook microservices
```
