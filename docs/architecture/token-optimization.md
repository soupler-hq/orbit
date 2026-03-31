---
id: token-optimization-v1
doc_type: guide
status: Final
version: v1
last_updated: 2026-03-30
---

# Orbit Token Optimization Guide
> How Orbit minimizes token consumption while maximizing output quality

---

## The Token Problem

Every AI-powered development system faces the same degradation curve:

```
Session start:    Fresh context → excellent code quality, full spec compliance
After 50k tokens: Starting to drift from earlier decisions
After 100k tokens: "I'll be more concise" → dropping detail, cutting corners  
After 150k tokens: Forgetting earlier architectural decisions
After 200k tokens: Context rot — output quality collapses
```

Orbit solves this with a layered optimization strategy.

---

## Layer 1: Model Routing

Not every task needs the most capable (and expensive) model. Orbit routes to the minimum-sufficient model:

```
claude-haiku-4-5-20251001
  → Task classification (what type of task is this?)
  → Agent selection (which agent handles this?)
  → Simple transformations (format conversion, summarization)
  → Context summarization for STATE.md updates
  Cost: ~$0.001 per task

claude-sonnet-4-6
  → Default implementation tasks (most code)
  → Plan verification (does this plan meet requirements?)
  → Code review (structured analysis)
  → Post-execution verification
  Cost: ~$0.01-0.05 per task

claude-opus-4-6
  → Complex architectural decisions
  → Multi-constraint optimization problems  
  → Novel domain reasoning (things the model hasn't seen patterns for)
  → High-stakes review (security audit, payment flow review)
  Cost: ~$0.10-0.50 per task
```

### Model Profile Configuration
Set in `.orbit/config.json`:
```json
{
  "model_profiles": {
    "quality": {
      "classify": "claude-haiku-4-5-20251001",
      "plan": "claude-opus-4-6",
      "implement": "claude-opus-4-6",
      "review": "claude-sonnet-4-6",
      "verify": "claude-sonnet-4-6"
    },
    "balanced": {
      "classify": "claude-haiku-4-5-20251001",
      "plan": "claude-opus-4-6",
      "implement": "claude-sonnet-4-6",
      "review": "claude-sonnet-4-6",
      "verify": "claude-sonnet-4-6"
    },
    "budget": {
      "classify": "claude-haiku-4-5-20251001",
      "plan": "claude-sonnet-4-6",
      "implement": "claude-sonnet-4-6",
      "review": "claude-haiku-4-5-20251001",
      "verify": "claude-haiku-4-5-20251001"
    }
  },
  "active_profile": "balanced"
}
```

---

## Layer 2: Subagent Isolation (Most Important)

The single most effective token optimization: **never accumulate conversation history in the main orchestrator**.

```
WRONG (context rot):
Main Session (200k window fills up)
├── 50k: Brainstorm + spec
├── 30k: Plan phase 1
├── 40k: Implement task 1 (inline)
├── 35k: Implement task 2 (inline)
└── 45k: Context full → quality collapses

RIGHT (Orbit wave model):
Main Session (~30-40k total)
├── 5k: Brainstorm + spec → write PROJECT.md
├── 5k: Plan phase 1 → write PHASE-1-PLAN.md
└── 10k: Orchestrate waves, read SUMMARY.md files

Subagent A (fresh 200k): Task 1 → commit → write SUMMARY.md
Subagent B (fresh 200k): Task 2 → commit → write SUMMARY.md
Subagent C (fresh 200k): Task 3 → commit → write SUMMARY.md
```

Each subagent gets only what it needs:
```
Subagent context = task XML + relevant ARCH sections + STATE.md snapshot + specific skill files
Typical subagent input: 8-15k tokens
Typical subagent output: 5-20k tokens
Main session never sees the subagent's working
```

---

## Layer 3: Lazy Skill Loading

Skills are not loaded globally. Each subagent gets only the skills relevant to its task.

