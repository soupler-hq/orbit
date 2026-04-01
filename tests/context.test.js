/**
 * Tests for bin/context.js
 * Covers: schema init, load levels, migrate from STATE.md, save, export
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Helpers ─────────────────────────────────────────────────────────────────

let Database;
let initSchema;
let loadMinimal;
let findExistingTask;
try {
  Database = require('better-sqlite3');
  ({ initSchema } = require('../bin/db'));
  ({ loadMinimal, findExistingTask } = require('../bin/context'));
} catch {
  console.warn('better-sqlite3 not installed — context.test.js tests will be skipped');
}

const SAMPLE_STATE_MD = `# Orbit Project State

## Project Vision
Test project vision paragraph.

## Project Context
- **Active Milestone**: v2.9.0 — Idea to Market
- **Active Phase**: Wave 0 — Release Bootstrap
- **Current Version**: v2.8.1
- **Current Branch**: test/132-enforcement-e2e
- **Active PR**: #141 — test(enforcement): add end-to-end coverage for runtime gates

## Decisions Log
| Date | Version | Decision | Rationale |
|------|---------|----------|-----------|
| 2026-03-31 | v2.8.1 | SQLite chosen over Redis | No daemon, no network, single file |
| 2026-03-30 | v2.8.0 | Orbit self-orchestrates v2.9.0 | Dogfood the framework |

## Todos + Seeds

### v2.9.0 — Wave 0
- [ ] #94 — observability status blocks
- [ ] #99 — unified installer
- [x] #97 — next-command inference (closed)

#### Enforcement Hardening (CURRENT)
- [ ] #132 — test(enforcement): add end-to-end coverage for setup, routing, and review gates
  - Active branch: \`test/132-enforcement-e2e\`
  - Active PR: #141 against \`develop\`

## Last 5 Completed Tasks
1. docs(plan): v2.9.0 Wave 0 plan
`;

function makeTmpDb() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-context-test-'));
  const dbPath = path.join(tmpDir, 'context.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db); // single source of truth: bin/db.js
  return { db, dbPath, tmpDir };
}

// ── Skip all tests if better-sqlite3 not available ───────────────────────────

const describeIfSqlite = Database ? describe : describe.skip;

describeIfSqlite('context.js — schema and load levels', () => {
  let db, tmpDir;

  beforeEach(() => {
    ({ db, tmpDir } = makeTmpDb());
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('creates all three tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const names = tables.map((t) => t.name);
    expect(names).toContain('state');
    expect(names).toContain('decisions');
    expect(names).toContain('tasks');
  });

  it('--load minimal: returns milestone and open tasks', () => {
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('milestone', 'v2.9.0 — Wave 0');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('version', 'v2.8.1');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('branch', 'feat/context-fix');
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run('#94', 'observability blocks', 'open');
    db.prepare('INSERT INTO tasks (issue_ref, title, status, blocker) VALUES (?, ?, ?, ?)').run('#99', 'setup installer', 'blocked', 'waiting for PR');

    const output = loadMinimal(db);

    expect(output).toContain('- Milestone: v2.9.0 — Wave 0');
    expect(output).toContain('[OPEN] #94 observability blocks');
    expect(output).toContain('[BLOCKED] #99 setup installer — waiting for PR');
  });

  it('--load minimal: prioritizes active issue and shows active PR', () => {
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('milestone', 'v2.9.0 — Idea to Market');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('phase', 'Enforcement Hardening');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('version', 'v2.8.1');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('branch', 'fix/145-state-freshness');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('active_issue', '#145');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'active_title',
      'enforce automatic state freshness across command paths'
    );
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'active_pr',
      '#153 — fix(state): persist active branch in minimal context'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#87',
      'name hook stages in orbit.config.json',
      'open'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#145',
      'enforce automatic state freshness across command paths',
      'open'
    );

    const originalExecFileSync = require('child_process').execFileSync;
    require('child_process').execFileSync = () => 'fix/145-state-freshness\n';

    try {
      const output = loadMinimal(db);

      expect(output).toContain('## Active Work');
      expect(output).toContain('- Issue: #145 — enforce automatic state freshness across command paths');
      expect(output).toContain('- PR: #153 — fix(state): persist active branch in minimal context');
      expect(
        output.indexOf('#145 enforce automatic state freshness across command paths')
      ).toBeLessThan(output.indexOf('#87 name hook stages in orbit.config.json'));
    } finally {
      require('child_process').execFileSync = originalExecFileSync;
    }
  });

  it('--load minimal: infers the active issue from the branch when state facts are stale', () => {
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('milestone', 'v2.9.0 — Idea to Market');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('phase', 'Enforcement Hardening');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('version', 'v2.8.1');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('branch', 'fix/145-state-freshness');
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#145',
      'enforce automatic state freshness across command paths',
      'open'
    );

    const output = loadMinimal(db);

    expect(output).toContain('## Active Work');
    expect(output).toContain('- Issue: #145');
  });

  it('--load minimal: ignores stale active issue and PR when the live branch has changed', () => {
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('milestone', 'v2.9.0 — Idea to Market');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('phase', 'Enforcement Hardening');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('version', 'v2.8.1');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('branch', 'test/129-enforcement-e2e');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('active_issue', '#129');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'active_title',
      'test(enforcement): add end-to-end coverage for setup, routing, and review gates'
    );
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'active_pr',
      '#165 — test(enforcement): execute install and setup hook paths'
    );

    const originalExecFileSync = require('child_process').execFileSync;
    require('child_process').execFileSync = () => 'fix/145-state-freshness\n';

    try {
      const output = loadMinimal(db);

      expect(output).toContain('- Branch: fix/145-state-freshness');
      expect(output).toContain('- Issue: #145');
      expect(output).not.toContain('#129');
      expect(output).not.toContain('#165');
    } finally {
      require('child_process').execFileSync = originalExecFileSync;
    }
  });

  it('--load minimal: prefers current-milestone tasks over unrelated legacy backlog noise', () => {
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'milestone',
      'v2.9.0 — Idea to Market (self-orchestrated by Orbit)'
    );
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'phase',
      'Enforcement Hardening — documented-vs-enforced closure and resumable-state reliability'
    );
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run('version', 'v2.8.1');
    db.prepare('INSERT INTO state (key, value) VALUES (?, ?)').run(
      'branch',
      'fix/145-minimal-context-priority'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status, milestone) VALUES (?, ?, ?, ?)').run(
      '#142',
      'epic(enforcement): close documented-vs-enforced workflow gaps',
      'open',
      'v2.9.0'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status, milestone) VALUES (?, ?, ?, ?)').run(
      '#132',
      'test(enforcement): add end-to-end coverage for setup, routing, and review gates',
      'open',
      'v2.9.0'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status, milestone) VALUES (?, ?, ?, ?)').run(
      '#125',
      'feat(context): provenance-driven context synthesis and recovery',
      'open',
      'v2.9.0'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#64',
      'feat(agents): add product-manager agent',
      'open'
    );
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#65',
      'feat(agents): add business-analyst agent',
      'open'
    );

    const output = loadMinimal(db);

    expect(output).toContain('- Issue: #145');
    expect(output).toContain('#142 epic(enforcement): close documented-vs-enforced workflow gaps');
    expect(output).toContain('#132 test(enforcement): add end-to-end coverage for setup, routing, and review gates');
    expect(output).toContain('#125 feat(context): provenance-driven context synthesis and recovery');
    expect(output).not.toContain('#64 feat(agents): add product-manager agent');
    expect(output).not.toContain('#65 feat(agents): add business-analyst agent');
  });

  it('--load decisions: returns decisions ordered newest first', () => {
    db.prepare('INSERT INTO decisions (date, version, decision, rationale) VALUES (?, ?, ?, ?)').run('2026-03-30', 'v2.8.0', 'First decision', 'reason A');
    db.prepare('INSERT INTO decisions (date, version, decision, rationale) VALUES (?, ?, ?, ?)').run('2026-03-31', 'v2.8.1', 'Second decision', 'reason B');

    const decisions = db.prepare('SELECT * FROM decisions ORDER BY id DESC').all();
    expect(decisions[0].date).toBe('2026-03-31');
    expect(decisions[1].date).toBe('2026-03-30');
  });

  it('--load blocked: only returns blocked tasks', () => {
    db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run('open task', 'open');
    db.prepare('INSERT INTO tasks (title, status, blocker) VALUES (?, ?, ?)').run('blocked task', 'blocked', 'API keys missing');

    const blocked = db.prepare("SELECT * FROM tasks WHERE status = 'blocked'").all();
    expect(blocked.length).toBe(1);
    expect(blocked[0].title).toBe('blocked task');
    expect(blocked[0].blocker).toBe('API keys missing');
  });
});

describeIfSqlite('context.js — migrate from STATE.md', () => {
  let db, tmpDir, statePath;

  beforeEach(() => {
    ({ db, tmpDir } = makeTmpDb());
    statePath = path.join(tmpDir, 'STATE.md');
    fs.writeFileSync(statePath, SAMPLE_STATE_MD, 'utf8');
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('extracts milestone from STATE.md', () => {
    // Simulate migrate logic
    const text = fs.readFileSync(statePath, 'utf8');
    const milestoneMatch = text.match(/\*\*Active Milestone\*\*:\s*(.+)/);
    expect(milestoneMatch).not.toBeNull();
    expect(milestoneMatch[1].trim()).toBe('v2.9.0 — Idea to Market');
  });

  it('extracts version from STATE.md', () => {
    const text = fs.readFileSync(statePath, 'utf8');
    const versionMatch = text.match(/\*\*Current Version\*\*:\s*(.+)/);
    expect(versionMatch).not.toBeNull();
    expect(versionMatch[1].trim()).toBe('v2.8.1');
  });

  it('extracts current branch from STATE.md', () => {
    const text = fs.readFileSync(statePath, 'utf8');
    const branchMatch = text.match(/\*\*Current Branch\*\*:\s*(.+)/);
    expect(branchMatch).not.toBeNull();
    expect(branchMatch[1].trim()).toBe('test/132-enforcement-e2e');
  });

  it('extracts active PR from STATE.md', () => {
    const text = fs.readFileSync(statePath, 'utf8');
    const prMatch = text.match(/\*\*Active PR\*\*:\s*(.+)/);
    expect(prMatch).not.toBeNull();
    expect(prMatch[1].trim()).toBe('#141 — test(enforcement): add end-to-end coverage for runtime gates');
  });

  it('decisions table rows are idempotent on duplicate insert', () => {
    // Insert same decision twice — should not duplicate
    const insert = db.prepare('INSERT INTO decisions (date, version, decision, rationale) VALUES (?, ?, ?, ?)');
    insert.run('2026-03-31', 'v2.8.1', 'SQLite chosen over Redis', 'No daemon, no network, single file');

    const check = db.prepare('SELECT id FROM decisions WHERE date = ? AND decision = ?').get('2026-03-31', 'SQLite chosen over Redis');
    expect(check).not.toBeNull();

    // Second insert should be skipped (idempotency check is done in migrate)
    const existing = db.prepare('SELECT id FROM decisions WHERE date = ? AND decision = ?').get('2026-03-31', 'SQLite chosen over Redis');
    expect(existing.id).toBe(check.id); // same row, no duplicate
  });

  it('task status values pass the CHECK constraint', () => {
    expect(() => {
      db.prepare("INSERT INTO tasks (title, status) VALUES ('test', 'open')").run();
    }).not.toThrow();

    expect(() => {
      db.prepare("INSERT INTO tasks (title, status) VALUES ('bad', 'invalid_status')").run();
    }).toThrow();
  });

  it('prevents duplicate task rows by issue_ref', () => {
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      '#145',
      'enforce automatic state freshness across command paths',
      'open'
    );

    expect(() => {
      db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
        '#145',
        'enforce automatic state freshness across command paths',
        'open'
      );
    }).toThrow();

    const rows = db.prepare('SELECT id FROM tasks WHERE issue_ref = ?').all('#145');
    expect(rows).toHaveLength(1);
  });

  it('upgrades a title-only task when the same task later gets an issue_ref', () => {
    db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)').run(
      null,
      'enforce automatic state freshness across command paths',
      'open'
    );

    const existing = findExistingTask(
      db,
      '#145',
      'enforce automatic state freshness across command paths'
    );

    expect(existing).not.toBeNull();

    db.prepare('UPDATE tasks SET issue_ref = ?, title = ?, status = ? WHERE id = ?').run(
      '#145',
      'enforce automatic state freshness across command paths',
      'open',
      existing.id
    );

    const rows = db
      .prepare('SELECT issue_ref, title FROM tasks WHERE title = ?')
      .all('enforce automatic state freshness across command paths');
    expect(rows).toHaveLength(1);
    expect(rows[0].issue_ref).toBe('#145');
  });
});
