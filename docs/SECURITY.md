# Zenith CMS — Security & Data Protection

Security is built directly into the core architecture of Zenith CMS. This guide explains the security measures used to protect your data, APIs, and file uploads.

---

## 1. API and Schema Validation

Every HTTP request sent to Zenith CMS is validated at the boundary, ensuring malformed or malicious payloads never reach the database.

*   **Zod Schema Validation**: Zenith compiles your TypeScript schemas (`cms.config.ts`) into Zod validation rules at boot time. If a request body contains extra fields, incorrect types, or exceeds defined limits (e.g. `maxLength: 255`), the server immediately rejects it with a `400 Bad Request` or `422 Unprocessable Entity`.
*   **NoSQL Injection Prevention**: MongoDB operator injection (e.g. passing `{"$gt": ""}` instead of a string) is mitigated by strict Zod type coercion and validation before the payload reaches Mongoose.
*   **Prototype Pollution**: The core API recursively sanitizes JSON payloads to strip `__proto__` and `constructor` keys.

---

## 2. Authentication & Session Management

Zenith utilizes dual authentication patterns to secure both the admin UI and external headless requests.

*   **HttpOnly Cookies**: For the Admin UI, session tokens are stored in `HttpOnly` and `SameSite=Strict` cookies. This makes them completely inaccessible to client-side JavaScript, neutralizing Cross-Site Scripting (XSS) token theft.
*   **Bearer Tokens**: For headless applications, JSON Web Tokens (JWT) are signed using HMAC SHA-256 with your configured `JWT_SECRET`. 
*   **Brute-Force Lockouts**: The core `AuthService` tracks failed login attempts. After **5 failed attempts**, the account is soft-locked for **15 minutes**.
*   **Standardized Disclosures**: To prevent user enumeration attacks, endpoints return generic "Invalid credentials" errors instead of confirming if an email exists.

---

## 3. Secure Audit Trails & Multi-Tenancy

*   **Tenant Isolation**: Data leakage between sites is prevented at the database adapter level. Every query automatically inherits a `{ siteId }` filter based on the `X-Zenith-Site-Id` HTTP header. 
*   **Immutable Audit Logs**: Changes made to content or settings trigger immutable audit logs that record the User ID, timestamp, and a snapshot diff. These logs cannot be edited or deleted by standard administrators.

---

## 4. File Upload Safety (Magic Bytes)

To prevent attackers from uploading executable code masquerading as media (e.g., uploading a `.php` or `.js` web-shell renamed to `image.png`), Zenith performs deep file inspection.

*   **Magic Bytes Verification**: The server inspects the first few hexadecimal bytes (the file signature) of every uploaded file. For example, a valid JPEG must start with `FF D8 FF E0`.
*   **Rejection**: If the MIME type or extension claims the file is an image, but the magic bytes indicate an executable, the upload is immediately rejected and deleted from the temporary buffer.
*   **SVG Sanitization**: SVG files are notorious vectors for Stored XSS. Zenith sanitizes all uploaded SVGs to strip `<script>` tags and inline JavaScript event handlers (`onload`, `onerror`).

---

## 5. Webhook Security (HMAC)

Outbound webhooks sent to external servers (like Vercel, Netlify, or custom endpoints) are cryptographically signed.

*   **Signature Header**: The server generates a SHA-256 HMAC hash of the payload using your configured `WEBHOOK_SECRET` and includes it in the `X-Zenith-Signature` header.
*   **Verification**: The receiving server computes the hash of the raw request body. If the hashes match via a constant-time comparison, the receiver knows the payload is authentic and untampered.

---

## 6. Rate Limiting

By default, the Express server mounts standard rate limiters:
- **API Endpoints**: 100 requests per minute per IP.
- **Auth Endpoints**: 10 requests per 15 minutes per IP.

In production, enabling Redis via the `REDIS_URL` environment variable elevates the rate limiter to a distributed state, enforcing limits perfectly across load-balanced clusters.

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please do not file a public GitHub issue. Instead, email us at **security@zenithcms.com**. We will review your report and respond within 24 hours.
