# Zenith CMS — Swarm Agent Context

> **Last verified:** 2026-05-26 (post-TS-fix sweep)
> **Status:** ✅ TypeScript 0 errors (admin + core), ✅ 93/93 tests pass, ⚠️ 206 files uncommitted

---

## 1. Repository Layout

```
c:/Users/Asus/Desktop/cms/
├── packages/
│   ├── core/           # Express headless API (server-side only — NO React imports)
│   ├── admin/          # React glassmorphic dashboard (Vite, Zustand, Tailwind)
│   ├── blog-demo/      # Demo storefront
│   ├── types/          # Shared TypeScript interfaces (single source of truth)
│   ├── sdk/            # Zero-dependency browser SDK (fetch-based)
│   ├── cli/            # CLI tooling
│   ├── db-mongodb/     # Mongoose adapter
│   └── db-postgres/    # Drizzle/Postgres adapter
├── templates/          # Blog demo, storefront, demo templates
├── docs/               # Specs and playbooks
└── internal/reports/   # Architectural audits
```

---

## 2. Critical Decoupling Rules

1. **`packages/core`** must NEVER import React, Vite assets, or client state libraries
2. **`packages/admin`** must use the custom Axios instance at `packages/admin/src/lib/api.ts` for all API calls
3. **`packages/types`** is the single source of truth — all shared interfaces live here

---

## 3. Build & Test Commands (run from repo root)

```bash
pnpm install          # Install all deps
pnpm run build        # Compile all workspace packages
pnpm test             # Run all tests (93 tests, 15 files — all pass)
pnpm run dev          # Start all dev servers
pnpm --filter @zenithcms/admin dev   # Admin only
pnpm --filter @zenithcms/core dev    # Core only
```

---

## 4. Zustand Stores (8 total)

| Store | File | Persistence | Purpose |
|-------|------|-------------|---------|
| `authStore` | `store/authStore.ts` | None | User auth state, login/logout |
| `workflowStore` | `store/workflowStore.ts` | None | Workflow/publish status |
| `i18nStore` | `store/i18nStore.ts` | None | Locale/translation state |
| `panelStore` | `store/panelStore.ts` | None | Left/right panel open/width/tabs |
| `commentsStore` | `store/commentsStore.ts` | None | Document comments CRUD |
| `modalStore` | `store/modalStore.ts` | None | Modal open/close flags (7 modals) |
| `editorStore` | `store/editorStore.ts` | **localStorage** (debounced 2s, key `zenith_editor_state`) | Page data, undo/redo, relations, media |
| `siteStore` | `lib/siteStore.ts` | **localStorage** (full read/write) | Active workspace/site IDs |

### editorStore Key State
- `data: PageData | null` — the document being edited
- `undoStack` / `redoStack` — max 50 entries, debounced push (1200ms)
- `selectedRelations: Set<string>` — for relations modal
- `mediaAssets: MediaAsset[]` — cached media library
- `reset()` — clears localStorage + all transient state (call when navigating between documents)

---

## 5. Editor Component Tree

### Main Editor Files
```
packages/admin/src/pages/editor/
├── constants.ts          # FieldDefinition (28 types), BlockDefinition, humanize()
├── unifiedBlocks.ts      # UNIFIED_BLOCK_LIBRARY — all block definitions
├── FieldRenderer.tsx     # Renders any field type (memoized, switch on field.type)
├── EditorToolbar.tsx     # Top toolbar with save/publish/preview
└── components/
    ├── LeftPanel.tsx          # Schema field navigation
    ├── RightPanel.tsx         # Preview/history/comments tabs
    ├── SectionBlock.tsx       # Individual section/block card on canvas
    ├── BlockPickerModal.tsx   # Visual grid block picker
    ├── DynamicZoneModal.tsx   # Slide-in panel for DZ management
    ├── NestedDynamicZone.tsx  # Inline DZ editor with drag-and-drop
    ├── RelationsModal.tsx     # Content relation picker (debounced search)
    ├── MediaLibraryModal.tsx  # Media grid with upload, filter, copy URL
    ├── SEOModal.tsx           # SEO metadata editor
    ├── TemplatesModal.tsx     # Template picker
    ├── InlineRelationPicker.tsx # Inline relation search/select
    ├── CommentsPanel.tsx      # Document comments thread
    ├── CollabAvatars.tsx      # Live collaborator presence
    ├── DocumentLockBanner.tsx # Lock/unlock for concurrent editing
    ├── ConflictResolutionModal.tsx # Merge conflict UI
    ├── DocumentDiffModal.tsx  # Version diff viewer
    ├── AutoSaveIndicator.tsx  # Save status pill
    ├── EditorStatusBar.tsx    # Bottom status bar
    ├── SchedulePicker.tsx     # Publish scheduling
    ├── ConfirmDialog.tsx      # Generic confirm
    ├── ConfirmPublishModal.tsx # Publish confirmation
    ├── BlockContextMenu.tsx   # Right-click context menu
    └── SlashMenu.tsx          # Slash command menu
```

### Custom Events (data flow from modals → editor)
- `zenith:media-selected` — dispatched from MediaLibraryModal when user clicks "Select"; payload: `{ url, alt, mimeType, width, height }`
- Listeners use `window.addEventListener('zenith:media-selected', ...)`

### FieldRenderer Field Types (28 total)
`text`, `email`, `password`, `uid`, `color`, `textarea`, `richtext`, `lexical`, `media`, `relation`, `number`, `boolean`, `checkbox`, `select`, `array`, `group`, `blocks`, `code`, `collapsible`, `join`, `point`, `radio`, `row`, `ui`, `date`, `json`, `dz`, `tabs`

