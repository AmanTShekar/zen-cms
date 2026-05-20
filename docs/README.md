# Zenith CMS Documentation

Welcome to the Zenith CMS documentation hub. Whether you are setting up the system for the first time, writing a frontend integration, or building a custom plugin, these guides are here to help you get started.

---

## 🚀 Getting Started

*   **[Quickstart & Onboarding](./ONBOARDING.md)**: A quick guide to installing, configuring environment variables, running the database seed, and integrating the SDK.
*   **[Installation & Setup](./INSTALLATION.md)**: Setting up Zenith Core and the React Admin Dashboard in local development and production environments.
*   **[Code Examples](./EXAMPLES.md)**: Real-world frontend examples, code snippets, and integrations.
*   **[Troubleshooting & Diagnostics](./ISSUE_GUIDE.md)**: How to check server status, diagnose common errors, and clear active presence locks.

---

## 🛠️ Technical Reference

*   **[Schema & Collections](./COLLECTIONS.md)**: Understanding how schemas translate into database collections and REST endpoints.
*   **[Real-Time Collaboration](./COLLABORATION.md)**: How field locks and editor presence sync in real time.
*   **[Architecture Guide](./ARCHITECTURE.md)**: A high-level overview of Zenith's monorepo structure, database adapters, and isolated worker pool.
*   **[API Reference](./API.md)**: Detailed endpoints for authentication, dynamic collections, real-time presence, and diagnostics.
*   **[Plugin & Widget Development](./PLUGINS.md)**: Learn how to write server-side plugins and create custom dashboard widgets.
*   **[Competitive Audit & Parity](./COMPETITIVE_AUDIT.md)**: Analysis of features and capabilities comparing Zenith CMS to other major headless content systems.

---

## 🔒 Security & AI Scopes

*   **[Security Policy](./SECURITY.md)**: Details on brute-force protection, HttpOnly cookies, and magic-bytes file validation.
*   **[AI Integration Guide](./AI_DEVELOPMENT.md)**: Best practices for using the AI Schema Architect and integrating model providers.

---

### Core Philosophy

We believe a CMS should be fast, highly customizable, and robust enough to prevent content editor collisions. Zenith achieves this by pairing type-safe TypeScript schemas with active concurrency locking and sandboxed custom hooks.
