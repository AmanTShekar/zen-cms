# Zenith CMS — Complete Codebase Analysis & Summary

> **Date:** 2026-05-22
> **Version:** 0.2.0
> **Repository Root:** `C:\Users\Asus\Desktop\cms`

---

## 1. Executive Overview

Zenith CMS is an **enterprise-grade, multi-tenant headless CMS** built as a TypeScript-first pnpm monorepo. It provides a REST API, GraphQL endpoint, real-time collaborative editing, an AI-powered admin dashboard, and dual database support (MongoDB via Mongoose, PostgreSQL via Drizzle ORM). It is designed to compete with Payload CMS, Strapi, and Directus.

---

## 2. Monorepo Structure

```
cms/
├── packages/
│   ├── core/                 # Headless API engine (Express, ~130+ source files)
│   ├── admin/                # Glassmorphic React admin dashboard (Vite, Zustand, Tailwind)
│   ├── types/                # Shared TypeScript type definitions & generated interfaces
│   ├── db-mongodb/           # MongoDB database adapter (Mongoose)
│   ├── db-postgres/          # PostgreSQL database adapter (Drizzle ORM)
│   ├── sdk/                  # Zero-dependency JS client SDK (fetch-based)
│   ├── cli/                  # CLI tool entry point
│   ├── demo/                 # Demo storefront app
│   └── create-zenithcms-app/ # Scaffolding tool for new projects
├── templates/
│   ├── blog-demo/            # Blog storefront template
│   └── storefront-glass/     # Glassmorphic storefront template (newer)
├── internal/
│   └── references/           # Reference implementations (Payload, Strapi, Keystone, Ghost)
├── docs/                     # Architecture docs, ADRs, API references
└── pnpm-workspace.yaml       # Workspace config
```

### Package Dependency Graph
```
@zenithcms/types          ← imported by ALL packages
    ↑
@zenithcms/db-mongodb  ─┐
@zenithcms/db-postgres ─┤→ @zenithcms/core ← @zenithcms/admin
                        └→ @zenithcms/sdk
```

---

## 3. Core Engine (`packages/core/`)

### 3.1 Entry Point & Bootstrap (`server.ts`)
- Loads `cms.config.ts` from the project root (or falls back to empty config)
- Creates a `ZenithEngine` instance and calls `engine.start()`

### 3.2 ZenithEngine (`index.ts`) — The Central Nucleus

**Responsibilities:**
1. **Middleware Pipeline:** Tracer → Metrics → Helmet (CSP) → CORS → Compression → JSON/URL parsing → Audit → Cookie Parser → CSRF Protection → MongoDB sanitize (conditional) → Maintenance mode → Rate limiting → API key validation
2. **Route Registration:** All REST API routes under `/api/v1/`, plus GraphQL at `/graphql`, Swagger at `/api-docs`, Prometheus metrics at `/metrics`
3. **Dynamic Collection Router Factory:** Converts collection schemas into full CRUD REST endpoints
4. **Database Adapter Resolution:** Uses `AdapterFactory` to create the correct DB adapter based on env vars
5. **Plugin System:** `applyPlugins()` merges plugin configs; `onInit` and `onReady` lifecycle hooks
6. **Service Initialization:** Scheduler, Deployment, Webhooks, Flow Engine, Presence
7. **WebSocket Server:** Socket.IO for real-time collaborative editing with presence tracking
8. **Graceful Shutdown:** SIGTERM/SIGINT handlers, stops scheduler, terminates sandbox pool, closes DB

**API Routes:**
| Path | Description |
|------|-------------|
| `/api/v1/auth/*` | Auth (login, register, refresh, forgot/reset password, email verification, setup) |
| `/api/v1/system/*` | Health check, system info |
| `/api/v1/upload` | File upload (multer + Cloudinary/S3/Local) |
| `/api/v1/media` | Media serving |
| `/api/v1/preferences` | User preferences |
| `/api/v1/versions` | Document versioning history |
| `/api/v1/presence` | Real-time presence |
| `/api/v1/content-tools` | Content utility endpoints |
| `/api/v1/members` | Member management |
| `/api/v1/flows` | Automation flow management |
| `/api/v1/dashboard` | Dashboard layout |
| `/api/v1/sites` | Multi-site management |
| `/api/v1/promotion` | Promotion/deploy triggers |
| `/api/v1/releases` | Release management |
| `/api/v1/roles` | Role-based access control |
| `/api/v1/templates` | Template management |
| `/api/v1/:collectionSlug` | **Dynamic collection CRUD** (auto-generated per collection) |
| `/api/v1/globals/:slug` | Singleton global config |
| `/graphql` | Dynamically generated GraphQL API |
| `/api-docs` | Swagger/OpenAPI documentation |

