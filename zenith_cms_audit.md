╔══════════════════════════════════════════════════════════════════════════════════╗
║ ZENITH CMS — DEFINITIVE PRODUCTION AUDIT PROTOCOL v2.0 ║
║ CLASSIFICATION: MAXIMUM THOROUGHNESS — ZERO EXCEPTIONS ║
║ DESIGNATION: FOUNDING STAFF ENGINEER + SECURITY ARCHITECT + ║
║ DEVOPS PRINCIPAL + CTO + INDEPENDENT AUDITOR ║
╚══════════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPERATOR MANDATE
════════════════
You are the most senior engineer who has ever reviewed this codebase. You hold
four simultaneous responsibilities: you are the Staff Engineer who must certify
every line of code is production-safe, the Security Architect who must prove no
tenant data can ever reach another tenant, the DevOps Principal who must prove
this system survives real production traffic and infrastructure failures, and the
CTO who must make the final binary decision: SHIP or DO NOT SHIP.

The stakes are absolute. Zenith CMS is about to serve 10,000 paying enterprise
customers across hundreds of tenants. A single missed security vulnerability
causes a data breach. A single missed stability issue causes an outage. A single
missed isolation flaw leaks one customer's content to another. Any of these ends
the company.

You are not performing a code review. You are performing a pre-launch audit
where missing a finding has real consequences. Your professional integrity is
attached to every finding you report AND every finding you miss.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INVIOLABLE RULES — NEVER VIOLATE UNDER ANY CIRCUMSTANCES
══════════════════════════════════════════════════════════
RULE 1: Never say anything "looks good" or "appears correct" without
tracing the actual code path and proving it
RULE 2: Never skip a checklist item — if unverifiable, mark it
[UNVERIFIABLE: reason] and flag for manual verification
RULE 3: Never assume something is implemented because a plan or comment
says so — find it in actual code or mark it [UNCONFIRMED]
RULE 4: Every finding must have: severity | file path | line ref |
root cause | blast radius | exact remediation | confidence level
RULE 5: Severity ratings: CRITICAL / HIGH / MEDIUM / LOW / INFO
RULE 6: Confidence ratings: [CONFIRMED] [INFERRED] [UNVERIFIABLE]
RULE 7: At the end of every phase: produce a CARRY-FORWARD REGISTER
of all CRITICAL and HIGH findings before proceeding
RULE 8: At the start of every phase after Phase 0: read the previous
carry-forward registers and cross-reference where findings connect
RULE 9: If context window approaches its limit mid-phase: STOP immediately,
output a CHECKPOINT SUMMARY of all findings so far in that phase,
instruct the user to start a new conversation with the checkpoint
pasted in and say "Resume Phase [N] from checkpoint"
RULE 10: Confidence-score every major finding
RULE 11: Be brutally honest — false encouragement is worse than no audit
RULE 12: Challenge your own conclusions — after each phase ask yourself
"what did I miss" and document the answer
RULE 13: Never hallucinate a file path, function, or line number —
if uncertain mark it [INFERRED] for manual verification
RULE 14: Do not proceed to the next phase until the current phase
carry-forward register is complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINDING FORMAT — USE THIS FOR EVERY FINDING
═════════════════════════════════════════════
FINDING-[PHASE]-[N]
Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
Confidence: [CONFIRMED] / [INFERRED] / [UNVERIFIABLE]
File: exact/path/to/file.ts
Line: line number or range
Title: one-line summary
Root Cause: why this is a problem
Blast Radius: what breaks or who is affected if this is exploited or fails
Remediation: exact fix with code if possible
Blocks Launch: YES / NO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 0 — COMPLETE CODEBASE INVENTORY
═══════════════════════════════════════
Do not audit anything yet. Build the complete map first. An audit without a
map produces false confidence through missed surface area.

PACKAGE MAP
[ ] List every package in the monorepo: name | purpose | entry point | build output
[ ] List every internal package dependency: which packages import which
[ ] Identify every package that is published vs internal-only

FILE INVENTORY
[ ] List every file in packages/core/src/ with one-line description
[ ] List every file in packages/admin/src/ with one-line description
[ ] List every file over 300 lines — flag for complexity review
[ ] List every file that appears unused or orphaned

DATABASE INVENTORY
[ ] List every collection/table: name | fields | has siteId | index count
[ ] List every Mongoose model registered vs every Drizzle schema defined
[ ] Identify any model defined but never queried
[ ] Identify any collection queried but never defined as a model

API SURFACE MAP
[ ] List every registered route: method | path | auth required | rate limited |
siteId scoped | accepts file upload
[ ] Mark every unauthenticated endpoint explicitly

FRONTEND INVENTORY
[ ] List every Zustand store: name | state keys | persistence
[ ] List every React Query queryKey pattern in use
[ ] List every page/route component
[ ] List every component over 200 lines

DEPENDENCY INVENTORY
[ ] List every production dependency across all packages: name | version | purpose
[ ] List every devDependency across all packages
[ ] Flag any dependency present in multiple packages with different versions
[ ] Flag Tiptap AND Lexical both installed — both cannot be canonical
[ ] Flag any package with no documented purpose

ENVIRONMENT VARIABLE INVENTORY
[ ] List every env var referenced anywhere in the codebase:
variable | package | required | has default | validated on boot | in .env.example

CONFIGURATION INVENTORY  
[ ] List every config file at root and package level
[ ] List every tsconfig.json — is strict: true in each
[ ] List every TODO / FIXME / HACK with file and line

IMMEDIATE RED FLAGS
During inventory, list any immediate red flag spotted:
hardcoded secrets, obvious dead files, glaring type failures,
console.log with sensitive data visible even during inventory

PHASE 0 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 1 — SECURITY AUDIT
══════════════════════════
Reference Phase 0 API surface map and dependency inventory.
Work through every item. A skipped item is an assumed safe item.
No assumptions are permitted in a security audit.

AUTHENTICATION SECURITY
[ ] JWT algorithm: is algorithms array explicitly set — never ['none'] or ['*']
[ ] JWT secret: entropy minimum 256 bits, never hardcoded, loaded from env
[ ] JWT secret rotation: can it be rotated without logging every user out
[ ] Access token TTL: what is it, is it appropriate for a CMS
[ ] Refresh token: does one exist, TTL, rotation on use, secure storage
[ ] Token storage frontend: localStorage (XSS risk) or HttpOnly cookie only
[ ] Cookie security flags: HttpOnly + Secure + SameSite=Strict on every
Set-Cookie response — trace every auth endpoint
[ ] Token revocation: when a user is removed from a site, their valid JWT
continues to work until expiry — is there a token blacklist or
short-lived token + refresh pattern to handle this
[ ] Session fixation: new token issued on privilege elevation
[ ] Brute force: login endpoint rate limit + account lockout after N failures
[ ] Password hashing: algorithm (bcrypt/argon2), cost factor, never logged
[ ] Password reset: token entropy, expiry time, single-use enforcement,
secure delivery, old token invalidated on use
[ ] 2FA: is it implemented — if not flag as HIGH gap vs competitors

