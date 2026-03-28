import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      // Only measure coverage on modules that export testable APIs.
      // CLI entry-points (install.js, safety-evaluator.js, extract-changelog.js)
      // have inline side-effects on import and require refactoring before they
      // can be measured. Tracked in sprint-3 issue #13.
      include: ['bin/orchestrator.js'],
      reporter: ['text', 'lcov'],
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
  },
});
