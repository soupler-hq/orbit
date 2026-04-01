import { describe, expect, it } from 'vitest';
import { renderQuick } from '../bin/quick.js';
import { renderPlan } from '../bin/plan.js';
import { renderReview } from '../bin/review.js';
import { renderVerify } from '../bin/verify.js';
import { renderNext } from '../bin/next.js';
import { renderRiper } from '../bin/riper.js';
import { renderClarify } from '../bin/clarify.js';
import { findOperationalRule, loadOperationalRules } from '../bin/operational-rules.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function expectParity(output, command) {
  expect(output).toContain('━━━ Orbit');
  expect(output).toContain('Current Execution');
  expect(output).toContain(`Command:  ${command}`);
  expect(output).toContain('Workflow Gate');
  expect(output).toContain('## Recommended Next Command');
}

describe('runtime command status parity', () => {
  const trackedArgs = {
    issue: '#146',
    branch: 'feat/146-runtime-status-parity',
    implementationStatus: 'done',
    testsStatus: 'passed',
    testEvidenceStatus: 'present',
    reviewStatus: 'approved',
    reviewEvidenceStatus: 'present',
    shipDecisionStatus: 'approved',
    prStatus: 'not_open',
  };

  it('quick runtime emits the standard status blocks', () => {
    const output = renderQuick(trackedArgs);
    expectParity(output, '/orbit:quick');
    expect(output).toContain('**Primary**: /orbit:ship');
  });

  it('quick runtime writes a checkpoint manifest and emits the checkpoint block', () => {
    const checkpointDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-runtime-checkpoint-'));
    const output = renderQuick({
      ...trackedArgs,
      writeCheckpoint: true,
      checkpointDir,
      headSha: 'abc1234',
      changedFiles:
        'bin/runtime-command.js,tests/command-runtime.test.js,docs/quality/evaluation-framework.md,orbit.registry.json',
      verificationChecks: 'vitest:true,validate:true',
    });

    expect(output).toContain('Orbit Checkpoint');
    expect(output).toContain('Checkpoint: pr_ready');
    expect(output).toContain('Artifact:');

    const latest = JSON.parse(fs.readFileSync(path.join(checkpointDir, 'latest.json'), 'utf8'));
    expect(latest.metadata.issue).toBe('#146');
    expect(latest.metadata.pr).toBe(null);
    expect(latest.impact.scope).toEqual({
      logic: true,
      tests: true,
      docs: true,
      config: true,
    });
    expect(latest.orchestration.current_state).toBe('pr_ready');
    expect(latest.orchestration.recommended_next_step).toBe('/orbit:ship');
  });

  it('quick runtime blocks when the requested issue does not match the active feature branch', () => {
    const output = renderQuick({
      issue: '#148',
      branch: 'feat/150-executable-next-runtime',
      implementationStatus: 'in_progress',
    });

    expect(output).toContain('State:    context_switch_required');
    expect(output).toContain('Next:     branch_aligned');
    expect(output).toContain('**Primary**: /orbit:quick #148');
    expect(output).toContain('Requested issue #148 does not match active branch feat/150-executable-next-runtime (#150)');
    expect(output).toContain('Working target: Issue #148');
    expect(output).toContain('Branch:     feat/150-executable-next-runtime');
    expect(output).toContain('PR:         not opened yet');
  });

  it('quick runtime consults operational rules and blocks the wrong route before execution', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-op-rules-'));
    const rulesFile = path.join(tmpDir, 'OPERATIONAL-RULES.json');
    fs.writeFileSync(
      rulesFile,
      JSON.stringify(
        {
          version: 1,
          rules: [
            {
              id: 'gh-approved-route',
              status: 'active',
              summary: 'Use the approved route first for GitHub CLI network and mutation commands.',
              scope: {
                environment: ['codex-sandbox'],
                tool: ['gh'],
                operation: ['network_mutation'],
              },
              guidance: {
                preferred_route: 'approved',
                why: 'Sandboxed gh network and mutation calls are unstable in this environment.',
              },
            },
          ],
        },
        null,
        2
      )
    );

    const output = renderQuick({
      issue: '#172',
      branch: 'feat/172-operational-rules',
      implementationStatus: 'in_progress',
      tool: 'gh',
      operation: 'network_mutation',
      environment: 'codex-sandbox',
      route: 'sandbox',
      rulesFile,
    });

    expect(output).toContain('Operational Rule');
    expect(output).toContain('Rule:     gh-approved-route');
    expect(output).toContain('State:    operational_rule_required');
    expect(output).toContain('Next:     approved_route');
    expect(output).toContain('requires route approved');
  });

  it('operational rules match by environment, tool, and operation specificity', () => {
    const rules = loadOperationalRules(
      (() => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-op-rule-load-'));
        const file = path.join(tmpDir, 'OPERATIONAL-RULES.json');
        fs.writeFileSync(
          file,
          JSON.stringify(
            {
              version: 1,
              rules: [
                {
                  id: 'generic-gh',
                  status: 'active',
                  scope: { tool: ['gh'] },
                  guidance: { preferred_route: 'approved' },
                },
                {
                  id: 'specific-gh-sandbox',
                  status: 'active',
                  scope: {
                    environment: ['codex-sandbox'],
                    tool: ['gh'],
                    operation: ['network_mutation'],
                  },
                  guidance: { preferred_route: 'approved' },
                },
              ],
            },
            null,
            2
          )
        );
        return file;
      })()
    );

    const match = findOperationalRule(rules, {
      environment: 'codex-sandbox',
      tool: 'gh',
      operation: 'network_mutation',
      route: '',
      runtimeCommand: '/orbit:quick',
    });

    expect(match.id).toBe('specific-gh-sandbox');
  });

  it('plan runtime emits the standard status blocks', () => {
    expectParity(renderPlan(trackedArgs), '/orbit:plan');
  });

  it('review runtime emits the standard status blocks', () => {
    expectParity(renderReview(trackedArgs), '/orbit:review');
  });

  it('verify runtime emits the standard status blocks', () => {
    expectParity(renderVerify(trackedArgs), '/orbit:verify');
  });

  it('next runtime emits the standard status blocks', () => {
    expectParity(renderNext(trackedArgs), '/orbit:next');
  });

  it('riper runtime emits the standard status blocks', () => {
    expectParity(renderRiper(trackedArgs), '/orbit:riper');
  });

  it('clarify runtime emits the standard status blocks and shows the pending queue', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-clarify-state-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit State',
        '## Clarification Requests',
        '[OPEN] id: clarify-001 | requested_by: engineer | issue: #73 | command: /orbit:quick | question: Which staging dataset should be used? | reason: Missing required input | requested_at: 2026-04-01T00:00:00Z',
      ].join('\n')
    );

    const output = renderClarify({
      issue: '#73',
      branch: 'feat/73-clarification-gate',
      stateFile,
    });

    expectParity(output, '/orbit:clarify');
    expect(output).toContain('Clarification Queue');
    expect(output).toContain('Pending:   1');
    expect(output).toContain('Question: Which staging dataset should be used?');
    expect(output).toContain('State:    clarification_required');
  });

  it('clarify runtime refuses to resolve a request without an answer', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-clarify-missing-answer-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit State',
        '## Clarification Requests',
        '[OPEN] id: clarify-001 | requested_by: engineer | issue: #73 | command: /orbit:quick | question: Which staging dataset should be used? | reason: Missing required input | requested_at: 2026-04-01T00:00:00Z',
      ].join('\n')
    );

    expect(() =>
      renderClarify({
        issue: '#73',
        branch: 'feat/73-clarification-gate',
        stateFile,
        resolve: 'clarify-001',
      })
    ).toThrow('--answer is required with --resolve');
  });

  it('next runtime resolves the next issue from STATE.md when no tracked branch is active', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-next-state-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit Project State',
        '## Project Context',
        '- **Active Milestone**: v2.9.0 — Idea to Market',
        '- **Active Phase**: Enforcement Hardening',
        '',
        '## Todos + Seeds',
        '### v2.9.0 — Idea to Market',
        '#### Enforcement Hardening (CURRENT)',
        '- [ ] #150 — feat(workflow): implement `/orbit:next` as an executable runtime command',
      ].join('\n')
    );

    const output = renderNext({
      branch: 'develop',
      implementationStatus: 'not_started',
      stateFile,
    });

    expect(output).toContain('**Primary**: /orbit:quick #150 feat(workflow): implement `/orbit:next` as an executable runtime command');
    expect(output).toContain('State:    issue_ready');
    expect(output).toContain('Working target: Issue #150');
    expect(output).toContain('Branch:     develop');
  });

  it('next runtime honors active phase metadata even when the section is not marked CURRENT', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-next-state-phase-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit Project State',
        '## Project Context',
        '- **Active Milestone**: v2.9.0 — Idea to Market',
        '- **Active Phase**: Enforcement Hardening',
        '',
        '## Todos + Seeds',
        '### v2.9.0 — Idea to Market',
        '#### Enforcement Hardening',
        '- [ ] #151 — feat(governance): enforce documentation updates for behavior changes',
      ].join('\n')
    );

    const output = renderNext({
      branch: 'develop',
      implementationStatus: 'not_started',
      stateFile,
    });

    expect(output).toContain('**Primary**: /orbit:quick #151 feat(governance): enforce documentation updates for behavior changes');
    expect(output).toContain('Working target: Issue #151');
    expect(output).toContain('Branch:     develop');
  });

  it('next runtime uses a planning-aligned workflow gate when the active phase backlog is empty', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-next-plan-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit Project State',
        '## Project Context',
        '- **Active Milestone**: v2.9.0 — Idea to Market',
        '- **Active Phase**: Enforcement Hardening',
        '',
        '## Todos + Seeds',
        '### v2.9.0 — Idea to Market',
        '#### Enforcement Hardening (CURRENT)',
        '- [x] #150 — feat(workflow): implement `/orbit:next` as an executable runtime command',
      ].join('\n')
    );

    const output = renderNext({
      branch: 'develop',
      implementationStatus: 'not_started',
      stateFile,
    });

    expect(output).toContain('State:    planning_required');
    expect(output).toContain('Next:     planned');
    expect(output).toContain('**Primary**: /orbit:plan');
  });

  it('next runtime drops an active PR lane once the current branch is already handoff-complete', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-next-handoff-complete-'));
    const stateFile = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(
      stateFile,
      [
        '# Orbit Project State',
        '## Project Context',
        '- **Active Milestone**: v2.9.0 — Idea to Market',
        '- **Active Phase**: Enforcement Hardening',
        '',
        '## Todos + Seeds',
        '### v2.9.0 — Idea to Market',
        '#### Enforcement Hardening (CURRENT)',
        '- [ ] #62 — feat(state): initialize v2.9.0 release STATE.md — prime Orbit with full release plan',
      ].join('\n')
    );

    const output = renderNext({
      issue: '#181',
      branch: 'feat/181-quick-review-pr-autochain',
      implementationStatus: 'done',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'approved',
      reviewEvidenceStatus: 'present',
      shipDecisionStatus: 'approved',
      prStatus: 'open',
      prNumber: '#184',
      stateFile,
    });

    expect(output).toContain(
      '**Primary**: /orbit:quick #62 feat(state): initialize v2.9.0 release STATE.md — prime Orbit with full release plan'
    );
    expect(output).toContain('State:    issue_ready');
    expect(output).toContain('Working target: Issue #62');
    expect(output).toContain('already in pr_open');
    expect(output).not.toContain('**Primary**: /orbit:progress');
  });

  it('early-stage runtime output uses the concrete issue and avoids premature PR blockers', () => {
    const output = renderPlan({
      issue: '#146',
      branch: 'feat/146-runtime-status-parity',
      implementationStatus: 'not_started',
      testsStatus: 'unknown',
      reviewStatus: 'unknown',
      prStatus: 'unknown',
    });

    expect(output).toContain('Command:  /orbit:quick #146');
    expect(output).not.toContain('/orbit:quick #NNN');
    expect(output).not.toContain('PR state unavailable');
    expect(output).not.toContain('Review state unavailable');
  });
});
