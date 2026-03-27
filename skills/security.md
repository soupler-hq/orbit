# SKILL: Security
> Security is designed in, not bolted on. Every component has a security model.

## ACTIVATION
Auto-loaded for all architecture design, API design, and authentication/authorization tasks.

## AUTHENTICATION PATTERNS

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

## AUTHORIZATION: RBAC + ABAC

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

// Use as middleware
const authorize = (action: string) => (req, res, next) => {
  if (!can(req.user, action, req.resource)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

## INPUT VALIDATION (every external input)
```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  shippingAddressId: z.string().uuid(),
});

// Use in route handler
app.post('/orders', async (req, res) => {
  const result = CreateOrderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }
  // proceed with result.data — types guaranteed
});
```

## OWASP TOP 10 CHECKLIST

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

## SECRETS MANAGEMENT
```bash
# NEVER in code or .env committed to git
DATABASE_URL=postgres://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...

# Use secret managers:
# AWS: aws secretsmanager get-secret-value
# GCP: gcloud secrets versions access latest
# HashiCorp Vault: vault kv get secret/myapp
# Doppler, 1Password Secrets Automation
```

## SECURITY HEADERS (every HTTP response)
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

## RATE LIMITING (every public endpoint)
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('rate.limit.exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ error: 'Too many requests' });
  },
});

// Stricter limits for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
```
