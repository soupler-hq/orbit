# SKILL: Identity & Authentication Systems (IDP)
> Auth is never an afterthought. Design it first, design it right.

## ACTIVATION
Auto-loaded for auth systems, SSO, IDP frameworks, user management, and permission systems.

## IDP ARCHITECTURE PATTERNS

### Pattern 1: BYO Auth (JWT + Refresh Tokens)
Best for: full control, no vendor lock-in, small teams
```
User → POST /auth/login → validate → issue access JWT (15m) + refresh token (30d)
User → request with access JWT → validate signature → proceed
User → JWT expired → POST /auth/refresh → rotate refresh token → new JWT
User → POST /auth/logout → revoke refresh token → done
```

### Pattern 2: Auth Provider (Clerk, Auth0, Supabase Auth)
Best for: faster time to market, MFA/SSO built-in, teams without auth expertise
```
Frontend → Auth provider SDK → provider handles login/MFA/OAuth
Backend → validate JWT from provider → check permissions → proceed
Benefit: social login, MFA, magic links, bot protection — all included
Cost: vendor dependency, $0.02-0.05 per MAU at scale
```

### Pattern 3: Enterprise SSO (SAML/OIDC)
Best for: B2B SaaS, enterprise customers, compliance requirements
```
SP (your app) ← SAML/OIDC → IdP (Okta, Azure AD, Google Workspace)
User → clicks "Sign in with SSO" → redirect to IdP → authenticate → assertion → create session
Implement: passport-saml, node-saml, or use Auth0/Clerk which handle SAML for you
```

## MULTI-TENANCY PATTERNS

### Row-Level Security (Postgres)
```sql
-- Every table has tenant_id
ALTER TABLE orders ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX orders_tenant_id_idx ON orders(tenant_id);

-- RLS policy — users only see their tenant's data
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set in every request handler
SET app.current_tenant_id = '{tenantId}';
```

### Middleware: Tenant Resolution
```typescript
const resolveTenant = async (req, res, next) => {
  // Resolve by: subdomain / custom domain / JWT claim / path param
  const tenantId = extractTenantId(req);
  if (!tenantId) return res.status(400).json({ error: 'Cannot resolve tenant' });
  
  const tenant = await getTenant(tenantId);
  if (!tenant || !tenant.active) return res.status(403).json({ error: 'Tenant not found' });
  
  req.tenant = tenant;
  await db.query(`SET app.current_tenant_id = '${tenant.id}'`); // RLS
  next();
};
```

## PERMISSION SYSTEMS

### Simple RBAC (3-5 roles)
```typescript
const PERMISSIONS = {
  admin:   ['read', 'write', 'delete', 'manage_users', 'manage_billing'],
  manager: ['read', 'write', 'delete'],
  member:  ['read', 'write'],
  viewer:  ['read'],
} as const;
```

### Fine-Grained ABAC (when RBAC isn't enough)
```typescript
// Policy: user can edit a document if they own it OR are admin
const canEdit = (user: User, doc: Document): boolean => {
  if (user.role === 'admin') return true;
  if (doc.ownerId === user.id) return true;
  if (doc.collaborators.includes(user.id)) return true;
  return false;
};
```

## OAUTH2 IMPLEMENTATION
```typescript
// Authorization code flow (always use PKCE for public clients)
const initiateOAuth = (provider: 'google' | 'github') => {
  const state = generateSecureRandom();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier); // S256
  
  storeInSession({ state, codeVerifier, provider });
  
  return buildAuthUrl(provider, { state, codeChallenge });
};

const handleCallback = async (code: string, state: string) => {
  const session = getSession();
  if (session.state !== state) throw new Error('State mismatch — possible CSRF');
  
  const tokens = await exchangeCode(code, session.codeVerifier);
  const userInfo = await fetchUserInfo(tokens.access_token);
  
  const user = await findOrCreateUser(userInfo);
  return issueAppJwt(user);
};
```

## IDP CHECKLIST
- [ ] Passwords: bcrypt with cost factor 12 minimum
- [ ] JWT: RS256 (asymmetric), short expiry (15m), refresh rotation
- [ ] MFA: TOTP support (Google Authenticator, Authy)
- [ ] Password reset: time-limited tokens, one-time use, invalidated on use
- [ ] Account lockout: after 10 failed attempts, 30 minute lockout
- [ ] Audit log: every auth event (login, logout, password change, MFA enable)
- [ ] Session invalidation: on password change, all active sessions revoked
- [ ] Rate limiting: 10 auth attempts per 15 minutes per IP
