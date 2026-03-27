# SKILL: Identity & Authentication Systems (IDP)
> Auth is never an afterthought. Design it first, design it right.

## ACTIVATION
Auto-loaded for auth systems, SSO, IDP frameworks, user management, and permission systems.

## CORE PRINCIPLES
1. **Security First**: Auth is never an afterthought; design and validate it before building features.
2. **Least Privilege**: Users and services must only have the permissions strictly required for their role.
3. **Tenant Isolation**: In multi-tenant systems, isolation must be enforced at the lowest possible layer (e.g., Database RLS).
4. **No Custom Cryptography**: Use standard libraries and protocols (OIDC, OAuth2, Argon2/Bcrypt) instead of rolling your own.
5. **Zero Trust**: Validate every request identity and permission, regardless of whether it originates internally or externally.

## PATTERNS

### IDP Architectures
- **BYO Auth**: JWT + Refresh tokens for full control and zero platform lock-in.
- **Provider-Led**: Clerk/Auth0/Supabase for speed and managed MFA/SSO.
- **Enterprise SSO**: SAML/OIDC for B2B compliance and organizational identity integration.

### Isolation & Permissions
- **Row-Level Security (RLS)**: Enforcing tenant boundaries at the database level.
- **Tenant Middleware**: Resolving and validating tenant context from requests/tokens.
- **RBAC/ABAC**: Hierarchical roles or attribute-based policies for granular access control.

## CHECKLISTS

### IDP Hardening
- [ ] Passwords hashed with Bcrypt (cost 12+) or Argon2id
- [ ] JWTs use RS256 (asymmetric) with short-lived access tokens (15m)
- [ ] MFA support (TOTP) implemented and enforced for sensitive roles
- [ ] Rate limiting applied to all auth and password reset endpoints
- [ ] Audit logging for every auth event (login, failure, password change)
- [ ] Token/Session revocation implemented (on password change or logout)

## ANTI-PATTERNS
- **Client-Side Auth Only**: Relying on frontend logic for security without backend verification.
- **Leaky Tenants**: Failing to include `tenant_id` in every database query or RLS policy.
- **Secret Commits**: Hardcoding JWT secrets or API keys in source code.
- **Vague Roles**: Granting "Admin" permissions to users who only need "Editor" access.
- **Missing Rate Limits**: Allowing infinite login attempts, enabling brute-force attacks.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
