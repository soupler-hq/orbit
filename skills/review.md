# SKILL: Code Review
> Reviews that make code better, not just feel reviewed

## ACTIVATION
Auto-loaded for all code review, PR review, and quality audit tasks.

## THE REVIEW MINDSET
You are not reviewing to find fault. You are reviewing to:
1. Catch bugs before they reach production
2. Ensure the code matches the spec/requirements
3. Identify security vulnerabilities
4. Prevent future maintainability problems
5. Confirm the tests are meaningful

A review that finds nothing is either excellent code or an incomplete review.

---

## REVIEW AXES (in priority order)

### Axis 1: Correctness
Does it do what it's supposed to do?
- Does the implementation match the spec/requirements exactly?
- Are all edge cases handled (null, empty, overflow, concurrent access)?
- Are error cases handled correctly (not silently swallowed)?
- Is the logic correct under the stated assumptions?

```typescript
// CORRECTNESS BUG: spec says "return items in descending order by date"
const items = await db.query('SELECT * FROM items WHERE userId = $1', [userId]);
// Missing ORDER BY created_at DESC — bug, even though code "works"
```

### Axis 2: Security
Could this be exploited?
```
Checklist per function that touches external input:
□ Input validated and sanitized before use
□ SQL/NoSQL: parameterized queries (no string interpolation)
□ Output encoded before rendering in HTML/JSON
□ Auth check present before any data access
□ Rate limiting on repeated-call vectors
□ No sensitive data in logs, URLs, or error messages
□ No secrets hardcoded
```

```typescript
// SECURITY BUG: SQL injection possible
const user = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
// Fix:
const user = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
```

### Axis 3: Reliability
Will it fail gracefully?
- What happens when a downstream service is unavailable?
- Are timeouts set on all external calls?
- Are retries implemented with exponential backoff?
- Are partial failure states handled?
- Is database transaction scope correct (too broad / too narrow)?

```typescript
// RELIABILITY BUG: no timeout, no retry — hangs indefinitely on network issue
const data = await fetch('https://payment-api.example.com/charge');

// Fix:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const data = await fetch('https://payment-api.example.com/charge', {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

### Axis 4: Test Quality
Are the tests actually testing behavior?
```
For each test:
□ Tests behavior, not implementation (would survive a refactor?)
□ Would catch the bug it's supposed to catch?
□ Has exactly one reason to fail
□ Doesn't test framework behavior (only application behavior)
□ Setup/teardown doesn't leak state between tests
□ Assertion message is helpful when it fails
```

```typescript
// BAD TEST: tests implementation, not behavior
expect(userService.cache).toHaveProperty('user:123');

// GOOD TEST: tests observable behavior
const user = await userService.getUser('123');
expect(user.id).toBe('123');
expect(user.name).toBe('Alice');
// (Whether it uses a cache internally is irrelevant to this test)
```

### Axis 5: Performance
Any obvious bottlenecks?
- N+1 queries in loops
- Missing indexes on filtered/sorted columns
- Large payloads loaded into memory unnecessarily
- Synchronous operations that should be async
- Duplicate work in hot paths

### Axis 6: Maintainability
Will the next person understand this?
- Variable and function names reveal intent (not just what they do, but why)
- Functions do one thing
- Complex logic has a comment explaining WHY (not what — the code shows what)
- Magic numbers/strings are named constants
- No dead code

---

## REVIEW OUTPUT FORMAT

```markdown
## Code Review: {PR/Component name}

**Reviewer**: Orbit Reviewer Agent
**Date**: {date}
**Files reviewed**: {N} files, {N} lines changed

### Summary
{2-3 sentence overall assessment. Be honest: is this production-ready?}

### Ship Decision
- [ ] BLOCKED — CRITICAL issues must be resolved
- [ ] APPROVED WITH CONDITIONS — HIGH issues should be resolved before merge
- [ ] APPROVED — ready to merge

---

### Findings

#### 🔴 CRITICAL — {Title}
**Severity**: Critical — must fix before merge
**File**: `src/payments/stripe.ts:142`
**Issue**: {specific description of what's wrong}
**Impact**: {what happens if this ships}
**Fix**:
```typescript
// Replace this:
const secret = 'sk_live_xxxxx';
// With:
const secret = requireEnv('STRIPE_SECRET_KEY');
```

#### 🟠 HIGH — {Title}
**Severity**: High — should fix before merge
**File**: `src/api/orders.ts:67`
**Issue**: {description}
**Impact**: {impact}
**Fix**: {specific fix}

#### 🟡 MEDIUM — {Title}
**Severity**: Medium — fix in follow-up PR
...

#### 🔵 LOW — {Title}
**Severity**: Low — optional improvement
...

#### ℹ️ INFO — {Title}
**Severity**: Info — no action required, just noting
...

---

### Positive Observations
{What was done well — this is not optional filler, it's useful feedback}
```

---

## REVIEW ANTI-PATTERNS (for the reviewer)
- **Vague findings**: "This could be improved" — never. Always say what to do instead.
- **Opinion as mandate**: "I would have used X" — only flag if there's an objective reason
- **Missing severity**: every finding needs a severity — helps the author prioritize
- **Reviewing style, not substance**: if a linter catches it, the linter should flag it
- **Approval without reading tests**: tests are half the code — they must be reviewed too
- **Finding something on every line**: if the code is good, say so. Nitpicking lowers trust.
