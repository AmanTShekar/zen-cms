# Zenith CMS — Improvements & Gap Tracker

> Consolidated improvement plan from all internal audits.
> Generated: 2026-05-22 | Last updated: 2026-05-29 | Status: P1 MOSTLY DONE / P2 IN PROGRESS
> Supersedes: internal/reports/GAP_ANALYSIS.md, REFERENCE_COMPARISON_MATRIX.md, COMPETITIVE_AUDIT.md

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed & verified in code |
| ⬜ | Not started |
| 🔴 | P0 — Blocking (security vulnerability or broken feature — do first) |
| 🟠 | P1 — Should fix before public launch |
| 🟡 | P2 — Important (competitive parity / first 30 days) |
| 🟢 | P3 — Enhancement (new capability / roadmap) |

---

## PART A — What's Done

### Phase 1 — Robustness Hardening — ✅ ALL COMPLETE

| # | Issue | File |
|---|-------|------|
| 1.1.1 | Account lockout after 5 failed attempts → 15-min lockout | `auth.ts:100-145` |
| 1.1.2 | Email verification flow (generate + verify + resend) | `auth.ts:147-183`, `api/auth.ts:260-298` |
| 1.1.3 | Hardcoded password replaced with `crypto.randomBytes(16).toString('base64url')` | `system.ts:746` |
| 1.1.5 | User model: `failedLoginAttempts`, `lockUntil`, `emailVerified`, `verificationToken` | `user-model.ts:8-13` |

### Phase 2 — Versioning & Scheduling — ✅ ALL COMPLETE

| # | Issue | File |
|---|-------|------|
| 2.1 | `POST /versions/:collection/:id/:versionId/restore` endpoint | `versions.ts:116-145` |
| 2.2 | `GET /versions/:collection/:id/:versionId/diff` endpoint | `versions.ts:80-113` |
| 2.3 | Max version enforcement (prunes beyond 50) | `content.ts: _enforceMaxVersions()` |
| 2.4 | Scheduled publish cron (`draft → published` when `scheduledAt <= now`) | `scheduler.ts:61-96` |

### Phase 3 — Plugin & SDK Quality — ✅ CORE COMPLETE

| # | Issue | File |
|---|-------|------|
| 3.1 | `plugin.onReady(app)` called after DB connect, after routes registered | `index.ts:551-563` |
| 3.3 | SDK uses native `fetch()`, zero dependencies | `sdk/src/index.ts:78` |
| 3.4 | SDK meta typed as `{ totalDocs, totalPages, page }` | `sdk/src/index.ts:104-106` |
| 3.5 | SDK `Where<T>` typed query builder | `sdk/src/index.ts:44-64` |
| 3.6 | SDK throws typed error with status info | `sdk/src/index.ts:85-86` |

### Phase 4 — GraphQL Mutations & DataLoader — ✅ COMPLETE

| # | Issue | File |
|---|-------|------|
| 4.1 | GraphQL `Mutation` type (createX, updateX, deleteX) | `graphql.ts:430-439` |
| 4.2 | Blocks use proper GraphQL union types | `graphql.ts:147-166` |
| 4.3 | Depth limiting (max 6 levels) | `graphql.ts:446-461` |
| 4.4 | DataLoader (`SimpleDataLoader`) for relation batching | `graphql.ts:17-60` |
| 4.5 | Resolvers handle population/relations via DataLoader | `graphql.ts:203-229` |

### Phase 5 — New Capabilities — PARTIALLY DONE

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1 | Field types: code, collapsible, join, point, radio, row, ui | ✅ Done | Types, schema, admin UI, DB adapters all updated |
| 5.2 | Bulk operations (delete/publish/unpublish) | ✅ Done | Multi-select, bulk toolbar, backend endpoints |
| 5.4 | Image focal point / smart crop | ✅ | AI-estimated focal point stored in asset document |
| 5.5 | Validation completeness (Zod per field type) | ✅ Complete | `schema/engine.ts` |
| 5.6 | Adapter-safe search (`$like` not `$regex`) | ✅ Done | `query-parser.ts`, both adapters |
| 5.7 | SDK zero-dependency | ✅ Done | `sdk/src/index.ts` uses native fetch |
| OAuth/SSO strategies (GitHub, Google, Microsoft) | 🟢 | Routes exist; state store needs Redis | See P0-3 |

---

## PART B — What's Needs Work

### 🔴 P0 — Launch Blockers (must fix before any production traffic)

