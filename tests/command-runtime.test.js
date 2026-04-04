import { describe, expect, it } from 'vitest';
import { renderQuick, runQuick } from '../bin/quick.js';
import { renderPlan } from '../bin/plan.js';
import { renderReview } from '../bin/review.js';
import { renderVerify } from '../bin/verify.js';
import { renderNext } from '../bin/next.js';
import { renderRiper } from '../bin/riper.js';
import { renderClarify } from '../bin/clarify.js';
import { classifyPromptDispatch, dispatchPrompt } from '../bin/prompt-dispatch.js';
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
    expect(output).toContain('Orbit Auto-Chain');
    expect(output).toContain('Final State:  pr_ready');
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

  it('quick runtime auto-dispatches review after tests go green and updates the chained final state', () => {
    const output = renderQuick({
      issue: '#181',
      branch: 'feat/181-quick-review-pr-autochain',
      implementationStatus: 'done',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'not_requested',
      prStatus: 'not_open',
    });

    expect(output).toContain('Orbit Auto-Chain');
    expect(output).toContain('Review:       auto_dispatch_review');
    expect(output).toContain('Final State:  review_required');
    expect(output).toContain('**Primary**: /orbit:review');
  });

  it('quick runtime routes review findings into a remediation loop', () => {
    const output = renderQuick({
      issue: '#181',
      branch: 'feat/181-quick-review-pr-autochain',
      implementationStatus: 'done',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'changes_requested',
      reviewEvidenceStatus: 'present',
      reviewFindings: 'MEDIUM: persist concrete findings into the remediation loop',
      prStatus: 'not_open',
    });

    expect(output).toContain('Orbit Auto-Chain');
    expect(output).toContain('Review:       changes_requested');
    expect(output).toContain('PR Action:    blocked');
    expect(output).toContain('Final State:  remediation_required');
    expect(output).toContain('persist concrete findings into the remediation loop');
    expect(output).toContain('**Primary**: /orbit:quick #181');
  });

  it('quick runtime can execute review and land in remediation_required when findings are returned', () => {
    const result = runQuick(
      {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        implementationStatus: 'done',
        testsStatus: 'passed',
        testEvidenceStatus: 'present',
        reviewStatus: 'not_requested',
        executeReviewAction: true,
        prStatus: 'not_open',
      },
      {
        reviewRunner: () => ({
          output: 'review executed',
          reviewStatus: 'changes_requested',
          reviewEvidenceStatus: 'present',
          shipDecisionStatus: 'blocked',
          reviewFindings: 'HIGH: preserve concrete findings in remediation',
        }),
      }
    );

    expect(result.reviewResult).toMatchObject({
      reviewStatus: 'changes_requested',
      reviewFindings: 'HIGH: preserve concrete findings in remediation',
    });
    expect(result.prResult).toBe(null);
    expect(result.output).toContain('Review:       changes_requested');
    expect(result.output).toContain('Final State:  remediation_required');
    expect(result.output).toContain('preserve concrete findings in remediation');
    expect(result.output).toContain('**Primary**: /orbit:quick #181');
  });

  it('quick runtime can execute review and then sync the PR when the result is clean', () => {
    const result = runQuick(
      {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        implementationStatus: 'done',
        testsStatus: 'passed',
        testEvidenceStatus: 'present',
        reviewStatus: 'not_requested',
        executeReviewAction: true,
        executePrAction: true,
        verificationCommands: 'bash bin/validate.sh||npm run format:check',
        changedFiles: 'commands/commands.md',
        prStatus: 'not_open',
      },
      {
        reviewRunner: () => ({
          output: 'review executed',
          reviewStatus: 'approved',
          reviewEvidenceStatus: 'present',
          shipDecisionStatus: 'approved',
          reviewFindings: 'none',
        }),
        syncPullRequest: () => ({
          action: 'created',
          number: 187,
          url: 'https://github.com/soupler-hq/orbit/pull/187',
        }),
      }
    );

    expect(result.reviewResult).toMatchObject({
      reviewStatus: 'approved',
      shipDecisionStatus: 'approved',
    });
    expect(result.prResult).toEqual({
      action: 'created',
      number: 187,
      url: 'https://github.com/soupler-hq/orbit/pull/187',
    });
    expect(result.output).toContain('PR Action:    created');
    expect(result.output).toContain('Final State:  pr_open');
    expect(result.output).toContain('PR:         #187');
  });

  it('quick runtime creates or updates the PR once the chained state is clean', () => {
    const result = runQuick(
      {
        issue: '#181',
        branch: 'feat/181-quick-review-pr-autochain',
        implementationStatus: 'done',
        testsStatus: 'passed',
        testEvidenceStatus: 'present',
        reviewStatus: 'approved',
        reviewEvidenceStatus: 'present',
        shipDecisionStatus: 'approved',
        prStatus: 'not_open',
        executePrAction: true,
        verificationCommands: 'bash bin/validate.sh||npm run format:check',
        changedFiles: 'commands/commands.md',
      },
      {
        syncPullRequest: () => ({
          action: 'created',
          number: 186,
          url: 'https://github.com/soupler-hq/orbit/pull/186',
        }),
      }
    );

    expect(result.prResult).toEqual({
      action: 'created',
      number: 186,
      url: 'https://github.com/soupler-hq/orbit/pull/186',
    });
    expect(result.output).toContain('PR Action:    created');
    expect(result.output).toContain('Final State:  pr_open');
    expect(result.output).toContain('PR:         #186');
    expect(result.output).toContain('**Primary**: /orbit:progress');
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
    expect(output).toContain(
      'Requested issue #148 does not match active branch feat/150-executable-next-runtime (#150)'
    );
    expect(output).toContain('Working target: Issue #148');
    expect(output).toContain('Branch:     feat/150-executable-next-runtime');
    expect(output).toContain('PR:         not opened yet');
  });

  it('quick runtime preserves the issue-boundary block even when tests and review are green', () => {
    const output = renderQuick({
      issue: '#148',
      branch: 'feat/150-executable-next-runtime',
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'approved',
      reviewEvidenceStatus: 'present',
      shipDecisionStatus: 'approved',
    });

    expect(output).toContain('State:    context_switch_required');
    expect(output).toContain('Next:     branch_aligned');
    expect(output).toContain('**Primary**: /orbit:quick #148');
    expect(output).not.toContain('Orbit Auto-Chain');
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
    expect(output).toContain('**Primary**: /orbit:quick');
  });

  it('quick runtime preserves the operational-rule block even when tests and review are green', () => {
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
      testsStatus: 'passed',
      testEvidenceStatus: 'present',
      reviewStatus: 'approved',
      reviewEvidenceStatus: 'present',
      shipDecisionStatus: 'approved',
      tool: 'gh',
      operation: 'network_mutation',
      environment: 'codex-sandbox',
      route: 'sandbox',
      rulesFile,
    });

    expect(output).toContain('Operational Rule');
    expect(output).toContain('State:    operational_rule_required');
    expect(output).toContain('Next:     approved_route');
    expect(output).toContain('requires route approved');
    expect(output).toContain('**Primary**: /orbit:quick');
    expect(output).not.toContain('Orbit Auto-Chain');
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

    expect(output).toContain(
      '**Primary**: /orbit:quick #150 feat(workflow): implement `/orbit:next` as an executable runtime command'
    );
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

    expect(output).toContain(
      '**Primary**: /orbit:quick #151 feat(governance): enforce documentation updates for behavior changes'
    );
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

  it('prompt dispatch makes explicit orbit:quick commands override freeform handling', () => {
    expect(
      classifyPromptDispatch('orbit:quick #145', {
        issue: '#181',
        workflowState: 'pr_open',
      })
    ).toEqual({
      type: 'explicit_command',
      command: '/orbit:quick',
      raw: 'orbit:quick #145',
      remainder: '#145',
      reason:
        'Explicit Orbit command detected; inferred routing and freeform handling are disabled.',
    });
  });

  it('prompt dispatch makes explicit orbit:review commands override active implementation context', () => {
    expect(
      classifyPromptDispatch('orbit:review on PR #189', {
        issue: '#145',
        workflowState: 'implementation_done',
      })
    ).toEqual({
      type: 'explicit_command',
      command: '/orbit:review',
      raw: 'orbit:review on PR #189',
      remainder: 'on PR #189',
      reason:
        'Explicit Orbit command detected; inferred routing and freeform handling are disabled.',
    });
  });

  it('prompt dispatch routes pick next task to orbit:next instead of staying in the active PR lane', () => {
    const result = classifyPromptDispatch('pick next task', {
      issue: '#181',
      workflowState: 'pr_open',
    });

    expect(result.type).toBe('inferred_workflow');
    expect(result.command).toBe('/orbit:next');
    expect(result.reason).toContain('Next-task prompt detected');
  });

  it('prompt dispatch executes explicit orbit:quick through the repo-local runtime path', () => {
    const result = dispatchPrompt(
      'orbit:quick #145',
      {
        issue: '#181',
        workflowState: 'pr_open',
      },
      {
        runQuick: (args) => ({
          output: `executed quick for ${args.issue}`,
        }),
      }
    );

    expect(result.executed).toBe(true);
    expect(result.error).toBe(null);
    expect(result.dispatch.command).toBe('/orbit:quick');
    expect(result.args.issue).toBe('#145');
    expect(result.output).toBe('executed quick for #145');
  });

  it('prompt dispatch executes explicit orbit:review through the repo-local runtime path', () => {
    const result = dispatchPrompt(
      'orbit:review on PR #189',
      {
        issue: '#145',
        workflowState: 'implementation_done',
      },
      {
        renderReview: (args) => `executed review for ${args.pr}`,
      }
    );

    expect(result.executed).toBe(true);
    expect(result.error).toBe(null);
    expect(result.dispatch.command).toBe('/orbit:review');
    expect(result.args.pr).toBe('#189');
    expect(result.output).toBe('executed review for #189');
  });

  it('prompt dispatch executes pick next task through orbit:next instead of staying in the current PR lane', () => {
    const result = dispatchPrompt(
      'pick next task',
      {
        issue: '#181',
        workflowState: 'pr_open',
      },
      {
        renderNext: () => 'executed next-task routing',
      }
    );

    expect(result.executed).toBe(true);
    expect(result.error).toBe(null);
    expect(result.dispatch.command).toBe('/orbit:next');
    expect(result.output).toBe('executed next-task routing');
  });

  it('prompt dispatch executes inferred continuation prompts through orbit:quick for the active issue', () => {
    const result = dispatchPrompt(
      'go ahead',
      {
        issue: '#181',
        workflowState: 'implementation_done',
      },
      {
        runQuick: (args) => ({
          output: `continued quick for ${args.issue}`,
        }),
      }
    );

    expect(result.executed).toBe(true);
    expect(result.error).toBe(null);
    expect(result.dispatch.command).toBe('/orbit:quick #181');
    expect(result.args.issue).toBe('#181');
    expect(result.output).toBe('continued quick for #181');
  });

  it('prompt dispatch hard-fails unsupported explicit Orbit commands instead of falling back to manual handling', () => {
    const result = dispatchPrompt('orbit:ship', {
      issue: '#181',
      workflowState: 'pr_ready',
    });

    expect(result.executed).toBe(false);
    expect(result.dispatch.command).toBe('/orbit:ship');
    expect(result.error).toContain(
      'Explicit Orbit command /orbit:ship is not executable through the repo-local dispatcher yet.'
    );
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
