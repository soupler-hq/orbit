# Skill: Reflection — Self-Correction & Loop Persistence
> Close the RALPH loop: Reflect, Act, Learn, Plan, Help

## ACTIVATION
- Task failure during `/orbit:build`.
- Test regressions in `/orbit:verify`.
- Significant architectural mismatch during consolidation.
- `OnTaskError` hook trigger.

## CORE PRINCIPLES
1.  **Failure as Data**: Never treat a crash as an end-state; treat it as an input for the next cycle.
2.  **Context preservation**: Before attempting a fix, dump the full stack trace and environmental state into `.orbit/state/last_error.json`.
3.  **Halt on Recursive Drift**: If the same error persists for >3 cycles, the agent must halt and request "Human Help" (the 'H' in RALPH).
4.  **Learning Integration**: Every "Reflection" must update the `DECISIONS` log in `STATE.md` with the "Lesson Learned."

## PATTERNS

### Error Reflection
1.  **Analyze**: Use `bin/debug` or `grep` to find the exact line of failure.
2.  **Logic**: Formulate a hypothesis (e.g., "Dependency missing," "Incorrect API signature").
3.  **Plan**: Propose a 1-line change or a specific refactor.
4.  **Act**: Apply fix and rerun the verification.

### RALPH Consolidation Loop
- **Reflect**: Read `SUMMARY.md` from parallel waves.
- **Act**: Identify conflicts (e.g., duplicate IDs).
- **Learn**: Update the project structure or registry.
- **Plan**: Reroute the next wave if necessary.
- **Help**: Alert the user if a blocking architectural decision is required.

## CHECKLISTS
- [ ] Error trace captured in `.orbit/state/`
- [ ] Hypothesis documented in `STATE.md`
- [ ] No recursive "Looping" (>3 attempts)
- [ ] `SUMMARY.md` updated with the "fix trace"

## ANTI-PATTERNS
- **Trial & Error**: Changing code randomly without a hypothesis.
- **Ghosting Errors**: Ignoring a failure and moving to the next task.
- **Context Rot**: Losing the original error logs during a "Clean" build.

## VERIFICATION WORKFLOW
1.  **Trigger**: Deliberately introduce a syntax error in a subagent task.
2.  **Execute**: Run `bin/orchestrator.js --wave="..."`.
3.  **Observe**: Verify that the `OnTaskError` hook captures the trace and appends the "Reflection" to the task summary.
