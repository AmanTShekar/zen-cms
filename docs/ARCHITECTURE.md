# Zenith Architecture: Enterprise-Grade Nucleus

Zenith is engineered as a decoupled, multi-tenant headless CMS that prioritizes extreme performance, relational rigidity, and real-time collaboration. This document details the inner workings of the Zenith Core and how its underlying sub-systems interact.

---

## 🏛️ Monorepo Package Topology

Zenith is organized as a high-performance monorepo containing isolated, specialized workspaces:

```
                          ┌──────────────────────────┐
                          │      @zenithcms/types       │ (Core API & Schema Interfaces)
                          └────────────┬─────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│        @zenithcms/core          │              │        @zenithcms/admin         │
│  - Express REST & GraphQL    │              │  - Vite + React SPA          │
│  - Dynamic schema push       │              │  - Tailwind CSS              │
│  - Collaborative Presence    │              │  - Zustand State Engine      │
│  - SQL/NoSQL ORM Adapters    │              │  - DnD Responsive Grid       │
└──────────────────────────────┘              └──────────────────────────────┘
```

---

## 🔑 1. Multi-Site Tenant Isolation Scoping (`X-Zenith-Site-Id`)

Zenith provides air-tight multi-tenant isolation. A single instance of the Zenith Kernel can host hundreds of independent storefronts and websites.

### Ingress Header Matching Flow:

1. Every client or administrator request must present the **`X-API-KEY`** or session credentials along with an **`X-Zenith-Site-Id`** header.
2. The core router maps the incoming `X-Zenith-Site-Id` to its registered workspace and site configuration:

```
Request ──► Middleware Scoping ──► Locate Tenant Connection Pool ──► Dynamic Schema Binding
```

3. Queries executed during that request are strictly scoped at the database adapter level, preventing cross-tenant data leakage.

---

## 🛢️ 2. Dynamic Database Adapters & Postgres Connection Swapping

Zenith is database agnostic, supporting both high-velocity document storage (MongoDB) and enterprise relational ledgers (PostgreSQL).

```
                            ┌─────────────────────────┐
                            │    DatabaseAdapter      │ (Common Abstract Interface)
                            └────────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │      MongooseAdapter      │                   │   PostgresDrizzleAdapter  │
   │  - Dynamic collection maps│                   │  - Dynamic Pool Manager   │
   │  - BSON Document model    │                   │  - Cascade Migrations     │
   │  - High-velocity indexing │                   │  - SQL schema builders    │
   └───────────────────────────┘                   └───────────────────────────┘
```

### PostgreSQL Drizzle Engine & SchemaSync:

- When using `PostgresDrizzleAdapter`, Zenith maintains a dynamic **Postgres Connection Pool Swapper**.
- When schemas are modified in the Admin panel, the **SchemaSync CLI & Engine** performs structural diffs of the database tables in real-time, executing dynamic database pushes (`db:push`) under transactions without taking the application offline.
- Relational tables, junction tables, and multi-tenant indexes are automatically created and updated.

---

## 👥 3. Real-Time Collaborative Presence & Collision Guard

To prevent conflicting edits (e.g. "Editor Sarah overwriting Editor Dave's content"), Zenith incorporates a high-frequency **Collaborative Presence Isolation Layer**.

```
Client 1 ──(POST /heartbeat)──► [NodeCache stdTTL: 60s] ◄──(GET /presence)── Client 2
                                         │
                                         ▼
                             [Deduplicated Active Users]
```

- **Keystroke & Collision Sync**: Every 30 seconds, active browsers running the Admin editor post lightweight status heartbeats to `/api/v1/presence/heartbeat`.
- **Deduplication Engine**: The core presence service compiles and deduplicates active editor metadata, instantly notifying other authors if an overlapping entity is being altered.
- **Graceful Timeouts**: Presence statuses automatically expire after 60 seconds of client inactivity to prevent stale lockouts.

---

## 🚀 4. Request Lifecycle & Schema Synthesis

```
  [HTTP Ingress] ──► Authorization (API Key / JWT)
                         │
                         ▼
             Tenant Matching Scoping (X-Zenith-Site-Id)
                         │
                         ▼
             Zod Ahead-Of-Time (AOT) Validation
                         │
                         ▼
             Hooks Injection (beforeChange / beforeValidate)
                         │
                         ▼
             Persistence (Dynamic DB Adapter Query)
                         │
                         ▼
             Neural Dispatch (Async Webhooks + HMAC payload sign)
                         │
                         ▼
  [Standardized Egress] ◄┘
```

1. **Zod AOT Validation**: Schema configs are dynamically parsed into Zod objects at boot-time. Requests with invalid or modified attributes are instantly rejected with detailed validation diagnostics.
2. **Neural Dispatch (Webhooks)**: On mutations, signing events are executed using HMAC-SHA256 headers, distributing changes securely to edge-cached storefronts.
