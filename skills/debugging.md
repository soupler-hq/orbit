# SKILL: Systematic Debugging
> Root cause always. Symptom fixes always come back.

## ACTIVATION
Auto-loaded for any bug report, unexpected behavior, or "why is this broken" task.

## CORE PRINCIPLES
1. **Root Cause Always**: Symptom fixes are temporary; find the "why" five times.
2. **Reproduce First**: Never touch code until the bug is consistently reproduced with a test.
3. **Hypothesis-Driven**: form a specific theory before searching or changing code.
4. **Binary Search**: Narrow the search space systematically by halving the suspect area.

## PATTERNS

### The 4-Phase Process
1. **REPRODUCE**: Write a failing test that isolates the bug.
2. **ISOLATE**: Narrow the search space to the specific component/line.
3. **ROOT CAUSE**: Identify the fundamental flaw (5 Whys).
4. **FIX & PREVENT**: Correct the cause and add regression tests.

## CHECKLISTS

### Reproduction Checklist
- [ ] Test written that reproduces bug
- [ ] Test fails consistently (not flaky)
- [ ] Minimal reproduction case identified (simplest input that triggers it)
- [ ] Frequency documented (always / sometimes / intermittent)
- [ ] Environment documented (dev / staging / prod, OS, runtime version)

### Fix Checklist
- [ ] Root cause fixed (not just symptom)
- [ ] Reproduction test now passes
- [ ] Full test suite green
- [ ] Related edge cases tested
- [ ] Comment explaining the fix rationale added
- [ ] Codebase searched for same bug pattern elsewhere

## ANTI-PATTERNS
- **Random Change Debugging**: Changing things until it stops failing without understanding why.
- **Log-and-Pray**: Adding logs randomly instead of at strategic phase boundaries.
- **Assumption Preservation**: Continuing to trust a component despite failure evidence.
- **Symptom Fixing**: Masking the error without addressing the underlying logic flaw.
- **Fixing Without a Test**: Committing a fix that isn't guarded by a new regression test.

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

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
