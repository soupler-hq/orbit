---
id: issue-130-orbit-enforcement-remediation
doc_type: plan
status: Active
version: v1
last_updated: 2026-03-31
scope: issue-130
phase: Foundations
rank: 010
priority: P0
depends_on: []
blocks:
  - issue-125
---

# Orbit Enforcement Remediation

> Implementation plan to make Orbit enforce its workflow contracts at runtime, not only in documentation

## Status

- Scope: v2.9.0 remediation foundation
- Type: Cross-cutting execution hardening
- Umbrella issue: #130
- Last updated: 2026-03-31

## Why This Exists

Recent review exposed a structural gap in Orbit:

- the framework documents lifecycle hook behavior, but the default setup path does not fully install it
- the framework documents plain-prompt workflow inference, but the runtime layer does not yet implement it
- the framework recommends worktrees, but some lifecycle tooling is not worktree-safe
- the desired `branch -> implement -> test -> review -> fix -> review -> PR` loop is described, but not yet enforced as a closed execution system

Orbit is currently stronger as a control-plane specification than as an enforced runtime. This plan exists to close that gap first, before more product-layer features are added on top.

## Core Goal

Move Orbit from:

- policy-rich
- documentation-led
- partially enforced

to:

- runtime-enforced
- adapter-aware
- test-backed
- difficult to misuse

## Design Principle

Orbit should not merely describe the correct workflow. It should make incorrect progression hard or impossible.

That means:

- default install/setup must activate the expected runtime behaviors
- adapters must honestly expose only the capabilities they can enforce
- workflow stages must become executable gates
- evals must verify implementation behavior, not just documentation presence

## Scope

This remediation covers four linked execution tracks:

1. Hook installation and worktree-safe lifecycle wiring
2. Plain-prompt workflow routing at the runtime boundary
3. Closed-loop workflow state enforcement for branch, test, review, and PR
4. End-to-end test and eval coverage for the enforcement path

## Execution Strategy

This work should be executed as foundation-first remediation, not as four independent feature tracks.

Recommended order:

1. Fix the install and hook truth gap first
2. Lock the real adapter capability boundary for plain-prompt routing
3. Enforce the workflow state machine only after the runtime entrypoints are honest
4. Harden the end-to-end evals last so they validate the final enforced behavior

This keeps Orbit from reintroducing the same problem in a new form:

- do not implement enforcement gates before the lifecycle plumbing is reliable
- do not claim plain-prompt inference before adapter support is real
- do not freeze eval expectations before runtime behavior has stabilized

## Priority Order

### P0: Runtime Truth

- #134 — install lifecycle hooks by default and support worktrees

This is the first task because it fixes a real runtime promise that currently does not hold for default users.

### P1: Adapter Truth

- #133 — implement implicit Orbit workflow routing for plain prompts

This should start with an adapter capability matrix and a narrow supported-path implementation, not a blanket promise across all runtimes.

### P2: Workflow Enforcement

- #131 — enforce closed-loop branch-test-review-pr state machine

This should build on the now-honest runtime entrypoints and should not assume capabilities the adapters do not yet provide.

### P3: Enforcement Confidence

- #132 — add end-to-end coverage for setup, routing, and review gates

This wave should codify the final behavior so future documentation changes cannot outrun implementation again.

## Related Issues