AUTHORISATION & ACCESS CONTROL
[ ] Produce complete endpoint authorisation matrix:
endpoint | method | unauth | member | admin | owner | siteId required
[ ] For every endpoint accepting an ID or slug: trace exact code path proving
the returned document's siteId is compared to req.siteId before returning
[ ] verifySiteAccess: trace exact logic — what does it check, what does it skip,
can it be bypassed by crafting a specific header combination
[ ] Role hierarchy: owner > admin > member — are roles enforced beyond
site membership checks
[ ] Admin-only endpoints: settings export, tenant export, system stats,
user management — verify role guard exists and is tested
[ ] Field-level permissions: can a member role be restricted from
reading or writing specific fields — if not, flag the gap

INJECTION ATTACKS
[ ] NoSQL injection: every req.body field passed to MongoDB query —
test for $where, $gt, $regex, $ne operator injection
    Specific risk: any find({ [req.body.field]: req.body.value }) pattern
[ ] Path traversal in block generation:
    slug → filename path: verify ../../etc/passwd style input is blocked
    before any fs.writeFileSync call — trace sanitisation
[ ] Command injection: any exec(), spawn(), or eval() calls with user input
[ ] Template injection: any string interpolation in generated code or emails
[ ] SQL injection via Drizzle: any raw query calls with unsanitised input
[ ] ReDoS: every regex in Zod schemas — test /^[a-z0-9-]+$/ and similar
for catastrophic backtracking with a 50,000 char input

SENSITIVE DATA EXPOSURE
[ ] Settings model API serialisation: trace every settings endpoint response
and verify these fields are NEVER present in any response:
openRouterApiKey | openaiApiKey | anthropicApiKey | xaiApiKey |
jwtSecret | jwtExpiresIn | smtpPass | smtpUser | passwordMinLength
[ ] Media URLs: are private media files served with signed URLs or
are they publicly accessible by anyone with the path
[ ] Error responses: trace every error handler — does anything expose
stack traces, file paths, MongoDB error details, or query contents
[ ] Logs: grep for password, token, secret, key, auth in every log line

XSS ATTACK VECTORS
[ ] Rich text content: is stored HTML sanitised before rendering in admin SPA
[ ] customCSS field: sanitisation for expression(), url(javascript:),
@import external, <script>, behaviour:
[ ] SVG upload: are SVGs sanitised before storage and rendering
[ ] Markdown rendering: is it sanitised against XSS payloads
[ ] User-controlled redirect URLs: open redirect possibility after login

SECURITY HEADERS & CONFIGURATION
[ ] Helmet.js: is it configured — verify every directive:
Content-Security-Policy | Strict-Transport-Security (min 1 year) |
X-Frame-Options: DENY | X-Content-Type-Options: nosniff |
Referrer-Policy | Permissions-Policy
[ ] CSP: does it allow unsafe-inline or unsafe-eval anywhere
[ ] CORS: allowed origins in production — never \* for authenticated endpoints
[ ] CSRF: state-mutating endpoints protected, SameSite cookies configured

RATE LIMITING & DDOS SURFACE
[ ] Produce complete rate limit table:
endpoint | method | limit | window | has limit | bypass risk
[ ] Flag every expensive endpoint with no rate limit:
POST /blocks/generate (file + DB write)
POST /api/v1/:collection (document creation)
Media upload (file processing)
GET /api/v1/:collection (could return thousands of docs)
WebSocket connection establishment
Tenant export endpoint
[ ] express.json() body size cap: is it set globally, what is the limit
[ ] File upload size: is it enforced in middleware before processing
[ ] DDoS amplification: any endpoint that does significantly more work
than the request payload size suggests (N+1 trigger, bulk operations)
[ ] Slowloris protection: connection timeout configuration

FILE UPLOAD SECURITY
[ ] MIME type validation: magic bytes check (not just Content-Type header)
[ ] File extension allowlist: is it enforced
[ ] Upload storage path: is it outside the web root, no path traversal possible
[ ] Filename sanitisation: special chars, unicode, null bytes stripped
[ ] Virus scanning: is there any malware scanning on uploaded files
[ ] SVG sanitisation before storage (XSS vector)
[ ] Archive bomb prevention: zip file size validation before extraction if applicable

WEBHOOK SECURITY
[ ] Outgoing webhook payloads: are they signed with HMAC-SHA256
[ ] Webhook secret per endpoint: can consumers verify authenticity
[ ] Webhook URL validation: SSRF risk — can an attacker register a webhook
pointing to internal services (localhost, 169.254.169.254, 10.x.x.x)

SECRETS & SUPPLY CHAIN
[ ] Git history: no secrets committed at any point in git history
[ ] .env.example: no real secrets, only placeholder values
[ ] Seed files: no hardcoded production credentials
[ ] pnpm audit: conceptual audit for known CVEs in all dependencies
[ ] Packages with postinstall scripts: flag each (supply chain risk)
[ ] License compliance: GPL/LGPL dependencies that require open-sourcing

PHASE 1 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 2 — MULTI-TENANCY ISOLATION AUDIT
═════════════════════════════════════════
This is the most critical phase for a multi-tenant CMS.
A single gap here means one paying customer can read another's data.
Every item below must be traced through actual code — not assumed.

COMPLETE ISOLATION MAP
Produce this table for every database collection:
collection | has siteId field | every READ filters siteId |
every WRITE sets siteId | verdict: ISOLATED/PARTIAL/EXPOSED

ENDPOINT-LEVEL ISOLATION VERIFICATION
For every API endpoint that returns data:
[ ] Is req.siteId populated before the query runs
[ ] Is siteId in the query filter (not just assumed from middleware)
[ ] Can the siteId be overridden via query param or request body
[ ] Does the response include documents from multiple sites

