# 🌌 Zenith CMS

**Zenith** is a high-performance, developer-first headless CMS built for the modern web. It provides a declarative, TypeScript-driven engine that auto-generates REST and GraphQL APIs from your schema, paired with a stunning glassmorphic admin dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Native-47A248.svg)](https://www.mongodb.com/)

---

## ✨ Key Features

- 🛠 **Declarative Schema**: Define your content structure in a single `cms.config.ts` file.
- ⚡ **Auto-API**: Instant REST and GraphQL endpoints for every collection and singleton.
- 💎 **Premium Admin UI**: A beautiful, responsive dashboard built with React 19, Tailwind, and Framer Motion.
- 🧱 **Modular Blocks**: Drag-and-drop block builder for creating dynamic page layouts.
- 🔐 **Security First**: Built-in RBAC, JWT authentication, and automated audit logging.
- 🖼 **Media Engine**: Advanced media library with AI-assisted alt-text generation and image optimization.
- 🔄 **Live Sync**: Real-time content synchronization between CMS and storefronts via BroadcastChannel.

---

## 🚀 Quick Start

### 1. Installation
```bash
pnpm install
```

### 2. Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 3. Launch
```bash
# Start the entire ecosystem (API + Admin + Demo)
npm run dev
```

| Service | Port | URL |
| :--- | :--- | :--- |
| **Zenith API** | 3000 | `http://localhost:3000` |
| **Admin Panel** | 5175 | `http://localhost:5175` |
| **Public Demo** | 5173 | `http://localhost:5173` |

---

## 🛠 Technical Architecture

Zenith is architected as a **pnpm monorepo** for maximum modularity:

- **`packages/core`**: The heartbeat. Handles Mongoose models, API route generation, and core services.
- **`packages/admin`**: The command center. A React-based SPA for content management.
- **`packages/sdk`**: Lightweight TypeScript client for consuming Zenith APIs.
- **`packages/demo`**: A reference storefront implementation showing off Zenith's capabilities.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by the Zenith Team
</p>
