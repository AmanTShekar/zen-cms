# Security & Data Protection

Security is built directly into the core architecture of Zenith CMS. This guide explains the security measures used to protect your data, APIs, and file uploads.

---

## 🔒 1. API and Schema Validation

Every request sent to Zenith CMS is validated at the entry point before it interacts with the database or file storage:

*   **Zod Schema Validation**: Validation rules are generated directly from your collection configurations. If a request body contains extra fields or incorrect types, the server rejects it immediately with a `400 Bad Request` or `422 Unprocessable Entity` status.
*   **Preventing CPU Abuse**: Zod schemas are compiled in-memory at boot time to ensure fast parsing, preventing memory usage issues or request hangs.

---

## 🔑 2. Authentication & Session Management

*   **HttpOnly Cookies**: Authentication session tokens are stored in `HttpOnly` and `SameSite=Strict` cookies. This makes them inaccessible to client-side scripts, protecting your sessions from Cross-Site Scripting (XSS) attacks.
*   **Brute-Force Protection**: Zenith automatically locks an account for **15 minutes** after **5 failed login attempts**.
*   **Standardized Error Disclosures**: To prevent credential harvesting, login endpoints return generic "Invalid credentials" messages rather than disclosing whether a specific email exists in the system.

---

## 📝 3. Secure Audit Trails

Every change to your content or settings is recorded in a secure audit log:
*   **Actor Identification**: Logs record who made the change (User ID, API Key, IP address, and User-Agent).
*   **State Diffing**: Logs store the exact state before and after the change so you can review what properties were modified.
*   **Immutability**: Audit logs are read-only and restricted to system administrators.

---

## 🖼️ 4. File Upload Safety (Magic Bytes)

To prevent attackers from uploading malicious executable code masquerading as media (e.g. uploading a `.js` web-shell renamed to `.png`), Zenith performs **Magic Bytes verification**:
*   **Signature Checking**: The server inspects the first few bytes of uploaded files to verify their actual file signature (e.g. `%PDF` for documents, `PNG` headers for images).
*   **Rejection**: If the file extension does not match the byte signature, the upload is rejected.

---

## 🕸️ 5. Webhook Security (HMAC)

Outbound webhooks sent to external servers or static hosting providers are signed with a secret key:
*   **Signature Header**: The server adds an `x-zenith-signature` header containing a SHA-256 HMAC hash of the payload.
*   **Validation**: The receiving server can verify this signature using the shared secret key to confirm the request came from your Zenith instance.

---

## Reporting Vulnerabilities

If you find a security vulnerability, please do not file a public GitHub issue. Instead, email us at **security@zenithcms.com**. We will review your report and respond within 24 hours.