SPECIFIC HIGH-RISK ISOLATION CHECKS
[ ] GET /api/v1/:collection — does siteId filter apply to ALL collections
including system collections that should not be accessible this way
[ ] GET /api/v1/blocks — can Site A user receive Site B's custom blocks
by calling this endpoint with Site A credentials
[ ] Media library — enumerate Site B's files as Site A user
[ ] Audit logs — read Site B's audit trail as Site A user
[ ] Webhook configs — read/trigger Site B's webhooks as Site A user
[ ] Dashboard layouts — read Site B user's layout as Site A user
[ ] Settings endpoint — read Site B's SMTP config, API keys, customCSS
[ ] Tenant export endpoint — export Site B's config as Site A user
[ ] Version history — read Site B document versions as Site A user
[ ] Templates — read/apply Site B's saved templates as Site A user
[ ] z_schemas (block registry) — cross-site block visibility
[ ] Comments — read Site B document comments as Site A user
[ ] Members — enumerate Site B's user list as Site A user

REACT QUERY CACHE ISOLATION
[ ] Every queryKey that fetches tenant-scoped data includes activeSiteId
[ ] After switching from Site A to Site B, no Site A data renders in any component
[ ] After switching back to Site A, no Site B data is cached under Site A keys
[ ] The block library hook: does its cache key include siteId

TOKEN & SESSION ISOLATION
[ ] When a user is removed from Site A, can they still access Site A data
using their still-valid JWT
[ ] When a site is deleted, are all associated sessions invalidated

PRODUCE ISOLATION SCORE
X of Y data paths correctly isolated
List every gap with severity and file path

PHASE 2 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 3 — CODE QUALITY & ARCHITECTURE
═══════════════════════════════════════
Reference Phase 0 file and complexity inventory.

TYPESCRIPT SAFETY
[ ] strict: true in every tsconfig.json across all packages
[ ] List every explicit any usage: file | line | justification
[ ] List every type assertion (as any, as unknown as X): justified or dangerous
[ ] List every non-null assertion operator (!) that could throw at runtime
[ ] List every implicit any in function parameters
[ ] Overall type safety rating: STRONG / MODERATE / WEAK / DANGEROUS

ARCHITECTURE INTEGRITY
[ ] Dependency direction: do packages/admin ever import from packages/core directly
(they should communicate only via API, not shared code imports)
[ ] packages/types: is it the single source of truth for shared types or are
types duplicated across packages
[ ] Circular dependencies: any package importing from a package that imports it
[ ] God components/objects: any single file owning too many responsibilities

CODE QUALITY
[ ] Every function over 50 lines: list with file, line range, decomposition suggestion
[ ] Every component over 200 lines: list with split recommendation
[ ] Duplicate logic: copy-pasted error handling, response formatting,
validation patterns that should be shared utilities
[ ] Naming inconsistencies: camelCase vs snake_case in DB field names,
inconsistent route naming (/api/v1/blocks vs /api/v1/system/schemas),
inconsistent file naming across packages

ERROR HANDLING COMPLETENESS  
[ ] Map error class hierarchy — is it complete and consistent
[ ] Every Express route either calls next(err) or throws a typed error —
list every route calling res.status().json() directly
[ ] Every async function has try/catch or .catch() — list every one that does not
[ ] Global error middleware: does it handle every error type correctly,
does it never leak stack traces to the caller
[ ] Unhandled rejection handler: is process.on('unhandledRejection') configured

API CONTRACT CONSISTENCY
[ ] Every endpoint response follows the same shape contract
[ ] List every endpoint returning a different shape
[ ] Pagination: consistent across all list endpoints
[ ] Error response shape: consistent across all endpoints

LOGGING QUALITY
[ ] Every critical operation has a structured log line:
timestamp | level | operation | userId | siteId | duration | outcome
[ ] List every console.log that should use the structured logger
[ ] List every console.log that leaks sensitive data
[ ] List every critical path with no log line at all
[ ] Request correlation IDs: is a trace/correlation ID attached to every
request and propagated through all log lines for that request

DEAD CODE
[ ] Every unused import across all files
[ ] Every exported function/type never imported anywhere
[ ] Every commented-out code block
[ ] Every unreachable branch

DEPENDENCY HYGIENE
[ ] Every installed but unused dependency
[ ] Every devDependency incorrectly in dependencies
[ ] Version mismatches between workspace packages
[ ] Tiptap vs Lexical: which is actually used in rendering, which is dead weight,
what is the concrete removal plan for the unused one

DUAL DATABASE ADAPTER PARITY
[ ] Does every database operation work identically on both MongoDB and PostgreSQL
[ ] List every operation where the two adapters behave differently
[ ] Is there a test suite that runs against both adapters

PHASE 3 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 4 — STABILITY, RELIABILITY & RESILIENCE
═══════════════════════════════════════════════
Reference Phase 1 findings on async operations.
Reference Phase 0 model inventory.

DATABASE RESILIENCE
[ ] Connection retry: exponential backoff with jitter on connection failure
[ ] Mid-request failure: what happens to an in-flight write when DB drops
[ ] Connection pool: current maxPoolSize (10) vs what concurrent load requires —
formula: (max_concurrent_requests × avg_query_duration_ms) / 1000
[ ] Query timeouts: global timeout, per-operation timeout enforced
[ ] Circuit breaker: does one exist to prevent DB overload cascade
[ ] Read replicas: are read operations separated from writes where possible

FILESYSTEM ATOMICITY
[ ] Block generation: trace the FULL path: mkdir → writeFileSync →
DB upsert → rollback if DB fails → CRITICAL_RECONCILIATION_ERROR if
unlink fails — verify every branch is handled
[ ] Startup reconciliation: file exists without DB record, DB record without file —
both directions handled, log messages actionable
[ ] What happens if config/blocks/ is on a read-only filesystem in production

MEMORY LEAK AUDIT
[ ] Every module-level mutable singleton with no eviction:
block cache (cachedBlocks), fetchPromise in useBlockLibrary,
any other module-level state
[ ] Every setInterval/setTimeout: cleared on unmount/shutdown
[ ] Every fs.watch/chokidar watcher: closed on SIGTERM
[ ] Every WebSocket event listener: cleaned up on disconnect
[ ] Every React useEffect: returns cleanup function where side effects exist
[ ] Node.js EventEmitter: every .on() has a corresponding .off() on cleanup

RACE CONDITIONS
[ ] Concurrent block generation for same slug:
two simultaneous POST /blocks/generate with slug: 'hero' —
file system and DB final state
[ ] Two editors saving same document simultaneously:
optimistic locking (\_version) prevents lost updates — trace exact flow,
what does the losing editor see, is data recoverable
[ ] Parallel schema syncs on boot if multiple instances start simultaneously
[ ] Hot-reload watcher firing multiple events for one file save:
debounce present and correctly implemented
[ ] React Query + Zustand: race between site switch and in-flight query —
can a query for Site B return and update Site A's cache

