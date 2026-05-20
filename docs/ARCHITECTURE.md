# Architecture Guide

This document explains how Zenith CMS is structured, how the monorepo packages communicate, and how requests flow through the server to the database.

---

## 🏛️ Monorepo Package Structure

Zenith is organized as a monorepo using `pnpm` to keep packages decoupled yet easily linkable:

```
                          ┌──────────────────────────┐
                          │     @zenithcms/types     │ (Shared TypeScript types)
                          └────────────┬─────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
┌──────────────────────────────┐            ┌──────────────────────────────┐
│       @zenithcms/core        │            │       @zenithcms/admin       │
│  - Express server backend    │            │  - React admin dashboard     │
│  - Database adapters         │            │  - Tailwind CSS              │
│  - Real-time presence        │            │  - Zustand stores            │
│  - Lifecycle sandbox hooks   │            │  - Drag-and-drop builder     │
└──────────────────────────────┘            └──────────────────────────────┘
```

---

## 👥 1. Request Lifecycle & Pipeline

Every incoming request to the server runs through a series of steps to ensure it is secure, valid, and routed to the correct tenant database:

```
  [HTTP Request] ---> Auth Check (Session / JWT)
                           |
                           v
                     Tenant Filter (X-Zenith-Site-Id)
                           |
                           v
                     Zod Schema Input Validation
                           |
                           v
                     Sandboxed Hooks (beforeChange / etc.)
                           |
                           v
                     Database Adapter Operation
                           |
                           v
                     Async Webhooks (signed with HMAC)
                           |
                           v
  [HTTP Response] <--------+
```

1.  **Authentication**: Checks the request for a valid JSON Web Token (JWT) in a secure cookie or a static API key header.
2.  **Tenant Scoping**: Parses the `X-Zenith-Site-Id` header to restrict data queries to the correct site workspace.
3.  **Schema Validation**: Validates fields against dynamically compiled Zod validation schemas.
4.  **Hooks Execution**: Triggers hooks (like resizing images or calculating fields) in sandboxed background worker threads to keep the main event loop fast.
5.  **Database Persistence**: Writes the data using the selected database adapter.
6.  **Webhooks**: Dispatches secure, signed webhooks to notify external services or rebuild static storefronts.

---

## 🛢️ 2. Dynamic Database Adapters

Zenith supports both document databases (MongoDB) and relational databases (PostgreSQL) using a shared interface:

```
                            ┌─────────────────────────┐
                            │     DatabaseAdapter     │ (Abstract Interface)
                            └────────────┬────────────┘
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼                                             ▼
    ┌───────────────────────────┐                 ┌───────────────────────────┐
    │      MongooseAdapter      │                 │  PostgresDrizzleAdapter   │
    │  - Document-based         │                 │  - Drizzle ORM            │
    │  - BSON models            │                 │  - SQL schema builders    │
    │  - Flexible nested fields │                 │  - Connection pooling     │
    └───────────────────────────┘                 └───────────────────────────┘
```

### PostgreSQL Drizzle Adapter
When using PostgreSQL, Zenith leverages **Drizzle ORM** for query building and migrations. 
*   **Database Syncing**: When you modify a schema in the admin panel, Zenith evaluates the differences between your config and the database, generating and running the necessary table migrations automatically.
*   **Junction Tables**: Handles relationships (like linking articles to authors or categories) using auto-managed junction tables with index optimization.

---

## 🔒 3. Multi-Site Tenant Isolation

Zenith is designed to host multiple sites from a single backend instance. 

*   **Scoping Header**: Requests require an `X-Zenith-Site-Id` header.
*   **Query Filtering**: The database adapters automatically append the active `siteId` filter to all CRUD operations. This ensures that content from one site can never leak or be modified by requests targeting another site.
