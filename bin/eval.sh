#!/usr/bin/env bash
# Orbit eval harness
# Lightweight checks that the control plane still covers routing, workflows, portability, and README positioning.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/bin/validate.sh" >/dev/null

required_patterns=(
  "What is Orbit?"
  "### Compatibility"
  "### Architecture"
  "### Flow Diagram"
  "### Component Diagram"
  "## Complex Scenario: Secure Feature Delivery"
  "## Why Use This Framework"
  "### With Orbit"
  "### Without Orbit"
  "## Sample Eval Set"
)

for pattern in "${required_patterns[@]}"; do
  if ! grep -q "$pattern" "$ROOT_DIR/README.md"; then
    printf 'README missing required section: %s\n' "$pattern" >&2
    exit 1
  fi
done

if grep -q "Comparison with Similar Projects" "$ROOT_DIR/README.md"; then
  printf 'README still contains comparison table section\n' >&2
  exit 1
fi

if ! grep -q "# Sample Eval Dataset" "$ROOT_DIR/docs/eval-dataset.md"; then
  printf 'missing eval dataset\n' >&2
  exit 1
fi

printf 'Orbit evals passed.\n'
