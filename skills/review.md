# SKILL: Code Review
> Reviews that make code better, not just feel reviewed

## ACTIVATION
Auto-loaded for all code review, PR review, and quality audit tasks.

## CORE PRINCIPLES
1. **Safety First**: Catching bugs and security vulnerabilities is the primary objective.
2. **Spec Alignment**: Code must do exactly what the requirement says — not more, not less.
3. **Meaningful Tests**: A feature without a test is incomplete. Tests must be behavior-driven.
4. **Actionable Feedback**: All findings must include location, impact, and a specific fix.

## PATTERNS

### Review Axes (in priority order)

1. **Correctness**: Does it implementation match the spec exactly?
2. **Security**: Is every external input validated? Are SQL/NoSQL injections possible?
3. **Reliability**: How does it handle network/DB timeouts or partial failures?
4. **Performance**: Are there N+1 queries, missing indexes, or memory leaks?
5. **Maintainability**: Is the intent clear? Are functions single-purpose?

## CHECKLISTS

### Code Quality Checklist
- [ ] Implementation matches requirements exactly
- [ ] All edge cases handled (null, empty, concurrent)
- [ ] Every external input validated and sanitized
- [ ] No secrets or sensitive data in logs/source
- [ ] Retries with backoff for external dependencies
- [ ] 80%+ test coverage on new/modified code
- [ ] Tests verify behavior, not implementation details

## ANTI-PATTERNS
- **Vague Findings**: Providing subjective feedback without a specific "how to fix."
- **Opinionated Review**: Enforcing personal style preferences over team standards.
- **Missing Severity**: Failing to rank findings (Critical/High/Low) to guide fixing priority.
- **Style-Only Review**: Nitpicking formatting while missing logic or security flaws.
- **Blind Approval**: Approving PRs without reviewing the corresponding tests.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
