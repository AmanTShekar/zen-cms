# 🤝 Contributing to Zenith CMS

First of all, thank you for taking the time to contribute! Zenith CMS is built on **Industrial Precision**, and we strive to maintain the highest standards of architectural stability, security, and developer experience.

This guide outlines our development standards, commit workflows, and environment setups to ensure your contributions fit seamlessly into the platform.

---

## 🏛️ 1. Project Directory Topology

Zenith is organized as an enterprise-grade monorepo containing the following core workspaces:

```text
.
├── packages/
│   ├── types/          # Shared interfaces & validation schemas
│   ├── core/           # Express-based REST & dynamic schema kernel
│   ├── admin/          # Vite React dashboard with dark glassmorphic styling
│   └── sdk/            # Headless Node & browser client SDK
├── docs/               # Technical manuals and developer onboarding playbooks
├── tests/              # Monorepo-wide integration and unit test fixtures
└── .devcontainer/      # Isolated Docker containerized workspaces
```

### Monorepo Boundaries:

- **Core ↛ Admin**: Never import admin React files, hooks, or assets into `@zenithcms/core`.
- **Types ↠ All**: `@zenithcms/types` is the single source of truth for both core validation and frontend builders.
- **No Barrel Files**: Always use explicit named imports (`import { x } from './module'`) to facilitate Rollup and Vite tree-shaking and prevent server/client context bleeding.

---

## 🤖 2. AI Code Assistant Integration

Zenith is an **AI-first codebase**, equipped with dedicated playbooks and environment integrations:

| AI tool              |              Context Playbooks              | Auto-Hooks Verification  |  Dockerized Env  |
| :------------------- | :-----------------------------------------: | :----------------------: | :--------------: |
| **Claude Code**      | ✅ [`.claudeprompt`](file:///.claudeprompt) | ✅ Husky standard gates  | ✅ Dev Container |
| **Cursor**           |  ✅ [`.cursorrules`](file:///.cursorrules)  | ✅ Pre-commit formatting | ✅ Dev Container |
| **ChatGPT / Gemini** |           ✅ Playbook directives            |    ⚠️ Manual CLI run     | ✅ Dev Container |

AI assistants working in this repository must strictly adhere to the guidelines outlined in the [AI-Driven Development Protocol](./docs/AI_DEVELOPMENT.md).

---

## 💻 3. Docker & Devcontainer Setup

Zenith includes a fully-configured Dev Container setup to allow developers to spin up the entire development stack with one click:

### Prerequisites:

- Docker Desktop or OrbStack installed on your system.
- VS Code with the **Dev Containers** extension.

### Quick Start:

1. Open the repository root in VS Code.
2. Select **"Reopen in Container"** from the pop-up or run `Dev Containers: Reopen in Container` from the Command Palette (`Ctrl+Shift+P`).
3. Once the environment initializes inside the Node.js 20/pnpm Docker container, run the monorepo services:
   ```bash
   pnpm install
   npm run dev
   ```

---

## 🧪 4. Testing & Validation Matrix

We use **Vitest** for server-side core unit testing and schema checks:

### Running Test Pipelines:

```bash
# Run integration and schema checks
npm run test

# Check all source files for formatting consistency
npx prettier --check .

# Validate typescript compilations
npm run build
```

### Guidelines for Writing Tests:

- **Clean State Hooks**: Always clean up dynamic test items inside database collections. Utilize `afterEach` hooks to delete newly inserted mock records so that test sequences remain strictly isolated.
- **Defensive Error Assertions**: Write explicit assertions check for bad payloads (`422 Validation Errors`) rather than generic try/catch suppressions.

---

## 📝 5. Conventional Commits & Pull Requests

This repository follows the **Conventional Commits** specification to automatically compile structured CHANGELOGs.

### PR and Commit Title Format:

`<type>(<scope>): <short description>`

- **Types**:
  - `feat`: A new user-facing feature.
  - `fix`: A bug fix or minor patch.
  - `docs`: Documentation edits.
  - `refactor`: Code changes that neither fix a bug nor add a feature.
  - `perf`: Performance-centric optimizations.
  - `chore`: Tooling updates, dependency bumps, or config adjustments.
- **Scopes**: Matches the corresponding monorepo package folder (e.g. `core`, `admin`, `sdk`, `types`).

### Examples:

- `feat(admin): integrate custom drag-and-drop widget grid`
- `fix(core): secure dynamic postgres access rules`
- `docs(onboarding): clarify quickstart env definitions`

---

<div align="center">
  <p><strong>Let's scale the Zenith of headless content orchestration together! 🚀</strong></p>
</div>
