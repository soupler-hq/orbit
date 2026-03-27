# SKILL: E-Commerce Systems
> Patterns and non-negotiables for building commerce platforms

## ACTIVATION
Auto-loaded when building any e-commerce, marketplace, payments, or ordering system.

## CORE DOMAIN MODEL
```
Catalog: Product → Variant → PriceList → Inventory
Commerce: Cart → Order → Fulfillment → Return
Payments: PaymentIntent → Transaction → Refund → Ledger
Identity: Customer → Address → PaymentMethod
```

## NON-NEGOTIABLES
1. **Payment processing**: Never store raw card numbers — use Stripe/Braintree/Adyen tokenization
2. **Idempotency**: Every payment operation must be idempotent — retries must not double-charge
3. **Inventory**: Optimistic locking on inventory changes — prevent overselling
4. **Order state machine**: Orders follow a strict state machine (created → confirmed → processing → shipped → delivered → returned) — never skip states
5. **Audit trail**: Every price change, order state change, inventory change is logged with timestamp and actor
6. **Tax**: Tax calculation is a separate service concern — never bake it into order total logic

## PAYMENT INTEGRATION PATTERN
```typescript
// Idempotent payment intent creation
const intent = await stripe.paymentIntents.create({
  amount: orderTotal,
  currency: 'usd',
  idempotencyKey: `order-${orderId}-payment`,  // crucial
  metadata: { orderId, customerId },
});

// Webhook-driven status updates (not polling)
// stripe listen → PaymentIntent.succeeded → update order status
```

## INVENTORY PATTERNS
```sql
-- Optimistic lock pattern — prevents overselling
UPDATE inventory
SET quantity = quantity - :requested, version = version + 1
WHERE product_id = :id
  AND quantity >= :requested
  AND version = :expectedVersion;

-- If 0 rows affected → retry or fail with "out of stock"
```

## CHECKOUT FLOW CHECKLIST
- [ ] Cart validation at checkout start (prices current, items available)
- [ ] Address validation before shipping rate calculation
- [ ] Tax calculation after shipping address confirmed
- [ ] Payment intent created with idempotency key
- [ ] Inventory reserved (not decremented) on checkout start
- [ ] Inventory decremented only on payment success
- [ ] Inventory released on payment failure or timeout
- [ ] Order confirmation email sent via queue (not inline)
- [ ] Webhook handler for payment events (idempotent)
