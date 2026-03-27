# Agent Forge — Dynamic Agent Builder
> Triggered when no existing agent covers the task with >60% fit

## PURPOSE
Agent Forge is the self-extending capability of Orbit. When a task falls outside existing agents' domains, Forge analyzes the task, defines a new specialized agent, persists it, and immediately dispatches work to it.

## WHEN FORGE ACTIVATES
- Task domain not covered by any agent in registry
- Task requires highly specialized knowledge
- User explicitly calls `/orbit:forge <description>`
- Orchestrator confidence in best-match agent is <60%

## FORGE PROCESS

### Step 1 — Domain Analysis
Analyze the task and identify:
- Primary knowledge domain(s)
- Secondary domains this agent draws from
- Unique constraints for this domain
- What "done well" means in this domain
- Anti-patterns to avoid

### Step 2 — Agent Blueprint
Define the new agent using this template:

```markdown
# Agent: {NAME}
> One-line description

## ROLE
{2-3 sentence description of expertise and approach}

## TRIGGERS ON
- {condition 1}
- {condition 2}

## DOMAIN EXPERTISE
{What this agent knows deeply}

## OPERATING RULES
1. {Domain-specific rule 1}
2. {Domain-specific rule 2}

## SKILLS LOADED
- {skill file 1}
- {skill file 2}

## OUTPUT FORMAT
{What this agent always produces — artifacts, formats, structure}

## QUALITY STANDARD
{Domain-specific definition of excellent output}

## ANTI-PATTERNS
- Never do X
- Avoid Y
```

### Step 3 — Registration
Write agent to `agents/{name}.md` and add to CLAUDE.md Agent Registry table.

### Step 4 — Dispatch
Pass task to new agent with full context and PLAN.md.

### Step 5 — Feedback Loop
After task completes, optionally refine the agent definition.

## EXAMPLE FORGE OUTPUTS

**Request**: "Build a Solana smart contract for NFT minting"
**Forged**: `blockchain-engineer` — Solana/Rust, Anchor framework, on-chain program architecture, gas optimization

**Request**: "Design ML pipeline for real-time fraud detection"
**Forged**: `ml-engineer` — feature engineering, model serving, latency, drift detection, MLOps

**Request**: "Build FHIR-compliant healthcare data exchange API"
**Forged**: `healthcare-engineer` — HL7 FHIR R4, HIPAA compliance, healthcare interoperability

**Request**: "Implement algorithmic trading strategy backtesting system"
**Forged**: `quant-engineer` — financial data pipelines, backtesting frameworks, risk metrics, execution simulation

## FORGE QUALITY CHECK
Before registering any new agent:
- [ ] Name is specific (not generic like "specialist")
- [ ] Triggers are unambiguous
- [ ] Operating rules are domain-specific, not generic advice
- [ ] Output format is concrete and verifiable
- [ ] Agent doesn't duplicate an existing agent
- [ ] Anti-patterns are genuine domain pitfalls
