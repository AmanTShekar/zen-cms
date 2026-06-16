# Zenith CMS Migration Runbook

This document details the strategies and procedures for applying database migrations in production environments with **zero downtime**. 

Because Zenith CMS supports both MongoDB and PostgreSQL via a unified ORM adapter, schema migrations are orchestrated dynamically. Drizzle automatically applies additive migrations to PostgreSQL during sync, but data transformations and structural deletions require manual migration files.

## Generating and Running Migrations

To scaffold a new migration:
```bash
pnpm --filter @zenith-open/zenithcms-core run migration:generate add_deleted_at_to_users
```

This creates a timestamped file in `packages/core/src/database/migrations/`.

To run pending migrations:
```bash
pnpm --filter @zenith-open/zenithcms-core run migration:run
```

To roll back the last executed migration:
```bash
pnpm --filter @zenith-open/zenithcms-core run migration:rollback
```

## The Expand & Contract Pattern

Applying a breaking schema change (like renaming or deleting a column) directly causes application downtime because active application nodes will attempt to read or write using the old schema before they are replaced during deployment.

To avoid this, use the **Expand & Contract** pattern across multiple deployments.

### Example: Renaming `first_name` to `given_name`

#### Step 1: Expand (Add the new field)
1. Generate a migration that adds `given_name` (if it is not automatically added by schema sync).
2. Update the codebase so that every write operation saves data to **both** `first_name` and `given_name`.
3. Update the codebase so that every read operation reads from `given_name`, but falls back to `first_name` if `given_name` is missing (the "forgiving reader").
4. **Deploy Application (Version A).**

#### Step 2: Migrate (Backfill data)
1. Write a migration script that iterates over all existing records and copies the value of `first_name` into `given_name`.
2. Run this migration in production.
3. Verify data integrity.

#### Step 3: Contract (Remove the old field)
1. Update the codebase to remove all references to `first_name` (no more writing to it, no more fallback reads).
2. **Deploy Application (Version B).**
3. Run a final migration to drop the `first_name` column from the database.

## Documenting Content Type Changes

When end-users modify custom block schemas via the Zenith CMS Admin Dashboard, the changes apply immediately. 
Existing documents built with the old schema structure will not break:
- Removed fields are ignored by the API during read and implicitly dropped on next save.
- Added fields default to `undefined` or default values specified in the schema.

To ensure consistency, UI components must be defensive and implement the forgiving reader pattern when rendering content fields.
