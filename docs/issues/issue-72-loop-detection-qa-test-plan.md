# Issue #72 QA Test Plan

## Scope

Quality plan for `Issue #72` loop detection in autonomous orchestration.

## Objectives

- prove repeated autonomous retry patterns trigger the loop guard at the configured threshold
- prove legitimate duplicate work in different sessions does not trip the loop detector
- prove the emitted runtime event is durable and actionable

## Coverage Matrix

### Functional

- threshold not reached: execution continues
- threshold reached in same session: `LOOP_DETECTED` halts progression
- different sessions with similar tasks: no false-positive halt
- runtime event written with session context

### Regression

- orchestrator still executes normal parallel waves after the detector is introduced
- existing runtime-state output remains parseable by eval and tests

### Negative Paths

- malformed or missing loop-detection config falls back safely
- a repeated task fingerprint in one wave does not poison later unrelated sessions

## Recommended Automation

- unit coverage in `tests/orchestrator.test.js`
- eval coverage in `bin/eval-runner.js`
- one end-to-end orchestrator execution fixture that proves halt behavior is surfaced in state output

## Release Gate

Blocking before ship:

- threshold and cross-session regression tests pass
- emitted `LOOP_DETECTED` event shape remains documented and enforced
- no false-positive halt for valid duplicate tasks in different sessions
