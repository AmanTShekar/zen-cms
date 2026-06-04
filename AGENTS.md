# 🤖 Zenith CMS — AI Developer Agent Playbook (AGENTS.md)

Welcome, AI coding assistant! This playbook serves as your definitive guide to working within the **Zenith CMS** repository. Adhering to these strict engineering principles, monorepo bounds, and styling systems is mandatory for successful integration and validation.

> [!NOTE]
> If you are an automated agent, add **🤖🤖🤖** to the end of your commit messages or pull request titles to trigger automated fast-track linting, formatting, and test execution validation checks.

---

## 🏛️ 1. Repository Map

Zenith CMS is structured as a robust, single-registry `pnpm` monorepo:

```
c:/Users/Asus/Desktop/cms/
├── packages/
│   ├── core/         # Backend API (Express, Mongoose/Postgres adapters, Zod/Ajv engines)
│   ├── admin/        # Headless Admin UI (Vite, React 19, Zustand, Tailwind CSS, Framer Motion)
│   ├── blog-demo/    # Visual Storefront Demo (Vite, React, dynamic SWR native fetch)
│   └── types/        # Unified Types & generated database model interfaces
├── internal/
│   └── reports/      # Architectural showdowns, audits, and Vanguard matrices
└── docs/             # Technical specifications & design system playbooks
```

### Decoupling Constraints
*   **`packages/core`** is strictly server-side Node.js logic. Do **never** import React components, CSS files, or client-side context hooks.
*   **`packages/admin`** must only access database structures via the custom HTTP instance `packages/admin/src/lib/api.ts`. All dynamic UI state must utilize Zustand stores.
*   **`packages/types`** holds our static types. All schemas, collection shapes, and API models are exported here.

---

## ⚙️ 2. Environmental Requirements & Commands

Ensure you are using:
*   **Node.js**: `^20` or `^22`
*   **Package Manager**: `pnpm` (configured with strict `.npmrc` exact overrides)

### Core Developer Lifecycle
```bash
# 1. Install precise workspace dependencies
pnpm install

# 2. Compile all packages in order
pnpm run build

# 3. Execute unit and integration tests (17/17 checks)
pnpm test

# 4. Start active development servers
pnpm run dev
```

---

## 🔒 3. Crucial Security & Multi-Tenancy Guardrails

Every contribution must maintain Zenith's rigorous multi-tenant security architecture:

### A. Brute-Force & Lockout Systems
All user authentication flows must register attempts via `AuthService` in `packages/core/src/services/auth.ts`:
*   Accounts must be locked out automatically for **15 minutes** after **5 failed login attempts**.
*   Never write standard error disclosures that reveal if an email exists (e.g. dynamic signup messages). Use standardized response formats.
*   Always transport session tokens via secure **HttpOnly, SameSite=Strict cookies**.

### B. Dynamic Tenant Isolation
*   Every data access query on user, collection, or media databases must verify active scopes using the `X-Zenith-Site-Id` header mapping.
*   Confirm that the `siteId` is securely resolved inside Express endpoints before querying.

### C. Agnostic Database Queries
*   Never write raw database drivers (like MongoDB regex queries) directly inside router endpoints.
*   All queries must route through the clean database interface in `DatabaseAdapter.ts` to allow both Mongoose and Drizzle backends to scale perfectly.

---

## 🎨 4. Premium Design System: Glassmorphism

Zenith CMS demands state-of-the-art UI styling. Flat, generic, or default browser layouts will be rejected.

### Grid Card CSS Recipe
All admin dashboard container panels must satisfy this specific visual specification:
```css
/* Deep dark translucent card layout */
background-color: rgba(17, 24, 39, 0.65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 0px;
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
```

### Design Standards Checklist
- [ ] **Harmony**: Base backgrounds must use Deep Obsidian (`#0B0F19`).
- [ ] **Accents**: Use HSL-mapped Cyber-Purple (`#8B5CF6`) or Emerald-Green (`#10B981`) instead of basic red/blue styles.
- [ ] **Interactive Scales**: Apply subtle spring scaling (`transform: scale(1.02)`) on active cards.
- [ ] **Micro-animations**: Integrate clean, hardware-accelerated Framer Motion keyframes.

---

## 🛡️ 5. Quality & Pre-PR Gate Checklist

Before proposing a change or raising a pull request, run the following verification pipeline:

1.  **TypeScript Compilation**: Compile the entire monorepo:
    ```bash
    pnpm run build
    ```
2.  **Lint Verification**: Enforce clean styling rules:
    ```bash
    pnpm run lint
    ```
3.  **Core Testing Suite**: Run the core integrations:
    ```bash
    pnpm test
    ```
    Ensure **17/17 tests** pass cleanly with 100% success.
