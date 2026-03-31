#!/usr/bin/env node
/**
 * bin/bootstrap.js — Orbit bootstrap
 * Initialises context.db from the repo's current state on first clone or re-init.
 *
 * Resolution order (first match wins for each fact):
 *   1. package.json     → name, version, description
 *   2. CHANGELOG.md     → milestone history, last shipped version (## [X.Y.Z] format)
 *   3. README.md        → project vision (first paragraph or ## About / ## Overview)
 *   4. git log -30      → recent work, infer active branch intent
 *   5. gh issue list    → populate tasks table (skip if gh unavailable)
 *   6. STATE.md         → if exists, migrate via context.js --migrate
 *   7. Defaults         → vision="new project", milestone="v1.0.0", phase=1
 *
 * Usage:
 *   node bin/bootstrap.js           # bootstrap from repo state
 *   node bin/bootstrap.js --force   # overwrite existing context.db without prompt
 *
 * Part of v2.9.0 Wave 3 (#101)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, '.orbit', 'context.db');
const STATE_PATH = path.join(ROOT, '.orbit', 'state', 'STATE.md');
const ARGS = process.argv.slice(2);
const FORCE = ARGS.includes('--force');

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

// ── Database setup ────────────────────────────────────────────────────────────

function openDb() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    console.error(
      'ERROR: better-sqlite3 not installed.\n' +
        '  Run: npm install better-sqlite3\n' +
        '  Then re-run: node bin/bootstrap.js'
    );
    process.exit(1);
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS state (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL, version TEXT,
      decision TEXT NOT NULL, rationale TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_ref TEXT, title TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open','in_progress','complete','blocked')),
      milestone TEXT, wave INTEGER, blocker TEXT
    );
  `);
  return db;
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

  // Try ## About or ## Overview section
  const sectionMatch = readme.match(
    /^## (?:About|Overview)\s*\n+([\s\S]+?)(?=\n##|\n---|\n\n\n|$)/m
  );
  if (sectionMatch) return sectionMatch[1].trim().split('\n')[0].trim();

  // Fall back to first non-heading, non-empty paragraph after any badges/shields
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
  // Look for ## [X.Y.Z] — title or ## [Unreleased]
  const match = changelog.match(/^## \[([^\]]+)\](?:\s*[-—]\s*(.+))?/m);
  if (!match) return null;
  const version = match[1];
  const title = match[2] ? match[2].trim() : '';
  return title ? `${version} — ${title}` : version;
}

function runGitLog() {
  try {
    return execSync('git log --oneline -30 2>/dev/null', { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return null;
  }
}

function runGhIssueList() {
  try {
    const output = execSync(
      'gh issue list --limit 50 --state open --json number,title,labels 2>/dev/null',
      { cwd: ROOT, encoding: 'utf8', timeout: 10000 }
    );
    return JSON.parse(output);
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
  const db = openDb();
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
    if (pkg.description && !upsertResults.vision) {
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

  // 4. git log — recent work
  const gitLog = runGitLog();
  if (gitLog) {
    upsert.run('git_log_snapshot', gitLog.slice(0, 2000));
    upsertResults.git = {
      value: `${gitLog.split('\n').filter(Boolean).length} commits`,
      source: 'git log',
    };
  }

  // 5. gh issue list — populate tasks
  let issueCount = 0;
  const issues = runGhIssueList();
  if (issues) {
    const insertTask = db.prepare(
      'INSERT OR IGNORE INTO tasks (issue_ref, title, status) VALUES (?, ?, ?)'
    );
    for (const issue of issues) {
      insertTask.run(`#${issue.number}`, issue.title, 'open');
      issueCount++;
    }
    upsertResults.issues = { value: `${issueCount} open issues`, source: 'gh issue list' };
  }

  // 6. STATE.md — migrate if exists
  let migratedDecisions = 0;
  if (fs.existsSync(STATE_PATH)) {
    const text = fs.readFileSync(STATE_PATH, 'utf8');

    // Decisions
    const decisionSection = text.match(/## Decisions Log\n([\s\S]*?)(?=\n##|$)/);
    if (decisionSection) {
      const insertDecision = db.prepare(
        'INSERT INTO decisions (date, version, decision, rationale) VALUES (?, ?, ?, ?)'
      );
      const rows = decisionSection[1]
        .split('\n')
        .filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('Date'));
      for (const row of rows) {
        const cols = row
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        if (cols.length >= 4) {
          const existing = db
            .prepare('SELECT id FROM decisions WHERE date = ? AND decision = ?')
            .get(cols[0], cols[2]);
          if (!existing) {
            insertDecision.run(cols[0], cols[1] || null, cols[2], cols[3]);
            migratedDecisions++;
          }
        }
      }
    }

    // Phase from STATE.md
    const phaseMatch = text.match(/\*\*Active Phase\*\*:\s*(.+)/);
    if (phaseMatch) {
      upsert.run('phase', phaseMatch[1].trim());
    }

    upsertResults.decisions = { value: `${migratedDecisions} entries`, source: 'STATE.md' };
  }

  db.close();

  // Print summary
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
    upsertResults.git?.value || '(not found)',
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

main();
