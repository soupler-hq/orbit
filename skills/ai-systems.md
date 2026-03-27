# SKILL: AI & Agent Systems
> Building reliable, observable, cost-controlled AI-powered systems

## ACTIVATION
Auto-loaded when building AI agents, LLM integrations, RAG systems, or ML pipelines.

## ACTIVATION
Auto-loaded when building AI agents, LLM integrations, RAG systems, or ML pipelines.

## CORE PRINCIPLES
1. **Token Economics**: Prioritize cost-efficiency via model routing (Haiku for simple, Opus for complex) and prompt caching.
2. **Context Budgeting**: Strictly enforce token limits per agent to prevent history-induced "context rot."
3. **Structured Interaction**: Mandatory use of tool-calling or JSON schemas for all LLM outputs to ensure machine-readability.
4. **Subagent Isolation**: Every task must run in a fresh, isolated context to maintain high reasoning fidelity.
5. **Observability First**: All LLM calls must be traceable, logging latency, token usage, and cost per request.

## PATTERNS

### Agent Architectures
- **Tool-Using Agent**: Goal-driven loop using a defined tool-set with iteration limits and step-tracing.
- **Orchestrator-Subagent**: A thin coordinator that plans and dispatches independent sub-tasks to fresh contexts.
- **RAG System**: Retrieval → Augmentation → Generation pipeline with optional re-ranking.

### Reliability & Control
- **Retry with Backoff**: Standard exponential backoff for API transient failures.
- **Output Guardrails**: Multi-layer validation (schema checks, hallucination checks, content filtering).
- **Context Lazy-Loading**: Injecting only the minimum required project context/skills into the agent's window.

## CHECKLISTS

### AI Maturity
- [ ] Model routing logic defined (avoiding Opus-by-default)
- [ ] Prompt caching enabled for high-frequency system instructions
- [ ] All agent outputs constrained by tool_choice or JSON schemas
- [ ] Every LLM interaction logged with cost and latency metadata
- [ ] Subagents receiving minimal, task-specific context bundles
- [ ] Iteration limits and escape conditions defined for autonomous loops

## ANTI-PATTERNS
- **Opus Overkill**: Using high-reasoning models for simple text formatting or extraction.
- **Context Dumping**: Passing the entire conversation history to a subagent.
- **Parsing Free-Text**: Attempting to use regex on free-form LLM responses instead of structured tools.
- **Unbounded Autonomy**: Letting an agent run tool loops without a hard iteration cap or human gate.
- **Secret Leaks**: Including API keys or raw secrets in prompts or context windows.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