| # | Gap | Severity | File | Description |
|---|-----|----------|------|-------------|
| P0-1 | Unauthenticated media file access | 🔴 CRITICAL | `api/media.ts:145` | `router.get('/:filename')` has no `requireAuth` — any unauthenticated user can download any uploaded file by path |
| P0-2 | Unsanitized `$regex` in admin search | 🔴 CRITICAL | `api/system.ts:426-434`, `api/trash.ts:59-63`, `api/redirects.ts:38-39` | Admin search endpoints inject user `req.query.search` directly into `$regex` — ReDoS attack surface, plus injection risk |
| P0-3 | Email transport is a stub | 🔴 CRITICAL | `services/email.ts` | `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendVerificationEmail` are no-ops — registration and password reset are completely broken in production |
| P0-4 | In-memory OAuth state store | 🟠 HIGH | `auth/strategies/oauth.ts:64-72` | `new Map()` for OAuth state — breaks on multi-instance deployments; Redis was intended but not implemented |
| P0-5 | No request drain in graceful shutdown | 🟠 HIGH | `index.ts:934-937` | Server force-kills in-flight requests after 10s instead of draining; violates K8s graceful shutdown pattern |
| P0-6 | Full error stacks in production logs | 🟡 MED | `middleware/error-handler.ts:15` | `logger.error({ err, ... })` passes full Error object (with stack traces and file paths) to pino |

---

### 🟠 P1 — Should Fix Before Public Launch

| # | Gap | Severity | File | Description |
|---|-----|----------|------|-------------|
| P1-1 | In-memory rate limit fallback | 🟠 HIGH | `middleware/rate-limit.ts:60-67` | Falls back to in-memory counters if Redis unavailable — bypassable across instances in production |
| P1-2 | SQL injection in migration runner | ✅ FIXED | `database/migrator.ts:45` | Parameterized via `sql` template tag — no more string interpolation |
| P1-3 | Migration failure halts entire boot | ✅ FIXED | `database/migrator.ts:94-95` | `Migrator.run(continueOnError?: boolean)` halts or continues per flag |
| P1-4 | No migration rollback | 🟡 MED | `database/migrator.ts` | Failed migration leaves DB in inconsistent state; no `down()` or rollback path |
| P1-5 | No DB-level FK cascade constraints | 🟡 MED | `model-factory.ts`, `PostgresDrizzleAdapter.ts` | Cascade delete only at app level; concurrent deletes of referenced entities can race |
| P1-6 | CORS defaults to block-all in production | ✅ FIXED | `index.ts:326` | Production now uses localhost fallback array instead of `false` |
| P1-7 | Password reset race condition | ✅ FIXED | `api/auth.ts:457-468` | Atomic `findOneAndUpdate` with `returnDocument: 'before'` — no TOCTOU |
| P1-8 | Sentry SDK 8 versions behind | ✅ FIXED | `server.ts:7` | `@sentry/node` updated to 11.x |

---

### 🟡 P2 — First 30 Days Post-Launch

| # | Gap | File | Description |
|---|-----|------|-------------|
| P2-1 | Search is O(n) naive scan | `services/search.ts:52-75` | `.includes()` on every document; no MongoDB `$text` index or Postgres `GIN` index |
| P2-2 | Sequential import (N+1) | `api/import-export.ts:95` | Records created one-by-one; 5000 records = 5000 sequential DB round-trips |
| P2-3 | Assets via `express.static` — no CDN | `index.ts:401` | Media through Node process; no S3/CDN/signed-URL integration |
| P2-4 | No retry with backoff for webhooks/emails/AI | `webhook.ts`, `email.ts` | First failure abandons operation; webhooks silently fail |
| P2-5 | Health check doesn't check Redis | ✅ FIXED | `api/system.ts:368` | `/health` now pings Redis and includes it in `status` field |
| P2-6 | Single health endpoint (not split for K8s) | ✅ FIXED | `api/system.ts` | New `/live` (liveness) and `/ready` (readiness) probe endpoints |
| P2-7 | No slow-query logging | ✅ FIXED | `middleware/slow-query.ts` | `slowQueryMiddleware` logs requests exceeding `SLOW_QUERY_THRESHOLD_MS` |
| P2-8 | Audit logs lack cryptographic integrity | `services/audit-log.ts` | No hash chain; MongoDB write access could modify audit records undetected |
| P2-9 | Version history no diff UI | Admin pages | Versions stored but no visual diff/comparison viewer |
| P2-10 | No live preview | Admin pages | Not found; Strapi/Payload both ship this |
| P2-11 | API key scopes not enforced at adapter | `db-mongodb/src/model-factory.ts` | `allowedCollections` in model but not checked in queries |
| P2-12 | No video/audio thumbnail extraction | `services/MediaVisionPipeline.ts` | Video assets handled but no thumbnail extraction (ffmpeg) |
| P2-13 | No blurhash placeholder generation | — | Sanity has built-in; Strapi has plugin; Zenith is missing this |

---

### 🟢 P3 — Roadmap (Nice-to-Have)

