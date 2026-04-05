#!/usr/bin/env node
/**
 * bin/event-log.js — Orbit Event Log
 *
 * Implements the event-sourced state model for Orbit.
 * EVENT-LOG.jsonl is the append-only source of truth (committed to git).
 * STATE.md is a materialized view that can be rebuilt with `bootstrap.js --replay`.
 *
 * Architecture (SOTA LLM memory layers):
 *   Episodic   → .orbit/state/EVENT-LOG.jsonl  (typed, ordered event stream)
 *   Semantic   → agents/, skills/, workflows/   (role and capability definitions)
 *   Procedural → .orbit/state/STATE.md          (current operating state — derived)
 *
 * Exports:
 *   appendEvent(event, [logPath])          — append a typed event
 *   readEvents([logPath])                  — read all events in order
 *   replayState([logPath])                 — derive materialized state from events
 *   recordDecision(params, [logPath])      — convenience: append a decision event
 *   EVENT_TYPES                            — string constants for all event types
 *   EVENT_LOG_PATH                         — default path (.orbit/state/EVENT-LOG.jsonl)
 *
 * Part of v2.9.0 Wave 0.5 (#213)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EVENT_LOG_PATH = path.join(ROOT, '.orbit', 'state', 'EVENT-LOG.jsonl');

/**
 * Typed event constants.
 * Use these instead of raw strings to prevent typos and enable grep-ability.
 */
const EVENT_TYPES = {
  PHASE_TRANSITION: 'phase_transition',
  TASK_COMPLETE: 'task_complete',
  TASK_OPEN: 'task_open',
  BLOCKER_ADDED: 'blocker_added',
  BLOCKER_RESOLVED: 'blocker_resolved',
  DECISION: 'decision',
  MILESTONE_START: 'milestone_start',
  MILESTONE_COMPLETE: 'milestone_complete',
  SNAPSHOT: 'snapshot',
};

/**
 * Append a typed event to EVENT-LOG.jsonl.
 * Automatically injects `ts` (ISO timestamp) if not provided by caller.
 *
 * @param {object} event - Event payload. Must include a `type` field.
 * @param {string} [logPath] - Override log path (for tests).
 * @returns {object} The stored event entry (with timestamp).
 * @throws {Error} If event or event.type is missing.
 */
function appendEvent(event, logPath = EVENT_LOG_PATH) {
  if (!event || !event.type) {
    throw new Error('appendEvent: event.type is required');
  }
  const entry = { ts: new Date().toISOString(), ...event };
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}

/**
 * Read all events from EVENT-LOG.jsonl in emission order.
 *
 * @param {string} [logPath] - Override log path (for tests).
 * @returns {object[]} Array of parsed event objects.
 * @throws {Error} If a line contains invalid JSON (data corruption guard).
 */
function readEvents(logPath = EVENT_LOG_PATH) {
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`EVENT-LOG.jsonl: invalid JSON on line ${i + 1}: ${line}`);
      }
    });
}

/**
 * Derive the current materialized state by replaying all events from the log.
 *
 * Only the sections that change over time are derived here:
 *   - currentFocus     — from the latest `phase_transition` event
 *   - recentlyCompleted — last 5 `task_complete` events (ordered)
 *   - openBlockers     — `blocker_added` events without a matching `blocker_resolved`
 *   - activeMilestone  — from `milestone_start` / `milestone_complete` events
 *
 * Static STATE.md sections (Vision, Project Context, Phase Status table) are
 * hand-authored and not modified by replay — they represent human-curated context.
 *
 * @param {string} [logPath] - Override log path (for tests).
 * @returns {{ currentFocus: string|null, recentlyCompleted: object[], openBlockers: object[], activeMilestone: string|null }}
 */
function replayState(logPath = EVENT_LOG_PATH) {
  const events = readEvents(logPath);
  const state = {
    currentFocus: null,
    recentlyCompleted: [],
    openBlockers: [],
    activeMilestone: null,
  };

  for (const evt of events) {
    switch (evt.type) {
      case EVENT_TYPES.PHASE_TRANSITION:
        if (evt.to) state.currentFocus = evt.to;
        break;

      case EVENT_TYPES.TASK_COMPLETE:
        state.recentlyCompleted.push(evt);
        break;

      case EVENT_TYPES.BLOCKER_ADDED:
        if (evt.id) state.openBlockers.push(evt);
        break;

      case EVENT_TYPES.BLOCKER_RESOLVED:
        if (evt.id) {
          state.openBlockers = state.openBlockers.filter((b) => b.id !== evt.id);
        }
        break;

      case EVENT_TYPES.MILESTONE_START:
        if (evt.milestone) state.activeMilestone = evt.milestone;
        break;

      case EVENT_TYPES.MILESTONE_COMPLETE:
        state.activeMilestone = null;
        break;
    }
  }

  // Keep only the last 5 completed tasks (same window as STATE.md human convention)
  state.recentlyCompleted = state.recentlyCompleted.slice(-5);
  return state;
}

/**
 * Convenience: record an architectural decision as a typed event.
 *
 * @param {{ decision: string, rationale: string, version?: string, wave?: string, actor?: string }} params
 * @param {string} [logPath] - Override log path (for tests).
 * @returns {object} The stored event entry.
 */
function recordDecision({ decision, rationale, version, wave, actor }, logPath = EVENT_LOG_PATH) {
  return appendEvent(
    {
      type: EVENT_TYPES.DECISION,
      decision,
      rationale,
      version,
      wave,
      actor: actor || 'Orbit',
    },
    logPath
  );
}

module.exports = {
  appendEvent,
  readEvents,
  replayState,
  recordDecision,
  EVENT_TYPES,
  EVENT_LOG_PATH,
};
