# Zenith Architecture: The Central Processing Nucleus

Zenith is designed as a modular, high-performance monorepo. It follows a **"Layered Nucleus"** pattern, where the core engine is decoupled from both the data layer and the UI layer.

---

## 1. The Kernel (packages/core)
The kernel is the brain of Zenith. It manages:
*   **Router Factory**: Dynamic endpoint generation based on `CollectionConfig`.
*   **Schema Engine**: The Zod-based bridge between TypeScript and the Database.
*   **Service Layer**: Handles Content, Webhooks, Search, and Media.

## 2. The Data Adapters
Zenith is **Database Agnostic**. All database operations are abstracted behind the `DatabaseAdapter` interface.
*   **MongooseAdapter**: Optimized for high-velocity, flexible content (Stable).
*   **SQL Catalyst (Beta)**: Native PostgreSQL support via **Drizzle ORM** for strict relational integrity and enterprise ledgers.

## 3. The Neural Bridge (Webhooks)
Zenith treats integrations as first-class citizens. The Neural Bridge ensures:
*   **HMAC Security**: Every payload is signed with a secret key.
*   **Exponential Backoff**: If a target is down, Zenith intelligently retries with increasing delays.
*   **Delivery Auditing**: Every webhook event is logged in the system health telemetry.

## 4. The Admin Interface (packages/admin)
A high-density, **Industrial Aesthetic** dashboard.
*   **Spatial Editor**: Uses 2D canvas logic to allow designers to map content relations spatially.
*   **Atomic State**: Uses Zustand to manage complex UI states without unnecessary re-renders.
*   **Glassmorphic Design**: A premium UI that feels responsive and alive.

---

## Sequence: Request Lifecycle

1.  **Ingress**: Request hits the Hardened Express Router.
2.  **Validation**: Zod AOT validates the payload against the collection schema.
3.  **Hooks**: `beforeChange` hooks are executed (e.g., for password hashing or computed fields).
4.  **Persistence**: The Database Adapter executes the mutation.
5.  **Dispatch**: The Neural Bridge triggers webhooks; the Event Hub triggers internal listeners.
6.  **Egress**: A standardized JSON response is returned.