```typescript
// Skill loading map (from CLAUDE.md)
const skillsForTask = (task: Task): string[] => {
  const skills: string[] = [];
  if (task.writesCode) skills.push('skills/tdd.md');           // 2.5k tokens
  if (task.isArchitecture) skills.push('skills/architecture.md'); // 3.5k tokens
  if (task.touchesAuth) skills.push('skills/security.md');    // 4.5k tokens
  if (task.deploys) skills.push('skills/deployment.md');      // 3k tokens
  if (task.isEcommerce) skills.push('skills/ecommerce.md');   // 2.5k tokens
  return skills;
};

// Never load all skills into one context:
// BAD:  5 skill files × 3k avg = 15k tokens every task
// GOOD: load only 1-2 skills per task = 3-7k tokens
```

---

## Layer 4: Structured XML Prompts

XML task format reduces ambiguity, which reduces the model's internal reasoning overhead and the number of clarification loops:

```xml
<!-- This clear structure reduces the model needing to "figure out" the task -->
<task type="implement">
  <n>Add rate limiting to POST /auth/login</n>
  <files>src/middleware/rateLimiter.ts, src/api/auth/login.ts</files>
  <action>
    Use express-rate-limit@7. Apply limit of 10 requests per 15 minutes per IP.
    Store state in Redis (connection already at process.env.REDIS_URL).
    On limit exceeded: return 429, log as 'warn' level with {ip, path}.
  </action>
  <verify>
    Run: npm test -- src/middleware/rateLimiter.test.ts
    All tests pass. Confirm: 11th request within window returns 429.
  </verify>
  <done>Rate limiter middleware created, applied to login route, tests passing, committed.</done>
</task>
```

Compared to a natural language equivalent, XML tasks:
- Eliminate 2-3 rounds of clarification (saves 5-15k tokens per task)
- Produce more spec-compliant output first pass (fewer retries)
- Are parseable for verification automation

---

## Layer 5: Prompt Caching

The CLAUDE.md system prompt is stable across all tasks in a project. Anthropic's prompt caching caches the first 1024+ tokens of a repeated prefix, reducing cost by 90% and latency by 85%.

**What gets cached:**
```
System: [CLAUDE.md content = ~6k tokens]  ← cached after first call
         [STATE.md snapshot = ~2k tokens]  ← cached if unchanged
         [Relevant ARCH sections = ~2k]    ← cached if unchanged
Human:  [Task XML = fresh each time]
```

Enable in API calls:
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  system: [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
  ],
  messages: [{ role: 'user', content: taskXML }],
});
// After first call: system prompt tokens cost 90% less
```

---

## Layer 6: STATE.md as Cross-Session Memory

Instead of feeding full conversation history, Orbit writes decisions to STATE.md and reads it fresh each session. A new session starts at ~5k tokens instead of 50k+.

```markdown
<!-- STATE.md read at session start: ~2k tokens, complete project context -->
## Decisions Log
2024-01-15: Chose PostgreSQL over MongoDB (ACID requirements for payments)
2024-01-16: Auth uses JWT RS256 (see ADR-002), refresh tokens in Redis
2024-01-17: Phase 1 complete — auth + user model shipped, 47 tests passing

## Active State
Phase: 2 (Core Domain), Wave: 1 of 3
Next task: Create product catalog schema
```

---

## Token Budget Targets

```
Per quick task:        < 10k tokens total (input + output)
Per phase plan:        < 25k tokens total
Per subagent task:     < 30k tokens total  
Main session total:    < 50k tokens (stays fresh all day)
Per project milestone: < 500k tokens total
```

---

## Cost Estimation

For a typical Phase (3 waves, 8 tasks total):
```
Orchestration (Sonnet): 5k × $0.003/1k = $0.015
Planning (Opus):       25k × $0.015/1k = $0.375
8 subagents (Sonnet): 8×20k × $0.003/1k = $0.48
Verification (Sonnet): 10k × $0.003/1k = $0.03
Total per phase: ~$0.90

Full 5-phase project: ~$4-8
(vs $15-30 without optimization, vs $100+ with naive accumulation)
```
