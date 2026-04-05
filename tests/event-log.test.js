import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendEvent, readEvents, replayState, recordDecision, EVENT_TYPES } from '../bin/event-log.js';

function tmpLog() {
  return path.join(
    os.tmpdir(),
    `orbit-event-log-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`
  );
}

// ── appendEvent ────────────────────────────────────────────────────────────────

describe('appendEvent', () => {
  it('writes a single JSON line to the log file', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'phase_transition', to: 'Wave 1' }, logPath);
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.type).toBe('phase_transition');
    expect(parsed.to).toBe('Wave 1');
    fs.unlinkSync(logPath);
  });

  it('adds an ISO timestamp automatically when ts is absent', () => {
    const logPath = tmpLog();
    const before = new Date().toISOString();
    appendEvent({ type: 'task_complete', issue: '#42' }, logPath);
    const after = new Date().toISOString();
    const parsed = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
    expect(parsed.ts).toBeDefined();
    expect(parsed.ts >= before).toBe(true);
    expect(parsed.ts <= after).toBe(true);
    fs.unlinkSync(logPath);
  });

  it('throws when event.type is missing', () => {
    const logPath = tmpLog();
    expect(() => appendEvent({ issue: '#42' }, logPath)).toThrow(
      'appendEvent: event.type is required'
    );
  });

  it('throws when event is null or undefined', () => {
    const logPath = tmpLog();
    expect(() => appendEvent(null, logPath)).toThrow('appendEvent: event.type is required');
    expect(() => appendEvent(undefined, logPath)).toThrow('appendEvent: event.type is required');
  });

  it('appends multiple events — each on its own line', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'task_complete', issue: '#1' }, logPath);
    appendEvent({ type: 'task_complete', issue: '#2' }, logPath);
    appendEvent({ type: 'task_complete', issue: '#3' }, logPath);
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).issue).toBe('#1');
    expect(JSON.parse(lines[2]).issue).toBe('#3');
    fs.unlinkSync(logPath);
  });

  it('returns the stored event entry including the timestamp', () => {
    const logPath = tmpLog();
    const result = appendEvent({ type: 'milestone_start', milestone: 'v2.9.0' }, logPath);
    expect(result.type).toBe('milestone_start');
    expect(result.ts).toBeDefined();
    fs.unlinkSync(logPath);
  });
});

// ── readEvents ─────────────────────────────────────────────────────────────────

describe('readEvents', () => {
  it('returns empty array when file does not exist', () => {
    const logPath = tmpLog();
    expect(readEvents(logPath)).toEqual([]);
  });

  it('parses all events from the log in emission order', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'milestone_start', milestone: 'v2.9.0' }, logPath);
    appendEvent({ type: 'task_complete', issue: '#212' }, logPath);
    const events = readEvents(logPath);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('milestone_start');
    expect(events[1].issue).toBe('#212');
    fs.unlinkSync(logPath);
  });

  it('throws on invalid JSON in the log', () => {
    const logPath = tmpLog();
    fs.writeFileSync(logPath, 'not-valid-json\n', 'utf8');
    expect(() => readEvents(logPath)).toThrow('EVENT-LOG.jsonl: invalid JSON on line 1');
  });

  it('handles a log with trailing newline gracefully', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'task_open', issue: '#99' }, logPath);
    const events = readEvents(logPath);
    expect(events).toHaveLength(1);
    fs.unlinkSync(logPath);
  });
});

// ── replayState ────────────────────────────────────────────────────────────────

