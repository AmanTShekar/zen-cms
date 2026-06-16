# PHASE 2 — MULTI-TENANCY ISOLATION AUDIT

## CRITICAL FINDING: Systemic Lack of Tenant Isolation

Across the Zenith CMS codebase, **multi-tenant isolation is broken at the architectural level**. Many core endpoints operate on a global scope, fetching all records and filtering in JavaScript rather than delegating to the database with a `siteId` filter. This introduces both a massive security vulnerability (potential for cross-tenant data leakage) and a severe performance bottleneck.

### Unscoped Data Access Patterns

The following modules exhibit critical isolation failures:

*   **User & Role Management:** `api/roles.ts`, `api/system/cache-jobs.ts`, and `api/auth.ts` endpoints query the `users` and `roles` collections without a `siteId` filter. This allows any authenticated user to list all users and roles across all tenants.
*   **Settings & Configuration:** `/api/v1/system/settings` and `/api/v1/system/onboarding` operate on a single, unscoped global row.
*   **Media & Comments:** Endpoints like `GET /api/v1/media/:id/transform` and `PATCH | DELETE /api/v1/comments/:id` look up records by `_id` without checking the associated `siteId`.
*   **Workspaces & Sites:** `workspaces.ts` and `sites.ts` fetch all database records and perform membership checks in-memory, which is both insecure and highly inefficient.

### Blast Radius

In a multi-tenant environment (e.g., SaaS), an authenticated user from Tenant A can:
1.  **List** all users, roles, and workspaces from Tenant B.
2.  **Access** unscoped settings, media, and comments from other tenants.
3.  **Potentially modify** global configuration or resources belonging to other tenants.

This represents a **COMPLETE FAILURE** of the multi-tenancy requirement stated in `AGENTS.md`.

### Remediation

1.  **Database-Level Enforcement:** Add a `siteId` index to every tenant-scoped collection and enforce it at the database adapter level.
2.  **Refactor API Endpoints:** Update all endpoints to include `siteId` in their initial database queries. Do not rely on in-memory JavaScript filtering for security boundaries.
3.  **Middleware Validation:** Ensure the `siteId` is validated in the request context (`req.siteId`) before any database operation begins.

---

*Carry-forward register will be appended after all phases are complete.*
