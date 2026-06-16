# Contributing to Zenith CMS

Zenith CMS is architected for industrial precision. We maintain the highest standards of structural stability, security, and developer experience.

This document formalizes our development standards, commit workflows, and environment orchestration protocols.

---

## 1. Project Directory Topology

Zenith is organized as an enterprise-grade monorepo containing the following core workspaces:

```text
.
├── packages/
│   ├── types/          # Shared interfaces & validation schemas
│   ├── core/           # Express-based REST & dynamic schema kernel
│   ├── admin/          # Vite React dashboard
│   └── sdk/            # Headless Node & browser client SDK
├── docs/               # Technical manuals and developer onboarding playbooks
├── tests/              # Monorepo-wide integration and unit test fixtures
└── .devcontainer/      # Isolated Docker containerized workspaces
```

### Monorepo Boundaries

- **Core to Admin Strict Isolation**: The `@zenith-open/zenithcms-core` package must never import React files, frontend hooks, or client assets.
- **Unified Typings**: `@zenith-open/zenithcms-types` serves as the single source of truth for both core validation logic and frontend rendering.
- **Explicit Exports**: The repository forbids the use of barrel files (`index.ts`). Always use explicit named imports (`import { x } from './module'`) to facilitate optimal tree-shaking via Rollup/Vite and prevent server context from bleeding into the client bundle.

---

## 2. Docker & Devcontainer Environment

Zenith provides a fully configured Dev Container environment, enabling contributors to initialize the entire development stack deterministically.

### Prerequisites

- Docker Desktop or OrbStack.
- Visual Studio Code with the **Dev Containers** extension.

### Initialization Sequence

1. Open the repository root in VS Code.
2. Select **"Reopen in Container"** from the prompt or execute `Dev Containers: Reopen in Container` from the Command Palette (`Ctrl+Shift+P`).
3. Once the Node.js 20/pnpm Docker container mounts, initialize the services:
   ```bash
   pnpm install
   npm run dev
   ```

---

## 3. Testing & Validation Matrix

The core backend and schema validation engines are tested via **Vitest**.

### Executing Validation Pipelines

```bash
# Execute integration and schema test suites
npm run test

# Audit formatting consistency across all source files
npx prettier --check .

# Validate TypeScript compilation across all workspaces
npm run build
```

### Test Authoring Constraints

- **Deterministic State**: Tests must utilize `afterEach` lifecycle hooks to purge mock records from the database. Test sequences must remain strictly isolated.
- **Defensive Assertions**: Assertions must verify explicit failure states (e.g., verifying `422 Unprocessable Entity` payloads) rather than masking failures with generic try/catch blocks.

---

## 4. Conventional Commits

This repository enforces the **Conventional Commits** specification to facilitate automated, structured CHANGELOG generation.

### Commit Format

`<type>(<scope>): <short description>`

- **Types**:
  - `feat`: A new user-facing feature.
  - `fix`: A bug fix or patch.
  - `docs`: Documentation modifications.
  - `refactor`: Structural changes that neither fix bugs nor add features.
  - `perf`: Performance optimizations.
  - `chore`: Tooling updates, dependency management, or pipeline adjustments.
- **Scopes**: Must correlate to the relevant monorepo package (e.g., `core`, `admin`, `sdk`, `types`).

### Examples

- `feat(admin): integrate custom drag-and-drop widget grid`
- `fix(core): secure dynamic postgres access rules`
- `docs(core): clarify quickstart environment variables`
