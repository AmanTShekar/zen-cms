# Security Policy & Compliance (SECURITY.md)

Zenith CMS enforces a zero-trust architecture, prioritizing absolute data security, programmatic sanitization, and strict multi-tenant isolation. This policy documents our security release lifecycles and vulnerability disclosure protocols.

---

## 1. Supported Release Lifecycles

The core maintainers monitor, patch, and release security updates according to the following schedule:

| Version | Status | Patch Release Frequency |
|---|---|---|
| **v0.2.x** (Active Develop) | Supported | Continuous (Immediate hotfixes for verified CVEs) |
| **v0.1.x** (Early Alpha) | Maintenance | Critical vulnerabilities only |
| **< v6.0.0** (Deprecated) | Unsupported | None (Upgrade to current stable release required) |

---

## 2. Platform Security Constraints

Zenith CMS implements the following security postures natively:

- **Ahead-of-Time (AOT) Schema Validation**: Incoming HTTP requests are validated against strict Zod parsing schemas prior to reaching controller execution, neutralizing parameter bypass attempts.
- **Role-Based Access Control (RBAC)**: Field-level and collection-level execution constraints provide granular read, create, update, and delete restrictions.
- **Cryptographic Webhook Signatures**: Outbound event notifications are cryptographically signed via HMAC-SHA256 using high-entropy secrets to prevent payload forgery.
- **Contextual Sanitization**: The core API strips sensitive metadata (passwords, internal access logs, tenant secrets) dynamically during serialization based on the requester's scope.

---

## 3. Vulnerability Disclosure Protocol

**If you discover a security vulnerability or potential exploit within Zenith CMS, do NOT file a public GitHub issue.** Public disclosure exposes operational systems before an upstream mitigation is available.

Please coordinate responsible disclosure privately via our security response team:

- **Email Contact**: security@zenithcms.com

### Required Report Contents

To expedite triage, please include:
- **Environment State**: Node.js version, database engine (MongoDB/PostgreSQL), and the specific `@zenith-open/zenithcms-core` package version.
- **Exploit Mechanics**: A deterministic, step-by-step reproduction sequence or a proof-of-concept (PoC) payload.
- **Impact Assessment**: Specify whether the vulnerability permits unauthorized read, write, arbitrary code execution, or denial-of-service.

### Response Service Level Agreements (SLA)

- **Triage**: Within 24 hours of report receipt.
- **Mitigation Draft**: Within 48 hours for verified high-severity vectors.
- **Public Disclosure**: We will coordinate with the reporter to publish an official GitHub Security Advisory and assign a CVE (with appropriate researcher credit) upon the deployment of the patch.
