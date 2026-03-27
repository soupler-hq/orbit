# SKILL: E-Commerce Systems
> Patterns and non-negotiables for building commerce platforms

## ACTIVATION
Auto-loaded when building any e-commerce, marketplace, payments, or ordering system.

## CORE PRINCIPLES
1. **Financial Integrity**: Never store raw payment data (card numbers); use tokenization providers only.
2. **Idempotency**: Every financial operation must be idempotent to prevent double-charging on retries.
3. **Optimistic Inventory**: Use versioned pessimistic or optimistic locking to prevent overselling items.
4. **Strict State Transitions**: Orders must follow a non-skippable state machine from creation to fulfillment.
5. **Full Auditability**: Every change to price, stock, or order status must be logged with a timestamp and actor.
6. **Separation of Concerns**: Keep localized concerns like Tax and Shipping as separate services from core order logic.

## PATTERNS

### Core Domain Mapping
- **Catalog**: Products → Variants → PriceLists → Inventory.
- **Commerce**: Carts → Orders → Fulfillment → Returns.
- **Identity**: Customers → Addresses → PaymentMethods.

### Operational Patterns
- **Idempotent Payments**: Passing `idempotency_key` (e.g., `order-{id}-payment`) to payment gateways.
- **Inventory Locking**: SQL `UPDATE ... WHERE quantity >= :requested AND version = :expected`.
- **Webhook Updates**: Asynchronous, reliable status synchronization via provider webhooks.

## CHECKLISTS

### Checkout Readiness
- [ ] Cart validated for current pricing and stock availability
- [ ] Shipping address validated before tax/rate calculation
- [ ] Payment intent created with unique idempotency key
- [ ] Inventory reserved on checkout start and decremented on success
- [ ] Confirmation emails triggered via background queue (async)
- [ ] Webhook handlers verified for idempotency and signature security

## ANTI-PATTERNS
- **Big Ledger Logic**: Calculating totals in the database instead of a dedicated service.
- **PCI Compliance Violations**: Logging card data or raw PII in plaintext logs.
- **Direct Inventory Decay**: blindly decrementing stock without checking availability or version.
- **Synchronous Webhooks**: Processing external callbacks inline, blocking the listener.
- **Status Jumping**: Moving an order from "Pending" to "Shipped" without "Processing" or "Paid" checks.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
