# 👥 Zenith Live Collaboration & Team Presence Engine (`COLLABORATION.md`)

Zenith incorporates a high-fidelity, real-time collaboration engine that connects distributed editors through live presence states, active page indicators, and document mutex locks. This prevents content overwrites and provides teams with instant visual coordination.

---

## 🏛️ 1. Orchestration Architecture

The system operates over a low-latency **WebSocket Heartbeat connection** coupled with a light-weight Redis or in-memory dynamic state broker in the Core Express Server.

```
  ┌───────────────────────┐         ┌───────────────────────┐
  │   Editor A (Admin)    │         │   Editor B (Admin)    │
  └───────────┬───────────┘         └───────────┬───────────┘
              │ (Heartbeat WS)                  │ (Heartbeat WS)
              ▼                                 ▼
┌───────────────────────────────────────────────────────────┐
│                    Zenith Core Server                     │
│                [ Presence Registry Map ]                  │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
               [ Live Presence State Broadcast ]
```

---

## 📡 2. Heartbeat Connection Flow

Every open workspace client mounts a dedicated React hook context `usePresence` that negotiates socket lifecycles:

1. **Mount**: Client opens the dashboard, starts a WebSocket session to `ws://localhost:3000/api/v1/presence`.
2. **Heartbeat Loop**: Client dispatches a status frame every **10 seconds** describing their current activity:
   ```json
   {
     "userId": "usr_92a18d7f",
     "userName": "Jane Doe",
     "activeSiteId": "site_9210",
     "currentPath": "/collections/products/edit/prod_8218",
     "action": "viewing"
   }
   ```
3. **Registry TTL**: The server registry maintains active users with an automatic expiry window of **15 seconds**. If a client closes their tab or drops connection, they naturally timeout and disappear from other editors' screens without leaving dangling locks.

---

## 🔒 3. Real-Time Document Locks

To protect records from concurrent modification conflicts:

- When Editor A enters the Edit view for a specific document ID, the system registers a `mutex-lock` for `userId` on that document path.
- If Editor B attempts to navigate to the same edit page, they receive a warning header:
  > ⚠️ **Document locked by Jane Doe (Viewing)**
- The Save button for Editor B is dynamically disabled, converting the viewport into read-only mode until Editor A navigates away.

---

## 🛠️ 4. WebSocket & API Reference

### Presence Ping REST Fallback:

For networks with restrictive WebSocket firewalls, the client can fall back to polling the HTTP Presence interface:

- **Endpoint**: `GET /api/v1/presence`
- **Response Payload**:
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

---

## 🧠 5. AI Pair-Programming Directives for Collaboration Features

When writing updates to real-time client components:

1. **Prevent Hook Overload**: Never trigger presence updates on raw mouse move events. Only emit state changes on path transitions, form focus locks, or periodic timeout ticks.
2. **Defensive Disconnects**: Always capture `ws.onclose` and clean up local component timers (`clearInterval`) to prevent memory leaks and constant server reconnections.
3. **Graceful Degradation**: If the presence server returns a `404` or the socket disconnects, gracefully downgrade the UI by hiding the active avatars instead of crashing the dashboard layout.
