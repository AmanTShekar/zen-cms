# ADR 002: Co-existence of MongoDB and PostgreSQL Database Adapters

## Status
Accepted

## Context
Zenith CMS is designed to be database-agnostic, supporting both document-oriented (MongoDB) and relational (PostgreSQL) backends. Since different hosting and deployment configurations have varied requirements, the CMS must maintain feature parity across both database types. 

However, co-existence introduces significant engineering challenges:
1. Difference in schema definition languages (Mongoose schemas vs Drizzle SQL tables).
2. Divergence in query capabilities (nested document queries vs SQL joins).
3. Handling transactions, schema migration tracking, and multi-tenant isolation uniformly.

## Decision
We implemented a strict `DatabaseAdapter` interface exported from `packages/types/src/database.ts`:
1. **Drizzle ORM (PostgreSQL):** Configured via `PostgresDrizzleAdapter.ts`. Handles dynamic schemas, indexes, and custom relations stored as text/JSONB fields. Runs auto-migrations on boot protected by PostgreSQL advisory locks.
2. **Mongoose (MongoDB):** Configured via `MongooseAdapter.ts`. Registers models dynamically on boot, matching the dynamic collection schemas.
3. **Query Translation:** Dynamic request filters are parsed into an intermediate AST (`QueryASTParser`) before compiling into the target database dialect (Mongoose query filters or Drizzle SQL where conditions).

## Consequences
- **Pros:** Maximum flexibility for developers to scale with Document DBs or secure ACID Compliance in Relational DBs; completely decoupled controller code.
- **Cons:** High development overhead maintaining two adapters; SQL relations must be modeled on top of dynamic SQL layouts, and complex queries must be normalized.
