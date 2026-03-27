# SKILL: AI & Agent Systems
> Building reliable, observable, cost-controlled AI-powered systems

## ACTIVATION
Auto-loaded when building AI agents, LLM integrations, RAG systems, or ML pipelines.

## CORE PRINCIPLES

### Token Economics
Token costs are an engineering constraint, not an afterthought:
1. **Context budgeting**: every agent gets a defined context budget. Track usage.
2. **Lazy loading**: load only the skills/context needed for this specific task
3. **Subagent isolation**: fresh context per task — never accumulate rot across long sessions
4. **Prompt caching**: use Anthropic prompt caching for repeated system prompts (system prompt + first human turn)
5. **Model routing**: use smaller models (Haiku/Sonnet) for classification, routing, summarization. Use larger (Opus) only for complex reasoning.

### Model Routing Pattern
```typescript
const routeToModel = (task: Task): Model => {
  if (task.type === 'classify' || task.type === 'extract') return 'claude-haiku-4-5';
  if (task.complexity === 'high' || task.requiresReasoning) return 'claude-opus-4-6';
  return 'claude-sonnet-4-6'; // default
};
```

## AGENT DESIGN PATTERNS

### 1. Tool-Using Agent
```typescript
const agent = {
  system: `You are a {role}. Use tools to accomplish tasks.
           Think step by step. Use the minimum tools necessary.`,
  tools: [searchTool, writeTool, readTool],
  maxIterations: 10,
  onIteration: (step) => logStep(step), // always trace
};
```

### 2. Orchestrator-Subagent Pattern
```typescript
// Orchestrator: thin, routes work, assembles results
const orchestrator = async (task: Task) => {
  const plan = await planTask(task);           // Sonnet
  const results = await Promise.all(
    plan.subtasks.map(st => dispatch(st))       // parallel subagents
  );
  return await synthesize(results);            // Sonnet
};

// Subagent: fresh context, single responsibility
const dispatch = async (subtask: Subtask) => {
  return await claude({
    system: subtask.agentSystem,
    messages: [{ role: 'user', content: subtask.prompt }],
    // NO conversation history — fresh context
  });
};
```

### 3. RAG System Pattern
```typescript
// Retrieval → Augmentation → Generation
const rag = async (query: string) => {
  // 1. Embed query
  const queryEmbedding = await embed(query);
  
  // 2. Retrieve top-K relevant chunks
  const chunks = await vectorDB.search(queryEmbedding, { topK: 5, threshold: 0.75 });
  
  // 3. Rerank (optional but recommended)
  const reranked = await rerank(query, chunks);
  
  // 4. Generate with context
  return await claude({
    messages: [{
      role: 'user',
      content: `Context:\n${reranked.map(c => c.text).join('\n\n')}\n\nQuestion: ${query}`
    }]
  });
};
```

## RELIABILITY PATTERNS

### Structured Output (always)
```typescript
// Don't parse free-form text — demand structure
const result = await claude({
  messages: [{ role: 'user', content: 'Analyze this: ...' }],
  tools: [{
    name: 'return_analysis',
    description: 'Return the analysis result',
    input_schema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' }
      },
      required: ['sentiment', 'confidence', 'reasoning']
    }
  }],
  tool_choice: { type: 'tool', name: 'return_analysis' }
});
```

### Retry + Fallback
```typescript
const withRetry = async (fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await sleep(exponentialBackoff(i));
    }
  }
};
```

### Guardrails
Every AI output must pass through validation:
- Schema validation (structured outputs)
- Content filtering (if user-facing)
- Hallucination check (for factual claims — compare against source)
- Cost tracking (log token usage per request)

## OBSERVABILITY FOR AI SYSTEMS
```typescript
// Log every LLM call
logger.info('llm.call', {
  model,
  promptTokens: usage.input_tokens,
  completionTokens: usage.output_tokens,
  costUsd: calculateCost(usage, model),
  latencyMs,
  taskType,
  agentId,
  correlationId,
});
```

Metrics to track:
- `llm_calls_total{model, task_type}`
- `llm_tokens_used_total{model, token_type}` (input/output)
- `llm_cost_usd_total{model}`
- `llm_latency_seconds{model, p50/p95/p99}`
- `agent_task_success_rate{agent_name}`
- `agent_iteration_count{agent_name}` — high = inefficient prompts

## AI SYSTEM CHECKLIST
- [ ] Model routing configured (don't use Opus for everything)
- [ ] Prompt caching enabled for repeated system prompts
- [ ] All outputs are structured (tool_choice or JSON mode)
- [ ] Retry logic with exponential backoff
- [ ] Cost tracking per request and per user
- [ ] Guardrails for every user-facing output
- [ ] Every LLM call logged with token usage and latency
- [ ] Subagents use fresh contexts (no accumulated history)
- [ ] Context windows have defined budgets per agent type
