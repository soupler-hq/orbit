# Building Orbit with Orbit

> How Orbit uses its own workflows, agents, and state surfaces to evolve the framework safely.

Orbit is not only a framework for downstream repos. It is also the operating model used to change Orbit itself. That means new contributors should expect framework work to begin at an Orbit command boundary, move through issue-backed branches, and leave behind durable state, review evidence, and updated docs rather than ad-hoc task transcripts.

## 1. The Self-Improvement Cascade

Orbit improves itself in waves. Each wave strengthens the next one.

- Wave `N` adds or sharpens agents, skills, workflows, and enforcement primitives.
- Wave `N+1` then uses those improvements to execute the next slice of work with better routing, clearer review, and less manual cleanup.
- This creates a compounding loop: safer workflows produce better framework changes, which then make future framework work safer again.

In practice, the cascade looks like this:

1. Add or harden a control-plane primitive.
2. Update the registry, runtime docs, and verification surfaces.
3. Use the new primitive on the next issue instead of treating it as hypothetical.
4. Keep only the pieces that survive real use in release work.

That is why Orbit issues often land in a sequence instead of isolation. A clarification gate, loop detector, checkpoint manifest, and strict command dispatcher are not unrelated features. Together they make the next self-hosted issue more reliable.

## 2. Session Protocol

Use the same startup protocol every time so state stays trustworthy across threads, agents, and time gaps.

1. Start from `/orbit:resume`.
2. Reload the current working context from `STATE.md`, checkpoint manifests, and the active branch.
3. Confirm the active issue, branch, and PR before doing new work.
4. Continue through the appropriate workflow boundary:
   - `/orbit:quick #NNN` for a focused issue slice
   - `/orbit:plan` for multi-step design or architecture work
   - `/orbit:build [N]` for wave execution
5. End by updating state surfaces, review evidence, and PR metadata in the same pass.

When the session was compacted or resumed in a fresh runtime, the goal is not to reconstruct context from memory. The goal is to recover it from durable evidence.

## 3. TDD for Agent Files

Orbit applies TDD to agent and skill definitions, not only to code.

The recommended pattern is:

1. Add or tighten eval assertions first.
2. Add dataset prompts that prove the routing or contract change matters.
3. Run the failing eval or contract test.
4. Create or update `agents/*.md`, `skills/*.md`, and `orbit.registry.json`.
5. Regenerate the human views and rerun validation.

This keeps agent work grounded in executable expectations instead of prose-only intent. A new agent is not considered real just because an `.md` file exists. It becomes real when eval, registry, docs, and routing all agree.

## 4. The Wave 1.5 Gate

Newly created agents do not immediately become trusted framework primitives. Wave 1.5 is the productization gate.

At this gate, each new agent must:

- clarify what it owns and what it does not
- update downstream workflows that should use it
- add durable docs or issue support artifacts
- prove the contract in eval or runtime enforcement

This is where raw agent creation turns into release-grade behavior. Wave 1 can add the first contract. Wave 1.5 proves the contract belongs in the framework.

## 5. The Graduation Test

An agent is production-ready when it has been used at least once in the same release that created it.

That graduation test matters because:

- it exposes routing overlap that static docs miss
- it forces generated docs and workflow contracts to stay truthful
- it proves the agent can survive the real issue → branch → review → PR loop

If an agent exists in the registry but never gets used in the release that introduced it, treat it as provisional. Graduation requires real work, not just a definition file.

## 6. Real Example

The current `v2.9.0` release provides a concrete self-orchestration example.

### Wave 1: create the product-lifecycle roster

- `#64` added `product-manager`
- `#65` added `business-analyst`
- `#66` added `qa-engineer`
- `#67` aligned `technical-writer`
- `#68` aligned `launch-planner`

### Wave 1.5: turn the roster into usable framework behavior

- `/orbit:launch`, `/orbit:discover`, and `/orbit:ship` were updated to use the new specialist roles.
- Supporting skills such as `user-onboarding` and `compliance-checklist` were added and wired into the relevant agents.
- Durable docs like `docs/issues/issue-67-wave-1-agent-doc-stubs.md` and QA plans for Wave 1.5 issues were added so the release carried more than just agent files.

### Wave 0 and enforcement hardening then improved later execution

- state freshness and checkpoint work made resume safer
- auto-chain work made `/orbit:quick -> /orbit:review -> PR` real
- governance hardening reduced PR-body drift between documentation and CI

The key point is that later work used the earlier changes immediately. Orbit did not just add agents and safety features; it used them in the same release to improve how the next slices shipped.
