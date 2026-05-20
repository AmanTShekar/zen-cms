# 🛡️ Security Policy & Compliance (SECURITY.md)

At Zenith, we prioritize absolute data security, programmatic sanitization, and architectural isolation. This security policy documents our **Air-Tight Protocol**, active security maintenance bounds, and vulnerability reporting procedures.

---

## 1. Supported Versions

We actively monitor, patch, and release security updates for the following core release lifecycles:

| Version                     | Supported | Patch Release Frequency                         |
| :-------------------------- | :-------: | :---------------------------------------------- |
| **v0.2.x** (Active Develop) |    ✅     | Continuous (Immediate hotfixes on CVE warnings) |
| **v0.1.x** (Early Alpha)    |    ⚠️     | Critical vulnerabilities only                   |
| **< v0.1.0** (Deprecated)   |    ❌     | None (Upgrade to current stable release)        |

---

## 2. The Air-Tight Protocol Features

Zenith implements a series of zero-trust security postures:

- **Zod AOT Validation**: Incoming HTTP requests are validated against strict Zod parsing definitions before reaching controllers, neutralizing schema parameter bypass attempts.
- **Role-Based Access Control (RBAC)**: Field-level scoping constraints allow granular read/create/update/delete restrictions specified inside collection configs.
- **Webhook HMAC Signatures**: Outgoing notifications are cryptographically signed using high-entropy secret tokens, preventing webhook forgery.
- **State Sanitization Middleware**: The core API strips password fields, access logs, and tenant secrets dynamically based on context scopes.

---

## 3. Reporting a Vulnerability

**If you discover a security vulnerability or exploit potential, please DO NOT open a public GitHub issue.** Doing so risks exposing secure systems before a mitigation is available.

Instead, please coordinate disclosure privately with our security response team:

- **Email Contact**: [security@zenithcms.com](mailto:security@zenithcms.com)
- **Encryption**: You may encrypt your report using our security public key if necessary.

### What to Include in a Report:

- **Environment Context**: Node.js and MongoDB versions, plus monorepo package version.
- **Exploit Details**: A step-by-step description or proof-of-concept payload demonstrating the vulnerability.
- **Impact Analysis**: Whether it allows unauthorized read, write, server execution, or database denial-of-service.

### Response SLAs:

- **Triage Window**: Within 24 hours of receipt.
- **Mitigation Draft**: Within 48 hours for verified high-severity vulnerabilities.
- **Coordination**: We will coordinate with you to publish a credit/acknowledgment in the GitHub security advisory register upon patch release.

---

<div align="center">
  <p><strong>Thank you for keeping Zenith secure and resilient! 🛡️</strong></p>
</div>