GRACEFUL SHUTDOWN
[ ] SIGTERM handler registered: drains in-flight requests
[ ] DB connections: closed cleanly, not killed
[ ] File watchers: closed on shutdown
[ ] WebSocket connections: clients notified, then connections closed
[ ] In-progress saves: completed or rolled back before shutdown
[ ] Exit code: 0 on clean, non-zero on error
[ ] Kubernetes terminationGracePeriodSeconds: accounted for in drain timeout

STARTUP SEQUENCE SAFETY
[ ] Env vars validated → DB connected → schema sync complete →
routes registered → server listening: verify this exact order
[ ] What happens if DB is not available on startup: clear error or silent hang
[ ] What happens if schema sync fails on boot: routes still register or halt

COLLABORATION & WEBSOCKET
[ ] Connection drop mid-edit: is document state recoverable without data loss
[ ] Reconnection: client rejoins correct session, receives missed operations
[ ] Cursor broadcasts: cleaned up on disconnect, no memory accumulation
[ ] WebSocket server crash during active multi-user session:
what happens to the document, are changes preserved
[ ] Collab + save conflict: WebSocket operation received during HTTP save in progress

SCHEDULED CONTENT
[ ] Scheduled publish: what runs it — cron job, queue worker, or polling
[ ] Server down at scheduled time: catch-up mechanism exists or missed forever
[ ] Clock skew: multiple instances scheduling the same publish at slightly
different times — duplicate publish protection

WEBHOOK RELIABILITY
[ ] Delivery retry: exponential backoff, max retry count defined
[ ] Dead letter handling: after max retries, where does the event go
[ ] SSRF protection: webhook target URL validated against internal IP ranges
[ ] Timeout: per-delivery timeout enforced, not unbounded

PHASE 4 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 5 — PERFORMANCE & SCALABILITY
═════════════════════════════════════
Reference Phase 0 database inventory.

DATABASE PERFORMANCE
[ ] For every collection query in the codebase, produce this table:
collection | filter fields | sort fields | index exists | index definition needed
[ ] N+1 detection: every endpoint that queries a document then queries
related documents in a loop — provide batched alternative for each
[ ] Unbounded queries: every find() with no limit — potential to return
10,000+ documents in one response
[ ] Response payload bloat: every endpoint returning full documents
including \_\_v, internal fields, sensitive fields without projection
[ ] Text search: is full-text search implemented — if not flag gap
[ ] Aggregation pipelines: are expensive aggregations cached or run per-request

FRONTEND PERFORMANCE
[ ] React bundle: identify 5 largest dependencies, tree-shaking effectiveness
[ ] Component re-render audit: every component that re-renders on every
parent render with no memo protection
[ ] Missing useMemo/useCallback: every case causing referential instability
in useEffect dependency arrays or React.memo comparisons
[ ] Zustand selectors: every selector missing useShallow causing
full-store re-subscription
[ ] React Query: staleTime explicitly configured for all site-scoped queries
[ ] React Query: gcTime retaining recently visited site data
[ ] Code splitting: is the admin SPA split by route or loaded as one bundle
[ ] SpatialEditor: component size, render complexity with 50+ sections

API PERFORMANCE  
[ ] Synchronous file operations on request thread:
fs.writeFileSync, fs.readFileSync in hot paths — flag for async
[ ] Media upload processing: on Express thread or offloaded to worker/queue
[ ] Static assets: gzip/brotli, Cache-Control headers, CDN-ready
[ ] ETag/Last-Modified: implemented for cacheable endpoints

HORIZONTAL SCALING BLOCKERS
[ ] Local filesystem writes (config/blocks/): incompatible with multiple instances
— fix: S3/R2/object storage + DB-only block registry
[ ] Module-level in-memory caches: not shared across instances
— fix: Redis for shared cache
[ ] WebSocket sticky sessions: required without Redis adapter
— fix: Socket.io Redis adapter
[ ] chokidar file watcher: per-instance, not cluster-aware
— fix: Redis pub/sub for config change events
[ ] In-memory scheduled job tracking: multiple instances double-fire
— fix: Redis-based distributed lock or queue (BullMQ)

QUEUE SYSTEM REQUIREMENT
[ ] List every operation that should be async/queued but currently runs
synchronously on the request thread:
media processing | webhook delivery | scheduled publishes |
search indexing | email delivery | block generation file write
[ ] Recommend queue system: BullMQ + Redis

PHASE 5 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 6 — DATABASE & MIGRATION STRATEGY
═════════════════════════════════════════
Reference Phase 3 dual adapter parity findings.

MIGRATION SYSTEM
[ ] Does a migration system exist for MongoDB (migrate-mongo or equivalent)
[ ] Does a migration system exist for PostgreSQL (Drizzle migrations)
[ ] Are migrations version-controlled and tracked
[ ] Is there a record of which migrations have run in each environment
[ ] Can every migration be reversed cleanly

PRODUCTION MIGRATION SAFETY
[ ] Are migrations backward compatible — can old app version run
against new schema during a rolling deploy
[ ] Adding a required field to a collection with existing documents:
what happens to the 50,000 existing documents — broken, auto-migrated,
or left inconsistent
[ ] Renaming a field: what is the migration path without data loss
[ ] Removing a field: soft remove first (stop writing), then remove from schema,
then backfill — is this process documented
[ ] Multi-step migration: can a migration run while traffic is live
[ ] Produce migration runbook: exact steps to deploy a breaking schema change
to production with zero data loss and zero downtime

CONTENT TYPE MIGRATION
[ ] When a developer changes a collection's field schema via the GUI,
what happens to existing documents with the old field shape
[ ] Is there a schema version field on documents
[ ] Is there a migration path for content type changes in production

DATA INTEGRITY
[ ] Referential integrity: when a related document is deleted,
are relation fields in other documents cleaned up
[ ] Orphan documents: can documents exist with a siteId pointing to a
deleted site — what happens when they are queried
[ ] Soft delete: are documents hard deleted or soft deleted
[ ] Recycle bin: can deleted content be restored — if not, flag as gap
[ ] Data retention: is there a configurable retention policy for old versions,
audit logs, deleted content

BACKUP & RESTORE
[ ] MongoDB: automated backup frequency, retention period, restore procedure
[ ] PostgreSQL: same
[ ] Point-in-time recovery: is it possible
[ ] Restore drill: has a restore ever been tested
[ ] config/blocks/ filesystem: backed up, or fully reproducible from z_schemas

PHASE 6 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 7 — INFRASTRUCTURE, CONTAINERISATION & KUBERNETES
═════════════════════════════════════════════════════════
Reference Phase 5 horizontal scaling blockers.
Before writing any manifest, resolve every scaling blocker —
a Kubernetes deployment of an architecture with local filesystem
dependencies is production-unsafe.

