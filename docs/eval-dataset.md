# Sample Eval Dataset

> Small prompt set for checking routing, workflow choice, and runtime portability

## Dataset Format

Each entry should be evaluated for:

- intended domain
- expected agent
- expected workflow
- expected runtime support notes

## Cases

| ID | Prompt | Expected Domain | Expected Agent | Expected Workflow | Notes |
|---|---|---|---|---|---|
| E01 | Add rate limiting to auth endpoints | ENGINEERING | engineer | `/orbit:quick` | Code change with TDD and security skill |
| E02 | Design a multi-region active-active architecture | SYNTHESIS | architect | `/orbit:plan` then `/orbit:build` | Needs architecture and scalability analysis |
| E03 | Review this React auth component for bugs | REVIEW | reviewer | `/orbit:review` | Language-specific review (TypeScript axes activated) |
| E04 | Create a CI/CD rollback plan for production | OPERATIONS | devops | `/orbit:plan` | Deployment and observability coverage |
| E05 | Unknown domain with high uncertainty | RESEARCH | researcher | `/orbit:plan` or `/orbit:forge` | Research first, forge if needed |
| E06 | Build an ML inference monitoring loop | SYNTHESIS | forge | `/orbit:forge` | Routes to forge; forge creates a domain-specific ml-engineer agent on demand |
| E07 | Audit prompt injection risks in the workflow docs | REVIEW | security-engineer | `/orbit:audit` | Security plus prompt-safety |
| E08 | Resume a compacted session and continue phase work | OPERATIONS | strategist or engineer | `/orbit:resume` | State recovery test |

## Expected Signals

- Clear commands should route directly.
- Cross-domain tasks should produce a wave plan.
- Security-related tasks should always include a security check.
- Unknown or novel domains should trigger research or forge behavior.
- Portability notes should not assume a single runtime.
