# ADR 001: Sandboxing Dynamic Custom VM-Execution Hooks

## Status
Accepted

## Context
Zenith CMS allows developers to write custom server-side hooks (such as `beforeValidate`, `afterChange`) to process collection items dynamically. Since these hooks run custom, arbitrary JavaScript code, executing them directly in the main Express event loop thread poses major security and reliability risks:
1. Unhandled user code errors could crash the entire CMS process.
2. Long-running or infinite loops in user code could starve the single-threaded event loop, leading to Denial of Service (DoS) for all clients.
3. User code could access Node's native `fs`, `child_process`, or process environment variables, leaking sensitive system data.

## Decision
We implemented a custom hook sandboxing system using a pool of Node.js `worker_threads` coupled with isolated `vm` context compilation:
1. When the CMS boots, it instantiates `WorkerSandboxPool` managing a set of dedicated worker processes.
2. Custom scripts are loaded, compiled, and run within an isolated `vm` context where sensitive Node globals (`process`, `require`, `global`) are withheld or mocked.
3. Dynamic timeout parameters are configured to forcibly terminate hooks exceeding limits.

## Consequences
- **Pros:** Isolates memory/process crashes from the core HTTP API; blocks basic global/scope pollution and environment variable leaks.
- **Cons:** Spawning worker threads increases process footprint and memory usage. Communication overhead between the worker thread and main process via message passing can add slight latency on mutating requests.
