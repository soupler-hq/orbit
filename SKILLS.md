# Orbit Skills Index
> Reusable process frameworks loaded by agents and workflows

## Core Skills
- `skills/tdd.md` - RED/GREEN/REFACTOR for all code changes.
- `skills/architecture.md` - ADRs, boundaries, failure modes, and technical trade-offs.
- `skills/planning.md` - Wave planning, XML task definitions, and phase breakdowns.
- `skills/brainstorming.md` - Intent extraction and spec discovery.
- `skills/debugging.md` - Reproduction-first root cause analysis.
- `skills/review.md` - Structured code and architecture review.
- `skills/deployment.md` - CI/CD, rollout, rollback, and release safety.
- `skills/observability.md` - Logging, metrics, tracing, and alerting.
- `skills/security.md` - Auth, authorization, validation, and security controls.
- `skills/prompt-safety.md` - Prompt injection and agentic system defense.
- `skills/context-management.md` - Token budgeting, compaction, and session recovery.
- `skills/riper.md` - Research, Innovate, Plan, Execute, Review workflow.
- `skills/git-worktree.md` - Parallel worktree-based development.
- `skills/scalability.md` - Capacity planning and bottleneck analysis.
- `skills/identity.md` - Authentication, authorization, SSO, and multi-tenancy.
- `skills/ai-systems.md` - Agent systems, routing, and model economics.
- `skills/ecommerce.md` - Checkout, payments, inventory, and order state machines.
- `skills/instructor.md` - Educational delivery, analogy-first explanations, and Socratic discovery.
- `skills/sota-architecture.md` - Kernel vs. Userland management, agent promotion, and bloat prevention.
- `skills/nexus.md` - Multi-repo workspace coordination and organization-wide orchestration.

## Registry Discipline
- Skill metadata lives in `orbit.registry.json`.
- Each skill should have a single owner purpose and a clear loading trigger.
- Skills are reusable process frameworks, not task-specific instructions.

## Agent Skill Map
- `architect` loads architecture, security, and scalability skills.
- `engineer` loads TDD and debugging skills.
- `strategist` loads planning and brainstorming skills.
- `reviewer` loads the review skill.
- `devops` loads deployment and observability skills.
- `researcher` loads brainstorming and planning support as needed.
- `designer` loads brainstorming support for UX discovery.
- `security-engineer` loads security, identity, and review skills.
- `data-engineer` loads architecture, observability, TDD, and scalability skills.
- `forge` loads the forge skill and any domain-specific skills it creates.
- `pedagogue` loads the instructor skill.
- `nexus` loads the nexus skill for multi-repo orchestration.

## Loading Policy
- Load skills lazily.
- Prefer one or two skills per task instead of broad bundles.
- Keep skill usage aligned with the current task type.
- Add new skills only when they represent a reusable pattern, not a one-off task.
- When a skill changes, update the registry and the human index together.
