# Issue #73 QA Test Plan

## Scope

Quality plan for `Issue #73` clarification gate behavior.

## Objectives

- prove ambiguous work can emit a clarification request into state
- prove unresolved clarification requests block tool execution
- prove resolution requires an actual answer and clears the gate deterministically

## Coverage Matrix

### Functional

- clarification request emitted into `STATE.md`
- pending clarification blocks tool execution through the pre-tool-use hook
- resolving with an answer clears the gate
- resolving without an answer is rejected

### Regression

- normal tool execution continues when no clarification request is pending
- runtime output still includes standard Orbit status blocks

### Negative Paths

- missing state file initializes safely
- duplicate clarification ids do not corrupt pending request resolution
- stale resolved entries do not keep the tool gate blocked

## Recommended Automation

- unit coverage in `tests/clarification-gate.test.js`
- runtime coverage in `tests/command-runtime.test.js`
- eval coverage for the clarification-gate helper and state-template contract

## Release Gate

Blocking before ship:

- unresolved clarification reliably blocks tool execution
- `/orbit:clarify --resolve` requires `--answer`
- state and runtime output stay consistent after clarification resolution
