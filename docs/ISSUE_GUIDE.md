# 📋 Zenith Issue & Triage Guide (`ISSUE_GUIDE.md`)

This guide helps contributors and automated AI triage systems troubleshoot local Zenith environment anomalies, query limits, and database locks before filing formal GitHub Issues.

---

## 🛠️ 1. Environmental Triaging

When experiencing launch or execution crashes:

### Step 1: Verify Node & Dependency Alignment

Ensure your local environment matches the workspace version requirements:

```bash
# Verify active runtime
node --version # Must be >= 20.x

# Verify lockfile matches node_modules tree
npm ci
```

### Step 2: Test MongoDB DB Core Connections

If the core Express API crashes on launch, verify your Mongo daemon is active and responsive:

```bash
# Verify port binding
curl -I http://localhost:27017

# Validate MongoDB URI inside your local .env
# Example: MONGODB_URI=mongodb://localhost:27017/zenith
```

---

## 🔒 2. Resolving Document Locks

In collaborative multi-tenant environments, you may encounter lock warnings:

> ⚠️ **Document locked by [User] (Viewing)**

### Clear Stuck Mutexes

If a user session terminates abruptly without triggering socket cleanup:

1. Focus hooks release locks automatically after a **15-second TTL**.
2. Alternatively, run an admin reset command:
   ```bash
   # Clear database lock documents
   npm run db:clear-locks
   ```

---

## 🐞 3. Formatting an Actionable Ticket

Before submitting a GitHub Issue, compile telemetry details to expedite triaging:

1. **Clean Trace**: Capture and paste the complete Node/Express console stack trace, or the React runtime compiler error.
2. **Steps to Reproduce**: Provide a minimal, reproducible code snippet (such as a dynamic schema configuration or relationship mapping that triggered the bug).
3. **Specify the Monorepo Workspace**: Scope the issue to the corresponding package (e.g. `core`, `admin`, `sdk`).

---

<div align="center">
  <p><strong>Thanks for helping us keep the Zenith CMS core framework bulletproof! 🛡️</strong></p>
</div>
