# Zenith API Reference: Enterprise REST & GraphQL

The Zenith Core features a hardened, high-speed routing layer equipped with Ahead-Of-Time (AOT) schema validation and multi-site tenant isolation.

---

## 🔒 1. Global Session & Tenant Scoping Headers

All requests directed to the Zenith Core API must include a valid session token (or static API Key) paired with the workspace scoping header.

```http
Authorization: Bearer <JWT_TOKEN_HERE>
X-API-KEY: <STATIC_ACCESS_KEY_HERE>
X-Zenith-Site-Id: <SITE_OR_TENANT_ID_HERE>
```

> [!WARNING]
> Requests omitted or presenting incorrect `X-Zenith-Site-Id` values will be instantly scoped out, resulting in empty responses or `403 Forbidden` statuses.

---

## 👥 2. Real-Time Collaborative Presence API

Used to coordinate concurrent multi-editor collaboration and lock fields in real-time.

### A. Publish Presence Heartbeat

- **Endpoint**: `POST /api/v1/presence/heartbeat`
- **Payload JSON**:

```json
{
  "collection": "pages",
  "documentId": "65e8f17c24f2b9001b9728cb"
}
```

- **Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```

### B. List Online Editors for Document

- **Endpoint**: `GET /api/v1/presence/:collection/:documentId`
- **Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "isLocked": true,
    "activeUsers": [{ "id": "user_992", "email": "clara@zenith.io" }],
    "message": "clara is also editing this document"
  }
}
```

### C. Retrieve All Active Editors Across Workspace (Dashboard Status)

- **Endpoint**: `GET /api/v1/presence`
- **Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    { "id": "user_992", "email": "clara@zenith.io" },
    { "id": "user_104", "email": "dave@zenith.io" }
  ]
}
```

---

## 📦 3. Dynamic REST Collections API

Zenith dynamically synthesizes collections specified in `cms.config.ts` into individual Express endpoints.

### A. Query/Filter Collection Documents

- **Endpoint**: `GET /api/v1/:collection_slug`
- **Query Selectors**:
  - `limit`: Integer (Default: `10`)
  - `page`: Integer (Default: `1`)
  - `sort`: String (e.g. `createdAt` or `-price` for descending)
  - `filter`: Stringified JSON (e.g. `{"status": "published", "price": {"$gt": 49}}`)

### B. Update Record

- **Endpoint**: `PATCH /api/v1/:collection_slug/:id`
- **Payload JSON**: Only includes properties to update.
- **Headers**: Requires JWT Authorization token.

---

## 🕸️ 4. Unified GraphQL Schema Core

Exposes a rich type system for nested queries.

- **Endpoint**: `POST /api/v1/graphql`
- **Query Payload**:

```graphql
query GetProducts($limit: Int) {
  getProducts(limit: $limit, sort: "-createdAt") {
    docs {
      id
      title
      price
      category {
        name
        slug
      }
    }
    totalDocs
  }
}
```

---

## 📈 5. Telemetry & Workspace Health Diagnostics

### A. Core Telemetry Diagnostic Pulse

- **Endpoint**: `GET /api/v1/system/health`
- **Success Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 184920,
    "database": {
      "adapter": "postgres-drizzle",
      "latency": "4ms",
      "connected": true
    },
    "presence": {
      "activeKeys": 4
    }
  }
}
```

### B. Read Tenant Security Audit Trails

- **Endpoint**: `GET /api/v1/system/audit`
- **Query Selectors**: `limit=20`
- **Security Level**: Admin restricted.