describe('replayState', () => {
  it('returns null currentFocus when log is empty', () => {
    const logPath = tmpLog();
    const state = replayState(logPath);
    expect(state.currentFocus).toBeNull();
    expect(state.recentlyCompleted).toEqual([]);
    expect(state.openBlockers).toEqual([]);
    expect(state.activeMilestone).toBeNull();
  });

  it('derives currentFocus from last phase_transition event', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'phase_transition', from: 'Wave 0', to: 'Wave 1' }, logPath);
    appendEvent({ type: 'phase_transition', from: 'Wave 1', to: 'Wave 0.5' }, logPath);
    const state = replayState(logPath);
    expect(state.currentFocus).toBe('Wave 0.5');
    fs.unlinkSync(logPath);
  });

  it('keeps only the last 5 task_complete events', () => {
    const logPath = tmpLog();
    for (let i = 1; i <= 7; i++) {
      appendEvent({ type: 'task_complete', issue: `#${i}` }, logPath);
    }
    const state = replayState(logPath);
    expect(state.recentlyCompleted).toHaveLength(5);
    expect(state.recentlyCompleted[0].issue).toBe('#3');
    expect(state.recentlyCompleted[4].issue).toBe('#7');
    fs.unlinkSync(logPath);
  });

  it('resolves blockers when blocker_resolved event follows blocker_added', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'blocker_added', id: 'B-001', note: 'PR #190 in flight' }, logPath);
    appendEvent({ type: 'blocker_added', id: 'B-002', note: 'Wave 4 blocked on Wave 0.5' }, logPath);
    appendEvent({ type: 'blocker_resolved', id: 'B-001' }, logPath);
    const state = replayState(logPath);
    expect(state.openBlockers).toHaveLength(1);
    expect(state.openBlockers[0].id).toBe('B-002');
    fs.unlinkSync(logPath);
  });

  it('tracks active milestone from milestone_start/milestone_complete', () => {
    const logPath = tmpLog();
    appendEvent({ type: 'milestone_start', milestone: 'v2.9.0' }, logPath);
    let state = replayState(logPath);
    expect(state.activeMilestone).toBe('v2.9.0');
    appendEvent({ type: 'milestone_complete', milestone: 'v2.9.0' }, logPath);
    state = replayState(logPath);
    expect(state.activeMilestone).toBeNull();
    fs.unlinkSync(logPath);
  });
});

// ── recordDecision ─────────────────────────────────────────────────────────────

describe('recordDecision', () => {
  it('writes a decision event with the correct shape', () => {
    const logPath = tmpLog();
    recordDecision(
      {
        decision: 'Use event sourcing for STATE.md',
        rationale: 'SOTA LLM memory pattern — event log as source of truth',
        version: 'v2.9.0',
        wave: 'Wave 0.5',
      },
      logPath
    );
    const [evt] = readEvents(logPath);
    expect(evt.type).toBe(EVENT_TYPES.DECISION);
    expect(evt.decision).toBe('Use event sourcing for STATE.md');
    expect(evt.rationale).toBe('SOTA LLM memory pattern — event log as source of truth');
    expect(evt.version).toBe('v2.9.0');
    expect(evt.wave).toBe('Wave 0.5');
    fs.unlinkSync(logPath);
  });

  it('defaults actor to "Orbit" when not provided', () => {
    const logPath = tmpLog();
    recordDecision({ decision: 'Test', rationale: 'Testing defaults' }, logPath);
    const [evt] = readEvents(logPath);
    expect(evt.actor).toBe('Orbit');
    fs.unlinkSync(logPath);
  });

  it('respects explicit actor override', () => {
    const logPath = tmpLog();
    recordDecision(
      { decision: 'Ship Wave 0.5', rationale: 'All items complete', actor: 'human-operator' },
      logPath
    );
    const [evt] = readEvents(logPath);
    expect(evt.actor).toBe('human-operator');
    fs.unlinkSync(logPath);
  });
});

// ── EVENT_TYPES ────────────────────────────────────────────────────────────────

describe('EVENT_TYPES', () => {
  it('exports all expected event type constants', () => {
    expect(EVENT_TYPES.PHASE_TRANSITION).toBe('phase_transition');
    expect(EVENT_TYPES.TASK_COMPLETE).toBe('task_complete');
    expect(EVENT_TYPES.TASK_OPEN).toBe('task_open');
    expect(EVENT_TYPES.BLOCKER_ADDED).toBe('blocker_added');
    expect(EVENT_TYPES.BLOCKER_RESOLVED).toBe('blocker_resolved');
    expect(EVENT_TYPES.DECISION).toBe('decision');
    expect(EVENT_TYPES.MILESTONE_START).toBe('milestone_start');
    expect(EVENT_TYPES.MILESTONE_COMPLETE).toBe('milestone_complete');
    expect(EVENT_TYPES.SNAPSHOT).toBe('snapshot');
  });
});
