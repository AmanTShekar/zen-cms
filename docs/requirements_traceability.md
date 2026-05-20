# Requirements Traceability Matrix

This document maps the security, reliability, and functional specifications of Zenith CMS to their respective implementation files in the codebase.

| Requirement ID | Requirement Name | Description | File Path | Line Range / Functions |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-SEC-001** | Brute-Force Rate Limiting | Lock out user accounts after 5 failed login attempts for 15 minutes. | [auth.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/auth.ts) | `AuthService.login` lockout counter logic |
| **REQ-SEC-002** | VM Hook Sandboxing | Run custom user scripts in worker threads with restricted scopes. | [worker-pool.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/sandbox/worker-pool.ts) | `WorkerSandboxPool` & `SandboxWorker` |
| **REQ-SEC-003** | Magic Bytes Validation | Verify magic byte headers to block MIME-type spoofing during uploads. | [upload.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/api/upload.ts) | `validateMagicBytes` middleware |
| **REQ-SEC-004** | Local Path Traversal Guard | Prevent directory traversal exploits by sanitizing incoming file names. | [local.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/storage/local.ts) | `LocalStorageProvider.upload` & `delete` |
| **REQ-SEC-005** | S3 Path Traversal Guard | Sanitize keys sent to object storage to prevent bucket escape exploits. | [s3.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/storage/s3.ts) | `S3StorageProvider.upload` & `delete` |
| **REQ-SEC-006** | Webhook SSRF protection | Validate webhook URL target IPs to prevent private range (RFC1918) requests. | [webhook.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/webhook.ts) | `isPrivateIP` & DNS lookup checks |
| **REQ-SEC-007** | Granular Dynamic RBAC | Enforce custom user resource/action credentials loaded via z_roles. | [factory.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/api/factory.ts) | `verifyGranularAccess` checks |
| **REQ-SEC-008** | External Audit Logging | Forward immutable audit logs to remote servers securely using HMAC signatures. | [audit.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/middleware/audit.ts) | `forwardAuditEvent` helper |
| **REQ-SEC-009** | Dev CI Security Gates | CI/CD actions implementing lint, vulnerability scanner, and static audit. | [.github/workflows/ci.yml](file:///c:/Users/Asus/Desktop/cms/.github/workflows/ci.yml) | GitHub security gates and runner setup |
| **REQ-DB-001** | Multi-Tenant Pooling | Isolate tenant access pools dynamically using distinct site scopes. | [PostgresDrizzleAdapter.ts](file:///c:/Users/Asus/Desktop/cms/packages/db-postgres/src/PostgresDrizzleAdapter.ts) | Connection string pooling lookup |
| **REQ-DB-002** | Migration Concurrency Guard | Use database advisory locks during boot to prevent multi-node conflicts. | [PostgresDrizzleAdapter.ts](file:///c:/Users/Asus/Desktop/cms/packages/db-postgres/src/PostgresDrizzleAdapter.ts) | `pg_advisory_lock` in `_ensureSystemTables` |
| **REQ-OPS-001** | Maintenance Mode | Intercept client requests and return 503 during system maintenance. | [maintenance.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/middleware/maintenance.ts) | `maintenanceMiddleware` bypass checks |
| **REQ-OPS-002** | Observability Metrics | Prometheus-compatible statistics endpoint tracking Node heap and execution load. | [metrics.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/middleware/metrics.ts) | `metricsMiddleware` telemetry registry |
| **REQ-OPS-003** | Asynchronous Tracing | Correlate async processes and request context headers using traceparent tags. | [tracer.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/tracer.ts) | AsyncLocalStorage trace context tracker |
| **REQ-OPS-004** | Media Cleaner Service | Orphaned media sweeper running query lookups on uploads. | [sweeper.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/services/storage/sweeper.ts) | DB relation scanning and file unlinking |
| **REQ-OPS-005** | Selective Version Rollback | Field-level historical rollback API for documents without resetting whole state. | [versions.ts](file:///c:/Users/Asus/Desktop/cms/packages/core/src/api/versions.ts) | `/rollback-fields` restore logic |
