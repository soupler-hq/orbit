# SKILL: Deployment
> Every deploy is automated, reversible, and observable

## ACTIVATION
Auto-loaded for any deployment, infrastructure, or CI/CD task.

## CI/CD PIPELINE ANATOMY
Every pipeline must have these stages in order:

```yaml
# Stage 1: Quality Gate (fail fast)
- lint: no style issues, no unused imports
- typecheck: no type errors
- unit-tests: all unit tests pass
- security-scan: no known vulnerabilities (Snyk, Trivy, or equivalent)

# Stage 2: Build
- build: application compiles/bundles successfully
- docker-build: container image builds and layers are cached

# Stage 3: Integration
- integration-tests: service calls to real dependencies (test DB, test queue)
- smoke-test: deployed to staging, hit key endpoints

# Stage 4: Deploy
- deploy-staging: deploy to staging environment
- e2e-tests: end-to-end tests pass on staging
- deploy-production: (manual approval gate for production)

# Stage 5: Verify
- health-check: service health endpoint returns 200
- synthetic-monitor: key user journey succeeds
- rollback-trigger: automatic rollback if health check fails >3 times
```

## ENVIRONMENT CONFIGURATION RULES
1. Config comes from environment variables — never hardcoded
2. Each environment (dev/staging/prod) has its own secret store
3. App reads config at startup, fails fast if required vars are missing
4. No config that differs between environments in source code

```typescript
// config.ts — fail fast pattern
const config = {
  database: {
    url: requireEnv('DATABASE_URL'),
    poolSize: parseInt(env('DB_POOL_SIZE', '10')),
  },
  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
    tokenTtl: parseInt(env('JWT_TTL_SECONDS', '3600')),
  },
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
```

## DOCKER BEST PRACTICES
```dockerfile
# Multi-stage build — keep production image minimal
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

## ROLLBACK STRATEGY
Every deploy must have a rollback plan written before the deploy happens:
- **Canary**: route 5% → 25% → 100% of traffic, with automatic rollback on error spike
- **Blue/Green**: keep old version running, switch load balancer, keep old for 30 minutes
- **Feature flag**: deploy code dark, enable via flag, disable flag on issues

## DEPLOYMENT CHECKLIST
- [ ] All tests passing on CI
- [ ] Security scan passing
- [ ] Staging deploy successful
- [ ] Database migrations are backward-compatible (old code runs against new schema)
- [ ] Rollback tested and documented
- [ ] On-call engineer notified
- [ ] Monitoring dashboard checked before and after
