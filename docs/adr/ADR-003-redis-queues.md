# ADR 003: Redis-Backed Webhook Delivery Queue

## Status
Accepted

## Context
When content updates occur, Zenith CMS dispatches webhook notifications to external HTTP endpoints. Since these endpoints are external and untrusted, triggering requests synchronously in the HTTP thread poses serious issues:
1. Slow external endpoints stall client response times.
2. Network timeouts or failures result in lost webhook notifications.
3. Lack of rate control can overload external targets or exhaust local sockets.

## Decision
We implemented a Redis-backed webhook delivery queue utilizing `ioredis`:
1. Mutating content actions push events to a Redis sorted set queue.
2. Background worker processes poll the Redis queue, executing HTTP dispatches with exponential backoff retries on failure.
3. Hosts without Redis fall back automatically to an in-memory queue to maintain basic operation.
4. SSRF protection is built-in, performing DNS validation to block private IP ranges (RFC1918).

## Consequences
- **Pros:** Guarantees reliable delivery with automatic retries; completely decouples webhook execution latency from the request-response cycle; blocks SSRF attacks.
- **Cons:** Introduces a runtime dependency on Redis for production scaling.
