/**
 * Tests for bin/extract-changelog.js logic
 * We test the extraction algorithm directly (not the CLI wrapper).
 */
import { describe, it, expect } from 'vitest';

// ─── Pure extraction logic (mirrors bin/extract-changelog.js) ──────────────

function extractVersion(changelog, version) {
  const cleanVersion = version.replace(/^v/, '');
  const lines = changelog.split('\n');
  const versionHeaderRegex = /^##\s+\[?([\d.]+)\]?/;
  const releaseNotes = [];
  let foundVersion = false;

  for (const line of lines) {
    const match = line.match(versionHeaderRegex);
    if (match) {
      if (match[1] === cleanVersion) {
        foundVersion = true;
        continue;
      } else if (foundVersion) {
        break;
      }
    }
    if (foundVersion) releaseNotes.push(line);
  }

  return { found: foundVersion, notes: releaseNotes.join('\n').trim() };
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const SAMPLE_CHANGELOG = `# Changelog

## [2.4.0]
### Added
- Branch protection hardening
- CODEOWNERS enforcement

## [2.3.0]
### Added
- Nexus multi-repo orchestration

## [2.0.0]
### Changed
- Major rewrite
`;

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('extractVersion', () => {
  it('extracts notes for a specific version', () => {
    const { found, notes } = extractVersion(SAMPLE_CHANGELOG, '2.4.0');
    expect(found).toBe(true);
    expect(notes).toContain('Branch protection hardening');
    expect(notes).toContain('CODEOWNERS enforcement');
  });

  it('does not include notes from the next version', () => {
    const { notes } = extractVersion(SAMPLE_CHANGELOG, '2.4.0');
    expect(notes).not.toContain('Nexus multi-repo');
  });

  it('handles v-prefix in version string', () => {
    const { found } = extractVersion(SAMPLE_CHANGELOG, 'v2.3.0');
    expect(found).toBe(true);
  });

  it('returns found=false for a version not in the changelog', () => {
    const { found } = extractVersion(SAMPLE_CHANGELOG, '9.9.9');
    expect(found).toBe(false);
  });

  it('returns empty notes for a version with no content before the next header', () => {
    const sparse = `## [1.0.0]\n## [0.9.0]\nOld stuff`;
    const { found, notes } = extractVersion(sparse, '1.0.0');
    expect(found).toBe(true);
    expect(notes).toBe('');
  });

  it('extracts the last version with no following header', () => {
    const { found, notes } = extractVersion(SAMPLE_CHANGELOG, '2.0.0');
    expect(found).toBe(true);
    expect(notes).toContain('Major rewrite');
  });

  it('supports bracket-less version headers', () => {
    const changelog = `## 1.5.0\n### Fixed\n- Bug squashed\n\n## 1.4.0\n- Old`;
    const { found, notes } = extractVersion(changelog, '1.5.0');
    expect(found).toBe(true);
    expect(notes).toContain('Bug squashed');
  });
});
