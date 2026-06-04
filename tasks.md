# Zenith CMS — Task Execution Order

> Ordered for safest first, most risky last. Do items at the top first — they won't break anything and unblock later work.
> Every task is designed to be implemented and tested in isolation.
> Last updated: 2026-05-28

---

## How to Read This File

- **Group 1**: Safe — isolated one-file changes, zero risk of breaking anything
- **Group 2**: Low-risk — scoped changes that are clearly correct, test as you go
- **Group 3**: Medium-risk — changes to shared patterns; test carefully after
- **Group 4**: Structural — larger refactors; do after Groups 1-3
- **Group 5**: Feature additions — new capabilities that don't touch existing behavior

---

## GROUP 1 — Safest (One-file, no risk)

### G1-1 — Parameterize migration SQL
**File**: `packages/core/src/database/migrator.ts:45`
**Priority**: P1-2 (HIGH risk flag)
**Risk**: ZERO

```typescript
// BEFORE:
await adapter.db.execute(`INSERT INTO z_migrations (name) VALUES ('${name}')`)

// AFTER — use your adapter's parameterized binding:
await adapter.db.execute(`INSERT INTO z_migrations (name) VALUES (?)`, [name])
// or: adapter.db.execute(raw`INSERT INTO z_migrations (name) VALUES (${name})`) if using safe interpolation
```

Verify your adapter's `execute` accepts bindings. If not, add a safe interpolation method and use it here.
**Test**: Run any existing migration; verify `z_migrations` table still gets populated.

---

### G1-2 — Don't log full Error objects in production
**File**: `packages/core/src/middleware/error-handler.ts:15`
**Priority**: P0-6
**Risk**: ZERO

```typescript
// BEFORE:
logger.error({ err, url: req.url, method: req.method }, 'Unhandled error')

// AFTER:
logger.error({ err: err.message, stack: err.stack, url: req.url, method: req.method }, 'Unhandled error')
```

**Test**: Trigger a fake error; verify logs show `err.message` and `stack` but not a serialized full `Error` object.

---

### G1-3 — Update Sentry SDK
**File**: `packages/core/package.json` (find `@sentry/node`)
**Priority**: P1-8 (security)
**Risk**: VERY LOW (minor version bump, Sentry maintains backward compatibility)

```bash
pnpm update @sentry/node@latest
```

**Test**: Start the server; verify Sentry init logs no warnings; trigger a test error and confirm it reaches Sentry.

---

### G1-4 — CORS production warning at startup
**File**: `packages/core/src/index.ts` (around line 326)
**Priority**: P1-6
**Risk**: ZERO

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
  logger.warn('CORS_ORIGINS is not set — in production this will block all cross-origin requests. Set the CORS_ORIGINS env var.')
}
```

**Test**: Start with `NODE_ENV=production` and no `CORS_ORIGINS`; verify warning appears.

---

### G1-5 — Migration continue-on-error flag
**File**: `packages/core/src/database/migrator.ts:94-95`
**Priority**: P1-3
**Risk**: LOW

```typescript
// Add options parameter to runMigrations:
async runMigrations(options: { continueOnError?: boolean } = {}) {
  // ...
  if (!result.ok) {
    logger.error({ err }, `Migration ${file} failed`)
    if (!options.continueOnError) throw new Error(...)
    // else: log and continue
  }
}

// At startup call:
await migrator.runMigrations({ continueOnError: process.env.NODE_ENV !== 'production' })
```

**Test**: Create a broken migration file; verify it logs the error and (in dev) continues without halting boot.

---

## GROUP 2 — Low-Risk Improvements

### G2-1 — Redis in health check
**File**: `packages/core/src/api/system.ts:360`
**Priority**: P2-5
**Risk**: LOW

```typescript
// After DB health check, add:
let redisHealthy = false
try {
  if (redisService?.client) {
    await redisService.client.ping()
    redisHealthy = true
  }
} catch (e) { redisHealthy = false }

