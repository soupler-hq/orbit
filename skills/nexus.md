# SKILL: Nexus Orchestration

> Coordination and intelligence across multiple repositories in a logical workspace

## ACTIVATION

Activated when the Orchestrator detects an `orbit.nexus.json` in the workspace root or when the USER_REQUEST involves multi-repo logic.

## CORE PRINCIPLES

1. **Workspace Sovereignty**: The Nexus root is the single source of truth for repository relationships.
2. **Context Federation**: Summaries from sub-repos must be aggregated, not the full source code (to avoid token bloat).
3. **Cross-Repo Traceability**: Every decision involving Repo A that affects Repo B must be documented in `NEXUS-STATE.md`.
4. **Least Privilege**: Subagents assigned to Repo A should not have write access to Repo B unless explicitly escalated.

## WORKFLOWS

### Cross-Repo Compatibility Check
1. **Identify**: Map the source of truth (e.g., `engineering-standards/IDP`) and the consumer (e.g., `soupler-marketing`).
2. **Phase 1 (Extract)**: 
   - Spawn Researcher in Repo A to extract capabilities (APIs, schemas).
   - Spawn Researcher in Repo B to extract requirements (dependencies, auth needs).
3. **Phase 2 (Analyze)**: The Architect Meta-Agent compares extracted data for protocol or version mismatches.
4. **Phase 3 (Report)**: Update `NEXUS-STATE.md` with the "Compatibility Score" and remediations.

## CHECKLISTS

- [ ] Does `orbit.nexus.json` correctly list all child repos?
- [ ] Are repositories indexed with `orbit sync` before analysis?
- [ ] Is the "Architect-General" agent loaded for cross-repo reasoning?
- [ ] Are findings burned into the global `NEXUS-STATE.md`?

## ANTI-PATTERNS

- **Context Bleeding**: Loading the full `node_modules` of Repo A into the context of Repo B.
- **Ambiguous Dependencies**: Assuming Repo B uses the latest version of Repo A without checking `package.json`.
- **Silent Failures**: Changing a shared IDP without running a Nexus-wide compatibility audit.