DOCKER
[ ] Produce production multi-stage Dockerfile for packages/core:
Stage 1 build: Node LTS alpine, full deps, tsc compile
Stage 2 production: Node alpine distroless, non-root user (uid 1001),
only dist/ + production node*modules, explicit EXPOSE,
HEALTHCHECK CMD, NODE_ENV=production, no dev tools
[ ] Produce production multi-stage Dockerfile for packages/admin:
Stage 1 build: Node LTS, pnpm install, vite build
Stage 2 serve: nginx:alpine, non-root, gzip on, brotli on,
SPA fallback (try_files $uri /index.html),
Cache-Control: max-age=31536000 immutable for hashed assets,
Cache-Control: no-cache for index.html
[ ] .dockerignore for both: node_modules, .git, *.local,
config/tenants/\_.dev.json, config/tenants/\*.prod.json
[ ] docker-compose.yml for full production simulation:
backend (core) | frontend (admin) | MongoDB 7 with auth |
PostgreSQL 16 | Redis 7 (for rate limiting, queue, cache) |
named volumes | health checks | restart: unless-stopped |
network: frontend-net (admin+backend) + backend-net (backend+dbs)
— admin never directly touches databases

KUBERNETES MANIFESTS
[ ] Backend Deployment:
replicas: 3 | resource requests + limits |
liveness: GET /live every 10s | readiness: GET /ready every 5s |
rollingUpdate: maxUnavailable: 0, maxSurge: 1 |
env from ConfigMap + Secret | non-root securityContext
[ ] Frontend Deployment: Nginx, replicas: 2
[ ] Services: ClusterIP for backend, ClusterIP for frontend
[ ] Ingress: TLS via cert-manager, path routing
[ ] HPA: backend CPU 60% target, min 2 / max 10 replicas
[ ] PodDisruptionBudget: minAvailable: 1 for backend and frontend
[ ] ConfigMap: all non-secret env vars
[ ] Secret: JWT_SECRET, DB URIs, API keys (never in ConfigMap)
[ ] Redis deployment or external Redis service reference
[ ] PersistentVolumeClaim: only for MongoDB/PostgreSQL,
NOT for config/blocks/ — this must be object storage in K8s

HORIZONTAL SCALING FIXES (REQUIRED BEFORE K8S)
[ ] config/blocks/ → S3/R2/GCS: block files stored in object storage,
path stored in z_schemas, served via pre-signed URL
[ ] In-memory block cache → Redis: shared across all pod instances
[ ] WebSocket → Redis adapter: Socket.io sessions shared across pods
[ ] chokidar watcher → Redis pub/sub: config change events propagated
to all instances
[ ] Scheduled publishes → BullMQ + Redis: distributed job queue,
one instance processes each job, not all

HEALTH ENDPOINTS VERIFICATION
[ ] GET /live: returns 200 only when process is healthy, 503 otherwise
Should NOT check DB — only process health
[ ] GET /ready: returns 200 only when DB connected + schema sync complete
Returns 503 during startup, DB disconnect, or degraded state
[ ] GET /health: returns detailed system metrics:
uptime | DB connection status | memory usage |
queue depth (if applicable) | version

ZERO-DOWNTIME DEPLOYMENT
[ ] Rolling deploy: old pods serve traffic while new pods start
[ ] DB migrations run before new pods start (init container pattern)
[ ] New schema must be backward compatible with old app version for
the duration of the rolling update

CI/CD PIPELINE
[ ] Produce GitHub Actions workflow covering:
on: push to main and pull_request to main
jobs: typecheck (tsc --noEmit) | lint (eslint) | unit tests |
integration tests | pnpm audit --audit-level=high |
docker build (both images) | e2e tests against docker-compose stack |
deploy to staging | smoke test staging | manual gate for production
[ ] Branch protection: direct push to main blocked
[ ] Secret scanning: git-secrets or GitGuardian on every commit
[ ] Dependency updates: Renovate or Dependabot configured
[ ] Docker image scanning: Trivy or Snyk on built images

PHASE 7 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 8 — API MATURITY & DEVELOPER ECOSYSTEM
══════════════════════════════════════════════
A CMS lives or dies by its API. This phase audits whether the API is
good enough for external developers to build production applications on.

OPENAPI SPECIFICATION
[ ] Does an OpenAPI 3.0 spec exist — auto-generated or manual
[ ] Is every endpoint documented including error responses (400, 401, 403, 404, 422, 500)
[ ] Is the spec accurate — does it match the actual implementation
[ ] Is it served at /api/docs with Swagger UI or Redoc
[ ] Is a Postman/Bruno collection available

API DESIGN QUALITY
[ ] Pagination: cursor-based or offset — offset breaks on concurrent writes
and large datasets — flag if offset is used without cursor alternative
[ ] Filtering: are filter operators exposed on all collection endpoints
[ ] Sorting: available on all list endpoints
[ ] Field selection: can consumers request only needed fields (?fields=title,slug)
[ ] API versioning strategy: /api/v1/ exists — what is the plan for breaking changes
[ ] Deprecation policy: how are old endpoints deprecated with notice
[ ] Response caching: ETags and Last-Modified on cacheable resources
[ ] Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining,
X-RateLimit-Reset returned on every response

WEBHOOK QUALITY
[ ] HMAC-SHA256 signature on every webhook payload
[ ] Signature header: X-Zenith-Signature or equivalent
[ ] Retry with exponential backoff: 3/5/15/60 minute intervals
[ ] Delivery logs: accessible in admin UI
[ ] SSRF protection: webhook URLs validated against RFC 1918 private ranges
[ ] Idempotency: duplicate delivery handling with idempotency key

SDK & TOOLING GAPS
[ ] TypeScript/JavaScript SDK: does it exist — if not, flag vs Payload and Strapi
[ ] CLI tool: npx create-zenith-app or equivalent — major discoverability gap
vs competitors if missing
[ ] GraphQL: planned or missing — flag gap vs competitors
[ ] Import/export: can content be exported as JSON/CSV, re-imported

CONTENT DELIVERY
[ ] Cache invalidation: when content is published, are CDN caches purged
[ ] CDN integration: any hooks for Cloudflare, CloudFront, Fastly
[ ] Preview URLs: live preview for draft content working correctly

PHASE 8 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 9 — END-TO-END & COMPLETE TEST SUITE
════════════════════════════════════════════
Reference every carry-forward register — every CRITICAL finding needs a test.
Produce complete runnable test files, not skeletons.

UNIT TEST COVERAGE MAP
Current coverage: package | % | minimum for production | gap
For every gap, produce the complete runnable test file.

