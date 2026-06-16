# Zenith CMS — Real-Time Collaboration & Presence

Concurrent modification of content models or document data introduces race conditions and data loss risks. Zenith CMS mitigates these risks at the infrastructure level via active document locking and real-time presence synchronization.

---

## 1. Presence Synchronization Architecture

The collaboration state is synchronized across active clients using a low-latency WebSocket connection, backed by either an in-memory store (in development) or a distributed Redis instance (in production).

```
    [ Client A ] (Websocket)                [ Client B ] (Websocket)
             \                                      /
              v                                    v
      +----------------------------------------------------+
      |                 Zenith Core Server                 |
      |              [ Active Presence Ledger ]            |
      +-------------------------+--------------------------+
                                |
                                v
                [ Presence Broadcast Event Bus ]
```

## 2. Heartbeat Connection Lifecycle

When a client instantiates the Admin UI, the frontend establishes a persistent WebSocket connection to the core server on the `/api/v1/presence` endpoint.

1. **Connection Initialization**: Handshake and token verification.
2. **Heartbeat Broadcast**: A lightweight telemetry payload is transmitted every 10 seconds:
    ```json
    {
      "userId": "usr_92a18d7f",
      "userName": "Jane Doe",
      "activeSiteId": "site_9210",
      "currentPath": "/collections/products/edit/prod_8218",
      "action": "viewing"
    }
    ```
3. **Garbage Collection**: The presence ledger enforces a strict 60-second Time-To-Live (TTL) on all connected clients. If a client disconnects unexpectedly without transmitting a teardown sequence, the lock expires automatically.

---

## 3. Distributed Document Locking

To guarantee data integrity, Zenith employs optimistic document locks.

- **Lock Acquisition**: When Client A navigates to an editing context for a specific document, the core server issues an exclusive lock bound to `userId` and `documentId`.
- **Conflict Notification**: If Client B navigates to the same document, the system broadcasts a lock conflict event.
- **Read-Only Degradation**: The frontend intercepts the conflict event, disables mutation vectors (save buttons, form inputs), and degrades the UI into a read-only state until the lock is released or garbage collected.

---

## 4. Presence API Fallback Configuration

If corporate firewalls or proxies aggressively terminate WebSocket connections, the core server supports standard HTTP polling.

**Endpoint**: `GET /api/v1/presence`

**Response Specification**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "usr_92a18d7f",
      "userName": "Jane Doe",
      "email": "jane@zenith.dev",
      "activeSiteId": "site_9210",
      "currentPath": "/collections/products/edit/prod_8218",
      "lastSeen": "2026-05-17T23:45:00Z"
    }
  ]
}
```

## 5. Implementation Constraints for Custom Plugins

When extending the Admin UI or building custom administrative interfaces:
- Do not bind presence dispatch events to high-frequency actions (e.g., `mousemove` or `keyup`). Route updates strictly through the 10-second heartbeat cycle.
- Explicitly invoke `clearInterval` upon component unmount to prevent resource leaks and orphaned connections.
- Ensure the application handles network partitions gracefully. If the WebSocket disconnects, revert to standard optimistic concurrency control (HTTP 409 Conflict handling) rather than permanently locking the interface.