### FieldConfig Union (19 members in `packages/types/src/index.ts`)
`TextFieldConfig`, `NumberFieldConfig`, `CheckboxFieldConfig`, `SelectFieldConfig`, `MediaFieldConfig`, `RelationFieldConfig`, `ArrayFieldConfig`, `GroupFieldConfig`, `BlocksFieldConfig`, `RichTextFieldConfig`, `BasicFieldConfig`, `CodeFieldConfig`, `CollapsibleFieldConfig`, `JoinFieldConfig` (omits `required`), `PointFieldConfig`, `RadioFieldConfig`, `RowFieldConfig`, `UIFieldConfig`, `DZFieldConfig`

**⚠️ Type gotcha:** `FieldConfig` is a union — `required` doesn't exist on all members (notably `JoinFieldConfig`). Use `(field as any).required` when accessing from a generic `FieldConfig`.

---

## 6. API Client

All admin API calls go through `packages/admin/src/lib/api.ts` — a custom Axios instance with:
- Multi-tenant header propagation (`X-Zenith-Site-Id`)
- Base URL from `VITE_API_URL` env var
- Auth token injection

---

## 7. Design System

- **Theme:** Premium glassmorphism, deep dark mode (`#0B0F19`), `backdrop-blur-md`
- **Typography:** Outfit or Inter fonts
- **Animations:** `framer-motion` for all transitions
- **CSS:** Tailwind with custom CSS in `index.css` (276 lines of custom utilities)
- **No placeholders:** Never use `// TODO` comments or mock images

---

## 8. Core API Routes

```
/auth/*           — Authentication (login, logout, refresh, forgot/reset password)
/pages/*          — Page CRUD
/globals/*        — Global content CRUD
/collections/*    — Collection entries CRUD
/media            — Media library listing
/upload           — File upload
/versions/*       — Document version history
/sites/*          — Site/workspace management
/roles/*          — RBAC management
/api-keys/*       — API key management
/workflows/*      — Workflow state transitions
/comments/*       — Comment CRUD
/audit/*          — Audit log
/plugins/*        — Plugin management
```

---

## 9. Database

- **Adapters:** MongoDB (Mongoose) and PostgreSQL (Drizzle) via `DatabaseAdapter` interface
- **Multi-tenancy:** Every query scoped via `X-Zenith-Site-Id` header → `siteId`
- **Models:** Pages, Globals, Sites, Workspaces, Users, Roles, API Keys, Comments, Locks, Versions, Audit Logs, Webhooks, Plugins

---

## 10. Known Patterns for Common Tasks

### Adding a new field type:
1. Add literal to `FieldDefinition.type` union in `constants.ts`
2. Add case in `FieldRenderer.tsx` switch statement
3. If it needs a new config interface, add to `FieldConfig` union in `types/src/index.ts`
4. Add field component in `components/fields/` if complex

### Adding a new modal:
1. Add open flag to `modalStore.ts`
2. Create component in `pages/editor/components/`
3. Import and render in the main editor layout
4. Use `useFocusTrap` hook for accessibility
5. Use `AnimatePresence` for enter/exit animations

### Adding a new block type:
1. Add to `UNIFIED_BLOCK_LIBRARY` in `unifiedBlocks.ts`
2. Fields auto-render via `FieldRenderer` — no additional wiring needed

---

## 11. Test Infrastructure

- **Framework:** Vitest
- **Location:** `packages/core/tests/` and `packages/core/src/` (co-located)
- **Count:** 93 tests across 15 files
- **Run:** `pnpm test` from root

---

## 12. Recent Git History (last 10 commits)

```
fc95b2e40  (HEAD, uncommitted work)
eedb3f3   feat(admin): consolidate old workspace indicators in DashboardLayout
09cf146   fix(admin): safeguard RichTextEditor from unmounted/destroyed state crashes in React 19
25e8f6a   feat(admin): implement reusable premium glassmorphic dropdown and consolidate site selector
3495458   fix(admin): resolve SiteSelector runtime crash when sites is not an array
1909149   feat(admin): overhaul BlocksBuilder component with visual, category-grouped picker
35907bd   feat: redesign block injection picker to Strapi-style visual grid
f73f496   feat: add missing Strapi-equivalent field types (password, uid, color)
4df74be   feat: add Edge SDK, humanize docs, fix seed script references
d104a0d   feat: close locale-write and RLS update/delete gaps from competitive audit
```

---

## 13. Uncommitted Changes Summary (206 files, +26228/-5303)

Major areas of work-in-progress:
- **Admin dashboard:** Complete glassmorphic redesign of all pages
- **Editor:** New components (CommentsPanel, CollabAvatars, DocumentLockBanner, ConflictResolution, SlashMenu, etc.)
- **Lexical integration:** Full rich text editor with custom nodes (Image, Media, Relationship, HR)
- **Settings pages:** Full settings module (API Keys, Billing, Database, Plugins, AI, etc.)
- **Core API:** New routes (webhooks, workspaces, audit, comments, locks)
- **Database:** New models (webhook-config, workspace, comment, lock, plugin)
- **SDK:** SWR cache layer, zero-dependency fetch
- **Build:** Vite config updates, new tsconfig settings
- **Deleted:** `packages/demo/` moved to `templates/demo/`

---

## 14. TypeScript Gotchas

1. `FieldConfig` is a union — use `(x as any).required` not `x.required`
2. `Record<string, unknown>` property access yields `unknown` — cast with `as string` or `as any`
3. `JoinFieldConfig` explicitly omits `required` from `BaseFieldConfig`
4. `FieldRenderer` uses `React.memo` — props must be serializable
5. `editorStore` uses `immer` for `updateData` but NOT for `setField` (manual shallow copy)
6. `selectedRelations` is a `Set<string>` — not JSON-serializable, won't survive localStorage (only `data`, `undoStack`, `redoStack` are persisted)