### 3.3 Dynamic Router Factory (`api/factory.ts`)

The factory function `createCollectionRouter()` converts a `CollectionConfig` into a full Express router with:

- **Authentication middleware:** Public reads allowed if configured; otherwise JWT required
- **Role-based access control:** Per-verb (create/update/delete) with dynamic role permission lookup from DB
- **Granular field-level access:** `sanitizeFields()` removes fields the user can't read/update
- **Zod validation:** Cached, pre-compiled schemas for input validation
- **Import/Export:** Batch import (up to 5000 records, transactional batches of 50) and paginated JSON export
- **Version history:** Optional version tracking on collections with `versions: true`
- **Custom endpoints:** Additional routes defined in `config.endpoints`

### 3.4 Schema Engine (`schema/engine.ts`)

Dynamically builds **Zod validation schemas** from field configurations:
- Supports all field types: text, number, email, textarea, richtext, json, select, media, date, checkbox, relation, blocks, array, array, group, tabs
- **Caching:** Pre-compiled schemas cached by slug for high throughput
- **i18n:** Localized fields wrapped in `Record<string, T>`
- **Custom hooks:** Async validation hooks on individual fields
- **JSON Schema validation:** Via AJV for json field types

### 3.5 Content Service (`services/content.ts`)

The business logic layer for CRUD operations with:
- **Row-Level Security (RLS):** Per-operation access control (`access.read`, `access.update`, `access.delete`)
- **Draft/Publish isolation:** Public queries only see published documents
- **Multi-tenancy:** Automatic `siteId` filtering
- **Field processing pipeline:** Recursive processing for nested groups, arrays, blocks
- **Localization:** Locale-aware reads (flatten locale map) and writes (merge into locale map)
- **XSS protection:** HTML sanitization on rich text fields
- **Hook execution:** Before/after hooks for validate, create, read, update, delete (with isolated worker sandbox option)
- **Optimistic concurrency control:** Document locking via PresenceService
- **Event emission:** Async event hub notifications
- **Versioning:** Automatic version snapshots on create/update
- **Delta tracking:** JSON diff calculation on updates

### 3.6 Authentication & Security (`services/auth.ts`)

- **JWT tokens:** Short-lived access tokens (15 min), long-lived refresh tokens (7 days)
- **Password hashing:** bcrypt with 12 salt rounds
- **Account lockout:** 5 failed attempts → 15-minute lockout
- **Timing attack prevention:** Constant-time comparison, dummy hash on missing users
- **Password validation:** Min 8 chars, uppercase, number required
- **Email verification:** Token-based with 24-hour expiry
- **Password reset:** SHA-256 hashed tokens, 1-hour expiry

### 3.7 Database Adapters

#### MongooseAdapter (`packages/db-mongodb/`)
- Document-based MongoDB via Mongoose
- Dynamic schema generation from collection configs (model-factory.ts)
- Neural cache layer (in-memory or Redis)
- Transaction support with replica set fallback
- Auto-registration of system models (AuditLog, Version, Flows, Migrations, Collections, Presence)
- Search via MongoDB `$regex`

#### PostgresDrizzleAdapter (`packages/db-postgres/`)
- Relational PostgreSQL via Drizzle ORM with node-postgres connection pooling
- **Dynamic column mapping:** Maps Zenith field types to PostgreSQL column types
- **Auto-migration engine:** Creates tables, adds missing columns, creates indexes (including GIN for JSONB)
- **Junction tables:** Automatic M2M relationship table management with position ordering
- **Query AST parser:** Translates MongoDB-style operators to SQL (`$eq`, `$in`, `$gt`, `ILIKE`, etc.)
- **Deep relation population:** Recursive nested relation loading with circular reference protection
- **Polymorphic relations:** Supports `relationTo: ['posts', 'tags']`
- **Per-tenant connection pools:** Dynamic tenant provisioning via `registerTenant()`
- **Advisory locks:** Prevents concurrent migration conflicts

