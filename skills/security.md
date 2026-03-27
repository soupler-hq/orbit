# SKILL: Security
> Security is designed in, not bolted on. Every component has a security model.

## ACTIVATION
Auto-loaded for all architecture design, API design, and authentication/authorization tasks.

## CORE PRINCIPLES
1. **Deny by Default**: Access is only granted when explicitly allowed.
2. **Defense in Depth**: Multiple layers of security (auth, input validation, encryption).
3. **Least Privilege**: Users and systems have only the minimum access needed.
4. **Assume Breach**: Design for the compromise of any single component.
5. **Fail Safely**: When security checks fail, they must fail closed (deny).

## PATTERNS

### JWT Best Practices
```typescript
// JWT config — non-negotiable settings
const jwtConfig = {
  algorithm: 'RS256',           // asymmetric — not HS256
  expiresIn: '15m',             // short-lived access tokens
  issuer: 'auth.yourdomain.com',
  audience: 'api.yourdomain.com',
};

// Refresh token rotation
const refresh = async (refreshToken: string) => {
  const token = await validateRefreshToken(refreshToken);
  await revokeRefreshToken(refreshToken);       // rotate — one-time use
  const newRefresh = await issueRefreshToken(token.userId);
  const newAccess = await issueAccessToken(token.userId);
  return { accessToken: newAccess, refreshToken: newRefresh };
};
```

### Session Security
```typescript
// Cookie settings — production non-negotiables
res.cookie('session', token, {
  httpOnly: true,      // no JS access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 900000,      // 15 minutes
  path: '/',
});
```

### Authorization: RBAC + ABAC
```typescript
// Role-based access control
const can = (user: User, action: string, resource: Resource): boolean => {
  const permissions = rolePermissions[user.role];
  if (!permissions.includes(action)) return false;
  
  // Attribute-based check (ownership)
  if (resource.ownerId && resource.ownerId !== user.id) {
    return user.role === 'admin'; // only admins can access others' resources
  }
  
  return true;
};
```

### Input Validation
```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  shippingAddressId: z.string().uuid(),
});
```

## CHECKLISTS

### OWASP TOP 10
| # | Vulnerability | Mitigation |
|---|--------------|-----------|
| A01 | Broken Access Control | RBAC middleware on every route, deny by default |
| A02 | Cryptographic Failures | TLS everywhere, bcrypt for passwords, no MD5/SHA1 |
| A03 | Injection | Parameterized queries always, Zod validation on all inputs |
| A04 | Insecure Design | Threat model every new feature, ADR for security decisions |
| A05 | Security Misconfiguration | No default creds, security headers, disable debug in prod |
| A06 | Vulnerable Components | Snyk in CI, `npm audit` on every PR |
| A07 | Auth Failures | MFA for admin, rate limit auth endpoints, account lockout |
| A08 | Software Integrity | Sign releases, verify third-party package checksums |
| A09 | Logging Failures | Log every auth event, never log passwords/tokens |
| A10 | SSRF | Whitelist allowed external URLs, block metadata endpoints |

## ANTI-PATTERNS
- **Hardcoded Secrets**: Storing credentials in source code or unencrypted .env files.
- **Trusting the Client**: Passing security-critical decisions (e.g., price, ID) from the client without server validation.
- **Verbose Errors**: Exposing stack traces or internal system details to users.
- **Missing Rate Limits**: Leaving endpoints vulnerable to brute force or DoS.
- **Schemaless Inputs**: Accepting unvalidated JSON payloads directly into logic or DB.

## VERIFICATION WORKFLOW
1.  **Logical Consistency**: Ensure the skill's core principles align with the current architecture.
2.  **Output Integrity**: Verify that any artifacts generated follow the template and fulfill all requirements.
3.  **Traceability**: Ensure that all decisions made during this skill's use are logged in the task state.