- [#130](https://github.com/soupler-hq/orbit/issues/130) — epic(runtime): enforcement-first orbit execution remediation
- [#134](https://github.com/soupler-hq/orbit/issues/134) — fix(runtime): install lifecycle hooks by default and support worktrees
- [#133](https://github.com/soupler-hq/orbit/issues/133) — feat(runtime): implement implicit Orbit workflow routing for plain prompts
- [#131](https://github.com/soupler-hq/orbit/issues/131) — feat(workflow): enforce closed-loop branch-test-review-pr state machine
- [#132](https://github.com/soupler-hq/orbit/issues/132) — test(enforcement): add end-to-end coverage for setup, routing, and review gates
- [#78](https://github.com/soupler-hq/orbit/issues/78) — chore(structure): clean repo root + add GENERATED headers + restructure templates

## Root Cause Analysis

### 1. Control Plane Advanced Faster Than The Runtime

Orbit’s templates, command docs, and generated instruction views evolved faster than the install/setup and adapter layers. That allowed new promises to be merged into the control plane before runtime enforcement existed.

### 2. No Mandatory State Machine

Orbit has commands and workflow guidance, but not yet a single enforced state model that blocks invalid transitions. This makes review, verification, and PR discipline too easy to bypass.

### 3. Eval Depth Is Too Shallow

The current test and eval layers are strong on structural presence and output-shape checks. They are not yet strong enough on end-to-end operational verification.

### 4. Adapter Capability Boundaries Are Underspecified

Some features are only real if the adapter can intercept or route user input. Plain-prompt inference is one example. Orbit needs a clearer distinction between:

- documented aspiration
- supported runtime capability
- unsupported or partial adapter behavior

## Remediation Architecture

### Layer 1: Install And Hook Enforcement

Goal: make the default setup path activate the lifecycle behaviors Orbit depends on.

Required outcomes:

- `install.sh` and `bin/setup.sh` install lifecycle hooks by default where supported
- hook installation works in both standard repos and linked worktrees
- docs describe installed behavior accurately

Primary issue:

- #134

### Layer 2: Runtime Prompt Interception

Goal: make plain-prompt inference an actual runtime feature rather than a prose contract.

Required outcomes:

- define where prompt interception lives for each supported adapter
- infer the nearest Orbit workflow for tracked work prompts
- keep explicit `/orbit:*` commands higher priority
- document unsupported adapter cases honestly

Primary issue:

- #133

### Layer 3: Closed-Loop Workflow State Machine

Goal: turn Orbit’s ideal flow into a progression model with explicit gates.

Suggested task states:

- `issue_ready`
- `branch_ready`
- `implementation_done`
- `tests_green`
- `review_required`
- `review_clean`
- `pr_ready`
- `pr_open`

Required outcomes:

- Orbit can explain the current state
- Orbit can explain what is blocking the next state
- PR creation depends on test and review state, not just operator memory

Primary issue:

- #131

### Layer 4: Enforcement Evals

Goal: ensure implementation drift is caught before documentation gets ahead again.

Required outcomes:

- end-to-end coverage of install/setup hook activation
- worktree-aware coverage
- prompt-routing coverage where supported
- state-machine gate coverage
- a clean distinction between structural checks and runtime-enforcement checks

Primary issue:

- #132

## Implementation Waves

### Wave 1: Runtime Truth Baseline

Focus:

- close the gap between documented hook behavior and installed hook behavior
- fix worktree handling for git hook installation
- classify which adapters can and cannot support plain-prompt interception

Issues:

- #134
- partial discovery work for #133

Exit criteria:

- a default supported setup path installs lifecycle hooks
- worktree installs do not fail on `.git` file layouts
- adapter capability matrix is explicit
- no docs claim installed lifecycle behavior that the default setup path does not actually activate

### Wave 2: Prompt Routing Enforcement

Focus:

- implement implicit workflow routing only where technically feasible
- update runtime contracts to match what the adapters can really do

Issues:

- #133

Sequencing note:

- start with capability discovery and contract tightening
- implement one supported adapter path cleanly before broadening
- remove or downgrade any over-broad docs claims if a runtime cannot support interception

Exit criteria:

- explicit commands still win
- supported adapters infer workflow correctly for tracked work prompts
- unsupported cases are documented as unsupported, not implied

### Wave 3: Closed-Loop State Enforcement

Focus:

- add a task-state progression model
- block invalid progression toward PR and ship
- surface state and blockers in Orbit status output

Issues:

- #131

Exit criteria:

- review and verification become executable gates
- Orbit can report the current state and next allowed transition
- PR progression is blocked when prerequisites are missing
- the gate model reflects real runtime capabilities instead of aspirational workflow prose

### Wave 4: End-To-End Confidence

Focus:

- strengthen install tests, evals, and workflow verification
- ensure future documentation changes cannot outrun runtime truth

Issues:

- #132

Exit criteria:

- runtime enforcement is covered by tests
- docs-only promises without implementation become detectable failures
- install, routing, and review loops are validated as actual behavior, not inferred from file presence

## Parallelism Policy

Use limited parallelism here.

Safe to run in parallel:

- small discovery work for #133 while #134 is being implemented
- test harness scaffolding for #132 once the first enforcement behaviors are stable

Not safe to run in parallel:

- #131 before the runtime and adapter truth layers settle
- final #132 assertions before the enforcement behavior is implemented

Rule of thumb:

- build the lowest truthful layer first
- only parallelize when the write paths and behavioral assumptions are clearly disjoint

## Definition Of Done For The Epic

The remediation epic should only be considered complete when all of the following are true:

- the default setup path activates the lifecycle behavior Orbit documents
- linked worktrees are supported where Orbit recommends worktrees
- plain-prompt routing is either implemented for a runtime or explicitly documented as unsupported
- the branch-test-review-fix-review-pr loop is enforced as a runtime progression model
- evals fail when documentation gets ahead of implementation

## Changes Expected By Area

### Runtime / Install

- `install.sh`
- `bin/setup.sh`
- `bin/install-hooks.sh`
- hook scripts and worktree resolution logic

### Adapter Layer

- runtime-specific instruction generation
- prompt-routing contracts
- runtime capability docs

### Workflow Engine

- task-state tracking
- status inference
- PR and review gating

### Validation / Evals

- install tests
- end-to-end workflow tests
- eval-runner enforcement assertions

## Acceptance Criteria

- a normal supported setup path installs and activates lifecycle hooks
- worktree users receive the same supported lifecycle behavior
- plain prompts only claim inference where the runtime can actually perform it
- Orbit can enforce the path from issue and branch through test and review to PR
- runtime-eval coverage fails when enforcement behavior drifts from documentation

## Sequencing Policy

This remediation should be completed before major new workflow surface area is added. Orbit’s foundation must be enforced before the framework grows broader.

## Notes

- This plan strengthens the base layer needed by PDCS and later v2.9.0 work.
- This plan complements #78 because cleaner structure and generated-view discipline make enforcement easier to reason about.
