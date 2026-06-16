# Zenith CMS — Troubleshooting & Issue Triage

This document provides a deterministic process for isolating environmental variables, resolving database connectivity faults, and safely releasing orphaned collaboration locks prior to escalating issues to the maintainers.

---

## 1. Environment Verification

Before assuming a runtime defect, verify the host execution environment against the system prerequisites.

**Node.js Constraints:**
```bash
node --version # Strictly requires v20.0.0 or higher. Use 'nvm use' if incorrect.
```

**Dependency Synchronization:**
Compilation errors often stem from desynchronized lockfiles across the monorepo packages. To enforce strict resolution:
```bash
pnpm install --frozen-lockfile
```

---

## 2. Database Connectivity Diagnostics

If the core Express server crashes upon initialization with a `MongoNetworkError` or `ECONNREFUSED` exception, the adapter is failing to establish a TCP connection with the storage layer.

1. **Verify Daemon Execution:**
    ```bash
    # Test MongoDB availability
    curl -I http://localhost:27017

    # Test PostgreSQL availability
    curl -I http://localhost:5432
    ```
2. **Review `.env` Configuration:**
    Ensure `DATABASE_TYPE` exactly matches either `mongodb` or `postgres`.
    Ensure the corresponding URI variable (`MONGODB_URI` or `POSTGRES_URI`) contains the correct credentials, host, port, and database name.

---

## 3. Resolving Stale Document Locks

The Zenith concurrency controller uses pessimistic locking during active editing sessions. If a client disconnects unexpectedly, the system may retain an orphaned lock state, displaying the warning: `Document locked by [User]`.

**Resolution Paths:**
1. **Automated TTL:** Wait 60 seconds. The server's garbage collection interval will automatically reap the stale heartbeat registration.
2. **Manual Intervention:** If you are the system administrator and require immediate lock destruction, execute the cache purge script from the project root:
    ```bash
    pnpm run db:clear-locks
    ```

---

## 4. Escalation Protocol (Filing GitHub Issues)

If the issue persists after isolating environmental variables, file a detailed defect report.

To ensure rapid triage, your report must include:
1. **Unabridged Stack Traces:** Provide the full error log output from either the Node.js console or the browser DevTools. Do not truncate the logs.
2. **Deterministic Reproduction Steps:** Clearly state the precise sequence of actions or API calls required to trigger the failure state.
3. **Monorepo Localization:** Specify which sub-package (`@zenith-open/zenithcms-core`, `@zenith-open/zenithcms-admin`, or `@zenith-open/zenithcms-types`) is raising the exception.
