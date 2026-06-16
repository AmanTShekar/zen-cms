# PHASE 1 — SECURITY AUDIT FINDINGS

## Authentication & Authorization Security

### JWT Implementation
- **`algorithms: ['HS256']`** explicitly set ✅ prevents algorithm confusion (CVE-2015-9235 style attacks)
- **JWT secret**: Production hard-fail enforced; dev fallback present but guarded
- **Access token TTL**: 15 minutes ✅
- **Refresh token TTL**: 7 days with rotation (jti + version) ✅
- **Token revocation**: sessionStore with jti-based check ✅
- **Token storage**: HttpOnly, Secure (production), SameSite=Strict cookies ✅ — localStorage NOT used for tokens
- **Cookie flags**: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'strict'` ✅

### Account Lockout & Brute Force
- **Failed attempts**: MAX_FAILED_ATTEMPTS = 5 ✅
- **Lockout duration**: 15 minutes ✅
- **Rate limiting**: `express-rate-limit` at 10 requests per 15 minutes on auth routes ✅
- **Skip in dev/test**: `skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'` — acceptable for dev, but ensure NODE_ENV cannot be spoofed in production

### Password Security
- **Hashing**: bcrypt with 12 rounds ✅
- **Validation**: 8+ chars, mixed case, number, special char ✅
- **Reset tokens**: crypto.randomBytes(32) for verification tokens, 24h expiry ✅

### 2FA / MFA
- **Implementation**: otplib + QRCode ✅
- **Flow**: Temp token (5min) → 2FA verification → full auth ✅

---

## Injection Attack Vectors

### NoSQL Injection — MEDIUM
**File**: `packages/core/src/api/query-parser.ts`
**Line**: 82, 90

```typescript
ops[`$${opKey}`] = opVal  // line 82
ops[opKey] = opVal        // line 90 (unsanitized for non-operator keys)
```

**Root Cause**: `$regex` and `$like` operators are in the allowed list. An attacker could send:  
`?filter[title][$regex]=^(a+)+$` with a 50,000 char payload to trigger catastrophic backtracking (ReDoS).  
The `normalizeFilters` function does block `$where`, `$ne`, `$gt` (in isolation), but the `$regex` operator allows arbitrary regex patterns.

**Blast Radius**: DoS via CPU exhaustion on regex query. Potential data exfiltration if combined with blind injection timing.

**Remediation**: 
1. Validate and limit regex pattern length
2. Sanitize regex input (escape special chars by default)
3. Consider removing `$regex` from allowed operators entirely

### XSS via CustomCSS / Stored HTML
**File**: `packages/core/src/services/content.ts`  
**Line**: 62-75

```typescript
if (field.type === 'richtext' && action === 'beforeChange') {
  cleanData[field.name] = sanitizeHtml(val)
}
```

**Root Cause**: Richtext fields use `sanitizeHtml()` but the `customCSS` field in z_settings does not appear to have sanitization. Need to verify.

**Remediation**: Ensure `customCSS`, `customHTML`, and any other user-injected string fields are sanitized before storage AND before rendering.

---

## Security Headers

### Helmet.js Configuration
**File**: `packages/core/src/index.ts`  
**Line**: 312-329

```javascript
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "'unsafe-inline'"], // HIGH RISK
    styleSrc: ["'self'", "'unsafe-inline'"],  // HIGH RISK
  }
}
```

**CRITICAL**: `unsafe-inline` in `scriptSrc` allows arbitrary inline JavaScript, defeating CSP's XSS protection. Swagger UI is the reason, but this is a major security gap.

**Remediation**: Use nonces or hashes for Swagger inline scripts. Generate CSP nonces per-request.

### CORS
**File**: `packages/core/src/index.ts`  
**Line**: 330-346

```javascript
cors({
  origin: this.corsOptions?.origins || process.env.CORS_ORIGINS?.split(',') || (process.env.NODE_ENV === 'production' ? [] : true),
  credentials: this.corsOptions?.credentials ?? true
})
```

✅ In production with no CORS_ORIGINS, defaults to `[]` (deny all). Good.
✅ Credentials enabled. Good for cookie-based auth.

---

## CRITICAL PHASE 1 FINDINGS

### FINDING-PHASE1-001
**Severity**: CRITICAL  
**File**: `packages/core/src/database/user-model.ts`, `member-model.ts`, `role-model.ts`, `api-key-model.ts`, `plugin-model.ts`, `onboarding-state-model.ts`  
**Title**: Core collections missing siteId field — cross-tenant data isolation failure  
**Root Cause**: User, member, role, API key, plugin, and onboarding models have no `siteId`, meaning queries cannot be scoped to a tenant. Even though `verifySiteAccess` exists, the data itself lacks the field required for enforcement.  
**Blast Radius**: Any user can query these collections and get data from other tenants.  
**Remediation**: Add `siteId` to all schemas. Update create/read/update/delete to always filter by siteId.  
**Blocks Launch**: YES

### FINDING-PHASE1-002
**Severity**: HIGH  
**File**: `packages/core/src/api/query-parser.ts`, line 82  
**Title**: `$regex` operator allowed in queries — ReDoS risk  
**Root Cause**: `normalizeFilters` allows `$regex` which passes unsanitized user input to MongoDB/Postgres regex engine.  
**Blast Radius**: CPU exhaustion via catastrophic backtracking with 50,000+ char patterns. Blind data exfiltration via timing.  
**Remediation**: Remove `$regex` from allowed operators or enforce strict pattern length limits and pre-compile/validate all regex strings.  
**Blocks Launch**: YES (must fix before production)

### FINDING-PHASE1-003
**Severity**: HIGH  
**File**: `packages/core/src/index.ts`, line 317  
**Title**: CSP scriptSrc allows `unsafe-inline`  
**Root Cause**: Helmet CSP configured with `scriptSrc: ["'self'", "'unsafe-inline'"]` for Swagger UI.  
**Blast Radius**: XSS payloads can execute inline scripts, bypassing CSP protection.  
**Remediation**: Replace `unsafe-inline` with nonces. Generate nonce per-request and inject into Swagger inline scripts.  
**Blocks Launch**: NO (for launch, but fix within 30 days)

### FINDING-PHASE1-004
**Severity**: MEDIUM  
**File**: `packages/core/src/middleware/auth.ts`, line 23  
**Title**: `verifySiteAccess` uses slug for site lookup rather than ObjectId  
**Root Cause**: `await adapter.find('sites', { slug: siteId })` — if site slug is not unique or can be changed, this lookup is brittle.  
**Blast Radius**: Stale cache entries if slug changes. Potential for collision if slugs are not enforced unique.  
**Remediation**: Use ObjectId for site resolution. Cache by `siteId:ObjectId`.  
**Blocks Launch**: NO

---

## CARRY-FORWARD REGISTER (PHASE 1 → 2)

| ID | Severity | Phase | Description | File |
|---|---|---|---|---|
| CF-001 | CRITICAL | 0 | User/Member/Role models lack siteId | user-model.ts, member-model.ts, role-model.ts |
| CF-002 | CRITICAL | 0 | API Key, Plugin, Onboarding models lack siteId | api-key-model.ts, plugin-model.ts, onboarding-state-model.ts |
| CF-003 | HIGH | 1 | `$regex` operator allows ReDoS | query-parser.ts |
| CF-004 | HIGH | 1 | CSP `unsafe-inline` in scriptSrc | index.ts (helmet config) |
| CF-005 | MEDIUM | 1 | `verifySiteAccess` uses slug not ObjectId | auth.ts |

---

*Next: PHASE 2 — Multi-Tenancy Isolation Audit*
