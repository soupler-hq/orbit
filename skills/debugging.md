# SKILL: Systematic Debugging
> Root cause always. Symptom fixes always come back.

## ACTIVATION
Auto-loaded for any bug report, unexpected behavior, or "why is this broken" task.

## THE 4-PHASE PROCESS

### Phase 1: Reproduce
Before touching any code:
1. Write a failing test that REPRODUCES the bug. If you can't write this test, you don't understand the bug yet.
2. Confirm the test fails consistently.
3. Note: on what inputs? in what environment? with what frequency?

```
Bug Reproduction Checklist:
- [ ] Test written that reproduces bug
- [ ] Test fails consistently (not flaky)
- [ ] Minimal reproduction case identified (simplest input that triggers it)
- [ ] Frequency documented (always / sometimes / intermittent)
- [ ] Environment documented (dev / staging / prod, OS, runtime version)
```

### Phase 2: Isolate
Narrow the search space systematically:
1. What component handles this input?
2. What does the data look like when it enters? When it exits? Where does it diverge from expected?
3. Binary search the call stack — add logging at the midpoint, narrow from there.
4. Form a hypothesis: "I believe the bug is in X because Y."
5. Test the hypothesis. If wrong, update and repeat.

**Never**: assume the bug is where it looks like it is. Symptoms lie.

### Phase 3: Root Cause
Find the actual cause, not the proximate cause.
Ask "why" five times:
```
Bug: User sees 500 error on login
Why 1: Login endpoint throws an exception
Why 2: Database query returns null, not handled
Why 3: User record exists but email is null
Why 4: Registration didn't validate email field
Why 5: Email field was made nullable in migration, no validation added at API layer
Root cause: Missing input validation + implicit null assumption in query
```

A patch that fixes Why 1 without fixing Why 5 will produce another bug.

### Phase 4: Fix & Prevent
1. Fix the root cause
2. Make the reproduction test pass
3. Run the full test suite — confirm nothing else broke
4. Add a test for every related edge case you discovered during investigation
5. Add a code comment explaining WHY the fix works (not what it does)
6. If the root cause reveals a category of bugs, search the codebase for the same pattern

```
Fix Checklist:
- [ ] Root cause fixed (not just symptom)
- [ ] Reproduction test now passes
- [ ] Full test suite green
- [ ] Related edge cases tested
- [ ] Comment explaining the fix rationale added
- [ ] Codebase searched for same bug pattern elsewhere
- [ ] Committed: fix(scope): {what was fixed and why}
```

## DEBUGGING ANTI-PATTERNS
- **Random change debugging**: changing things until it stops failing. This works once and creates two new bugs.
- **Log-and-pray**: adding print statements randomly. Log strategically at phase boundaries.
- **Assumption preservation**: continuing to assume X is fine despite evidence. Test every assumption.
- **Symptom fixing**: making the error go away without understanding it. The bug moves, not disappears.
- **Fixing without a test**: if there's no test that would have caught this bug, you'll see it again.

## INTERMITTENT BUGS
For bugs that don't reproduce consistently:
1. Hypothesis: race condition / timing / external dependency / resource exhaustion?
2. Add structured logging at every state transition in the suspect path
3. Analyze log patterns across failures — what's different when it fails?
4. Stress test / increase concurrency to make it fail more reliably
5. Never close an intermittent bug as "can't reproduce" — that's "not investigated yet"

## CONDITION-BASED WAITING (for async bugs)
Never use `setTimeout` or `sleep` to "fix" async timing issues. Instead:
```typescript
// WRONG: hope this is long enough
await sleep(1000);
expect(result).toBe(true);

// RIGHT: wait for the actual condition
await waitFor(() => expect(result).toBe(true), { timeout: 5000 });
```