// Add redisHealthy to the health response body
```

**Test**: Stop Redis; hit health endpoint; verify response shows Redis unhealthy.

---

### G2-2 — Split health into /ready and /live
**File**: `packages/core/src/api/system.ts`
**Priority**: P2-6
**Risk**: LOW (adds new endpoints; existing /health unchanged)

```typescript
// GET /api/v1/system/ready — 200 if DB+Redis healthy, 503 otherwise (K8s readiness probe)
// GET /api/v1/system/live — always 200 unless process is dying (K8s liveness probe)
```

Keep existing `/health` as-is for backward compat.

**Test**: With services up, both return 200. With DB down, `/ready` returns 503 but `/live` still returns 200.

---

### G2-3 — Slow-query logging middleware
**File**: `packages/core/src/middleware/slow-query.ts` (new file)
**Priority**: P2-7
**Risk**: LOW

```typescript
export function slowQueryLogger(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    res.on('finish', () => {
      const ms = Date.now() - start
      if (ms > thresholdMs) {
        logger.warn({ path: req.path, method: req.method, duration: ms, status: res.statusCode }, 'Slow request')
      }
    })
    next()
  }
}
```

Add `router.use(slowQueryLogger())` to the main router.

**Test**: Add `await new Promise(r => setTimeout(r, 2000))` temporarily to any route; verify warning in logs; remove the delay.

---

### G2-4 — Fix password reset race condition
**File**: `packages/core/src/api/auth.ts:457-468`
**Priority**: P1-7
**Risk**: MEDIUM (must not break existing reset flow)

Use an atomic find-and-update so only one request can use a token:

```typescript
// BEFORE: find() then update() — not atomic

// AFTER — atomic findOneAndUpdate (only updates if used: false is still true):
const record = await adapter.findOneAndUpdate(
  'z_password_resets',
  { token: tokenHash, used: false, expiresAt: { $gte: new Date() } },
  { used: true },
  { returnDocument: 'after' }
)
if (!record) throw new InvalidTokenError('Token invalid or already used')
```

If `findOneAndUpdate` doesn't exist on your adapter yet, implement it as Task G5-4 first.

**Test**: Fire two concurrent password reset requests with the same token — verify only one succeeds.

---

## GROUP 3 — Medium-Risk (Test carefully)

### G3-1 — OAuth Redis state store
**File**: `packages/core/src/auth/strategies/oauth.ts:64-72`
**Priority**: P0-4 (HIGH)
**Risk**: MEDIUM

```typescript
// BEFORE: const stateStore = new Map<string, ...>()
// AFTER — Redis-backed single-use state:

function generateState(provider: string): string {
  const state = crypto.randomBytes(16).toString('base64url')
  // TTL of 600s = 10 minutes (matches OAuth spec)
  redis.setex(`oauth:state:${state}`, 600, JSON.stringify({ provider, createdAt: Date.now() }))
  return state
}

async function verifyState(state: string): Promise<{ provider: string } | null> {
  const raw = await redis.get(`oauth:state:${state}`)
  if (!raw) return null
  await redis.del(`oauth:state:${state}`) // single-use
  return JSON.parse(raw)
}
```

**Test**: Run two server instances; complete OAuth through a load balancer; verify state is shared correctly.

---

### G3-2 — Fix unauthenticated media access
**File**: `packages/core/src/api/media.ts:145`
**Priority**: P0-1 (CRITICAL)
**Risk**: MEDIUM (may be intentional — check first)

Before changing, search for calls to `GET /api/v1/media/` in frontend code to determine if this was intentional:

```bash
# If all calls are authenticated (use api.ts with X-Zenith-Site-Id header), add auth:
router.get('/:filename', requireAuth, ...)
```

If public-facing storefront fetches media without auth, either:
- Keep route public but document that files must not contain sensitive data, OR
- Update all callers (blog-demo, storefront templates) to use authenticated fetch

**Test**: As unauthenticated user, request a known uploaded file — should return 401.

---

### G3-3 — Sanitize $regex user input (3 files)
**File**: `packages/core/src/api/system.ts:426-434`, `api/trash.ts:59-63`, `api/redirects.ts:38-39`
**Priority**: P0-2 (CRITICAL — ReDoS + injection)
**Risk**: MEDIUM

Add regex escaping in a shared utility (`packages/core/src/lib/regex.ts`):

```typescript
// FROM MongooseAdapter.ts line 580:
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

Then in each of the three affected files:

```typescript
const safeSearch = escapeRegex(search as string)
query.userEmail = { $regex: safeSearch, $options: 'i' }
```

