#!/usr/bin/env node
/**
 * bin/db.js — Orbit shared database module
 *
 * Single source of truth for:
 *   - SQLite schema (state, decisions, tasks tables)
 *   - DB connection (openDb)
 *   - Default DB path
 *
 * Both bootstrap.js and context.js import from here.
 * Tests create their own in-memory/temp DBs using the exported initSchema.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '.orbit', 'context.db');

/**
 * Open (or create) the Orbit SQLite database.
 * @param {string} [dbPath] - Override the default DB path. Used in tests.
 * @returns {import('better-sqlite3').Database}
 */
function openDb(dbPath = DB_PATH) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    console.error(
      'ERROR: better-sqlite3 not installed.\n' +
        '  Run: npm install\n' +
        '  Then re-run your command.'
    );
    process.exit(1);
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

/**
 * Create all Orbit tables if they don't exist (idempotent).
 * @param {import('better-sqlite3').Database} db
 */
function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS state (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      version    TEXT,
      decision   TEXT NOT NULL,
      rationale  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_ref  TEXT,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL CHECK(status IN ('open','in_progress','complete','blocked')),
      milestone  TEXT,
      wave       INTEGER,
      blocker    TEXT
    );
  `);
}

module.exports = { openDb, initSchema, DB_PATH };
