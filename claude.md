# CLAUDE.md

This file provides system architecture guidance, coding standards, and monorepo workflows to Claude Code, Cursor, and any agentic AI developers operating inside the Zenith CMS codebase.

---

## 🏛️ 1. Project Structure

Zenith CMS is an enterprise-grade, high-performance multi-tenant headless CMS structured as a pnpm monorepo.

```
c:/Users/Asus/Desktop/cms/
├── packages/
│   ├── core/         # Headless API Engine (Express, Mongoose/Postgres adapters, Zod parser)
│   ├── admin/        # Glassmorphic Admin Dashboard (Vite, React, Zustand, Tailwind, D&D Grid)
│   ├── blog-demo/    # Demo Storefront (Vite, React, Tailwind, dynamic content sync)
│   └── types/        # Unified Workspace TypeScript definitions & generated collection interfaces
├── internal/
│   └── reports/      # Deep architectural audits, Vanguard matrices, and stabilization specs
└── docs/             # Technical specifications & AI development playbooks
```

### Decoupling Rules (Crucial)
1. **`packages/core`** is strictly server-side. It must **never** import React, bundler assets, or client state libraries.
2. **`packages/admin`** must strictly fetch data via the custom Axios/fetch `api` instance in `packages/admin/src/lib/api.ts` (with multi-tenant header propagation).
3. **`packages/types`** serves as the single source of truth for the entire workspace. All shared interfaces are defined or compiled here.

---

## 🛠️ 2. Build & Test Commands

Always run commands from the repository root using `pnpm`:

*   **Install Dependencies**: `pnpm install`
*   **Compile All Workspace Packages**: `pnpm run build`
*   **Run Unit & Integration Test Suites**: `pnpm test`
*   **Start Local Development Servers**:
    *   Whole Monorepo: `pnpm run dev`
    *   Core Engine only: `pnpm --filter @zenithcms/core dev`
    *   Admin Dashboard only: `pnpm --filter @zenithcms/admin dev`

---

## 🎨 3. Design Aesthetics & Visual Guardrails

Zenith CMS stands for visual excellence. Default browser styles or flat layouts are **unacceptable**.

*   **Theme Archetype**: Premium, responsive glassmorphism.
*   **Visual Assets**: Always utilize vibrant, Tailwind-driven HSL tailwinds, deep dark modes (`#0B0F19`), and rich backdrop blurs (`backdrop-blur-md`).
*   **Typography**: Utilize Outfit or Inter fonts with highly deliberate line height mappings.
*   **Dynamic States**: Incorporate smooth micro-animations (`framer-motion`) and elegant active transition indicators on every primary layout.
*   **No Placeholders**: Never write comments like `// TODO: implement later` or inject static mock images. If an image is needed, generate a real design asset.

---

## 🛡️ 4. Code Standards & Architecture Guidelines

To maintain system stability and prevent regression, always adhere to these engineering rules:

### A. Dynamic Tenant Scoping
Every database lookup, write, and deletion query inside `packages/core` must securely resolve multi-tenancy.
*   Retrieve the tenant identifier via the `X-Zenith-Site-Id` header mapping.
*   Ensure that the `siteId` is explicitly passed to and checked against the database adapter's schema constraints.

### B. Database-Agnostic Operations
*   Never write adapter-specific code (e.g. native MongoDB `$regex` or Postgres `ILIKE`) directly in API controllers.
*   Always define query methods on `DatabaseAdapter` in `packages/core/src/database/adapters/DatabaseAdapter.ts` and call them safely via the active database adapter.

### C. Drag-and-Drop Canvas Constraints
*   The `DashboardBuilder` grid utilizes exactly **one** root `DndContext` to coordinate canvas widgets.
*   **Never** nest duplicate context providers.
*   Ensure custom widgets are bound in rigid layout boundaries (`w-full h-full select-none`) to preserve coordinates during repositioning.

### D. Security & Brute Force Lockout
*   Passwords must conform to rigorous strength checks (minimum 8 characters, containing uppercase, lowercase, numbers, and symbols).
*   Any client authentication attempts must pass through the brute-force security lockouts in `AuthService` (maximum 5 failed login attempts before locking out the account for 15 minutes).
*   Always use HttpOnly, Secure, SameSite=Strict cookies to transport refresh tokens.

### E. Zero-Dependency Browser Integration
*   The Zenith Client SDK must remain completely zero-dependency, using the native browser `fetch` standard instead of bulky libraries like `axios`.
*   Include built-in Stale-While-Revalidate (SWR) cache layers for high-performance storefront requests.
