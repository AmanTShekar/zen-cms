# Zenith CMS — Production Readiness Audit: Final Verdict

**Audit Date:** 2026-06-16  
**Auditor:** OpenCode AI Agent  
**Classification:** MAXIMUM THOROUGHNESS — ZERO EXCEPTIONS  
**Status:** COMPLETE

---

## Executive Summary

This audit covered the complete Zenith CMS codebase across four domains: Security (Phase 1), Multi-Tenancy Isolation ( Rolling Updates / Readiness Gates), Code Quality & Architecture (Phase 3), and Infrastructure & Scalability (Phase 7). The assessment reveals a foundational architecture that is technically competent but contains critical design flaws that make it **unsafe for production** in a multi-tenant SaaS environment.

### The Bottom Line
**DO NOT LAUNCH** as a multi-tenant SaaS product. The system contains critical isolation failures, significant security vulnerabilities, and architectural blockers that contradict the stated design and security requirements.

---

## Phase 1 : Security Audit — CRITICAL FINDINGS

| ID | Severity | Finding | Impact |
|---|---|---|---|
| SEC-01 | **CRITICAL** | Core models (`z_users`, `z_roles`, `z_api_keys`) lack `siteId`. | Complete failure of data isolation between tenants. |
| SEC-02 | **HIGH** | `$regex` operator allowed in public API queries (`query-parser.ts`). | Enables ReDoS attacks and potential data exfiltration. |
| SEC-03 | **HIGH** | Helmet CSP allows `unsafe-inline` for `scriptSrc`. discard. | Bypasses XSS protection; allows execution of arbitrary scripts. |
| SEC-04 | **MEDIUM** | JWT uses `HS256` and short-lived tokens (15 min) which are secure, but dev fallback secrets are weak. | Risk of token forgery in development or misconfigured production environments. |

**Security Architecture Positives:**
- Brute-force protection: Account lockout after 5 failed attempts (15 min).
- Token management: Secure `httpOnly`, `SameSite=Strict`, `Secure` cookies.
- Password hashing: `bcrypt` with 12 rounds.
- Error handling: Internal stack traces are masked from public API responses.

---

## Phase 2: Multi-Tenancy Isolation — COMPLETE FAILURE

The core security promise of Zenith CMS is broken. The following endpoints are **globally scoped**, allowing any authenticated user to access or manipulate data from other tenants:

- **User & Role Management:** `api/roles.ts`, `api/system/cache-jobs.ts`, `api/auth.ts`.
- **Settings:** `api/system/settings` operates on a single global configuration row.
- **Media & Comments:** `GET /api/v1/media/:id/transform` and `PATCH /api/v1/comments/:id` do not check `siteId`.
- **Workspaces & Sites:** `workspaces.ts` and `sites.ts` fetch all records and filter in JavaScript, creating both a security and performance bottleneck.

### Model Isolation Map
| Collection | Has `siteId` | Isolated? |
|---|---|---|
| `z_users` | ❌ No | **EXPOSED** |
| `z_roles` | ❌ No | **EXPOSED** |
| `z_api_keys` | ❌ No | **EXPOSED** |
| `z_plugins` | ❌ No | **EXPOSED** |
| `z_settings` | ⚠️ Yes | Global fallback logic present. |

**Verdict:** The system is architecturally monolithic, not multi-tenant. If deployed as-is, it represents a single-tenant application with tenant labels.

---

## Phase 3: Code Quality & Architecture — MODERATE

- **TypeScript:** ✅ `strict: true` in `tsconfig.json`.
- **Error Handling:** ✅ Centralized `ZenithError` class / middleware pattern. Good.
- **Logging:** Structured logging (Pino) but with no request correlation IDs.
- **Code Smell:** Heavy use of `any` types in `DatabaseAdapter` abstractions.
- **Architecture:** Clever dual-adapter pattern (MongoDB/Postgres), but parity is not fully tested.

---

## Phase 7: Infrastructure & Scalability — BLOCKED

The system is **fundamentally unscalable** for a Kubernetes/SaaS deployment.

| Blocker | Impact |
|---|---|
| **Local Filesystem** | Stores media blocks, uploads, and generated types on local disk. |
| **In-Memory State** | Sessions, caches, and event hubs are process-local. |
| **Scheduled Jobs** | Cron-like scheduled publishing runs on every pod instance without distributed locking. |
| **File Watchers** | `chokidar` watchers for "hot reloading" block containerization. |

**Dependency Status:**
- **Tiptap vs. Lexical:** Lexical is used. Tiptap is dead weight.
- **Helmet:** Present but misconfigured (`unsafe-inline` in CSP).

---

## Final Verdict: HARD BLOCK

Zenith CMS must **NOT** be deployed to production for multi-tenant use until the following are addressed:

### Immediate Actions (Launch Blockers)
1. **COMPLETE TENANT ISOLATION:** Add `siteId` to all models and enforce it at the database query layer.
2. **REMOVE UNSAFE API OPERATORS:** Strip `$regex` from the query parser or sanitize it strictly.
3. **FIX CSP:** Replace `unsafe-inline` in `scriptSrc` with nonces/hashes.
4. **HARDEN AUTH:** Remove dev fallback for JWT secrets; validate all auth flows are scoped to the active `siteId`.

### 30-Day Roadmap
1. **Abstract Storage:** Replace local filesystem writes with an object store (S3/MinIO) for media and blocks.
2. **Externalize State:** Move sessions, caches, and pub/sub to Redis. Make Redis a production requirement.
3. **Distributed Jobs:** Implement distributed locking for scheduled tasks using Redis or a task queue (BullMQ).
4. **Code Quality:** Increase test coverage, remove `any` types from the adapter layer, and add integration tests for MongoDB/Postgres parity.

### 90-Day Roadmap
1. **Performance:** Add database indexes for all `siteId` lookups. Implement rate limiting per-tenant.
2. **Monitoring:** Add distributed tracing (OpenTelemetry) and health endpoints (`/live` / `/ready`).
3. **Infrastructure:** Provide production `Dockerfile` and `docker-compose.yml` with health checks.

---

## Self-Verification
- **What was missed?** A full penetration test for NoSQL injection vectors and a deeper review of the WebSocket/WebRTC layer.
- **What was assumed?** That `publicRead` and `singleton` configurations are intentional. If they are meant to be global, they must be guarded by global admin roles.
- **What would fail first?** Under production load, the lack of database indexing on `siteId` and the in-memory caching layer would cause race conditions and severe performance degradation.

## Binary Decision

| Decision | Status |
|---|---|
| **SHIP WITH FIXES** | ❌ **BLOCKED** |
| **DELAY LAUNCH** | ✅ **EXECUTE IMMEDIATELY** |
| **REDESIGN REQUIRED** | ⚠️ **Partial redesign recommended for the tenant isolation layer** |
