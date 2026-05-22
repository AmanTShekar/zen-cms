---
name: schema-sync
description: Manually invoked skill for verifying, compilation checking, and synchronising database schemas across adapters, Zod parsers, and TypeScript types. Usage: /schema-sync
---

# Zenith Database Schema Synchronization (schema-sync)

This skill ensures that whenever a content collection schema is added, updated, or deleted, all downstream database layers, static types, and validation rule sets remain 100% synchronized and compiled.

---

## 🏛️ 1. The Dynamic Validation Compiler Checks

Whenever a database schema change is introduced, follow this rigorous flow to prevent validation failures:

### A. Zod Parsing Layer
*   **Location**: `packages/core/src/schema/engine.ts`
*   Ensure that any new fields are dynamically parsed by the compiled Zod registry.
*   Verify that custom validation constraints (such as `minLength`, `maxLength`, `min`, `max`, `minRows`, `maxRows`, and RFC email regex filters) are correctly compiled and enforced at runtime.

### B. Database Adapters Integration
*   **Locations**:
    *   `packages/core/src/database/adapters/DatabaseAdapter.ts`
    *   `packages/core/src/database/adapters/MongooseAdapter.ts`
    *   `packages/core/src/database/adapters/DrizzleAdapter.ts`
*   Ensure all schema definitions map securely within the respective adapter models.
*   **Dynamic Multi-Tenancy**: Check that queries on new models always filter securely using `siteId` parameters to preserve total isolation.

### C. Unified TypeScript Interfaces
*   **Location**: `packages/types/src/generated.ts`
*   Confirm that the TypeScript type maps reflect the new fields.
*   Run the dynamic schema compiler script to rebuild and export the strict types across all monorepo workspaces.

---

## 🛠️ 2. Verification Steps

1.  **TypeScript Compilation**: Run `pnpm run build` from the repository root. Ensure that no package reports compilation warnings or `any` implicit errors.
2.  **Run Tests**: Run `pnpm test` to verify that mock validations, auth workflows, and CRUD operations continue to pass with 100% success.
3.  **Check for Schema Bloat**: Review indexing and version history limitations. Ensure that dynamic models do not cause memory leaks or duplicate database connection pools.