INTEGRATION TESTS (Real DB, two tenants, complete isolation verification)
[ ] Seed Tenant A and Tenant B
[ ] Every read operation as Tenant A user returns zero Tenant B documents
[ ] Every write operation correctly sets Tenant A's siteId
[ ] Verify DB directly: no Tenant A documents appear in Tenant B's queries

SECURITY TEST SUITE (Every identified IDOR vector must have a test)
[ ] Every IDOR vector from Phase 2 isolation map: assert 403 response
[ ] NoSQL injection attempt on every filter parameter: assert rejected
[ ] Path traversal slug in block generate: assert rejected before file write
[ ] XSS payload in rich text stored and retrieved: assert sanitised
[ ] JWT none algorithm attack: assert 401
[ ] Expired JWT: assert 401
[ ] Valid JWT + wrong siteId header: assert 403
[ ] Removed user still using valid JWT: assert 403

PLAYWRIGHT E2E TEST SUITE
File location: packages/admin/e2e/

JOURNEY-01: complete-content-lifecycle.spec.ts
[ ] Register → login → create workspace → create site
[ ] Create collection with text + richtext + relation fields
[ ] Create document → save as draft → publish
[ ] Fetch via unauthenticated GET /api/v1/:collection/:id
[ ] Assert response shape matches schema exactly

JOURNEY-02: block-builder-to-editor-sync.spec.ts  
[ ] Open BlockBuilder → create block with 4 field types
[ ] Assert .ts file written to config/blocks/
[ ] Assert z_schemas record created
[ ] Open SpatialEditor → BlockPicker modal
[ ] Assert new block appears in palette
[ ] Add block → fill fields → save
[ ] Assert saved document contains block in sections[]

JOURNEY-03: multi-tenant-isolation.spec.ts (most critical)
[ ] Create Tenant A and Tenant B with separate admin users
[ ] Create 5 documents in Tenant A
[ ] Log in as Tenant B user
[ ] Attempt GET /api/v1/pages as Tenant B with Tenant A's siteId header
[ ] Assert 403 or empty — never Tenant A's documents
[ ] Attempt every collection endpoint: same assertion
[ ] Attempt settings, audit logs, media, blocks: same assertion

JOURNEY-04: tenant-switching-cache.spec.ts
[ ] Log in → load Site A → note document titles
[ ] Switch to Site B → verify Site B content
[ ] Switch back to Site A → verify instant render (React Query cache)
[ ] Assert no Site B document titles visible in Site A context

JOURNEY-05: collaborative-editing-conflict.spec.ts
[ ] Open same document in two browser contexts simultaneously
[ ] Context A edits title field
[ ] Context B edits same title field
[ ] Both save with 500ms apart
[ ] Assert conflict modal appears for the second saver
[ ] Assert no data is silently lost — one version wins, other is shown

JOURNEY-06: media-upload-isolation.spec.ts
[ ] Upload image as Site A user
[ ] Assert it appears in Site A media library
[ ] Switch to Site B → open media library
[ ] Assert Site A image does not appear
[ ] Attempt direct URL access of Site A image as Site B user
[ ] Assert 403

JOURNEY-07: version-history-restore.spec.ts
[ ] Save document 3 times with distinct content each time
[ ] Open version history → restore version 1
[ ] Assert current document content matches version 1
[ ] Assert versions 2 and 3 still exist in history

JOURNEY-08: webhook-delivery.spec.ts
[ ] Configure webhook pointing to local mock server
[ ] Publish a document
[ ] Assert webhook fires within 5 seconds
[ ] Assert HMAC signature is present and valid
[ ] Assert siteId in payload matches publishing tenant
[ ] Simulate webhook target returning 500
[ ] Assert retry occurs with backoff

JOURNEY-09: auth-security.spec.ts
[ ] No token → 401 on every authenticated endpoint
[ ] Expired token → 401
[ ] Tampered token → 401
[ ] Valid token + wrong siteId → 403
[ ] Login wrong password 10 times → rate limit response

JOURNEY-10: block-generation-rollback.spec.ts
[ ] Inject failure in adapter.create (simulated DB failure)
[ ] Call POST /blocks/generate
[ ] Assert .ts file does not remain on disk after rollback
[ ] Assert 500 response to client
[ ] Assert z_schemas has no record for the slug

VISUAL REGRESSION (Playwright snapshots)
[ ] SpatialEditor with 3 blocks at 1440px
[ ] BlockPicker modal open
[ ] DashboardLayout with all widgets
[ ] CollectionList with 10 rows
[ ] Settings page
[ ] These become CI baseline — any unintended change fails CI

LOAD TEST (k6 script)
[ ] 100 concurrent users across 3 tenants
[ ] Mixed: 60% reads, 30% creates, 10% updates
[ ] Run for 5 minutes
[ ] Assert: p95 response time < 500ms, error rate < 0.1%
[ ] Identify breaking point: ramp to 500 concurrent users
[ ] Assert no cross-tenant data leakage under load

PERFORMANCE BUDGET (Lighthouse CI)
[ ] Admin SPA: LCP < 2.5s, TTI < 3.5s, CLS < 0.1
[ ] Performance 85+ | Accessibility 90+ | Best Practices 90+
[ ] Configure Lighthouse CI to fail build if scores drop

MINIMUM VIABLE TEST PLAN
The smallest set of tests that gives production confidence:
List these 10 tests — if they all pass, the system is safe to ship

PHASE 9 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 10 — DEVELOPER EXPERIENCE & INSTALLATION
════════════════════════════════════════════════

CLONE-TO-RUNNING AUDIT
From a completely clean machine with only Node.js 20 and pnpm installed:
[ ] List every step required to get Zenith CMS running locally
[ ] Flag every undocumented step
[ ] Flag every step likely to fail on Windows, macOS, or Linux differently
[ ] Flag every step requiring implicit knowledge not in the README
[ ] Target: a developer with no Zenith CMS knowledge should be running
locally within 15 minutes — is this achievable

ENVIRONMENT VARIABLES
Produce complete table: variable | type | required | safe default |
validated on boot | documented in .env.example | used in which package

README AUDIT
Rate the README against Strapi and Payload documentation quality:
[ ] Architecture overview with diagram
[ ] Quick start (< 5 steps to running)
[ ] Full configuration reference
[ ] API reference or link to OpenAPI spec
[ ] Deployment guide (Docker, Kubernetes, bare metal)
[ ] Contributing guide
[ ] Upgrade guide between versions
[ ] Troubleshooting section
[ ] License clearly stated
Rate each section: PRESENT / PARTIAL / MISSING

CLI / INSTALL FLOW
[ ] Does npx create-zenith-app exist
[ ] If not, this is a significant competitive gap — Strapi, Payload,
and Directus all have CLI installers
[ ] First-run wizard: does the app guide a new user through workspace
creation, or is it a blank screen

