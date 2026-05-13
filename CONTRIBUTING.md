# Contributing to Zenith CMS

First of all, thank you for showing interest in contributing to Zenith! We believe in building the world's most powerful industrial operational platform, and we welcome developers who share that vision.

---

## 🏗️ Development Workflow

1.  **Fork and Clone**: Create your own branch from `main`.
2.  **Environment**: Set up your `.env` as described in the [Installation Guide](./docs/INSTALLATION.md).
3.  **Monorepo Rules**: 
    *   Never import from `packages/admin` into `packages/core`.
    *   Follow the **"No-Barrel-File"** policy to keep builds lean.
    *   Run `npm run check-deps` before submitting any PR to ensure architectural integrity.

## 🎨 Design Standards
If you are contributing to the Admin UI:
*   Follow the **Industrial Aesthetic** (High-density, monochromatic, monochromatic-accented).
*   Ensure all new components use **Framer Motion** for smooth, tactile transitions.
*   Use **Lucide React** for icons.

## 🧪 Testing
We use **Vitest** for the core engine. Ensure that any new feature includes comprehensive unit and integration tests:
```bash
npm run test
```

## 📜 Commit Messages
We follow the **Conventional Commits** specification:
*   `feat:` New features
*   `fix:` Bug fixes
*   `refactor:` Code changes that neither fix a bug nor add a feature
*   `perf:` Performance improvements

---

<div align="center">
  <p><strong>Let's reach the Zenith together.</strong></p>
</div>
