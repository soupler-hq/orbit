# Skill: Prompt Safety
> Defend against prompt injection, jailbreaks, and adversarial inputs in AI-integrated systems

## ACTIVATION
- Building any system that passes user input to an LLM.
- Reviewing AI-integrated features or security audits of agentic systems.
- When user input touches system prompts, tool calls, or agent instructions.

## CORE PRINCIPLES
1. **Never Trust User Data**: Treat all external input (direct or indirect) as potentially malicious "code" targeting the LLM.
2. **Structural Separation**: Maintain a strict boundary between system instructions and user-provided data using explicit tagging.
3. **Least Privilege Agents**: Agents must only have access to the minimum set of tools and data required for their specific task.
4. **Human-in-the-Loop**: Require explicit human approval for any irreversible, high-stakes, or write-access tool calls.
5. **Blast Radius Analysis**: Always design for the "worst case" scenario if an agent were to be compromised by an injection.

## PATTERNS

### Threat Identification
- **Direct Injection**: User input attempting to override instructions (e.g., "Ignore previous...").
- **Indirect Injection**: Adversarial text hidden in retrieved data (emails, docs, web pages).
- **Tool Hijacking**: Attempting to force the agent to call unauthorized or destructive tools.
- **Data Exfiltration**: Probing for system prompts or context window contents.

### Defensive Guardrails
- **Input Sanitization**: Heuristic-based filtering of known injection strings.
- **Context Tagging**: Wrapping untrusted data in explicit XML tags (e.g., `<external_content>`).
- **Output Validation**: Verifying LLM-generated tool calls against a strict JSON schema before execution.
- **Privilege Partitioning**: Separating read-only agents from those with write-access tools.

## CHECKLISTS

### AI Safety Audit
- [ ] Tool allow-list implemented (no ad-hoc tool discovery)
- [ ] Argument validation enforced via schema (e.g., Zod)
- [ ] Untrusted data wrapped in explicit context boundaries
- [ ] Human approval gate for all write operations in production
- [ ] Audit logs captured for every tool call and agent decision
- [ ] Rate limits and token budgets enforced per session

## ANTI-PATTERNS
- **Instruction Mixing**: F-stringing user input directly into system prompts without tags.
- **Greedy Tool Access**: Giving an agent `rm` or `delete` tools when it only needs to `read`.
- **Blind Execution**: Running tool calls immediately after LLM output without validation.
- **Implicit Trust**: Assuming internal data sources (like own DB) are safe from injection.
- **Unbounded Loops**: Allowing an agent to call tools in an infinite loop without a kill switch.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