### 3.8 GraphQL (`api/graphql.ts`)

Dynamically synthesizes a full GraphQL schema from collection configs:
- **Type generation:** Recursive types for groups, arrays, blocks (discriminated unions)
- **Queries:** `get{Type}(id)` and `list{Type}(page, pageSize, status)` per collection
- **Mutations:** `create{Type}`, `update{Type}`, `delete{Type}` per collection
- **DataLoader:** Custom batch-loading implementation for N+1 relation resolution
- **Document decorators:** Attach async resolvers for relations, handle block `__typename`
- **Depth limiting:** Query depth capped at 6 levels to prevent abuse
- **Auth context:** Bearer token or cookie-based, adapter injection

### 3.9 Additional Services

| Service | Description |
|---------|-------------|
| **AI Service** | Multi-provider AI (OpenRouter, xAI/Grok, OpenAI, Anthropic). Content generation, alt-text, SEO analysis, content quality scoring |
| **Search Service** | Global cross-collection search via adapter, tenant-scoped |
| **Cache Service** | Tag-based invalidation with TTL, NodeCache backend |
| **Event Hub** | Pluggable pub/sub: in-memory (default) or Redis for distributed setups |
| **Flow Engine** | Automation workflows triggered by content events (email, webhook, log, content update) |
| **Webhook Service** | Signed HMAC-SHA256 webhooks with SSRF protection, retry (3 attempts), Redis-backed queue |
| **Media Service** | Cloudinary integration with memory-based multer uploads |
| **Storage Service** | Pluggable: Local filesystem or AWS S3 |
| **Preview Service** | Signed JWT preview tokens (15 min TTL) |
| **Presence Service** | Real-time collaborative editing presence tracking |
| **Type Synthesizer** | Auto-generates TypeScript interfaces from collection schemas |
| **i18n Engine** | 22 supported locales, fallback chains, locale detection (query param, header, Accept-Language) |
| **Worker Sandbox Pool** | VM-isolated worker threads for hook execution with timeout and recycling |
| **Scheduler** | Scheduled content publishing |
| **Deployment** | Webhook-triggered deployments (Cloudflare, Netlify, Vercel) |
| **Licensing** | License management service |

### 3.10 Middleware Stack

1. **Tracer** — Request ID propagation
2. **Metrics** — Prometheus metrics collection
3. **Helmet** — Security headers with strict CSP
4. **CORS** — Configurable origins with credentials
5. **Compression** — gzip response compression
6. **Request parsing** — JSON (50MB limit) + URL-encoded
7. **Audit** — Request audit logging
8. **Cookie Parser** — Signed cookie parsing
9. **CSRF Protection** — Double-submit cookie pattern
10. **Mongo Sanitize** — MongoDB operator injection prevention (MongoDB only)
11. **Maintenance Mode** — Global maintenance toggle
12. **Rate Limiting** — Express-rate-limit
13. **API Key** — Service-to-service API key authentication

### 3.11 API Key Middleware (`middleware/api-key.ts`)

- Supports `X-API-Key` header for service-to-service authentication
- Optional per-key collection restrictions
- Falls back to JWT auth if no API key provided

### 3.12 Error Handling (`errors/index.ts`)

