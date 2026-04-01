---
id: evals-v1
doc_type: standard
status: Final
version: v1
last_updated: 2026-03-30
---

# Evaluation Framework

> Lightweight eval criteria for routing quality, workflow compliance, and runtime portability

## Why this exists

The framework is stronger when its behavior can be checked, not just described. These evals are designed to prove the control plane still works when docs, registry, hooks, or runtime adapters change.

## Evaluation Areas

### 1. Routing Accuracy

Given a user request, does the framework select the right agent or wave?

- Clear engineering task routes to `engineer`
- System design routes to `architect`
- Planning routes to `strategist`
- Security-sensitive work routes to `security-engineer`
- Unknown domains route to `researcher` or `forge`

### 2. Workflow Compliance

Does the task follow the expected lifecycle?

- Classify before executing
- Plan before building when the task is multi-step
- Verify before ship
- Update state before compaction or session end

### 3. Registry Integrity

Does the machine-readable registry match the actual repo?

- Every referenced agent file exists
- Every referenced skill file exists
- Every workflow command starts with `/orbit:`
- Every runtime adapter target exists in the docs

### 4. Portability

Can the same control plane work across runtimes?

- Claude should be native
- Codex should be compatible
- Antigravity should be compatible or adapter-assisted
- The docs should not require runtime-specific rewriting of the control plane

## Sample Eval Set

1. `build an admin billing export with audit logs`
2. `fix a type error in a React component`
3. `design a multi-region deployment strategy`
4. `review this auth change for security issues`
5. `for this unfamiliar domain, propose a safe first pass`

For a richer example corpus, see [eval-dataset.md](eval-dataset.md).

## Scoring Rubric

- `10/10` - correct agent routing, correct workflow choice, clean state handling, and portable docs
- `8/10` - minor routing or documentation drift, but the control plane still works
- `6/10` - workflow is usable but routing or state handling is inconsistent
- `4/10` - control plane is mostly manual and portability is weak
- `0-2/10` - framework behavior is ambiguous or undocumented

## Recommended Automation

- Validate registry and config on every change
- Check that the README, registry, and runtime adapter docs agree
- Run a small prompt-routing eval set when changing agents or workflows
- Fail CI if a runtime claim is made in docs but not represented in the registry
- Assert structural contracts for newly added agents, skills, and workflows instead of relying on raw assertion count alone
- Validate config-backed control-plane gates such as `loop_detection` and `clarification_gate`
- Validate durable templates that underpin project memory, such as `templates/DECISIONS-LOG.md`
