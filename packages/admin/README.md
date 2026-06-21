# Zenith CMS — Admin Dashboard

Premium glassmorphic admin dashboard for Zenith CMS. Built with React 19, TypeScript, Vite, Zustand, Tailwind CSS, and Lexical.

## Architecture

```
packages/admin/
├── src/
│   ├── components/
│   │   ├── lexical/          # Lexical rich-text editor (nodes, plugins, toolbar)
│   │   │   ├── nodes/        # Custom nodes: Image, Media, HorizontalRule, Relationship
│   │   │   ├── plugins/      # SlashCommand, MarkdownShortcut
│   │   │   ├── Toolbar.tsx   # Glassmorphic formatting toolbar
│   │   │   └── LexicalRichTextEditor.tsx
│   │   ├── LexicalRichTextEditor.tsx # Primary Lexical editor
│   │   ├── GlassDropdown.tsx # Reusable glassmorphic dropdown
│   │   ├── MediaPicker.tsx   # Media library integration
│   │   └── fields/           # Custom field renderers (Date, JSON, Slug, UID, etc.)
│   ├── pages/
│   │   ├── editor/           # Content editor with dynamic zones, blocks, SEO
│   │   ├── settings/         # Site settings, user management, invites
│   │   ├── AuditLogPage.tsx  # Tamper-evident audit trail viewer
│   │   └── ...
│   ├── store/                # Zustand stores (editor, modal, comments)
│   ├── lib/
│   │   ├── api.ts            # Fetch-based API client (replaces axios)
│   │   └── utils.ts          # Tailwind merge utility
│   └── context/              # ThemeContext (dark/light mode)
```

## Design System

- **Theme**: Premium glassmorphism with deep dark mode (`#0B0F19`)
- **Typography**: Inter / Outfit / Space Grotesk with deliberate weight mapping
- **Animations**: Framer Motion micro-animations on all interactive elements
- **Styling**: Tailwind CSS with `cn()` merge utility — no inline styles

## Development

```bash
# From monorepo root
pnpm --filter @zenith-open/zenithcms-admin dev      # Start dev server on port 5175
pnpm --filter @zenith-open/zenithcms-admin build    # Production build
pnpm run build                          # Build entire monorepo
```

The admin proxies `/api`, `/media`, and `/uploads` to the core engine at `http://localhost:3000`.

## Key Features

| Feature | Implementation |
|---------|---------------|
| **Rich Text** | Lexical editor |
| **Dynamic Zones** | Strapi-style block picker with visual component selection |
| **Media Library** | Multi-select, bulk delete, crop/rotate, focal point |
| **Version Control** | Visual preview diff, restore, max-version pruning |
| **Scheduled Publishing** | DateTime picker → backend cron scheduler |
| **i18n** | Locale switcher with translation completion progress |
| **Audit Log** | Tamper-evinent hash chain, export, purge with auth |
| **User Invite** | Secure token-based invite flow via email |
| **Plugin System** | Hook-based collection lifecycle + component injection |

## State Management

- **Zustand** for all client state (editor, modals, comments, panels)
- ** localStorage** persistence for sidebar config and editor undo stack
- **React Query** (@tanstack/react-query) for server state

## API Client

All requests use the native `fetch` API via `src/lib/api.ts` — no axios dependency. The client includes:
- Automatic `X-Zenith-Site-Id` header for multi-tenancy
- CSRF token propagation
- Token refresh on 401 with request queuing
- SWR-style cache-aware responses

## Lexical Editor

Custom Lexical nodes:
- **ImageNode** — Inline images with alt text, width/height
- **MediaNode** — Rich media (image/video/file) with captions
- **HorizontalRuleNode** — Divider separator
- **RelationshipNode** — Cross-collection document references

Plugins:
- **SlashCommandPlugin** — `/` command palette for block insertion
- **MarkdownShortcutPlugin** — Type `# `, `> `, `---`, etc.

## TypeScript

- `tsconfig.app.json`: `strict: true`, targets ES2023
- Excludes `src/components/lexical` from strict checking (Lexical 0.44.0 types are strict)
- `tsconfig.node.json`: Vite config only

## Build Output

- Source maps: Hidden (for Sentry/debugging without exposing to users)
- Code splitting: Vendor chunks for React, Query, Editor, Animation, Forms
- Base path: `./` (supports sub-path deployment behind reverse proxy)
