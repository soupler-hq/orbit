import { describe, expect, it } from 'vitest';
import { renderQuick } from '../bin/quick.js';
import { renderPlan } from '../bin/plan.js';
import { renderReview } from '../bin/review.js';
import { renderVerify } from '../bin/verify.js';
import { renderNext } from '../bin/next.js';
import { renderRiper } from '../bin/riper.js';
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
    expect(output).toContain('Issue:      #148');
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
    expect(output).toContain('Issue:      #150');
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
    expect(output).toContain('Issue:      #151');
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
