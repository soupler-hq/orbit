# Orbit Hooks System
> Automated actions that run before and after key Orbit events

## Overview
Hooks let you add custom automation around Orbit operations — linting before commits, Slack notifications after deploys, context validation before execution, and more.

Hooks run as bash scripts in your project root. Orbit calls them at defined lifecycle points.

---

## Hook Lifecycle Points

```
PreTask    → before any task execution begins
PostTask   → after task completes (receives exit code)
PreCommit  → before git commit (can block)
PostCommit → after git commit succeeds
PreDeploy  → before deployment (can block)
PostDeploy → after deployment completes
PreReview  → before code review starts
PostReview → after review report is generated
PreShip    → before phase ship (can block on CRITICAL findings)
PostShip   → after successful phase ship
OnError    → when any task fails
```

---

## Hook Configuration

Add to `.orbit/hooks.json` in your project:

```json
{
  "hooks": {
    "PreTask": {
      "enabled": true,
      "script": ".orbit/hooks/pre-task.sh",
      "timeout": 30,
      "blocking": true
    },
    "PostCommit": {
      "enabled": true,
      "script": ".orbit/hooks/post-commit.sh",
      "timeout": 10,
      "blocking": false
    },
    "PreDeploy": {
      "enabled": true,
      "script": ".orbit/hooks/pre-deploy.sh",
      "timeout": 120,
      "blocking": true
    },
    "PostDeploy": {
      "enabled": true,
      "script": ".orbit/hooks/post-deploy.sh",
      "timeout": 30,
      "blocking": false
    },
    "OnError": {
      "enabled": true,
      "script": ".orbit/hooks/on-error.sh",
      "timeout": 15,
      "blocking": false
    }
  }
}
```

**`blocking: true`** — if the hook exits non-zero, Orbit stops and reports the failure.
**`blocking: false`** — hook runs but failures are logged, not blocking.

---

## Built-in Hook Templates

### pre-task.sh — Validate context before execution
```bash
#!/usr/bin/env bash
# Runs before any task. Validates environment is ready.

# Check required env vars
required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Missing required env var: $var"
    exit 1
  fi
done

# Check git state is clean (no uncommitted changes outside task scope)
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  Uncommitted changes detected. Stashing before task..."
  git stash push -m "orbit-pre-task-$(date +%s)"
fi

echo "✅ Pre-task validation passed"
exit 0
```

### post-commit.sh — Notify on every commit
```bash
#!/usr/bin/env bash
# Runs after every atomic task commit

COMMIT_MSG=$(git log -1 --pretty=%s)
COMMIT_HASH=$(git rev-parse --short HEAD)
BRANCH=$(git branch --show-current)

# Post to Slack webhook (if configured)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{
      \"text\": \"🔨 Orbit committed: \`${COMMIT_HASH}\` — ${COMMIT_MSG} on \`${BRANCH}\`\"
    }" > /dev/null
fi

# Update context window warning if long session
echo "✅ Commit: ${COMMIT_HASH} — ${COMMIT_MSG}"
exit 0
```

### pre-deploy.sh — Safety gates before deployment
```bash
#!/usr/bin/env bash
# Blocks deployment if safety checks fail

ENVIRONMENT="${1:-staging}"
echo "🔍 Running pre-deploy checks for: $ENVIRONMENT"

# 1. All tests must pass
echo "  Running test suite..."
if ! npm test -- --ci --silent; then
  echo "❌ Tests failing — deployment blocked"
  exit 1
fi
echo "  ✅ Tests passing"

# 2. Security scan
echo "  Running security scan..."
if ! npx audit-ci --moderate; then
  echo "❌ Security vulnerabilities found — deployment blocked"
  exit 1
fi
echo "  ✅ Security scan clean"

# 3. No secrets in code
echo "  Scanning for secrets..."
if grep -r "sk_live_\|password.*=.*['\"].\{8,\}['\"]" --include="*.ts" --include="*.js" src/ 2>/dev/null; then
  echo "❌ Potential secrets found in source code — deployment blocked"
  exit 1
fi
echo "  ✅ No secrets detected"

# 4. Production deploy requires explicit confirmation
if [[ "$ENVIRONMENT" == "production" ]]; then
  echo ""
  echo "⚠️  PRODUCTION DEPLOYMENT"
  echo "  Branch: $(git branch --show-current)"
  echo "  Commit: $(git log -1 --pretty='%h — %s')"
  echo "  Files changed: $(git diff HEAD~1 --name-only | wc -l)"
  echo ""
  read -p "  Type 'deploy' to confirm production deployment: " confirm
  if [[ "$confirm" != "deploy" ]]; then
    echo "❌ Production deployment cancelled"
    exit 1
  fi
fi

echo "✅ Pre-deploy checks passed for $ENVIRONMENT"
exit 0
```

