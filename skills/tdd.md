# SKILL: Test-Driven Development
> RED-GREEN-REFACTOR is not a suggestion. It is the only way code gets written.

## ACTIVATION
Auto-loaded whenever any code is being written or modified.

## CORE PRINCIPLES
1. **Red-Green-Refactor**: Never write code without a failing test first.
2. **YAGNI**: Write only the code needed for the current test.
3. **Small Steps**: Decompose complex tasks into the smallest testable units.
4. **Safety First**: Tests are the safety net that allow confident refactoring.

## PATTERNS

### The Cycle
1. **RED**: Write a failing test for the next smallest behavior.
2. **GREEN**: Write minimal code to pass.
3. **REFACTOR**: Clean up code while keeping tests green.

### When Debugging
1. Write a test that REPRODUCES the bug first.
2. Fix the code.
3. Confirm the test passes.

## CHECKLISTS
Every test must have:
- [ ] A clear description: `it('should return 404 when user not found', ...)`
- [ ] A single assertion about a single behavior
- [ ] Proper setup/teardown (no shared mutable state between tests)
- [ ] Fast execution (<100ms for unit tests, <1s for integration)
- [ ] Independence — can run in any order

## ANTI-PATTERNS
- **Test-After**: Writing code first, then writing tests (not TDD).
- **Implementation Testing**: Testing private methods or internal details.
- **God Tests**: One massive test for multiple unrelated behaviors.
- **Mocking Overkill**: Mocking internal logic instead of only external boundaries.
- **Skipping RED**: Writing a test that you expect to pass immediately.

## VERIFICATION WORKFLOW
1.  **Red Phase**: Verify a failing test exists for the new capability.
2.  **Green Phase**: Verify that the new code passes only the specific new test.
3.  **Refactor Phase**: Verify that the code is clean, modular, and all tests still pass.
