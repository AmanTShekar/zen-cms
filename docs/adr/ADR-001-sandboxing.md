# ADR 001: Sandboxing Dynamic VM-Execution Hooks

## Status
Accepted

## Context
Zenith CMS permits the definition of custom server-side hooks (e.g., `beforeValidate`, `afterChange`) to process collection items dynamically. Executing arbitrary user-defined JavaScript within the primary Express event loop introduces critical security and reliability vulnerabilities:
1. Unhandled exceptions in user code induce fatal process termination.
2. Unbounded execution cycles (infinite loops) starve the single-threaded event loop, resulting in a Denial of Service (DoS) for all interconnected clients.
3. Unrestricted execution scopes permit access to Node.js native modules (`fs`, `child_process`) and environment variables, introducing significant data exfiltration risks.

## Decision
The architecture delegates custom hook execution to a dedicated sandboxing subsystem utilizing Node.js `worker_threads` and isolated `vm` contexts.
1. The CMS instantiates a `WorkerSandboxPool` during boot, managing a finite pool of pre-warmed worker processes.
2. Custom scripts are loaded, compiled, and executed within an isolated `vm` context. Access to sensitive Node globals (`process`, `require`, `global`) is explicitly withheld or securely mocked.
3. Deterministic execution limits (timeouts) are enforced at the thread level to terminate non-responsive hooks forcibly.

## Consequences
### Positive
- **Fault Isolation:** Memory leaks and fatal exceptions occurring within user scripts are isolated from the core HTTP API process.
- **Security Posture:** Prevents global scope pollution, unauthorized file system access, and environment variable exposure.

### Negative
- **Resource Overhead:** Instantiating and maintaining a pool of worker threads increases the baseline memory footprint of the application.
- **Latency:** Serialization and Inter-Process Communication (IPC) overhead between the worker thread and the main process introduces marginal latency penalties during mutative operations.
