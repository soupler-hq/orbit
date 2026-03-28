# SKILL: SOTA Architecture (Kernel vs. Userland)

> Principles for keeping the Orbit core lean while enabling infinite downstream extension.

## ACTIVATION

Activated when the Architect or Forge detects a need for a new agent/skill, or during the `/orbit:promote` workflow.

## CORE PRINCIPLES

1. **The Kernel Immutable**: Core agents (Architect, Engineer, Forge, Strategist, etc.) are stable "Pillars." Modifications to these are "Major Releases."
2. **Userland Freedom**: Project-specific specialists live in `.orbit/`. They are the "Antibodies" for repo-specific problems.
3. **Abstraction-as-Propagation**: A new capability discovered in a repo should be abstracted into a **Skill** first, not a new **Agent**.
4. **Nexus Awareness**: Before building or promoting, consult the `orbit.nexus.json` to see if a similar "Blueprint" (Skill) already exists in the organization.

## WORKFLOWS

### The "SOTA Promotion" Filter
When considering moving a project-local agent/skill to the global core:
1. **Utility Test**: Is this useful to at least 3 unrelated repos?
2. **Cohesion Test**: Does it overlap with existing core skills? If yes, **ENHANCE** the existing skill instead of adding a new one.
3. **Complexity Test**: Can this be solved with a simple Rule update in `INSTRUCTIONS.md`?

## CHECKLISTS

- [ ] Is the agent tagged with the correct `metadata.scope`?
- [ ] Has the logic been abstracted into a `SKILL` where possible?
- [ ] Does the `CHANGELOG.md` reflect why the "Core" was touched?
- [ ] If local, is it registered in the project's `.orbit/orbit.registry.json`?

## ANTI-PATTERNS

- **Agent Explosion**: Having 15 specialized React agents when one `react-expert` skill would suffice.
- **Hardcoded Context**: Writing project-specific repo names or jira-ids into a global agent/skill.
- **Framework Bloat**: Adding a core agent for every new NPM library discovered.

## PATTERNS

1. **Core Pillar**: Every major domain must have one core agent.
2. **Pattern Matching**: Always look for a skills-based solution before an agent-based one.
3. **Registry First**: Every new asset must be registered in the machine-readable registry.

## VERIFICATION WORKFLOW

1. **Test**: Run `bash bin/validate.sh` to ensure registry integrity.
2. **Audit**: Verify the "Promotion Filter" was followed.
3. **Review**: Ensure the new asset is documented in `README.md` and `CHANGELOG.md`.
