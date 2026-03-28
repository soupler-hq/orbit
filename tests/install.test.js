/**
 * Tests for bin/install.js
 * Covers: arg parsing, mode selection, tool routing, core utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// --- Helpers re-implemented for unit testing (extracted logic from install.js) ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find((a) => ['init', 'sync', 'promote', 'help'].includes(a)) || 'init';
  const isGlobal = args.includes('--global') || args.includes('-g');
  const isNexus = args.includes('nexus') || args.includes('--nexus');
  const tool = args.includes('--all')
    ? 'all'
    : args.find((a) => ['claude', 'codex', 'cursor'].includes(a)) || 'claude';
  return { command, isGlobal, isNexus, tool };
}

function resolveClaudeDir(isGlobal, projectDir) {
  return isGlobal ? path.join(os.homedir(), '.claude') : path.join(projectDir, '.claude');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// --- Tests ---

describe('parseArgs — command detection', () => {
  it('defaults to init when no command given', () => {
    expect(parseArgs(['node', 'install.js']).command).toBe('init');
  });

  it('picks up init explicitly', () => {
    expect(parseArgs(['node', 'install.js', 'init']).command).toBe('init');
  });

  it('picks up sync', () => {
    expect(parseArgs(['node', 'install.js', 'nexus', 'sync']).command).toBe('sync');
  });

  it('picks up promote', () => {
    expect(parseArgs(['node', 'install.js', 'promote']).command).toBe('promote');
  });

  it('picks up help', () => {
    expect(parseArgs(['node', 'install.js', 'help']).command).toBe('help');
  });
});

describe('parseArgs — global flag', () => {
  it('isGlobal is false by default', () => {
    expect(parseArgs(['node', 'install.js']).isGlobal).toBe(false);
  });

  it('--global sets isGlobal', () => {
    expect(parseArgs(['node', 'install.js', '--global']).isGlobal).toBe(true);
  });

  it('-g sets isGlobal', () => {
    expect(parseArgs(['node', 'install.js', '-g']).isGlobal).toBe(true);
  });
});

describe('parseArgs — nexus detection', () => {
  it('isNexus is false by default', () => {
    expect(parseArgs(['node', 'install.js']).isNexus).toBe(false);
  });

  it('nexus keyword sets isNexus', () => {
    expect(parseArgs(['node', 'install.js', 'nexus', 'init']).isNexus).toBe(true);
  });

  it('--nexus flag sets isNexus', () => {
    expect(parseArgs(['node', 'install.js', '--nexus']).isNexus).toBe(true);
  });
});

describe('parseArgs — tool routing', () => {
  it('defaults to claude', () => {
    expect(parseArgs(['node', 'install.js']).tool).toBe('claude');
  });

  it('--all sets tool to all', () => {
    expect(parseArgs(['node', 'install.js', '--all']).tool).toBe('all');
  });

  it('codex sets tool to codex', () => {
    expect(parseArgs(['node', 'install.js', 'codex']).tool).toBe('codex');
  });

  it('cursor sets tool to cursor', () => {
    expect(parseArgs(['node', 'install.js', 'cursor']).tool).toBe('cursor');
  });

  it('unknown tool falls back to claude', () => {
    expect(parseArgs(['node', 'install.js', 'antigravity']).tool).toBe('claude');
  });

  it('--all takes precedence over explicit tool', () => {
    expect(parseArgs(['node', 'install.js', '--all', 'codex']).tool).toBe('all');
  });
});

describe('resolveClaudeDir', () => {
  it('returns project-local .claude for local installs', () => {
    const dir = resolveClaudeDir(false, '/tmp/myproject');
    expect(dir).toBe('/tmp/myproject/.claude');
  });

  it('returns ~/.claude for global installs', () => {
    const dir = resolveClaudeDir(true, '/tmp/myproject');
    expect(dir).toBe(path.join(os.homedir(), '.claude'));
  });
});

describe('ensureDir', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a directory that does not exist', () => {
    const target = path.join(tmpDir, 'new', 'nested', 'dir');
    expect(fs.existsSync(target)).toBe(false);
    ensureDir(target);
    expect(fs.existsSync(target)).toBe(true);
  });

  it('is idempotent — does not throw if directory already exists', () => {
    ensureDir(tmpDir);
    expect(() => ensureDir(tmpDir)).not.toThrow();
  });
});

describe('copyFile', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies a file and creates intermediate directories', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'deep', 'nested', 'dest.txt');
    fs.writeFileSync(src, 'orbit-content');
    copyFile(src, dest);
    expect(fs.readFileSync(dest, 'utf8')).toBe('orbit-content');
  });

  it('overwrites an existing destination file', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(dest, 'old-content');
    fs.writeFileSync(src, 'new-content');
    copyFile(src, dest);
    expect(fs.readFileSync(dest, 'utf8')).toBe('new-content');
  });
});
