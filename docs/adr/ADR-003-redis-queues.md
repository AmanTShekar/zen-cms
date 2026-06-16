# ADR 003: Redis-Backed Webhook Delivery Queue

## Status
Accepted

## Context
Zenith CMS dispatches outbound webhook notifications to external HTTP endpoints in response to content mutations. Triggering synchronous HTTP requests to untrusted, external endpoints within the primary event loop introduces severe reliability vectors:
1. High-latency or stalled external endpoints directly degrade client response times.
2. Transient network failures or DNS resolution errors result in permanently lost webhook notifications.
3. The absence of rate limiting can inadvertently execute Denial of Service (DoS) attacks against external targets or exhaust the host's available socket pool.

## Decision
The architecture utilizes a Redis-backed delivery queue managed via `ioredis` to decouple webhook execution from the primary HTTP lifecycle.
1. Mutative actions commit webhook event payloads to a Redis sorted set queue.
2. An isolated pool of background worker processes polls the queue, executing HTTP dispatches with implemented exponential backoff algorithms for failed deliveries.
3. Server-Side Request Forgery (SSRF) protections are strictly enforced at the worker level, performing pre-flight DNS validation to block resolution of private IP address spaces (RFC 1918).
4. For single-node deployments lacking Redis infrastructure, the system gracefully degrades to an in-memory queue to sustain basic operational capability.

## Consequences
### Positive
- **Guaranteed Delivery:** Provides robust reliability via automated exponential retries.
- **Latency Decoupling:** Completely isolates external webhook execution latency from the core REST API request-response cycle.
- **Security Posture:** Hardens the host environment against SSRF vectors.

### Negative
- **Infrastructure Dependency:** Introduces a runtime dependency on Redis to achieve true horizontal scalability in production environments.
