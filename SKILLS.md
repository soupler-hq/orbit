<!-- GENERATED FILE - DO NOT EDIT MANUALLY -->
<!-- Source: templates/*.tpl.md + orbit.registry.json -->
<!-- Regenerate: node bin/generate-instructions.js --human-views -->

# Orbit Skills Index
> Reusable process frameworks loaded by agents and workflows

## Core Skills
<!-- GENERATED:START skills_list -->
- `skills/tdd.md` — code change discipline.
- `skills/architecture.md` — system design.
- `skills/planning.md` — phase planning.
- `skills/brainstorming.md` — spec extraction.
- `skills/debugging.md` — root cause analysis.
- `skills/review.md` — quality review.
- `skills/deployment.md` — ship safety.
- `skills/observability.md` — logs metrics tracing.
- `skills/security-and-identity.md` — auth, identity, tenancy, and validation.
- `skills/prompt-safety.md` — prompt injection defense.
- `skills/context-management.md` — session and token control.
- `skills/riper.md` — structured reasoning.
- `skills/git-worktree.md` — parallel development.
- `skills/scalability.md` — capacity planning.
- `skills/ai-systems.md` — agent systems and routing.
- `examples/skills/ecommerce.md` — commerce systems.
- `skills/reflection.md` — autonomous self-correction (RALPH loop).
- `skills/instructor.md` — educational delivery and concept explanation.
- `skills/nexus.md` — multi-repo workspace coordination.
- `skills/sota-architecture.md` — kernel vs userland management and bloat prevention.
- `skills/workflow-audit.md` — CI/CD pipeline architecture review — release step ordering, trigger hygiene, idempotency.
<!-- GENERATED:END skills_list -->

## Registry Discipline
- Skill metadata lives in `orbit.registry.json`.
- Each skill should have a single owner purpose and a clear loading trigger.
- Skills are reusable process frameworks, not task-specific instructions.

## Agent Skill Map
<!-- GENERATED:START agent_skill_map -->
- `architect` loads: skills/architecture.md, skills/security-and-identity.md, skills/scalability.md.
- `engineer` loads: skills/tdd.md, skills/debugging.md, skills/reflection.md.
- `strategist` loads: skills/planning.md, skills/brainstorming.md.
- `product-manager` loads: skills/planning.md, skills/brainstorming.md, skills/riper.md.
- `reviewer` loads: skills/review.md, skills/reflection.md.
- `devops` loads: skills/deployment.md, skills/observability.md.
- `researcher` loads: skills/brainstorming.md.
- `designer` loads: skills/brainstorming.md.
- `launch-planner` loads: skills/planning.md, skills/brainstorming.md.
- `technical-writer` loads: skills/review.md, skills/brainstorming.md.
- `security-engineer` loads: skills/security-and-identity.md, skills/review.md.
- `data-engineer` loads: skills/architecture.md, skills/observability.md, skills/tdd.md, skills/scalability.md.
- `safety-evaluator` loads: skills/prompt-safety.md.
- `forge` loads: skills/ai-systems.md, skills/brainstorming.md.
- `pedagogue` loads: skills/instructor.md, skills/brainstorming.md.
<!-- GENERATED:END agent_skill_map -->

## Loading Policy
- Load skills lazily.
- Prefer one or two skills per task instead of broad bundles.
- Keep skill usage aligned with the current task type.
- Add new skills only when they represent a reusable pattern, not a one-off task.
- When a skill changes, update the registry and the human index together.
