# Troubleshooting & Triage Guide

This guide helps you resolve common environment issues, database connection errors, and collaborative editing locks before creating a GitHub issue.

---

## 🛠️ Common Environment Issues

### 1. Verification of Node Version
Ensure your local Node version satisfies the project's requirements:

```bash
node --version # Must be >= 20.x
```

### 2. Lockfile and Dependency Setup
If you experience compile issues, try cleanly re-installing dependencies:

```bash
pnpm install --frozen-lockfile
```

### 3. Database Connectivity
If the server crashes on launch, check that your PostgreSQL or MongoDB server is running:

```bash
# For MongoDB default port:
curl -I http://localhost:27017

# For PostgreSQL default port:
curl -I http://localhost:5432
```
Make sure the connection URI in your `.env` matches your database configuration.

---

## 🔒 Resolving Active Document Locks

Because Zenith CMS prevents editors from overwriting each other's changes, you might occasionally see a lock message:

> ⚠️ **Document locked by [User]**

### How locks are cleared:
1.  **Automatic Expiration**: Locks release automatically after a **60-second** inactivity period.
2.  **Manual Database Clear**: If a lock gets stuck due to an abrupt disconnection, you can clear the presence ledger directly:
    ```bash
    pnpm run db:clear-locks
    ```

---

## 🐞 Creating a GitHub Issue

If you find a bug that needs fixing, please open a GitHub issue with the following details:

1.  **Console Logs**: Paste the stack trace from the server console or the browser DevTools.
2.  **Reproduction Steps**: Describe exactly what you clicked or what API call you made to trigger the error.
3.  **Monorepo Package**: Note which package the bug resides in (e.g. `core`, `admin`, `sdk`).

Thank you for helping keep Zenith CMS clean and stable! 🛡️
