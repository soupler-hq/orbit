# DECISIONS-LOG.md — Soupler HQ Platform Example
> Temporal decision ledger for durable architectural and workflow choices.
> Add entries; do not overwrite history.

- decision: "Use Stripe Connect for employer-to-worker payouts"
  made_at: "2026-03-15"
  version: "v2.8.0"
  phase: "M2 — Payments & Billing"
  made_by: "product-manager"
  context: "Payment architecture decision for employer-to-worker payout support"
  rationale: "Soupler takes a platform fee and needs split payments. Stripe Connect supports this directly; Stripe Checkout alone does not."
  supersedes: []
  still_valid: true
  invalidated_at: ""

- decision: "Defer multi-currency support to M3"
  made_at: "2026-03-10"
  version: "v2.8.0"
  phase: "M2 — Payments & Billing"
  made_by: "product-manager"
  context: "Scope cut for the current milestone"
  rationale: "Keeping M2 to USD-only reduces billing complexity and keeps the payments milestone shippable."
  supersedes: []
  still_valid: true
  invalidated_at: ""

- decision: "Use Railway for hosting instead of Vercel"
  made_at: "2026-03-05"
  version: "v2.8.0"
  phase: "M2 — Payments & Billing"
  made_by: "architect"
  context: "Hosting selection for a separate NestJS API service"
  rationale: "The API needs a long-running service for WebSocket-friendly behavior. Vercel serverless is not a good fit for that operational model."
  supersedes: []
  still_valid: true
  invalidated_at: ""
