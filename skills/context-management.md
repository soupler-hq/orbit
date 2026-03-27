# Skill: Context Management
> Keep the main session sharp. Never let context rot accumulate.

## ACTIVATION
- Always active (background discipline).
- Explicitly: when session feels slow, repetitive, or incoherent.
- When approaching 70%+ context window usage.
- Before dispatching any subagent.
- `/orbit:resume` command (reload state after compaction).

## CORE PRINCIPLES
1. **Context is RAM**: Think of the context window like memory; keep the main session clean (<50k tokens) and dispatch implementation details to subagents.
2. **Implementation Isolation**: Subagents get fresh contexts for specific tasks, preventing long-range "context rot."
3. **Minimum Sufficient Model**: Route to the cheapest model (Haiku → Sonnet → Opus) that can successfully execute the task.
4. **Lazy Loading**: Only load skill files and project docs when they are directly relevant to the current task.
5. **State-of-Truth Persistence**: Trust `STATE.md` and `ARCH.md` over conversation history for long-term decisions.

## PATTERNS

### Context Budgeting
- **Orchestrator**: <50k tokens (vision, state, current plan, रीजनिंग).
- **Subagent**: Up to 200k tokens (task XML, task-specific files, work area).

### Intelligent Model Routing
- **Haiku**: Task routing, classification, quick lookups.
- **Sonnet**: Standard engineering, implementation, debugging.
- **Opus**: Complex architecture, security threat modeling, novel algorithms.

### Lazy Loading Discipline
- Load `tdd.md` only before writing code.
- Load `security.md` only for security-critical reviews or auth changes.

## CHECKLISTS

### Context Health
- [ ] Orchestrator session is under 50k tokens
- [ ] Responses are precise; no repetition of old questions
- [ ] `STATE.md` updated before any major phase boundary
- [ ] Subagents receiving minimal, high-fidelity context bundles
- [ ] Success rate of commands remains high (no coherence fade)

## ANTI-PATTERNS
- **Repo Dumping**: Loading the entire codebase into any session.
- **Opus Overkill**: Using the most expensive model for simple file operations.
- **History Bloat**: Carrying 20+ turns of implementation chat into the main orchestrator session.
- **Implicit State**: Making decisions without documenting them in `STATE.md` or `ARCH.md`.
- **Eager Loading**: Loading every possible skill at the start "just in case."

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