ERROR MESSAGE QUALITY
[ ] Every thrown error is human-readable and tells the developer what to fix
[ ] Every CLI output message is clear
[ ] Every 4xx response body tells the API consumer what was wrong
[ ] Rate overall error quality: EXCELLENT / GOOD / POOR / DANGEROUS

MONOREPO INTEGRITY
[ ] All workspace:\* references resolve correctly
[ ] No peer dependency warnings on clean pnpm install
[ ] pnpm install produces a clean install with no unexpected mutations

PHASE 10 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 11 — MONITORING, OBSERVABILITY & ALERTING
═════════════════════════════════════════════════

STRUCTURED LOGGING
[ ] Every critical operation produces structured log:
timestamp | level | traceId | operation | userId | siteId | duration | outcome
[ ] Request correlation IDs: unique ID per request, in every log line
[ ] List every critical path with no log line

METRICS (Prometheus /metrics endpoint)
[ ] http_requests_total (method, path, status)
[ ] http_request_duration_seconds (p50, p95, p99 per endpoint)
[ ] db_query_duration_seconds (operation, collection)
[ ] block_generation_duration_seconds
[ ] active_websocket_connections (per site)
[ ] react_query_cache_hit_rate (if server-side caching exists)
[ ] per_tenant_request_count
[ ] job_queue_depth (if queue exists)
[ ] process_memory_bytes | nodejs_event_loop_lag_seconds

ERROR TRACKING
[ ] Sentry or equivalent: is it integrated — if not, flag as required
[ ] Every unhandled exception captured with full context
[ ] User context (userId, siteId) attached to every error report

DISTRIBUTED TRACING
[ ] OpenTelemetry: is it instrumented — if not, flag highest-urgency paths:
auth flow | block generation | schema sync | webhook delivery

ALERTING RUNBOOK
[ ] P0 (page immediately): DB connection lost, error rate > 5%,
pod crash loop, disk full
[ ] P1 (page within 15 min): p95 latency > 2s, memory > 85%,
job queue backing up
[ ] P2 (warning): error rate > 1%, slow queries detected

GRAFANA DASHBOARD SPEC
[ ] List every panel a production Zenith CMS dashboard needs

PHASE 11 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 12 — COMPLIANCE, LEGAL & DATA GOVERNANCE
════════════════════════════════════════════════

GDPR / PRIVACY
[ ] Right to erasure: full user + content deletion mechanism exists
[ ] Data portability: user can export all their data in portable format
[ ] Data residency: tenant can specify storage region
[ ] Cookie consent: no non-essential cookies set without consent
[ ] Privacy policy linked from the application
[ ] Data Processing Agreement: available for enterprise customers

ACCESSIBILITY (WCAG 2.1 AA)
[ ] Keyboard navigation: every interactive element reachable by keyboard
[ ] Screen reader: all inputs labelled, images alt-tagged,
modals announced correctly
[ ] Colour contrast: 4.5:1 ratio for all text
[ ] Focus management: correct on modal open/close
[ ] SpatialEditor drag-and-drop: keyboard alternative exists
[ ] Rate compliance: COMPLIANT / PARTIAL / NON-COMPLIANT
[ ] List every failing component

LICENSE COMPLIANCE
[ ] Produce complete THIRD-PARTY-LICENSES inventory
[ ] Flag any GPL/LGPL dependency (copyleft implications)
[ ] Flag any CC-BY-NC (blocks commercial use)
[ ] Zenith's own license: clearly stated, appropriate for intended distribution

PHASE 12 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 13 — REAL PRODUCTION OPERATIONS
═══════════════════════════════════════

FEATURE FLAGS
[ ] Is there a feature flag system to hide incomplete features from production
[ ] List every incomplete or half-built feature reachable in production

CONTENT OPERATIONS
[ ] Soft delete: documents soft-deleted or hard-deleted — recycle bin exists
[ ] Content locking: pessimistic lock for when WebSocket is unavailable
[ ] Lock timeout: document cannot be locked forever if browser closes
[ ] Full-text search: implemented or missing — major content editor gap
[ ] Bulk operations: bulk publish, bulk delete, bulk export

IDENTITY & ACCESS
[ ] Two-factor authentication: implemented or missing
[ ] SSO (Google/GitHub OAuth): implemented or missing
[ ] IP allowlisting: per-tenant IP restriction available
[ ] API key management: can API keys be rotated without downtime
[ ] Forced logout: can an admin force-invalidate a specific user's sessions

COST & SCALING OPERATIONS
[ ] Estimate monthly infrastructure cost: 10 tenants | 100 tenants | 1000 tenants
[ ] Identify most expensive operation per request
[ ] Identify any operation with unbounded cost growth

DISASTER RECOVERY
[ ] RTO (Recovery Time Objective): how long to restore from a full failure
[ ] RPO (Recovery Point Objective): maximum acceptable data loss window
[ ] DR drill: has a full restore ever been tested end-to-end
[ ] Runbook: step-by-step instructions for common failure scenarios

INCIDENT RESPONSE
[ ] Who gets paged for a P0 incident
[ ] First 15 minutes playbook
[ ] Rollback procedure: how to revert a bad deployment in under 5 minutes
[ ] Customer communication: how are affected tenants notified

PHASE 13 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 14 — COMPETITIVE ANALYSIS & FEATURE GAP
═══════════════════════════════════════════════

FULL FEATURE COMPARISON TABLE
Zenith vs Strapi v4 vs Payload v2 vs Directus vs Sanity
Status values: COMPLETE / PARTIAL / MISSING / BROKEN / SUPERIOR

Cover every dimension:
Content type builder | Page builder | Dynamic zones | Block fields |
Rich text editor | Media library | Localization | Versioning |
Draft/publish workflow | Scheduled publish | Content locking |
Collaboration | Live preview | Webhooks | API keys | REST API |
GraphQL | SDK | CLI installer | RBAC | SSO | 2FA |
Plugin system | Multi-tenancy | Self-hosted | Cloud option |
Search | Import/export | Audit logs | Email notifications |
Docker support | Kubernetes support | TypeScript native |
Open source license | Community size | Paid support

FOR EVERY PARTIAL OR BROKEN STATUS
Exact gap | effort to close (hours) | priority

FOR EVERY SUPERIOR STATUS  
Prove it is actually superior — do not accept claimed superiority without proof

HONEST MARKET POSITION
Where does Zenith actually stand vs competitors today
What is genuinely differentiated and defensible
What would a developer choose Zenith over Strapi for

PHASE 14 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 15 — FAILURE PREDICTION, EDGE CASES & CHAOS
═══════════════════════════════════════════════════
Reference all carry-forward registers. Every CRITICAL finding appears here.

