# Zenith API Reference: Hardened Endpoints

Zenith provides a state-of-the-art API layer that supports both **REST** and **GraphQL**. Our endpoints are hardened with Zod AOT validation and integrated with the CacheService for millisecond response times.

---

## Authentication

All API requests must be authenticated using a **Bearer Token** or an **X-API-KEY** header.

```http
Authorization: Bearer <your_jwt_token>
X-API-KEY: <your_api_key>
```

---

## Collection Endpoints (REST)

Every collection defined in your `CollectionConfig` automatically generates a set of standardized endpoints.

### 1. List Documents
`GET /api/v1/:collection_slug`
*   **Query Params**: 
    *   `limit`: Number of items per page.
    *   `page`: Current page number.
    *   `sort`: Field name (prefix with `-` for descending).
    *   `filter`: JSON-based filtering (e.g., `{"status": "published"}`).

### 2. Get Single Document
`GET /api/v1/:collection_slug/:id`

### 3. Create Document
`POST /api/v1/:collection_slug`
*   **Payload**: JSON object matching the collection schema.

### 4. Update Document
`PATCH /api/v1/:collection_slug/:id`
*   **Payload**: Partial JSON object.

### 5. Delete Document
`DELETE /api/v1/:collection_slug/:id`

---

## GraphQL Endpoint

Zenith exposes a single unified GraphQL endpoint for complex data fetching.

`POST /api/v1/graphql`

### Sample Query
```graphql
query {
  getPosts(limit: 5, sort: "-createdAt") {
    docs {
      title
      content
      author {
        name
      }
    }
  }
}
```

---

## System Health & Telemetry

### Get System Status
`GET /api/v1/system/health`
Returns real-time telemetry on the Nucleus, Database, and Neural Bridge status.

### Get Audit Logs
`GET /api/v1/system/audit` (Requires Admin Access)

---

## Rate Limiting & Safety
To protect the Nucleus, Zenith implements a default rate limit of **100 requests per minute** per IP. This can be configured in your `cms.config.ts`.
