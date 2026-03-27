# Skill: Context Management
> Keep the main session sharp. Never let context rot accumulate.

## When to Activate
- Always active (background discipline)
- Explicitly: when session feels slow, repetitive, or incoherent
- When approaching 70%+ context window usage
- Before dispatching any subagent
- `/orbit:resume` command (reload state after compaction)

## The Context Window is a Shared Resource

Think of the 200k context window like RAM:
- **Fresh session** = 200k available, sharp, fast
- **50k used** = working efficiently
- **150k used** = degraded coherence, repeated mistakes
- **180k+ used** = compaction imminent, state at risk

**Principle**: The orchestrator (main session) should never exceed 50k tokens in practice. Everything else goes into subagents with fresh contexts.

---

## Context Budget Allocation

```
Main session (orchestrator):     < 50k tokens
  ├── System prompt + CLAUDE.md:   ~8k
  ├── STATE.md snapshot:           ~5k
  ├── Current task plan:           ~3k
  ├── Conversation history:        ~20k
  └── Reserve for reasoning:       ~14k

Per subagent (fresh context):    ≤ 200k tokens
  ├── System instruction:          ~5k
  ├── Task specification (XML):    ~3k
  ├── Referenced files (lazy):     ~30-80k
  └── Working space:               ~120k
```

---

## Model Routing by Task Complexity

Route to the minimum sufficient model. Never use Opus where Haiku suffices.

| Task Type | Model | Max Tokens | Rationale |
|-----------|-------|-----------|-----------|
| Classify intent / route task | claude-haiku-4-5-20251001 | 512 | Pure routing, no reasoning |
| Quick lookup / format / rename | claude-haiku-4-5-20251001 | 1024 | Simple, single-step |
| Standard coding / debugging | claude-sonnet-4-6 | 8192 | Default for engineering |
| Multi-file refactor / review | claude-sonnet-4-6 | 16384 | More context needed |
| System architecture / design | claude-opus-4-6 | 16384 | Complex reasoning required |
| Security threat modeling | claude-opus-4-6 | 8192 | Adversarial thinking |
| Novel algorithm / research | claude-opus-4-6 | 32768 | Deep analysis |

**Cost guidance**: Haiku is ~20x cheaper than Opus. Route aggressively down when quality permits.

---

## Subagent Dispatch Protocol

Every subagent should be dispatched with a clean context bundle — no accumulated conversation history.

### What to include in subagent context:
```xml
<subagent_context>
  <task_spec>
    [XML task definition from PLAN.md]
  </task_spec>
  <relevant_files>
    [Only files this task actually touches — NOT the whole codebase]
  </relevant_files>
  <constraints>
    [Tech stack, conventions, non-negotiables]
  </constraints>
  <output_format>
    [Expected deliverable: file paths, format, commit message]
  </output_format>
</subagent_context>
```

### What NOT to include:
- Full conversation history
- Files unrelated to the task
- CLAUDE.md (too large — summarize relevant parts)
- Previous subagent outputs (only the deliverable, not the reasoning)

---

## PreCompact Survival Protocol

When context compaction is imminent (hook fires, or you notice coherence degrading):

1. **Stop current work** at the next atomic task boundary
2. **Write STATE.md** with current progress
3. **Commit** any uncommitted work
4. **Write a resume note** to `.orbit/state/pre-compact-snapshot.md`:
   ```
   Was working on: [task]
   Completed: [list]
   Next: [specific next action]
   Files changed: [list]
   ```
5. Let the PreCompact hook fire
6. In the new session: run `/orbit:resume`

---

## /orbit:resume Protocol

When resuming after compaction or new session:

```
1. Read .orbit/state/STATE.md          → project context
2. Read .orbit/state/pre-compact-snapshot.md  → what was in progress
3. Run: git log --oneline -10          → recent work
4. Run: git status                     → uncommitted changes
5. Summarize: "Here's where we are..."
6. Ask: "Ready to continue with [next task]?"
```

Never assume context survived. Always verify from STATE.md.

---

## Lazy Loading Discipline

Load skills only when the task requires them. Never load all skills at session start.

```
About to write code?    → load skills/tdd.md
About to deploy?        → load skills/deployment.md
About to review?        → load skills/review.md
About to design?        → load skills/architecture.md
Security concern?       → load skills/security.md
```

At 10k tokens per skill file, loading all 13 skills = 130k tokens wasted. Load only what's needed.

---

## Context Health Indicators

**Healthy session** (keep going):
- Responses are precise and focused
- No repeated questions about context
- Commands execute correctly first time

**Degrading session** (wrap up soon):
- Repeating earlier questions
- Responses getting longer without adding value
- Making mistakes on things established earlier

**Critical session** (stop and resume):
- Confused about current state
- Contradicting earlier decisions
- Context window warning in UI

---

## Anti-Patterns

```
❌ Loading entire codebase at session start
❌ Keeping 20+ conversation turns of implementation details in main session
❌ Passing full conversation history to subagents
❌ Using Opus for every task regardless of complexity
❌ Not saving STATE.md before closing a session
❌ Loading all skills at the start "just in case"
❌ Multiple rounds of clarification (fix with XML task spec upfront)
```
