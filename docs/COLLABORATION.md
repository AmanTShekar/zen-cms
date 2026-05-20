# Real-Time Collaboration & Presence

When multiple editors work on the same website, it's easy to overwrite each other's changes. Zenith CMS prevents this with real-time collaborative indicators and active document locking.

---

## 🏛️ How Presence Syncs

The collaboration system runs over low-latency WebSockets, backed by an in-memory or database-driven state store in the backend engine:

```
    [ Editor A ] (Websocket)                [ Editor B ] (Websocket)
            \                                      /
             v                                    v
     +----------------------------------------------------+
     |                 Zenith Core Server                 |
     |              [ Active Presence List ]              |
     +-------------------------+--------------------------+
                               |
                               v
             [ Real-Time UI Presence Broadcast ]
```

---

## 📡 Heartbeat Connection Lifecycle

When a user opens the admin dashboard, the frontend mounts the `usePresence` hook:

1.  **WebSocket Connection**: The browser opens a WebSocket connection to `ws://localhost:3000/api/v1/presence`.
2.  **Heartbeat Broadcast**: Every **10 seconds**, the client sends a small JSON heartbeat payload containing the user's details and active page path:
    ```json
    {
      "userId": "usr_92a18d7f",
      "userName": "Jane Doe",
      "activeSiteId": "site_9210",
      "currentPath": "/collections/products/edit/prod_8218",
      "action": "viewing"
    }
    ```
3.  **Automatic Expiration**: The server automatically expires inactive users after **60 seconds**. If an editor closes their tab or disconnects, their lock is released naturally without leaving orphaned blocks.

---

## 🔒 Document Lock Mechanics

To prevent save conflicts, Zenith uses document locks:

*   **Entering Edit Mode**: When Editor A opens a page, the server registers a lock for Editor A on that document path.
*   **Editor B Access**: If Editor B opens the same page, the dashboard notifies them:
    > ⚠️ **Document locked by Jane Doe**
*   **Read-Only Mode**: Editor B's save button is disabled, converting their screen to read-only until Editor A leaves or the lock expires.

---

## 🛠️ API & WebSocket Reference

### HTTP Presence Fallback
If WebSockets are blocked by proxy servers or firewalls, Zenith falls back to polling the HTTP API:

*   **Endpoint**: `GET /api/v1/presence`
*   **Response**:
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

## 💡 Developer Guidelines for Collaboration Features

*   **Throttle Updates**: Never trigger socket messages on mouse moves. Only dispatch messages when the user changes pages, focuses on a form, or on the 10-second timer.
*   **Clean Up Handlers**: Always handle WebSocket closures and clean up timers (`clearInterval`) in your React components to prevent memory leaks.
*   **Fail Gracefully**: If the presence server is unavailable, the dashboard should simply hide the avatars and let editors modify files rather than locking the screen or crashing the application.