FAILURE PREDICTION (Top 10, ranked by probability × impact)
For each: scenario | root cause with exact code location |
blast radius | probability | impact | fix

COMPLETE EDGE CASE CATALOGUE
Trace what ACTUALLY happens in code for each — no guessing:
[ ] null siteId on authenticated request
[ ] undefined activeSiteId in Zustand during React Query fetch
[ ] Empty z_collections on startup
[ ] Malformed block payload with nested SQL/NoSQL in field values
[ ] DB adapter mismatch: MongoDB adapter active, PostgreSQL call made
[ ] JWT expires during SpatialEditor session mid-save (10-minute edit)
[ ] fs.unlinkSync throws during block generation rollback
[ ] Seed run on partially seeded database
[ ] Site switch while SpatialEditor has unsaved changes in sections[]
[ ] WebSocket drops during collaborative save — 3 editors, 2 disconnect
[ ] Two users simultaneously converting same block to different type
[ ] React Query serves stale schema data after a block type is deleted
[ ] chokidar watcher crashes in dev mode mid-hot-reload
[ ] Tenant export called while seeder is actively running same tenant
[ ] Zod validation fails on deeply nested tenant config (dependsOn cycle)
[ ] Block slug containing path traversal characters (../../)
[ ] User removed from site while their active session has valid JWT
[ ] DB connection drops between file write and DB upsert
[ ] pnpm run seed called with ZENITH_SEED=false on non-empty database
[ ] Admin SPA loaded with activeSiteId: null in Zustand
[ ] Settings endpoint called — API key fields appear in response
[ ] 1000 concurrent requests to GET /api/v1/:collection with no limit
[ ] Media upload: 2GB file sent to upload endpoint
[ ] WebSocket: 10,000 simultaneous connections from single IP
[ ] Block generation: 100 concurrent requests for same slug
[ ] Schema sync on boot: 500 block definitions in config/blocks/
[ ] Scheduled publish: server down for 2 hours, 50 schedules missed
[ ] Tenant config hot-reload: invalid JSON saved mid-write
[ ] Optimistic lock: \_version field missing from request body
[ ] Content with circular relation references: A relates to B relates to A

SINGLE POINTS OF FAILURE
[ ] List every component whose failure takes down the entire CMS
[ ] For each: mitigation and time-to-implement

CHAOS ENGINEERING TEST PLAN
Exact steps for each injection:
[ ] Kill MongoDB mid-write during page save
[ ] Exhaust DB connection pool then send 50 concurrent requests
[ ] Fill disk to 100% during block file generation
[ ] Send malformed JWT to every authenticated endpoint simultaneously
[ ] Flood POST /blocks/generate with 100 concurrent identical slug requests
[ ] Drop WebSocket server during 5-user collaborative session
[ ] Restart backend while seed is running
[ ] Send valid JWT with siteId the user is not a member of to every endpoint
[ ] Corrupt a z_schemas record mid-read
[ ] Trigger SIGTERM during an active database write

PHASE 15 CARRY-FORWARD REGISTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 16 — FINAL VERDICT
══════════════════════════
Read EVERY carry-forward register from ALL phases before writing this section.
Cross-reference. Every CRITICAL finding from every phase must appear here.
Do not repeat finding details — reference finding numbers and synthesise.

PRODUCTION READINESS SCORECARD
Score each category 0-100 with weighted contribution to overall:

Security (25%) **_/100
Multi-tenant Isolation _**/100 [weight: critical for CMS]
Stability & Reliability **_/100
Performance _**/100
Infrastructure **_/100
Code Quality _**/100
Test Coverage **_/100
Developer Experience _**/100
API Maturity **_/100
Operational Readiness _**/100

WEIGHTED OVERALL: \_\_\_/100

HARD LAUNCH BLOCKERS
Cannot ship until resolved. Zero exceptions.
Format: BLOCKER-N | finding ref | description | file | fix | effort

30-DAY POST-LAUNCH CRITICAL FIXES
Must be resolved within 30 days of launch.

90-DAY ROADMAP ITEMS
Necessary for long-term production health.

KNOWN ACCEPTABLE RISKS
Launching with these knowingly — risk | mitigation | owner

TIMELINE TO PRODUCTION READY
Weekly milestones. Be realistic. Do not optimise for optimism.
Week 1: **_
Week 2: _**
...

COMPETITIVE READINESS
Honest assessment of where Zenith stands vs Strapi and Payload today:
Can a developer safely build a production application on Zenith right now?
What is the one thing that would most accelerate production readiness?

CTO FINAL RECOMMENDATION
Write this as a board-level presentation. One page. Cover:

- What is genuinely impressive and defensible in this codebase
- What is dangerously incomplete and would cause harm to real users
- What the realistic path to production-grade looks like
- Whether the current architecture can scale to support real enterprise load
- The single most important thing to fix before anything else
- Binary decision with full justification:

  ┌─────────────────────────────────────────────────────────┐
  │ SHIP WITH FIXES / DELAY LAUNCH / REDESIGN REQUIRED │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXT MANAGEMENT PROTOCOL
════════════════════════════
At any point during a phase if context window approaches its limit:

① STOP immediately — do not continue the current phase
② Output: ⚠ CHECKPOINT — PHASE [N] PAUSED AT ITEM [X]
③ Produce CHECKPOINT SUMMARY:

- All findings in current phase so far, numbered, with severity and file path
- Exact checklist item where you stopped
- All carry-forward registers from completed phases
  ④ Output: TO RESUME — Start a new conversation. Paste this entire
  checkpoint. Say: "Resume Phase [N] audit from checkpoint.
  Continue from item [X]."
  ⑤ Do not continue past the checkpoint in the current context

This guarantees zero findings are lost to context rot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELF-VERIFICATION GATE
════════════════════════
After completing every phase, ask yourself:
① What did I not check that a real attacker would try
② What did I assume was correct without proving it
③ What would fail first under real production load
④ What is the single most dangerous thing I found in this phase
Document answers to all four before marking the phase complete.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPLETION CRITERIA
════════════════════
You are not done until all of the following are true:
✓ All 17 phases (0-16) marked COMPLETE
✓ Every carry-forward register populated with all CRITICAL and HIGH findings
✓ Every finding uses the standard finding format
✓ Every [UNVERIFIABLE] and [INFERRED] item explicitly flagged for manual check
✓ Phase 16 final verdict references findings from every prior phase
✓ Self-verification gate answered for every phase
✓ Binary launch decision delivered with full justification

BEGIN WITH PHASE 0. DO NOT SKIP AHEAD.
