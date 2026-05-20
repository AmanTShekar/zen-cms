---
name: zenith
description: Comprehensive expert guidance for Zenith CMS monorepo development, covering database adapters, Dynamic Zod compilers, brute force safety lockouts, and glassmorphic UI cards.
---

# Zenith CMS Developer Skill (zenith)

This skill provides expert developer playbooks, code patterns, and constraints for writing elite, high-performance, strictly typed TypeScript code in the **Zenith CMS** repository.

---

## 🏛️ 1. Monorepo Structural Rules

All changes must adhere to strict workspace bounds to prevent code regressions:

```
c:/Users/Asus/Desktop/cms/
├── packages/
│   ├── core/         # Server-side API nucleolus (Express, MongoDB/Postgres, Zod parser)
│   ├── admin/        # Glassmorphic Admin UI (Vite, React 19, Zustand, Tailwind)
│   ├── blog-demo/    # Demo Storefront (Vite, React, native SWR fetch)
│   └── types/        # Static TypeScript type maps (Single source of truth)
```

*   **Boundary Restriction**: `packages/core` must **never** import React hooks, browser APIs, or client context modules.
*   **API Interactions**: `packages/admin` must strictly query the backend via the centralized `packages/admin/src/lib/api.ts` instance (which automatically manages session context and active tenant propagation).

---

## 🔒 2. Security & Multi-Tenancy Protocols

Every API endpoint, service, and database adapter query must maintain absolute isolation:

### A. Dynamic Tenant Scoping
All query calls on databases or user indexes must propagate the active tenant via header interceptors:
*   Securely resolve the active site scope using the `X-Zenith-Site-Id` header mapping.
*   Explicitly pass the resolved `siteId` to your database filters.

### B. Brute Force Account Protection
Any authentication attempts must integrate the failed login protection mechanisms in `AuthService` (`packages/core/src/services/auth.ts`):
*   Automatically lock user accounts for **15 minutes** after **5 failed login attempts**.
*   Utilize secure, HTTP-only, secure, SameSite=Strict cookies to transport refresh tokens.

---

## 🎨 3. Glassmorphism CSS styling standards

Zenith CMS demands rich, futuristic, translucent aesthetics. Flat, default gray grids will be immediately rejected.

### Dynamic Card Recipe
All primary dashboard grids, charts, and lists must use this visual standard:
```css
/* Deep Slate Obsidian overlay */
background-color: rgba(17, 24, 39, 0.65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08); /* Transparent borders */
border-radius: 12px;
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
```

### Hover Transitions
*   Always include smooth, hardware-accelerated spring curves on hoverable elements:
    ```css
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    ```
*   Incorporate active interactive scaling scaling (`transform: scale(1.02)`) on focus.

---

## 🛠️ 4. Dynamic Zod Schema Compilation

Whenever introducing or managing dynamic schema definitions:
*   **Compile Fields Safely**: Compile field properties inside `packages/core/src/schema/engine.ts` using detailed type restrictions (`minLength`, `maxLength`, array bounds `minRows`/`maxRows`).
*   **Agnostic Search**: Never write backend-specific database string matching queries (like MongoDB `$regex` or Postgres `ILIKE`) directly in API routers. Always pipe them through the `DatabaseAdapter.search` method.
