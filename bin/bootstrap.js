#!/usr/bin/env node
/**
 * bin/bootstrap.js — Orbit bootstrap
 * Initialises context.db from the repo's current state on first clone or re-init.
 *
 * Resolution order (first match wins for each fact):
 *   1. package.json     → name, version, description
 *   2. CHANGELOG.md     → milestone history, last shipped version (## [X.Y.Z] format)
 *   3. README.md        → project vision (first paragraph or ## About / ## Overview)
 *   4. git log -30      → recent commit count
 *   5. gh issue list    → populate tasks table (skip if gh unavailable)
 *   6. STATE.md / DECISIONS-LOG.md → decision history + active phase migration
 *   7. Defaults         → vision="new project", milestone="v1.0.0", phase=1
 *
 * Usage:
 *   node bin/bootstrap.js           # bootstrap from repo state
 *   node bin/bootstrap.js --force   # overwrite existing context.db without prompt
 *
 * Part of v2.9.0 (#101)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openDb, DB_PATH, ROOT_DIR } = require('./db');
const {
  DECISIONS_LOG_PATH,
  parseDecisionLogFile,
  parseStateDecisionTable,
} = require('./decision-log');

const ROOT = ROOT_DIR;
const STATE_PATH = path.join(ROOT, '.orbit', 'state', 'STATE.md');
const ARGS = process.argv.slice(2);
const FORCE = ARGS.includes('--force');
const REPLAY = ARGS.includes('--replay');

const { replayState, EVENT_LOG_PATH } = require('./event-log');

// ── Colour helpers ─────────────────────────────────────────────────────────────
const G = '\x1b[0;32m';
const Y = '\x1b[1;33m';
const N = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';

function log(symbol, label, value, source) {
  const src = source ? ` ${D}(from ${source})${N}` : '';
  console.log(`  ${symbol} ${label.padEnd(12)} → ${value}${src}`);
}

// ── Source readers ─────────────────────────────────────────────────────────────

function readPackageJson() {
  const p = path.join(ROOT, 'package.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function readChangelog() {
  const p = path.join(ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function readReadme() {
  const p = path.join(ROOT, 'README.md');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function extractVision(readme) {
  if (!readme) return null;

  // Try ## About or ## Overview section first
  const sectionMatch = readme.match(
    /^## (?:About|Overview)\s*\n+([\s\S]+?)(?=\n##|\n---|\n\n\n|$)/m
  );
  if (sectionMatch) return sectionMatch[1].trim().split('\n')[0].trim();

  // Fall back to first non-heading, non-empty paragraph
  const lines = readme.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('!') && // images
      !trimmed.startsWith('<') && // HTML
      !trimmed.startsWith('[') && // badges
      !trimmed.startsWith('>') && // blockquotes
      trimmed.length > 20
    ) {
      return trimmed.slice(0, 120) + (trimmed.length > 120 ? '…' : '');
    }
  }
  return null;
}

function extractMilestoneFromChangelog(changelog) {
  if (!changelog) return null;
  const match = changelog.match(/^## \[([^\]]+)\](?:\s*[-—]\s*(.+))?/m);
  if (!match) return null;
  const version = match[1];
  const title = match[2] ? match[2].trim() : '';
  return title ? `${version} — ${title}` : version;
}

function runGitLog() {
  try {
    const out = execFileSync('git', ['log', '--oneline', '-30'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function runGhIssueList() {
  try {
    const out = execFileSync(
      'gh',
      ['issue', 'list', '--limit', '50', '--state', 'open', '--json', 'number,title,labels'],
      { cwd: ROOT, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return JSON.parse(out);
  } catch {
    return null; // gh not available or not authenticated — skip gracefully
  }
}

// ── Bootstrap main ────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log(`${B}  Orbit Bootstrap${N}`);
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log('');

  // Check if context.db already exists
  if (fs.existsSync(DB_PATH) && !FORCE) {
    console.log(`${Y}⚠  context.db already exists at .orbit/context.db${N}`);
    console.log('   Use --force to overwrite: node bin/bootstrap.js --force');
    console.log('');
    process.exit(0);
  }

  const upsertResults = {};
  const db = openDb(DB_PATH);
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())'
  );

  // 1. package.json
  const pkg = readPackageJson();
  if (pkg) {
    if (pkg.version) {
      upsert.run('version', pkg.version);
      upsertResults.version = { value: pkg.version, source: 'package.json' };
    }
    if (pkg.name) {
      upsert.run('name', pkg.name);
    }
    if (pkg.description) {
      upsert.run('vision', pkg.description);
      upsertResults.vision = {
        value: pkg.description.slice(0, 60) + '…',
        source: 'package.json description',
      };
    }
  }

  // 2. CHANGELOG.md — milestone
  const changelog = readChangelog();
  const milestone = extractMilestoneFromChangelog(changelog);
  if (milestone) {
    upsert.run('milestone', milestone);
    upsertResults.milestone = { value: milestone, source: 'CHANGELOG.md' };
  }

  // 3. README.md — vision (overrides package.json description if richer)
  const readme = readReadme();
  const vision = extractVision(readme);
  if (vision) {
    upsert.run('vision', vision);
    upsertResults.vision = {
      value: vision.slice(0, 60) + (vision.length > 60 ? '…' : ''),
      source: 'README.md',
    };
  }

  // 4. git log — commit count only (no raw log stored; no consumer for it)
  const gitLog = runGitLog();
  if (gitLog) {
    const commitCount = gitLog.split('\n').filter(Boolean).length;
    upsert.run('git_commit_count', String(commitCount));
    upsertResults.git = {
      value: `${commitCount} recent commits`,
      source: 'git log',
    };
  }

  // 5. gh issue list — populate tasks
  let issueCount = 0;
  const issues = runGhIssueList();
  if (issues) {
    const insertTask = db.prepare('INSERT INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)');
    const updateTask = db.prepare(
      'UPDATE tasks SET issue_ref = ?, title = ?, status = ? WHERE id = ?'
    );
    const existingTaskByIssue = db.prepare('SELECT id FROM tasks WHERE issue_ref = ?');
    const existingTaskByTitle = db.prepare('SELECT id FROM tasks WHERE title = ?');
    for (const issue of issues) {
      const issueRef = `#${issue.number}`;
      const existingTask =
        existingTaskByIssue.get(issueRef) || existingTaskByTitle.get(issue.title);
      if (existingTask) {
        updateTask.run(issueRef, issue.title, 'open', existingTask.id);
      } else {
        insertTask.run(issueRef, issue.title, 'open');
      }
      issueCount++;
    }
    upsertResults.issues = { value: `${issueCount} open issues`, source: 'gh issue list' };
  }

  // 6. STATE.md / DECISIONS-LOG.md — migrate decisions + active phase if exists
  let migratedDecisions = 0;
  if (fs.existsSync(STATE_PATH) || fs.existsSync(DECISIONS_LOG_PATH)) {
    const text = fs.existsSync(STATE_PATH) ? fs.readFileSync(STATE_PATH, 'utf8') : '';

    const decisionEntries = parseDecisionLogFile(DECISIONS_LOG_PATH);
    const fallbackEntries = decisionEntries.length === 0 ? parseStateDecisionTable(text) : [];
    const insertDecision = db.prepare(
      `INSERT INTO decisions
        (date, version, decision, rationale, phase, made_by, context, supersedes, still_valid, invalidated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const entry of [...decisionEntries, ...fallbackEntries]) {
      const existing = db
        .prepare('SELECT id FROM decisions WHERE date = ? AND decision = ?')
        .get(entry.made_at, entry.decision);
      if (!existing) {
        insertDecision.run(
          entry.made_at,
          entry.version || null,
          entry.decision,
          entry.rationale,
          entry.phase || null,
          entry.made_by || null,
          entry.context || null,
          JSON.stringify(entry.supersedes || []),
          entry.still_valid === false ? 0 : 1,
          entry.invalidated_at || null
        );
        migratedDecisions++;
      }
    }

    // Active phase
    const phaseMatch = text.match(/\*\*Active Phase\*\*:\s*(.+)/);
    if (phaseMatch) {
      upsert.run('phase', phaseMatch[1].trim());
    }

    upsertResults.decisions = {
      value: `${migratedDecisions} entries`,
      source: fs.existsSync(DECISIONS_LOG_PATH) ? 'DECISIONS-LOG.md' : 'STATE.md',
    };
  }

  db.close();

  // ── Print summary ─────────────────────────────────────────────────────────
  const symOk = `${G}✓${N}`;
  const symSkip = `${Y}—${N}`;

  log(
    upsertResults.version ? symOk : symSkip,
    'version',
    upsertResults.version?.value || '(not found)',
    upsertResults.version?.source
  );
  log(
    upsertResults.vision ? symOk : symSkip,
    'vision',
    upsertResults.vision?.value || '(not found)',
    upsertResults.vision?.source
  );
  log(
    upsertResults.milestone ? symOk : symSkip,
    'milestone',
    upsertResults.milestone?.value || '(not found)',
    upsertResults.milestone?.source
  );
  log(
    upsertResults.git ? symOk : symSkip,
    'git',
    upsertResults.git?.value || '(skipped)',
    upsertResults.git?.source
  );
  if (upsertResults.issues) {
    log(symOk, 'tasks', upsertResults.issues.value, upsertResults.issues.source);
  } else {
    log(symSkip, 'tasks', '(gh CLI unavailable — skipped)', '');
  }
  if (upsertResults.decisions) {
    log(symOk, 'decisions', upsertResults.decisions.value, upsertResults.decisions.source);
  }

  const dbRel = DB_PATH.replace(ROOT + '/', '');
  log(symOk, 'context.db', `written to ${dbRel}`, '');
  console.log('');
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log(`${G}  Ready.${N} Run: node bin/context.js --load minimal`);
  console.log('');
}

// ── Replay mode ───────────────────────────────────────────────────────────────

/**
 * Rebuild the dynamic sections of STATE.md from EVENT-LOG.jsonl.
 *
 * Sections patched:
 *   - **Current Focus**: line in ## Project Context
 *   - ## Recently Completed (last 5 tasks) code block
 *   - ## Blockers code block
 *
 * Static sections (Vision, Phase Status table, Seeds, Todos) are left
 * untouched — they are human-curated and not derivable from events alone.
 *
 * Usage:
 *   node bin/bootstrap.js --replay
 *   node bin/bootstrap.js --replay --dry-run   # print diff without writing
 */