**Test**:
1. Normal text `"John"` → works
2. Regex chars `"[abc"` → returns literal match (doesn't error)
3. ReDoS payload `"^(a+)+$"` → returns literal match (doesn't hang server)

---

### G3-4 — Graceful shutdown with request drain
**File**: `packages/core/src/index.ts:934-937`
**Priority**: P0-5 (HIGH)
**Risk**: MEDIUM

```typescript
let isShuttingDown = false

process.on('SIGTERM', async () => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info('SIGTERM received — draining connections...')

  // Stop accepting new connections:
  server.close()

  // Wait for in-flight to drain (max 30s):
  const drainTimeout = setTimeout(() => {
    logger.warn('Drain timeout — forcing exit')
    process.exit(1)
  }, 30_000)

  await new Promise(resolve => server.on('close', () => {
    clearTimeout(drainTimeout)
    resolve(undefined)
  }))

  await this.adapter.disconnect()
  logger.info('Shutdown complete')
  process.exit(0)
})
```

**Test**: Start server, fire a long request, send SIGTERM while it's in-flight — server should wait for it to complete (within 30s) before exiting.

---

## GROUP 4 — Structural (Larger refactors)

### G4-1 — Implement email transport
**File**: `packages/core/src/services/email.ts`
**Priority**: P0-3 (CRITICAL — registration/password reset broken)
**Risk**: MEDIUM

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
})

export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    logger.info({ to, subject }, '[DEV] Email not sent — SMTP not configured')
    return
  }
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html })
}

export async function sendWelcomeEmail(email: string, name: string, verifyToken: string) {
  const url = `${process.env.APP_URL}/verify-email?token=${verifyToken}`
  await sendEmail(email, 'Welcome to Zenith CMS', `<p>Hi ${name}, click to verify: <a href="${url}">${url}</a></p>`)
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const url = `${process.env.APP_URL}/reset-password?token=${resetToken}`
  await sendEmail(email, 'Reset your password', `<p>Click to reset: <a href="${url}">${url}</a></p>`)
}
```

Add to `.env.example`:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@yourdomain.com
```

**Test**: Create a test account; verify welcome email logs (dev) or arrives (with real SMTP).

---

### G4-2 — Rate limiter: demand Redis in production
**File**: `packages/core/src/middleware/rate-limit.ts:60-67`
**Priority**: P1-1
**Risk**: MEDIUM (changes production startup)

```typescript
if (process.env.NODE_ENV === 'production' && !redisService?.client) {
  throw new Error('FATAL: Redis required in production for rate limiting. Set REDIS_URL.')
}
```

**Test**: Start production without Redis — server should refuse to start with a clear error.

---

### G4-3 — Batched parallel import
**File**: `packages/core/src/api/import-export.ts:95`
**Priority**: P2-2
**Risk**: MEDIUM

```typescript
const BATCH_SIZE = 100
for (let b = 0; b < records.length; b += BATCH_SIZE) {
  const batch = records.slice(b, b + BATCH_SIZE)
  await Promise.all(batch.map(async (record) => {
    const clean = sanitizeRecord(record)
    await contentService.create(clean, { siteId, userId, collection })
  }))
}
```

Note: `sanitizeRecord` is called per record (may be stateful) — don't share its state across the batch.

**Test**: Import a file with 500+ records; time it; verify count matches.

---

### G4-4 — DB-level FK cascade constraints
**Files**: `packages/db-postgres/src/PostgresDrizzleAdapter.ts`, `packages/db-mongodb/src/model-factory.ts`
**Priority**: P1-4
**Risk**: MEDIUM

For PostgreSQL — add `onDelete: 'cascade'` to relation columns in the adapter's column mapping:

```typescript
// In mapFieldToDrizzleColumn when field.type === 'relation':
references(() => targetTable.id, { onDelete: 'cascade' })
```

Write a migration to add `ON DELETE CASCADE` to existing FK columns.

For MongoDB — Mongoose can't enforce FK constraints at the DB level. The app-level `handleCascadeDeletes` in `model-factory.ts` handles this. Document this as a known MongoDB limitation.

**Test**: Create a document with a relation; delete the referenced document; verify cascade delete works.

---

### G4-5 — Text index search (replace O(n) scan)
**Files**: `packages/core/src/services/search.ts`, `packages/db-mongodb/src/MongooseAdapter.ts`, `packages/db-postgres/src/PostgresDrizzleAdapter.ts`
**Priority**: P2-1
**Risk**: MEDIUM

For MongoDB — on collection registration, create a text index:

