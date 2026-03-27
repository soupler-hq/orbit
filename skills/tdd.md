# SKILL: Test-Driven Development
> RED-GREEN-REFACTOR is not a suggestion. It is the only way code gets written.

## ACTIVATION
Auto-loaded whenever any code is being written or modified.

## THE CYCLE

### Phase 1: RED (Write a failing test)
1. Read the spec/task. Identify the smallest possible behavior to implement next.
2. Write a test for that behavior ONLY. Run it. Confirm it FAILS.
3. If the test passes before any implementation, the test is wrong — fix it.
4. Commit the failing test: `test(scope): add failing test for {behavior}`

### Phase 2: GREEN (Write minimal code to pass)
1. Write the MINIMUM code to make the test pass. Nothing more.
2. Don't write code for edge cases not yet tested.
3. Don't refactor yet. Ugly code that passes is better than elegant code that's untested.
4. Run the test. Confirm it passes. Run the full test suite. Confirm nothing broke.
5. Commit: `feat(scope): implement {behavior}`

### Phase 3: REFACTOR (Clean up with tests as safety net)
1. Now clean the code. Extract functions, rename variables, remove duplication.
2. Run the full test suite after EVERY change. If anything breaks, revert immediately.
3. When clean and green, commit: `refactor(scope): clean up {behavior}`

### Repeat
Pick the next smallest behavior. Return to Phase 1.

## TESTING ANTI-PATTERNS (NEVER DO THESE)
- Writing code first, then writing tests to match the code (this is not TDD)
- Skipping the RED phase "because obviously this will fail"
- Writing tests that test implementation details instead of behavior
- Testing private methods directly
- Mocking everything — mock only external dependencies, not internal logic
- Writing one massive test for multiple behaviors
- Deleting a test because it's "hard to pass"
- Committing with `--no-verify` to skip test checks

## TEST QUALITY CHECKLIST
Every test must have:
- [ ] A clear description: `it('should return 404 when user not found', ...)`
- [ ] A single assertion about a single behavior
- [ ] Proper setup/teardown (no shared mutable state between tests)
- [ ] Fast execution (<100ms for unit tests, <1s for integration)
- [ ] Independence — can run in any order

## COVERAGE MINIMUM
- New code: 100% line coverage, 100% branch coverage
- Legacy code: don't reduce coverage when modifying

## WHEN DEBUGGING, ALWAYS:
1. Write a test that REPRODUCES the bug first
2. Then fix the code
3. Confirm the test now passes
4. The bug test becomes the regression test forever