function replay() {
  const DRY_RUN = ARGS.includes('--dry-run');

  console.log('');
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log(`${B}  Orbit Bootstrap — Replay Mode${N}`);
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log('');

  if (!fs.existsSync(EVENT_LOG_PATH)) {
    console.log(`${Y}⚠  No EVENT-LOG.jsonl found at ${EVENT_LOG_PATH.replace(ROOT + '/', '')}${N}`);
    console.log('   Run events through the orchestrator or seed the log first.');
    console.log('');
    process.exit(0);
  }

  let derived;
  try {
    derived = replayState();
  } catch (err) {
    console.error(`${Y}✗  Failed to replay events: ${err.message}${N}`);
    process.exit(1);
  }

  const eventCount = require('./event-log').readEvents().length;
  console.log(`  Replayed ${eventCount} event(s) from EVENT-LOG.jsonl`);

  if (!fs.existsSync(STATE_PATH)) {
    console.log(`${Y}⚠  STATE.md not found — nothing to patch${N}`);
    process.exit(0);
  }

  let text = fs.readFileSync(STATE_PATH, 'utf8');
  let changed = false;

  // 1. Patch **Current Focus**: line
  if (derived.currentFocus) {
    const focusRx = /(\*\*Current Focus\*\*:\s*)(.+)/;
    const updated = text.replace(focusRx, (_, prefix) => `${prefix}${derived.currentFocus}`);
    if (updated !== text) {
      log(
        `${G}✓${N}`,
        'focus',
        `→ ${derived.currentFocus}`,
        'phase_transition events'
      );
      text = updated;
      changed = true;
    }
  }

  // 2. Patch ## Recently Completed block
  if (derived.recentlyCompleted.length > 0) {
    const completedLines = derived.recentlyCompleted
      .map((evt) => {
        const issuePart = evt.issue ? `${evt.issue} ` : '';
        return `✅ ${issuePart}${evt.title || evt.note || evt.type}`;
      })
      .join('\n');

    const recentRx =
      /(## Recently Completed \(last 5 tasks\)\s*\n```text\s*\n)([\s\S]*?)(\n```)/;
    const updated = text.replace(recentRx, (_, open, _old, close) => {
      return `${open}${completedLines}${close}`;
    });
    if (updated !== text) {
      log(
        `${G}✓${N}`,
        'completed',
        `${derived.recentlyCompleted.length} task(s) patched`,
        'task_complete events'
      );
      text = updated;
      changed = true;
    }
  }

  // 3. Patch ## Blockers block
  if (derived.openBlockers.length > 0 || derived.openBlockers.length === 0) {
    const blockerLines =
      derived.openBlockers.length > 0
        ? derived.openBlockers.map((b) => `[OPEN] ${b.id} — ${b.note || b.description || ''}`).join('\n')
        : '(none)';

    const blockerRx = /(## Blockers\s*\n```text\s*\n)([\s\S]*?)(\n```)/;
    const updated = text.replace(blockerRx, (_, open, _old, close) => {
      return `${open}${blockerLines}${close}`;
    });
    if (updated !== text) {
      log(
        `${G}✓${N}`,
        'blockers',
        `${derived.openBlockers.length} open`,
        'blocker events'
      );
      text = updated;
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  ${Y}—${N} STATE.md already reflects event log — no changes needed`);
  } else if (DRY_RUN) {
    console.log('');
    console.log(`${Y}  [dry-run] Changes computed but NOT written to STATE.md${N}`);
  } else {
    fs.writeFileSync(STATE_PATH, text, 'utf8');
    console.log('');
    console.log(`${G}  STATE.md updated from event log.${N}`);
  }

  console.log('');
  console.log(`${B}───────────────────────────────────────${N}`);
  console.log('');
}

if (REPLAY) {
  replay();
} else {
  main();
}
