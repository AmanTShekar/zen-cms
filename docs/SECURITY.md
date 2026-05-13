# Zenith Security Policy: The Air-Tight Protocol

Security in Zenith is not an afterthought; it is an architectural requirement. We call our security implementation the **"Air-Tight Protocol."**

---

## 🛡️ 1. Validation Hardening (Zod AOT)
Every incoming request to the Zenith kernel is validated against a strict Zod schema. 
*   **Zero-Trust Ingress**: No data reaches the service layer without passing validation.
*   **AOT Compilation**: In production, schemas are compiled ahead-of-time to raw JavaScript, preventing CPU-based denial of service (DoS) attacks via complex schema traversal.

## 🕵️ 2. Audit Log Engine
Every mutation in the system is tracked. Zenith logs:
*   **Who**: The actor (User ID / API Key).
*   **What**: The specific fields changed (before/after diffing).
*   **When**: High-precision timestamps.
*   **Where**: IP address and User Agent.
These logs are immutable and can be viewed in the **Audit Trail** page.

## 🔑 3. Authentication & Authorization
*   **JWT Nucleus**: State-of-the-art JSON Web Token implementation for session management.
*   **Granular RBAC**: Role-Based Access Control down to the individual field level. You can define access functions for `read`, `create`, `update`, and `delete` in your collection config.

## 🔗 4. Neural Bridge Security
*   **HMAC Signing**: All outgoing webhooks are signed using a shared secret. Receivers can verify the signature to ensure the request originated from your Zenith Nucleus.
*   **Payload Sanitization**: Zenith automatically strips sensitive fields from webhook payloads based on your access rules.

---

## 🚨 Reporting Vulnerabilities
If you discover a security vulnerability within Zenith, please send an e-mail to **security@zenithcms.com**. We treat all security reports with the highest priority and will respond within 24 hours.

**Please do not report security vulnerabilities via public GitHub issues.**
