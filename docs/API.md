# API Reference

The Zenith CMS Core features a high-speed routing layer equipped with Ahead-Of-Time (AOT) schema validation and multi-site tenant isolation. All requests directed to the API should include authorization and scoping headers when accessing protected resources.

---

## 🔒 1. Global Request Headers

When querying scoped collections or system endpoints, ensure the following headers are passed:

```http
Authorization: Bearer <JWT_TOKEN_HERE>
X-API-KEY: <STATIC_ACCESS_KEY_HERE>
X-Zenith-Site-Id: <SITE_OR_TENANT_ID_HERE>
```

---

## 👥 2. Authentication Endpoints (`/api/v1/auth`)

Manages administrator and editor sessions. Sets secure HttpOnly cookies (`accessToken` and `refreshToken`).

*   `POST /login`: Authenticates administrators and editors. Sets HttpOnly, SameSite=Strict session cookies.
*   `POST /register`: Registers the primary root administrator user.
*   `POST /refresh`: Rotates refresh tokens to renew session keys.
*   `POST /logout`: Clears session tokens.
*   `GET /me`: Returns details of the logged-in administrator.
*   `POST /forgot-password`: Generates reset tokens.
*   `POST /reset-password`: Processes password changes.
*   `GET /setup-status`: Returns whether the admin account setup has been completed.
*   `POST /setup`: Initiates initial database and admin configuration.

---

## 🏛️ 3. Dynamic REST Collections API (`/api/v1/:collection_slug`)

Every collection schema configured in `cms.config.ts` automatically exposes a set of CRUD endpoints:

*   `GET /`: Queries documents in the collection.
    *   **Parameters**: `page`, `pageSize`, `sort`, `filter`, `select`, `populate` (e.g. `?sort=-createdAt&select=title,status&populate=category`).
*   `GET /:id`: Retrieves a single document by ID.
*   `POST /`: Creates a document (payloads are validated using compiled Zod schemas).
*   `PATCH /:id`: Updates a document (validates partial payloads).
*   `DELETE /:id`: Deletes a document (only allowed if the document is not currently locked by another editor).
*   `POST /import`: Bulk imports an array of records inside a transaction (capped at 5,000 items, processed in batches of 50).
*   `GET /export`: Exports collection data as a file stream (capped at 1,000 items).

---

## 👥 4. Collaborative Presence API (`/api/v1/presence`)

Coordinates concurrent multi-editor collaboration and field locking.

*   `GET /`: Returns a list of all editors actively online.
*   `POST /heartbeat`: Sends a heartbeat payload to lock a document:
    ```json
    {
      "collection": "pages",
      "documentId": "65e8f17c24f2b9001b9728cb"
    }
    ```
*   `GET /:collection/:id`: Returns editors working on a specific document.
*   `DELETE /:collection/:id`: Manually releases active locks.

---

## 📈 5. System Configuration & Health (`/api/v1/system`)

Used for administration settings, plugin control, and diagnostics.

*   `GET /health`: Returns CPU usage, RAM heap, uptime, and database connection status.
*   `GET /counts`: Returns document totals across all collections.
*   `GET /audit-logs`: Retrieves immutable administrative event logs.
*   `GET /api-keys`: Lists configured project API keys.
*   `POST /api-keys`: Generates a new live access key (`zk_live_...`).
*   `GET /search`: Performs a multi-collection global search.
*   `POST /db/test-connection`: Tests database configuration settings before saving.
*   `POST /db/save-connection`: Writes connection settings dynamically to `.env`.
*   `GET /onboarding`: Returns the current setup status.
*   `POST /onboarding/complete`: Finalizes setup and generates the primary live token.
*   `GET /plugins`: Lists active system plugins.
*   `POST /plugins/inject`: Mounts a plugin configuration dynamically.

---

## 👥 6. Portal Member Endpoints (`/api/v1/members`)

Handles public site member directories (e.g., website subscribers or readers).

*   `POST /register`: Registers portal members.
*   `POST /login`: Authenticates portal members and returns Bearer tokens.
*   `GET /me`: Returns portal member profiles (requires `Authorization: Bearer <token>`).

---

## ⏱️ 7. Content Versioning & Audit History (`/api/v1/versions`)

Provides rollback capabilities and displays change histories.

*   `GET /:collection/:id`: Lists historical snapshot states.
*   `GET /:collection/:id/:versionId`: Returns details of a specific version snapshot.
*   `GET /:collection/:id/:versionId/diff`: Highlights differences between snapshot and current data.
*   `POST /:collection/:id/:versionId/restore`: Rolls back the entire document to the snapshot.
*   `POST /:collection/:id/:versionId/rollback-fields`: Restores only specific fields specified in the request body.

---

## 🧠 8. Content Editing Tools (`/api/v1/content-tools`)

Provides tools for content creation, optimization, and generation.

*   `POST /seo-analysis`: Returns readability scores, focus keyword densities, and metadata suggestion metrics.
*   `POST /quality`: Evaluates text using readability indices.
*   `POST /ai/generate`: Generates content blocks using configured AI model keys.
*   `POST /ai/improve`: Refines existing text based on modification prompts.
*   `POST /ai/meta-description`: Generates metadata summaries.
*   `POST /auto-link`: Scans content and suggests internal links matching other records.