| # | Feature | Description |
|---|---------|-------------|
| R1 | Meilisearch/Typesense integration | Replace O(n) naive search with dedicated search engine |
| R2 | GraphQL subscriptions | Add `graphql-ws` — currently query/mutation only |
| R3 | SAML/OIDC SSO (enterprise) | Currently only Google/GitHub/Microsoft OAuth |
| R4 | Tenant-level usage metering | API call counting, storage quotas, AI token tracking per tenant |
| R5 | Per-tenant custom roles | Currently global roles; should be per-site configurable |
| R6 | Collection-specific rate limits | Current limiter is global |
| R7 | Environment branching | Staging → production multi-env content workflow |
| R8 | Auto-translation integration | Editor exists; translation API not wired |
| R9 | Plugin hooks system extensibility | Only hooks-based; no custom endpoint extension mechanism |
| R10 | Stale-while-revalidate in SDK | SWR cache for storefront performance |
| R11 | Email notifications on workflow state changes | Authors not notified when content goes to `in_review` or `changes_requested` |

---

## PART C — Competitive Position

### What Zenith Does Better Than Strapi/Payload/Sanity/Directus

| Advantage | Details |
|-----------|---------|
| **Multi-tenancy architectural, not bolted on** | `siteId` enforced at every adapter query layer. Strapi/Payload/Directus need separate instances per tenant. One deployment, unlimited tenants. |
| **Brute-force lockout built-in** | 5 failed → 15-min lockout with constant-time timing attack prevention. Strapi/Payload ship this as a plugin or not at all. |
| **Field-level + row-level access control** | `Map<FieldName, { read, write }>` per role enforced at content service layer. Neither Sanity nor Directus have this granularity at the field level. |
| **Document locking + ConflictError** | `PresenceService` with active user tracking and `ConflictError` on stale `_version`. Strapi/Payload don't have collaborative conflict detection. |
| **Glassmorphic admin for agency sales** | Dark glassmorphism, framer-motion, Outfit typography. Strapi is generic MUI; Payload is utilitarian. Visual design wins agency pitches. |
| **Visual flow automation** | `FlowBuilderPage` with drag-and-drop canvas +  `FlowEngine`. More integrated than Directus Flows because it runs inside a multi-tenant headless CMS. |
| **TypeScript types auto-generated** | `type-synthesizer.ts` writes `generated.ts` from collection config. Matches Payload's best DX without a code-gen build step. |
| **Dual DB adapter** | Same collection config compiles to MongoDB and PostgreSQL via `DatabaseAdapter` interface. Strapi went Mongo-only; Payload went Postgres-first; Zenith is agnostic. |

### Gaps That Would Cause a Developer to Choose Strapi/Payload

| Gap | Why It Matters |
|-----|---------------|
| O(n) search | Breaks at any real content volume; Strapi has Meilisearch plugin ecosystem |
| Unverified PostgreSQL production deployment | Payload was built Postgres-first with thousands of production deployments |
| No version diff/comparison UI | Payload ships this built-in; any content team will miss it immediately |
| Media via express.static | Strapi Cloud, Sanity CDN, Contentful Images API — all have proper CDN integration |
| No SAML/OIDC SSO | Directus and Contentful Enterprise have this |
| No webhook retry | Strapi and Payload both have it; webhook failures are silent in Zenith |

### Scores at a Glance

| Feature | Strapi | Payload | Sanity | Directus | Zenith |
|---------|--------|---------|--------|---------|-------|
| Content modeling | 9 | 9 | 8 | 7 | 7 |
| Content API | 8 | 9 | 9 | 8 | 7 |
| Media/Assets | 7 | 7 | 9 | 8 | 6 |
| Auth/Access | 7 | 8 | 6 | 9 | 8 |
| Dev Experience | 8 | 9 | 8 | 7 | 7 |
| Admin UI | 7 | 8 | 9 | 8 | 6 |
| **Multi-tenancy** | **3** | **3** | **2** | **3** | **9** |

---

## Completion Summary

| Section | Status | Items Done | Items Left |
|---------|--------|-----------|-----------|
| Phase 1 — Robustness Hardening | ✅ COMPLETE | 15/15 | 0 |
| Phase 2 — Versioning & Scheduling | ✅ COMPLETE | 4/4 | 0 |
| Phase 3 — Plugin & SDK Quality | ✅ CORE COMPLETE | 5/7 | 2 P3 |
| Phase 4 — GraphQL Mutations & DataLoader | ✅ COMPLETE | 5/5 | 0 |
| Phase 5 — New Capabilities | 🔄 PARTIAL | 7/12 | 5 P3 |
| **P0 — Launch Blockers** | 🔴 IN PROGRESS | **0/6** | **6** |
| **P1 — Should fix before launch** | 🟡 MOSTLY DONE | **5/8** | **3** |
| **P2 — First 30 days post-launch** | 🟡 IN PROGRESS | **3/13** | **10** |
| **P3 — Roadmap** | 🟢 TODO | **0/11** | **11** |

---

*Last updated: 2026-05-29 | Sources: competitive audit vs Strapi/Payload/Sanity/Directus/Contentful + production readiness audit (security, data integrity, performance, reliability, observability, operability)*