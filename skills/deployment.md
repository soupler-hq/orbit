# SKILL: Deployment
> Every deploy is automated, reversible, and observable

## ACTIVATION
Auto-loaded for any deployment, infrastructure, or CI/CD task.

## CORE PRINCIPLES
1. **Automate Everything**: Every deploy step must be scriptable and version-controlled.
2. **Immutability**: Once an artifact (container, package) is built, it never changes.
3. **Environment Parity**: Dev, staging, and prod must be as identical as possible.
4. **Reversibility**: Every deployment must have a tested, high-speed rollback path.
5. **Fail-Fast Configuration**: App must validate all required env vars at startup.

## PATTERNS

### CI/CD Pipeline Anatomy
1. **Quality Gate**: Lint, typecheck, unit-test, security scan.
2. **Build**: Compile and containerize (multi-stage Docker).
3. **Integration**: Service-level tests against real dependencies.
4. **Staging**: Deploy to mirror environment for UAT/E2E.
5. **Production**: Manual approval gate followed by canary or blue/green deploy.

## CHECKLISTS

### Release Checklist
- [ ] All tests and security scans passing on CI
- [ ] Staging deploy successful and verified
- [ ] Database migrations are backward-compatible
- [ ] Rollback procedure tested and documented
- [ ] Monitoring dashboards verified (before/after)
- [ ] On-call rotation notified of the release

## ANTI-PATTERNS
- **Manual Deploys**: Running commands on a server instead of via CI/CD.
- **Hardcoded Config**: Storing environment-specific values in source code.
- **"Big Bang" Releases**: Deploying weeks of changes in one massive, risky update.
- **Missing Health Checks**: Deploying without automated verification of service health.
- **Shared Secrets**: Using the same credentials across staging and production.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
