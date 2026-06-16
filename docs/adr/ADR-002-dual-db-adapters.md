# ADR 002: Co-existence of MongoDB and PostgreSQL Adapters

## Status
Accepted

## Context
Zenith CMS is architected as a database-agnostic system, supporting both document-oriented (MongoDB) and relational (PostgreSQL) backends. Different infrastructure environments mandate varied storage capabilities, necessitating strict feature parity across disparate database paradigms.

Supporting dual paradigms introduces significant data layer complexities:
1. Fundamental divergence in schema definition languages (Mongoose BSON schemas vs. Drizzle SQL tables).
2. Fundamental divergence in query execution plans (nested document traversal vs. SQL relational joins).
3. The necessity for uniform handling of transactions, migration tracking, and multi-tenant isolation protocols across both adapters.

## Decision
The data access layer strictly conforms to a unified `DatabaseAdapter` interface defined in `@zenith-open/zenithcms-types`.
1. **Drizzle ORM (PostgreSQL):** The `PostgresDrizzleAdapter` handles dynamic schemas, indexes, and custom relations mapped as text or JSONB fields. It executes automated migrations during boot, synchronized via PostgreSQL advisory locks to prevent race conditions in clustered deployments.
2. **Mongoose (MongoDB):** The `MongooseAdapter` registers models dynamically during initialization, mapping exactly to the configured collection schemas.
3. **Query Translation Engine:** Incoming dynamic HTTP request filters are parsed into an intermediate Abstract Syntax Tree (`QueryASTParser`). This AST is subsequently compiled into the targeted database dialect (Mongoose query objects or Drizzle SQL statements) immediately prior to execution.

## Consequences
### Positive
- **Infrastructure Agnosticism:** Provides developers maximum flexibility to scale horizontally using document databases or to enforce strict ACID compliance using relational databases.
- **Controller Decoupling:** API controllers and business logic remain entirely decoupled from the underlying storage implementation.

### Negative
- **Development Overhead:** Requires duplicate implementation and rigorous testing matrices for all data-mutating features.
- **Relational Impedance:** Complex relational data must occasionally be modeled atop dynamic SQL layouts, necessitating query normalization and introducing potential indexing constraints.
