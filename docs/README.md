# Zenith CMS — Advanced Documentation Index

The root documentation (the primary `README.md` and the 12-part `MANUAL.md`) covers standard operations, API consumption, schema generation, and system deployment.

This directory (`docs/`) is reserved exclusively for principal engineers, system integrators, plugin developers, and core contributors. It contains exhaustive technical deep-dives into the system's infrastructure and the historical Architectural Decision Records (ADRs) that governed its design.

---

## 1. Technical Deep Dives

*   **[Core Architecture Guide](./ARCHITECTURE.md)**: Details the monorepo structure, request lifecycle middleware, database adapter bridging, and the mechanics of tenant isolation.
*   **[Security & Data Protection](./SECURITY.md)**: Explains the implementation of Zod schema validation, HttpOnly cookie mechanics, HMAC webhook signatures, and Magic Bytes file inspection.
*   **[AI Integration Guide](./AI_DEVELOPMENT.md)**: Outlines the Neural Bridge, provider API key configuration, and the AI content hub architecture.
*   **[Plugin Architecture](./PLUGINS.md)**: A technical reference for the Plugin API, detailing context injection and lifecycle hook registration.
*   **[Custom Field Registration](./FIELD_REGISTRATION.md)**: Instructions for developing custom React UI field components (e.g., Stripe Product Selectors) via the generic `ui` field type.
*   **[Real-Time Collaboration](./COLLABORATION.md)**: Documentation on the WebSocket lifecycle, heartbeat synchronization, and pessimistic lock mechanics.
*   **[Code Examples & Recipes](./EXAMPLES.md)**: Demonstrates implementation patterns for Edge runtime data fetching, constant-time HMAC validation, and server-side lifecycle hooks.
*   **[Troubleshooting & Triage](./ISSUE_GUIDE.md)**: Deterministic isolation protocols for environmental failures, database connection errors, and orphaned locks.

---

## 2. Architectural Decision Records (ADRs)

The `adr/` directory maintains a chronological log of significant, structurally immutable engineering decisions made during the development of Zenith CMS.

*   **[ADR-001: Hook Sandboxing](./adr/ADR-001-sandboxing.md)**: Decision matrix regarding the isolation of dynamic user-defined lifecycle hooks from the main Express event loop.
*   **[ADR-002: Dual Database Adapters](./adr/ADR-002-dual-db-adapters.md)**: Justification for supporting both PostgreSQL (via Drizzle) and MongoDB (via Mongoose) dynamically.
*   **[ADR-003: Redis Event Queues](./adr/ADR-003-redis-queues.md)**: The engineering reasoning behind standardizing on Redis for background job execution and horizontal scaling.
