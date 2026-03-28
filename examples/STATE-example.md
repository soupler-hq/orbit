# STATE.md — Soupler HQ Platform
> Active project memory. Read this at the start of every session.
> Last Updated: 2026-03-27T09:00:00Z

---

## Project Vision
Soupler HQ is the internal operations platform for Soupler — a B2B SaaS company connecting employers with skilled talent. The platform consolidates job posting management, candidate pipeline, invoicing, and team communication into a single admin interface. Built on Next.js 14 (App Router), NestJS API, PostgreSQL, and Redis.

---

## Active Milestone
**M2 — Payments & Billing** | Started: 2026-03-01 | Target: 2026-03-31

### Phase Status
| Phase | Name | Status | Agent(s) | Commits |
|-------|------|--------|----------|---------|
| 1 | Foundation + Auth | ✅ Done | architect, engineer | 23 commits |
| 2 | Core Domain (Jobs/Candidates) | ✅ Done | engineer, designer | 41 commits |
| 3 | Payments + Invoicing | 🔄 Active | engineer, devops | 12 commits |
| 4 | Notifications | ⏳ Pending | engineer | — |
| 5 | Admin Dashboard | ⏳ Pending | designer, engineer | — |

---

## Tech Stack
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | Next.js | 14.2 | App Router, RSC |
| API | NestJS | 10.x | REST + tRPC |
| Database | PostgreSQL | 16 | via Prisma ORM |
| Cache | Redis | 7.x | BullMQ for queues |
| Auth | Auth.js (next-auth) | 5 beta | JWT + session |
| Payments | Stripe | 14.x | Webhooks + Elements |
| Hosting | Railway | — | Auto-deploy from tag |
| CI/CD | GitHub Actions | — | test → build → deploy |
| Monitoring | Sentry + Railway logs | — | Error tracking |

---

## Architecture Decisions
| ADR | Decision | Date | Status |
|-----|----------|------|--------|
| ADR-001 | Use Next.js App Router over Pages Router | 2026-01-15 | Active |
| ADR-002 | PostgreSQL over MongoDB (relational data model fits domain) | 2026-01-15 | Active |
| ADR-003 | Stripe Elements for PCI compliance (no raw card handling) | 2026-02-01 | Active |
| ADR-004 | BullMQ over direct async for email/notification jobs | 2026-02-15 | Active |
| ADR-005 | tRPC for internal API calls, REST for external webhooks | 2026-03-01 | Active |

---

## Decisions Log
**2026-03-15** — Chose Stripe Connect for employer-to-worker payouts (not Stripe Checkout). Reason: Soupler takes a platform fee and needs to split payments. Connect supports this; Checkout alone does not.

**2026-03-10** — Deferred multi-currency support to M3. Scope cut agreed with product team. Only USD in M2. EUR/GBP tracking issue: #234.

**2026-03-05** — Railway over Vercel for hosting. Reason: NestJS API runs as a separate service — Vercel serverless isn't suitable for long-running WebSocket connections.

---

## Active Blockers
| Blocker | Owner | Since | Status |
|---------|-------|-------|--------|
| Stripe Connect onboarding KYC takes 24h+ in sandbox | @sunny | 2026-03-20 | Open — using test accounts to unblock |
| SMTP credentials for transactional email not provisioned | @devops | 2026-03-22 | Open — blocked Phase 4 start |

---

## Recently Completed (last 5)
1. `feat(phase-3): stripe payment intent creation + webhook handler` — `a3f2c1b`
2. `feat(phase-3): invoice PDF generation via puppeteer` — `b4d1e2a`
3. `test(phase-3): stripe webhook idempotency tests` — `c5e3f4b`
4. `feat(phase-2): candidate pipeline kanban board` — `d6f4a5c`
5. `arch(phase-3): ADR-005 tRPC vs REST decision` — `e7a5b6d`

---

## Current Sprint Todos (Phase 3 remaining)
- [ ] Stripe Connect account creation flow for employers
- [ ] Platform fee calculation (Soupler takes 12%)
- [ ] Invoice status webhook handler (paid/failed/refunded)
- [ ] Email notification on invoice paid
- [ ] E2E test: full payment flow (employer creates → worker receives)

---

## Seeds (future milestones)
- **M3 seed**: Multi-currency (EUR, GBP) — pending compliance review
- **M3 seed**: Bulk invoice export (CSV/PDF) — requested by 3 enterprise customers
- **M4 seed**: Mobile app (React Native) — post-M3 decision
- **M4 seed**: AI-powered candidate matching — research phase needed

---

## Forged Agents (project-specific)
| Agent | Purpose | File |
|-------|---------|------|
| `stripe-specialist` | Stripe Connect patterns, webhook handling, fee calculations | `agents/stripe-specialist.md` |

---

## Open Questions
- [ ] Do we need SOC2 compliance for enterprise tier? (M3 decision) — @legal
- [ ] Invoice retention policy — how long to store? (GDPR implication) — @product
- [ ] Stripe or manual for EU employer payouts? (regulatory) — @finance
