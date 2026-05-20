# AI Schema Architect & Development Guide

This guide helps you understand how to write code, configure schemas, and develop features within Zenith CMS, whether you are using AI tools (like Claude, Cursor, or ChatGPT) or developing manually.

---

## 🏛️ Monorepo Rules & Boundaries

To keep the monorepo clean and prevent circular dependency issues, adhere to these guidelines:

1.  **Shared Types**: All shared database interfaces and schema definitions must reside in `@zenithcms/types`. Never create local versions of these types within individual packages.
2.  **Decoupled Server & Client**: 
    *   `packages/core` contains only Node.js server logic. Do not import React components or client-side assets here.
    *   `packages/admin` communicates with the backend exclusively via the custom API client in `packages/admin/src/lib/api.ts`.
3.  **UI Styling Standards**: Do not write inline styles. Use global CSS classes or Tailwind utility classes to match the dashboard's glassmorphism style (using translucent layers like `border-white/5 bg-white/[0.02] backdrop-blur-xl`).

---

## 📝 Creating New Database Schemas

To create a new content collection, follow these three steps:

1.  **Define the config**: Define the schema structure in `@zenithcms/types` or your custom collection configuration file.
2.  **Generate Validation**: Create the corresponding Zod validation schema inside `packages/core`. This gates client input before any write operation is performed.
3.  **Register components**: Set up the fields in `packages/admin` so that editors can manage the data from the dashboard.

---

## 🏎️ Performance & UX Standards

*   **Lazy Loading**: Split code for large components (like charts, layout grids, or complex widgets) using `React.lazy()` to optimize the application's bundle size.
*   **Smooth Animations**: Keep the UI feeling responsive and fluid by wrapping transitions, drawers, and modal states in Framer Motion wrappers.
*   **Error Boundaries**: Wrap custom components in error boundaries so that an error in one widget doesn't crash the entire dashboard.

---

## 📡 API Testing Helpers

You can check server status and endpoint responses using simple curl commands:

### Server Health Check:
```bash
curl -X GET http://localhost:3000/api/v1/system/health
```

### Active Editor Presence:
```bash
curl -X GET http://localhost:3000/api/v1/presence
```

---

## 🔒 Access Control Warning

When creating custom controllers or writing database queries, always verify user permission levels. Never query collections without scoping the request by the current user's organization or using the `X-Zenith-Site-Id` header filter.