```typescript
// In MongooseAdapter — when registerCollection is called:
await collectionModel.collection.createIndex(
  { title: 'text', description: 'text', ...textFields },
  { name: 'content_search_idx', weights: { title: 10, description: 5 } }
)

// In search():
const results = await collectionModel.find({ $text: { $search: query } })
```

For PostgreSQL — add a migration that creates a GIN index:

```sql
CREATE INDEX idx_content_search ON z_contents USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')))
```

Add `ensureSearchIndexes()` called on schema hot-reload.

**Test**: Load 100+ docs; search — verify results are correct and fast (<100ms).

---

## GROUP 5 — Feature Additions (New capabilities, no existing behavior broken)

### G5-1 — Webhook retry with backoff
**File**: `packages/core/src/api/webhook.ts`
**Priority**: P2-4

```typescript
export async function retryFetch(url: string, opts: RequestInit, retries = 3) {
  let lastError: Error
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts)
      if (res.ok) return res
      if (res.status >= 400 && res.status < 500) return res // don't retry client errors
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
      if (i < retries - 1) await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, i), 16000)))
    }
  }
  throw lastError!
}
```

---

### G5-2 — Version diff UI in admin
**File**: `packages/admin/src/pages/versions/VersionDiff.tsx` (new)
**Priority**: P2-8

1. Fetch two version documents via `GET /versions/:collection/:id/:versionId/diff`
2. Compute field-level diffs (use `fast-json-diff` or similar)
3. Display side-by-side diff with red/green highlighting
4. Add "Compare to Previous" button on the versions list page

---

### G5-3 — Asset CDN prefix support
**File**: `packages/core/src/index.ts:401`, `packages/core/src/api/media.ts`
**Priority**: P2-3

Add `ASSET_CDN_URL` env var. When set in production, media upload responses return `ASSET_CDN_URL + path` instead of relative paths. Optionally, redirect media serving to signed S3/GCS URLs.

---

### G5-4 — findOneAndUpdate on adapters (unblocks G2-4)
**File**: `packages/core/src/database/adapters/DatabaseAdapter.ts`, `packages/db-mongodb/src/MongooseAdapter.ts`, `packages/db-postgres/src/PostgresDrizzleAdapter.ts`
**Priority**: Unblocks password reset fix
**Risk**: LOW (new method, no existing behavior changed)

```typescript
// In DatabaseAdapter interface:
findOneAndUpdate<T>(
  collection: string,
  query: Record<string, any>,
  update: Record<string, any>,
  options?: { returnDocument?: 'before' | 'after' }
): Promise<T | null>
```

Mongoose implementation:
```typescript
async findOneAndUpdate(collection, query, update, options = {}) {
  const result = await this.db.collection(collection).findOneAndUpdate(
    query, update, { returnDocument: options.returnDocument === 'after' ? 'after' : 'before' }
  )
  return result
}
```

---

## Quick-Reference Checklist

```
GROUP 1 — Safest:
  [ ] G1-1 Parameterize migration SQL
  [ ] G1-2 Don't log full Error objects
  [ ] G1-3 Update Sentry SDK
  [ ] G1-4 CORS production warning
  [ ] G1-5 Migration continue-on-error

GROUP 2 — Low-Risk:
  [ ] G2-1 Redis in health check
  [ ] G2-2 Split /ready and /live endpoints
  [ ] G2-3 Slow-query logging middleware
  [ ] G2-4 Password reset atomic fix

GROUP 3 — Medium-Risk:
  [ ] G3-1 OAuth Redis state store
  [ ] G3-2 Fix unauthenticated media access
  [ ] G3-3 Sanitize $regex in 3 files
  [ ] G3-4 Graceful shutdown with drain

GROUP 4 — Structural:
  [ ] G4-1 Implement email transport
  [ ] G4-2 Rate limiter demand Redis in prod
  [ ] G4-3 Batched parallel import
  [ ] G4-4 DB-level FK cascade constraints
  [ ] G4-5 Text index search

GROUP 5 — Features:
  [ ] G5-1 Webhook retry with backoff
  [ ] G5-2 Version diff UI
  [ ] G5-3 Asset CDN prefix
  [ ] G5-4 findOneAndUpdate on adapters
```

---

*Start with Group 1. Groups 1-3 have zero or minimal risk of breaking existing code. The ordering is intentional — do G5-4 before G2-4 if following strictly top-to-bottom.*