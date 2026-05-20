# 🤖 AI-Driven Development & Prompt Engineering Protocol (`AI_DEVELOPMENT.md`)

This guide outlines the unified engineering protocol for **AI Assistants (e.g. Claude, Cursor, ChatGPT, Gemini)** to build, modify, scale, and refactor code inside the Zenith CMS monorepo without triggering performance degradations, database mismatches, or styling regressions.

---

## 🏛️ 1. Zenith Core Architectural Constraints

Every AI system operating on the Zenith workspace must respect these physical rules:

1. **State Isolation**: Shared data models must originate in `@zenithcms/types`. Never write isolated, package-local interfaces for collections or sites.
2. **Dynamic Casting Rule**: Because Zenith handles highly dynamic custom JSON schemas, strategically utilize `any` casting in data parsing middleware to prevent compiler blockages. Always verify compiles via `npm run build` after doing so.
3. **No Direct DOM Style Overwrites**: Tailwind/CSS transitions are defined globally in `index.css`. Never introduce arbitrary inline style attributes inside React rendering blocks; utilize semantic layout classes and custom utility helpers instead.

---

## 📝 2. Schema Injection & Synthesis Flow

When asked to "create a new core feature or database schema":

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. Define configuration slug in packages/types         │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Compile Zod request validation inside packages/core  │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Register layout components in packages/admin        │
 └────────────────────────────────────────────────────────┘
```

Never skip step 2. Adding validation schemas ensures that all headless ingestion payloads conform to the **Air-Tight Schema Synthesis Protocol** before SQL/NoSQL writing takes place.

---

## 🎯 3. High-Performance UI Coding Standards

To maintain Zenith's visual excellence and fluid user experience:

- **Lazy Loading**: Register heavy dashboard elements or charts using `React.lazy()` with Suspense frames to optimize initial JS bundle payloads.
- **Micro-Animations**: Wrap status changes, workspace transitions, and drawer panels in Framer Motion `<AnimatePresence>` wrappers to give a premium responsive look.
- **Dark Glassmorphism**: Utilize dark mode borders using translucent layers (`border-white/5 bg-white/[0.02] backdrop-blur-xl`) to achieve visual alignment with the premium Zenith brand identity.

---

## 📡 4. REST API Dynamic Testing Commands

When verifying backend modifications, AI systems should run local checks using `curl` or automated testing scripts to check endpoint integrity:

### Retrieve API Status:

```bash
curl -X GET http://localhost:3000/api/v1/system/health
```

### Ping Workspace Active Presence:

```bash
curl -X GET http://localhost:3000/api/v1/presence
```

---

## 🔒 5. Access Control Warning

When writing custom API controllers:

> [!IMPORTANT]
> Always verify user auth states. Avoid querying collections without `overrideAccess: false` parameters on the database ORM layer to prevent exposing secure site structures.
