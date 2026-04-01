#!/usr/bin/env node
/**
 * bin/context.js — Orbit context.db CLI
 * Partial-load structured project state from SQLite; replaces full STATE.md reads.
 *
 * Usage:
 *   node bin/context.js --load minimal     (~300 tokens: milestone + open tasks)
 *   node bin/context.js --load standard    (~1.5k tokens: + last 10 decisions)
 *   node bin/context.js --load full        (~3k tokens: all tables)
 *   node bin/context.js --load decisions   decisions log only
 *   node bin/context.js --load blocked     blocked tasks only
 *   node bin/context.js --save             write current STATE.md deltas to context.db
 *   node bin/context.js --migrate          parse STATE.md → populate context.db (idempotent)
 *   node bin/context.js --export           generate STATE.md from context.db (stdout)
 *
 * Requires: better-sqlite3 (npm install better-sqlite3)
 * Falls back with a clear error if better-sqlite3 is not installed.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { openDb, DB_PATH } = require('./db');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, '.orbit', 'state', 'STATE.md');
const ARGS = process.argv.slice(2);

function currentGitBranch() {
  try {
    const branch = require('child_process')
      .execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
    return branch === 'HEAD' ? null : branch;
  } catch {
    return null;
  }
}

function findExistingTask(db, issueRef, title) {
  if (issueRef) {
    return (
      db.prepare('SELECT id FROM tasks WHERE issue_ref = ?').get(issueRef) ||
      db.prepare('SELECT id FROM tasks WHERE title = ?').get(title)
    );
  }
  return db.prepare('SELECT id FROM tasks WHERE issue_ref IS NULL AND title = ?').get(title);
}

function normalizeStateValue(value) {
  return String(value || '')
    .replace(/^`|`$/g, '')
    .trim();
}

function issueRefFromBranch(branch) {
  const match = String(branch || '').match(/\/(\d+)(?:-|$)/);
  return match ? `#${match[1]}` : '';
}

function milestonePrefix(value) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(v[0-9]+(?:\.[0-9]+){1,2})\b/i);
  return match ? match[1] : normalized;
}

function selectMinimalTasks(db, { activeIssue, activeMilestone }) {
  const baseOrder = `
    ORDER BY
      CASE WHEN issue_ref = ? THEN 0 ELSE 1 END,
      CASE status
        WHEN 'in_progress' THEN 0
        WHEN 'blocked' THEN 1
        ELSE 2
      END,
      id DESC
    LIMIT 10
  `;

  if (activeMilestone) {
    const milestoneTasks = db
      .prepare(
        `SELECT issue_ref, title, status, blocker, milestone
         FROM tasks
         WHERE status IN ('open','blocked','in_progress')
           AND milestone LIKE ?
         ${baseOrder}`
      )
      .all(`${activeMilestone}%`, activeIssue);

    if (milestoneTasks.length > 0) {
      return milestoneTasks;
    }
  }

  return db
    .prepare(
      `SELECT issue_ref, title, status, blocker, milestone
       FROM tasks
       WHERE status IN ('open','blocked','in_progress')
       ${baseOrder}`
    )
    .all(activeIssue);
}

function parseActiveIssueFromState(text, branch) {
  const lines = String(text || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const taskMatch = lines[index].match(/^- \[[ x]\] (#[0-9]+)\s+[—-]\s+(.+)$/);
    if (!taskMatch) continue;

    const issueRef = taskMatch[1];
    const title = taskMatch[2].trim();
    let activeBranch = '';

    for (let offset = index + 1; offset < lines.length; offset += 1) {
      const line = lines[offset];
      if (/^- \[[ x]\] /.test(line) || /^### /.test(line) || /^## /.test(line)) break;
      const branchMatch = line.match(/^\s*-\s+Active branch:\s+`?([^`]+?)`?\s*$/);
      if (branchMatch) {
        activeBranch = branchMatch[1].trim();
      }
    }

    if (branch && activeBranch === branch) {
      return { issueRef, title };
    }
  }

  return null;
}

// ── Load levels ───────────────────────────────────────────────────────────────

function loadMinimal(db) {
  const facts = db.prepare('SELECT key, value FROM state').all();
  const factMap = Object.fromEntries(facts.map((r) => [r.key, r.value]));
  const liveBranch = currentGitBranch();
  const branch = liveBranch || factMap.branch || '(not set)';
  const branchMatchesState = !liveBranch || !factMap.branch || liveBranch === factMap.branch;
  const activeIssue = branchMatchesState
    ? factMap.active_issue || issueRefFromBranch(branch)
    : issueRefFromBranch(branch);
  const activeTitle = branchMatchesState ? factMap.active_title || '' : '';
  const activePr = branchMatchesState ? factMap.active_pr || '' : '';
  const activeMilestone = milestonePrefix(factMap.milestone || '');
  const tasks = selectMinimalTasks(db, { activeIssue, activeMilestone });

  const lines = [
    '## Project Context (minimal)',
    `- Milestone: ${factMap.milestone || '(not set)'}`,
    `- Phase: ${factMap.phase || '(not set)'}`,
    `- Version: ${factMap.version || '(not set)'}`,
    `- Branch: ${branch}`,
  ];

  if (activeIssue || activePr) {
    lines.push('', '## Active Work');
    if (activeIssue) {
      lines.push(`- Issue: ${activeIssue}${activeTitle ? ` — ${activeTitle}` : ''}`);
    }
    if (activePr) {
      lines.push(`- PR: ${activePr}`);
    }
  }

  lines.push('', '## Open / In-Progress / Blocked Tasks');

  if (tasks.length === 0) {
    lines.push('_(none)_');
  } else {
    for (const t of tasks) {
      const ref = t.issue_ref ? `${t.issue_ref} ` : '';
      lines.push(
        `- [${t.status.toUpperCase()}] ${ref}${t.title}${t.blocker ? ` — ${t.blocker}` : ''}`
      );
    }
  }

  return lines.join('\n');
}

function loadStandard(db) {
  const minimal = loadMinimal(db);
  const decisions = db
    .prepare('SELECT date, version, decision, rationale FROM decisions ORDER BY id DESC LIMIT 10')
    .all();

  const lines = [minimal, '', '## Recent Decisions (last 10)'];
  if (decisions.length === 0) {
    lines.push('_(none)_');
  } else {
    for (const d of decisions) {
      lines.push(`- ${d.date} [${d.version || '—'}] ${d.decision}`);
      lines.push(`  > ${d.rationale}`);
    }
  }

  return lines.join('\n');
}

function loadFull(db) {
  const standard = loadStandard(db);
  const allTasks = db
    .prepare('SELECT issue_ref, title, status, milestone, wave, blocker FROM tasks ORDER BY id')
    .all();

  const lines = [standard, '', '## All Tasks'];
  if (allTasks.length === 0) {
    lines.push('_(none)_');
  } else {
    for (const t of allTasks) {
      const ref = t.issue_ref ? `${t.issue_ref} ` : '';
      const wave = t.wave !== null ? ` [wave ${t.wave}]` : '';
      const blocker = t.blocker ? ` — BLOCKED: ${t.blocker}` : '';
      lines.push(`- [${t.status}] ${ref}${t.title}${wave}${blocker}`);
    }
  }

  return lines.join('\n');
}

function loadDecisions(db) {
  const decisions = db
    .prepare('SELECT date, version, decision, rationale FROM decisions ORDER BY id DESC')
    .all();

  const lines = ['## Decisions Log'];
  if (decisions.length === 0) {
    lines.push('_(none)_');
  } else {
    for (const d of decisions) {
      lines.push(`- ${d.date} [${d.version || '—'}] ${d.decision}`);
      lines.push(`  > ${d.rationale}`);
    }
  }

  return lines.join('\n');
}

function loadBlocked(db) {
  const blocked = db
    .prepare("SELECT issue_ref, title, blocker FROM tasks WHERE status = 'blocked' ORDER BY id")
    .all();

  const lines = ['## Blocked Tasks'];
  if (blocked.length === 0) {
    lines.push('_(none — no blocked tasks)_');
  } else {
    for (const t of blocked) {
      const ref = t.issue_ref ? `${t.issue_ref} ` : '';
      lines.push(`- ${ref}${t.title}`);
      lines.push(`  BLOCKED: ${t.blocker || '(no reason recorded)'}`);
    }
  }

  return lines.join('\n');
}

// ── Migration: STATE.md → context.db ─────────────────────────────────────────

function migrate(db) {
  if (!fs.existsSync(STATE_PATH)) {
    console.error(`ERROR: STATE.md not found at ${STATE_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(STATE_PATH, 'utf8');
  const count = { state: 0, decisions: 0, tasks: 0 };

  // Extract project context fields
  const milestoneMatch = text.match(/\*\*Active Milestone\*\*:\s*(.+)/);
  const phaseMatch = text.match(/\*\*Active Phase\*\*:\s*(.+)/);
  const versionMatch = text.match(/\*\*Current Version\*\*:\s*(.+)/);
  const branchMatch = text.match(/\*\*Current Branch\*\*:\s*(.+)/);
  const activePrMatch = text.match(/\*\*Active PR\*\*:\s*(#[0-9]+.*)/);

  const upsertState = db.prepare(
    'INSERT OR REPLACE INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())'
  );
  const deleteState = db.prepare('DELETE FROM state WHERE key = ?');

  if (milestoneMatch) {
    upsertState.run('milestone', milestoneMatch[1].trim());
    count.state++;
  }
  if (phaseMatch) {
    upsertState.run('phase', phaseMatch[1].trim());
    count.state++;
  }
  if (versionMatch) {
    upsertState.run('version', versionMatch[1].trim());
    count.state++;
  }
  const liveBranch = currentGitBranch();
  const stateBranch = normalizeStateValue(branchMatch?.[1]);
  const branch = liveBranch || stateBranch;
  if (branch) {
    upsertState.run('branch', branch);
    count.state++;
  }
  if (activePrMatch && (!liveBranch || liveBranch === stateBranch)) {
    upsertState.run('active_pr', normalizeStateValue(activePrMatch[1]));
    count.state++;
  } else {
    deleteState.run('active_pr');
  }
  const activeIssue =
    parseActiveIssueFromState(text, branch) ||
    (() => {
      const inferredIssueRef = issueRefFromBranch(branch);
      if (!inferredIssueRef) return null;
      return { issueRef: inferredIssueRef, title: '' };
    })();
  if (activeIssue) {
    upsertState.run('active_issue', activeIssue.issueRef);
    if (activeIssue.title) {
      upsertState.run('active_title', activeIssue.title);
      count.state += 2;
    } else {
      deleteState.run('active_title');
      count.state += 1;
    }
  } else {
    deleteState.run('active_issue');
    deleteState.run('active_title');
  }

  // Parse decisions table (markdown format: | date | version | decision | rationale |)
  const decisionSection = text.match(/## Decisions Log\n([\s\S]*?)(?=\n##|$)/);
  if (decisionSection) {
    const rows = decisionSection[1]
      .split('\n')
      .filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('Date'));
    const insertDecision = db.prepare(
      'INSERT INTO decisions (date, version, decision, rationale) VALUES (?, ?, ?, ?)'
    );
    for (const row of rows) {
      const cols = row
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 4) {
        // Check for duplicate
        const existing = db
          .prepare('SELECT id FROM decisions WHERE date = ? AND decision = ?')
          .get(cols[0], cols[2]);
        if (!existing) {
          insertDecision.run(cols[0], cols[1] || null, cols[2], cols[3]);
          count.decisions++;
        }
      }
    }
  }

  // Parse todos (checkbox lists: - [ ] or - [x])
  const todoSection = text.match(/### v[\d.]+.*?\n([\s\S]*?)(?=\n###|\n## |$)/g);
  if (todoSection) {
    const insertTask = db.prepare(
      'INSERT INTO tasks (issue_ref, title, status, milestone, wave) VALUES (?, ?, ?, ?, ?)'
    );
    const updateTask = db.prepare(
      'UPDATE tasks SET issue_ref = ?, title = ?, status = ?, milestone = ?, wave = ? WHERE id = ?'
    );
    for (const section of todoSection) {
      const lines = section.split('\n');
      const milestoneHeader = lines[0]?.match(/### (v[\d.]+.*?)(?:\s*[-—].*)?$/)?.[1];
      for (const line of lines) {
        const todoMatch = line.match(/^- \[([ x])\] (#\d+)?\s*[-—]?\s*(.+?)(?:\s*\(.*\))?$/);
        if (todoMatch) {
          const done = todoMatch[1] === 'x';
          const issueRef = todoMatch[2] || null;
          const title = todoMatch[3].trim();
          const status = done ? 'complete' : 'open';
          const existing = findExistingTask(db, issueRef, title);
          if (!existing) {
            insertTask.run(issueRef, title, status, milestoneHeader || null, null);
            count.tasks++;
          } else {
            updateTask.run(issueRef, title, status, milestoneHeader || null, null, existing.id);
          }
        }
      }
    }
  }

  console.log(`✓ Migration complete:`);
  console.log(`  state facts:  ${count.state}`);
  console.log(`  decisions:    ${count.decisions}`);
  console.log(`  tasks:        ${count.tasks}`);
  console.log(`  context.db:   ${DB_PATH.replace(ROOT + '/', '')}`);
}

// ── Export: context.db → STATE.md text ───────────────────────────────────────

function exportStateFile(db) {
  const output = loadFull(db);
  const header = [
    '# Orbit Project State',
    '> Generated from context.db by: node bin/context.js --export',
    `> Generated at: ${new Date().toISOString()}`,
    '',
  ].join('\n');
  process.stdout.write(header + output + '\n');
}

// ── Save: write deltas from STATE.md to context.db ───────────────────────────

function save(db) {
  // Re-run migrate (idempotent — won't create duplicates)
  migrate(db);
  console.log('✓ context.db updated from STATE.md');
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const flag = ARGS[0];
  const level = ARGS[1];

  if (!flag) {
    console.error('Usage: node bin/context.js --load <level> | --save | --migrate | --export');
    console.error('Levels: minimal, standard, full, decisions, blocked');
    process.exit(1);
  }

  // --load requires context.db to already exist — it must not silently create an empty one
  if (flag === '--load' && !fs.existsSync(DB_PATH)) {
    console.error('ERROR: context.db not found at .orbit/context.db');
    console.error('  Run: npm run bootstrap  (or: node bin/bootstrap.js)');
    process.exit(1);
  }

  const db = openDb();

  switch (flag) {
    case '--load': {
      let output;
      switch (level) {
        case 'minimal':
          output = loadMinimal(db);
          break;
        case 'standard':
          output = loadStandard(db);
          break;
        case 'full':
          output = loadFull(db);
          break;
        case 'decisions':
          output = loadDecisions(db);
          break;
        case 'blocked':
          output = loadBlocked(db);
          break;
        default:
          console.error(
            `Unknown load level: ${level}. Use: minimal, standard, full, decisions, blocked`
          );
          process.exit(1);
      }
      process.stdout.write(output + '\n');
      break;
    }
    case '--save':
      save(db);
      break;
    case '--migrate':
      migrate(db);
      break;
    case '--export':
      exportStateFile(db);
      break;
    default:
      console.error(`Unknown flag: ${flag}`);
      process.exit(1);
  }

  db.close();
}

if (require.main === module) {
  main();
}

module.exports = {
  loadMinimal,
  loadStandard,
  loadFull,
  loadDecisions,
  loadBlocked,
  migrate,
  save,
  currentGitBranch,
  findExistingTask,
};