### post-deploy.sh — Verify deployment health
```bash
#!/usr/bin/env bash
# Runs after deployment, verifies service is healthy

ENVIRONMENT="${1:-staging}"
HEALTH_URL="${HEALTH_CHECK_URL:-http://localhost:3000/health}"
MAX_ATTEMPTS=12
SLEEP_SECONDS=5

echo "🏥 Checking deployment health: $HEALTH_URL"

for i in $(seq 1 $MAX_ATTEMPTS); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
  
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "✅ Service healthy after $((i * SLEEP_SECONDS))s"
    
    # Notify on successful production deploy
    if [[ "$ENVIRONMENT" == "production" ]] && [[ -n "$SLACK_WEBHOOK_URL" ]]; then
      VERSION=$(git describe --tags --always)
      curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-type: application/json' \
        -d "{\"text\": \"🚀 Deployed to production: \`${VERSION}\` — health check passing\"}" > /dev/null
    fi
    exit 0
  fi
  
  echo "  Attempt $i/$MAX_ATTEMPTS: HTTP $HTTP_CODE — waiting ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

echo "❌ Service not healthy after $((MAX_ATTEMPTS * SLEEP_SECONDS))s — triggering rollback"
# Signal to Orbit that rollback is needed
exit 2  # exit code 2 = trigger rollback
```

### on-error.sh — Handle task failures
```bash
#!/usr/bin/env bash
# Runs when any Orbit task fails
# Bridges into the executable recovery loop.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TASK_NAME="${1:-unknown}"
PHASE="${2:-execute}"
ERROR_MSG="${3:-no details}"
SUMMARY_FILE="${4:-}"

ARGS=(
  --command /orbit:riper
  --phase "$PHASE"
  --task "$TASK_NAME"
  --error-message "$ERROR_MSG"
)

if [[ -n "$SUMMARY_FILE" ]]; then
  ARGS+=(--summary-file "$SUMMARY_FILE")
fi

node "$ROOT_DIR/bin/recovery-loop.js" "${ARGS[@]}"
```

This writes `.orbit/state/last_error.json`, appends `.orbit/errors/<date>.log`, and returns a deterministic retry-or-halt decision after repeated failures. The repo-local `/orbit:riper` runtime uses the same controller automatically when its execute step fails.

Optional policy:
- keep `OnError` non-blocking for the first bounded retries
- alert or halt upstream once `last_error.json` reports `decision: "halt"`

---

## Hook Environment Variables
Orbit passes these to every hook:

```bash
AGENTIC_FRAMEWORK_PHASE=3        # Current phase number
AGENTIC_FRAMEWORK_TASK=engineer:auth-login   # Agent:task identifier
AGENTIC_FRAMEWORK_MODE=autonomous            # autonomous or collaborative
AGENTIC_FRAMEWORK_PROJECT=my-ecommerce       # Project name from STATE.md
AGENTIC_FRAMEWORK_MILESTONE=m1-foundation    # Current milestone
GIT_BRANCH=$(git branch --show-current)
GIT_COMMIT=$(git rev-parse --short HEAD)
```

---

## Context Window Warning Hook
Auto-detect when the main session context is getting full:

```bash
# Add to pre-task.sh
# Orbit tracks approximate context usage in .orbit/state/context.json
if [[ -f ".orbit/state/context.json" ]]; then
  USAGE=$(jq '.percentage' .orbit/state/context.json 2>/dev/null || echo 0)
  if [[ "$USAGE" -gt 70 ]]; then
    echo "⚠️  Context window at ${USAGE}% — consider /orbit:resume in a fresh session after this task"
  fi
  if [[ "$USAGE" -gt 85 ]]; then
    echo "🔴 Context window at ${USAGE}% — Orbit recommends starting a fresh session now"
    echo "   Run /orbit:resume in a new session to continue with full context."
  fi
fi
```