Structured error hierarchy with HTTP status codes:
- `InvalidPayloadError` (400)
- `AuthenticationError` (401)
- `TokenExpiredError` (401)
- `InvalidTokenError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `DuplicateError` (409)
- `ValidationError` (422) — with field-level error details
- `RateLimitError` (429)
- `ServiceUnavailableError` (503)

---

## 4. Admin Dashboard (`packages/admin/`)

### 4.1 Technology Stack
- **Framework:** React 19 with Vite
- **State Management:** Zustand (auth store)
- **Data Fetching:** TanStack Query (React Query) v5
- **Routing:** React Router v6
- **Styling:** Tailwind CSS with glassmorphism design system
- **Real-time:** Socket.IO client
- **Editor:** TipTap/ProseMirror (RichTextEditor)
- **D&D:** `@dnd-kit` for drag-and-drop canvas

### 4.2 Application Structure

```
App.tsx (BrowserRouter + QueryClient + ThemeProvider + Toaster)
├── /login → LoginPage
├── /forgot-password → ForgotPasswordPage
├── /reset-password → ResetPasswordPage
├── /setup → SetupWizard (onboarding)
├── /sites → SitePicker (multi-site workspace selection)
├── /collections/pages/:id → SpatialEditor (standalone, no sidebar)
└── /* → DashboardLayout (sidebar navigation)
    ├── / → DashboardBuilder (D&D widget canvas)
    ├── /collections → CollectionsPage (schema manager)
    ├── /collections/:slug → CollectionList
    ├── /collections/:slug/:id → CollectionDetail
    ├── /globals/:slug → CollectionDetail (isGlobal)
    ├── /audit-log → AuditLogPage
    ├── /media → MediaLibrary
    ├── /playground → DemoFeatures
    ├── /automations → FlowBuilderPage
    ├── /templates → TemplatesPage
    ├── /plugins → PluginsPage
    ├── /settings → SettingsPage
    ├── /ai-architect → AIWriterPage
    └── /system → SystemHealthPage
```

### 4.3 Key Components

| Component | Purpose |
|-----------|---------|
| **DashboardBuilder** | Drag-and-drop widget canvas with grid layout |
| **SpatialEditor** | Full-page visual page builder with block injection |
| **BlocksBuilder** | Visual block picker with categories, glassmorphic styling |
| **RichTextEditor** | TipTap-based WYSIWYG with markdown support |
| **MediaPicker** | Image/media selection with focal point cropping |
| **MediaLibrary** | Full media manager with upload, delete, organize |
| **CollectionDetail** | Generic document editor (works for any collection) |
| **CollectionList** | Data table with sorting, filtering, pagination |
| **FormBuilder** | Visual form/collection schema architect |
| **FlowBuilderPage** | Visual automation workflow designer |
| **SchemaFieldRenderer** | Dynamic form generation from field configs |
| **RelationPicker** | Cross-collection relation selection |
| **DynamicZoneEditor** | Strapi-style dynamic zone editing |
| **GlobalSearch** | Cross-collection search |
| **ThemeContext** | Dark/light mode with glassmorphism |

### 4.4 API Client (`lib/api.ts`)

- Axios instance with `withCredentials: true` for cookie-based auth
- Request interceptor: Attaches JWT from localStorage + `X-Zenith-Site-Id` header
- CSRF double-submit cookie pattern for mutating requests
- Response interceptor: Automatic token refresh on 401, failed request queue

### 4.5 Authentication Flow (`store/authStore`)

- Zustand store managing `user`, `isAuthenticated`, `isLoading`
- `checkAuth()` validates session via `/auth/me`
- Token refresh via `/auth/refresh` (httpOnly cookie)
- Login redirects from protected routes preserved via `state.from`

---

## 5. SDK (`packages/sdk/`)

Zero-dependency JavaScript client for storefront usage:
- **Pure `fetch()`** — no axios or other dependencies
- **API key auth** or **Bearer token** support
- **Site ID header** propagation for multi-tenant
- Methods: `find()`, `findById()`, `findGlobal()`, `create()`, `update()`, `delete()`
- **Response normalization:** Handles multiple response shapes
- **Query builder:** URL query string construction with nested where params

---

## 6. Type System (`packages/types/`)

Single source of truth for the entire workspace:
- **25+ field types** with discriminated union `FieldConfig`
- **Collection/Globals config** with hooks, access control, admin config
- **Plugin interface** with lifecycle hooks
- **Database adapter interface** (`DatabaseAdapter`) — abstract contract both adapters implement
- **Generated types** — auto-synthesized TypeScript interfaces written to `generated.ts`

---

## 7. Multi-Tenancy Architecture

Zenith implements site-level multi-tenancy via:
1. **`X-Zenith-Site-Id` header** — Required on most requests
2. **Middleware injection** — `req.zenith.adapter` provides scoped DB access
3. **Query filtering** — All collection queries auto-append `siteId` filter
4. **Collection-level isolation** — Search, count, find all scope by `siteId`
5. **Postgres adapter** — Supports per-tenant database connection pools (`registerTenant()`)

---

## 8. Security Features

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT (15m access / 7d refresh) + httpOnly cookies |
| **CSRF** | Double-submit cookie pattern |
| **XSS** | Helmet CSP headers + HTML sanitization on rich text |
| **Rate Limiting** | Express-rate-limit on auth and general endpoints |
| **SSRF Protection** | Webhook URL validation, IP range blocking, DNS resolution checks |
| **NoSQL Injection** | `express-mongo-sanitize` (MongoDB mode) |
| **Password Policy** | 8+ chars, uppercase, number, bcrypt hashing |
| **Account Lockout** | 5 failed attempts → 15-minute lockout |
| **Timing Attack Prevention** | Constant-time comparison, dummy hash on missing users |
| **Input Validation** | Zod schema validation on all write operations |
| **Access Control** | Per-collection, per-operation, per-field RLS |
| **Isolation** | Tenant-scoped queries at database level |

---

## 9. Competitive Positioning

Based on references in `internal/references/` and feature analysis:

| Feature | Zenith | Payload | Strapi | Directus |
|---------|--------|---------|--------|----------|
| Dual DB (Mongo + Postgres) | ✅ Native | ❌ MongoDB only | ✅ (via connectors) | ✅ |
| GraphQL (auto-generated) | ✅ Dynamic | ✅ Manual setup | ✅ Plugin | ✅ |
| Real-time collaboration | ✅ WebSocket | ❌ | ❌ | ❌ |
| AI Integration | ✅ Multi-provider | ❌ | ❌ (plugin) | ❌ |
| Automation/Flows | ✅ Built-in | ❌ | ❌ (plugin) | ❌ |
| Drag-and-Drop Builder | ✅ D&D Canvas | ❌ | ❌ | ❌ |
| Sandboxed Hooks | ✅ VM isolation | ❌ | ❌ | ❌ |
| Zero-dep JS SDK | ✅ | ❌ (requires fetch polyfill) | ❌ | ❌ |
| Auto Type Generation | ✅ | Partial | ✅ (via CLI) | ❌ |
| Glassmorphic Admin | ✅ Custom | ❌ Default | ❌ Default | ❌ Default |
| Multi-tenancy | ✅ Header-based | Plugin (paid) | Enterprise | ✅ |

---

## 10. Installation & Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Develop (all packages)
pnpm run dev

# Run core engine only
pnpm --filter @zenithcms/core dev

# Run admin dashboard only
pnpm --filter @zenithcms/admin dev
```

**Required environment variables:**
- `DATABASE_TYPE=mongodb|postgres` — Database selection
- `MONGODB_URI` or `POSTGRES_URI` — Connection strings
- `JWT_SECRET` + `JWT_REFRESH_SECRET` — Auth secrets (required in production)
- `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` — AI features (optional)
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — Media (optional)
- `REDIS_URL` — Distributed caching + webhooks (optional)

---

## 11. Recent Development (Git History Highlights)

Recent commits indicate heavy investment in:
1. **Block injection picker** — Strapi-style visual grid for content blocks
2. **Field type expansion** — Added password, uid, color field types
3. **Edge SDK** — Zero-dependency client improvements
4. **Locale/RLS gap fixes** — Closing competitive audit findings for localization and security
5. **Template system** — New `storefront-glass` template and `storefront-editorial` additions

---

## 12. Areas for Improvement

1. **Test Coverage** — Only 2 test files found (`auth.test.ts`, `engine.test.ts`); needs comprehensive testing
2. **Documentation** — API docs exist but component-level docs are sparse
3. **CLI Tool** — `packages/cli/src/index.ts` appears minimal; scaffolding could be expanded
4. **Demo Package** — `packages/demo/` entries are basic storefront stubs
5. **TypeScript Strictness** — Heavy use of `any` types throughout (especially in GraphQL, sandbox, webhook services)
6. **Pagination Max** — Hard cap of 100 items per page on REST, 100 on GraphQL
7. **Admin Bundle** — No code splitting visible in Vite config; large single bundle
