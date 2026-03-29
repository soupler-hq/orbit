# Orbit Skills Index
> Reusable process frameworks loaded by agents and workflows

## Core Skills
<!-- GENERATED:START skills_list -->
{{GENERATED_SKILLS_LIST}}
<!-- GENERATED:END skills_list -->

## Registry Discipline
- Skill metadata lives in `orbit.registry.json`.
- Each skill should have a single owner purpose and a clear loading trigger.
- Skills are reusable process frameworks, not task-specific instructions.

## Agent Skill Map
<!-- GENERATED:START agent_skill_map -->
{{GENERATED_AGENT_SKILL_MAP}}
<!-- GENERATED:END agent_skill_map -->

## Loading Policy
- Load skills lazily.
- Prefer one or two skills per task instead of broad bundles.
- Keep skill usage aligned with the current task type.
- Add new skills only when they represent a reusable pattern, not a one-off task.
- When a skill changes, update the registry and the human index together.
