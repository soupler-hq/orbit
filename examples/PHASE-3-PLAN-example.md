# Phase 3 Plan — Payments & Invoicing
**Project**: Soupler HQ
**Phase**: 3 of 5
**Status**: Active
**Agents**: engineer (primary), devops (deploy), security-engineer (audit)
**Created**: 2026-03-01

---

## Phase Objective
Implement the complete payment flow: employers fund their accounts, Soupler takes a platform fee, workers receive payouts. Invoice PDFs generated and emailed on payment.

**Exit Criteria:**
- Employer can add payment method and fund account via Stripe
- Invoice created on job completion, paid via Stripe, PDF emailed
- Soupler platform fee (12%) automatically split on every transaction
- All webhook events handled idempotently (retry-safe)
- Security audit passed (payment data handling)

---

## Dependency Map

```
Wave 1 (independent — run in parallel):
  Task A: Stripe Connect account creation (employer onboarding)
  Task B: Invoice data model + Prisma migrations
  Task C: PDF generation service (Puppeteer)

Wave 2 (depends on Wave 1 A+B):
  Task D: Payment Intent creation + Stripe Elements UI
  Task E: Invoice status state machine (pending→paid→failed→refunded)

Wave 3 (depends on Wave 2):
  Task F: Webhook handler (idempotent, all event types)
  Task G: Platform fee calculation + Connect payout routing

Wave 4 (depends on Wave 3):
  Task H: Email notifications (invoice created, paid, failed)
  Task I: Security audit of all payment flows

Wave 5 (integration):
  Task J: E2E test: full payment flow
  Task K: Staging deploy + smoke test
```

---

## Wave 1

### Task A: Stripe Connect Account Creation
```xml
<task id="phase3-task-a" agent="engineer" worktree=".worktrees/wave1-stripe-connect">
  <objective>Implement Stripe Connect account creation flow for new employers</objective>
  <context_files>
    <file>src/modules/employers/employer.service.ts</file>
    <file>src/modules/stripe/stripe.module.ts</file>
    <file>prisma/schema.prisma</file>
    <file>skills/ecommerce.md</file>
  </context_files>
  <tasks>
    <step>Add stripeAccountId field to Employer model in Prisma schema</step>
    <step>Create StripeService.createConnectAccount(employer) using stripe.accounts.create()</step>
    <step>Create POST /api/employers/:id/connect endpoint</step>
    <step>Store accountId in DB after successful creation</step>
    <step>Return onboarding link from stripe.accountLinks.create()</step>
  </tasks>
  <tests>
    <test>Unit: StripeService.createConnectAccount() calls stripe.accounts.create with correct params</test>
    <test>Unit: Employer model updated with stripeAccountId on success</test>
    <test>Unit: Returns onboarding URL from Stripe</test>
    <test>Integration: POST /api/employers/:id/connect → 201 with onboarding_url</test>
    <test>Edge: Employer already has Connect account → returns existing onboarding link</test>
  </tests>
  <verification>
    - All 5 tests passing
    - No stripeAccountId ever null after Connect creation
    - Idempotent: calling twice with same employer returns same account
  </verification>
  <commit_message>feat(phase-3): stripe connect account creation for employer onboarding</commit_message>
</task>
```

### Task B: Invoice Data Model
```xml
<task id="phase3-task-b" agent="engineer" worktree=".worktrees/wave1-invoice-model">
  <objective>Define Invoice schema and migrations</objective>
  <context_files>
    <file>prisma/schema.prisma</file>
    <file>src/modules/invoices/</file>
  </context_files>
  <tasks>
    <step>Add Invoice model: id, employerId, workerId, jobId, amount, fee, net, status (enum), stripePaymentIntentId, pdfUrl, createdAt, paidAt</step>
    <step>Add InvoiceStatus enum: PENDING, PAID, FAILED, REFUNDED, VOIDED</step>
    <step>Run prisma migrate dev --name add_invoice_table</step>
    <step>Generate Prisma client</step>
    <step>Create InvoiceRepository with CRUD methods</step>
  </tasks>
  <tests>
    <test>Migration runs cleanly on fresh DB</test>
    <test>Migration is idempotent (run twice = no error)</test>
    <test>InvoiceRepository.create() inserts and returns invoice</test>
    <test>InvoiceRepository.findByPaymentIntentId() returns correct invoice</test>
  </tests>
  <verification>
    - Prisma schema valid (npx prisma validate)
    - All 4 tests passing
    - stripePaymentIntentId has unique index (no duplicate webhook processing)
  </verification>
  <commit_message>feat(phase-3): invoice data model with status state machine + prisma migration</commit_message>
</task>
```

### Task C: PDF Generation Service
```xml
<task id="phase3-task-c" agent="engineer" worktree=".worktrees/wave1-pdf-service">
  <objective>Generate invoice PDFs using Puppeteer</objective>
  <context_files>
    <file>src/modules/invoices/templates/</file>
    <file>package.json</file>
  </context_files>
  <tasks>
    <step>Install puppeteer-core + @sparticuz/chromium (serverless-compatible)</step>
    <step>Create InvoiceTemplate HTML template (Handlebars or string interpolation)</step>
    <step>Create PdfService.generateInvoicePdf(invoice) → Buffer</step>
    <step>Upload PDF buffer to S3/R2 storage, return URL</step>
    <step>Update Invoice.pdfUrl after upload</step>
  </tasks>
  <tests>
    <test>Unit: PdfService.generateInvoicePdf() returns a PDF Buffer (starts with %PDF-)</test>
    <test>Unit: PDF contains invoice number, employer name, amount</test>
    <test>Integration: uploadToStorage() returns a valid URL</test>
  </tests>
  <verification>
    - PDF generated without Puppeteer timeout
    - PDF URL accessible (200 response)
    - PDF contains all required invoice fields
  </verification>
  <commit_message>feat(phase-3): invoice PDF generation with puppeteer + R2 upload</commit_message>
</task>
```

---

## Wave 2

### Task D: Payment Intent + Stripe Elements UI
```xml
<task id="phase3-task-d" agent="engineer" worktree=".worktrees/wave2-payment-ui">
  <objective>Stripe Elements checkout UI and server-side Payment Intent creation</objective>
  <dependencies>phase3-task-a, phase3-task-b</dependencies>
  ...
</task>
```

*(Tasks E through K follow same XML format — abbreviated for example clarity)*

---

## Phase 3 Non-Negotiables
- All Stripe API calls use idempotency keys
- Webhook handler processes every event type (paid, failed, refunded, disputed)
- No raw card data ever touches our servers (Stripe Elements only)
- Platform fee (12%) calculated server-side only, never client-side
- Security audit required before staging deploy

---

## Risk Register
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Stripe Connect KYC delays in staging | HIGH | MED | Use test mode accounts for development |
| Puppeteer timeout in Railway (memory limit) | MED | HIGH | Use @sparticuz/chromium + 512MB RAM config |
| Webhook delivery failure (Stripe retry) | LOW | HIGH | Idempotency key on all handlers |
| Double-charge on payment retry | LOW | CRITICAL | Idempotency + unique constraint on paymentIntentId |
