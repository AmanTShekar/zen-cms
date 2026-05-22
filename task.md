# Zenith CMS — Remaining Tasks

> Phase 1–4 are COMPLETE. This file tracks remaining P3 / enhancement work.
> Updated: 2026-05-22

---

## ✅ COMPLETED (Phases 1–4)

All P1 and P2 improvements are implemented and verified:

| Phase | Status | Key Evidence |
|-------|--------|-------------|
| **Phase 1.1** ✅ Auth hardening | Lockout, email verify, random passwords, user model fields | `auth.ts` lines 100-183, `system.ts` line 746, `user-model.ts` |
| **Phase 1.2** ✅ Validation | Zod constraints, RFC email regex, AJV JSON validation, label errors | `schema/engine.ts` |
| **Phase 1.3** ✅ Adapter-safe search | Query-parser `$regex` → `$like`, both adapters have `search()` | `query-parser.ts`, `MongooseAdapter.ts`, `PostgresDrizzleAdapter.ts` |
| **Phase 1.4** ✅ GraphQL auth | Bearer/cookie auth, ContentService resolvers | `graphql.ts` |
| **Phase 2** ✅ Versioning | Restore, diff, max version pruning, scheduler cron | `versions.ts`, `scheduler.ts`, `content.ts` |
| **Phase 3** ✅ Plugin/SDK | onReady lifecycle, SDK fetch-only with typed responses | `index.ts`, `sdk/src/index.ts` |
| **Phase 4** ✅ GraphQL CRUD | Mutations, union types, depth limiting, DataLoader | `graphql.ts` |

---

## ⬜ REMAINING TASKS

### P3 — New Capabilities

| # | Task | Priority | Files |
|---|------|----------|-------|
| 1 | **OAuth/SSO** — Add GitHub + Google OAuth strategies | 🟡 P3 | `packages/core/src/services/auth.ts`, `packages/core/src/api/auth.ts` |
| 2 | **Username login** — Allow login with username instead of email only | 🟡 P3 | `packages/core/src/services/auth.ts`, `packages/core/src/database/user-model.ts` |
| 3 | **Content import/export** — CSV/JSON import/export endpoints | 🟡 P3 | `new: packages/core/src/api/import-export.ts` |
| 4 | **Image focal point** — Store focal point coords with media uploads | 🟡 P3 | `packages/core/src/services/media.ts`, `packages/admin/src/components/MediaPicker.tsx` |
| 5 | **AI Vision Pipeline** — Auto-alt text, smart-tagging for media | 🟡 P3 | `new: packages/core/src/services/ai-vision.ts` |
| 6 | **Semantic vector search** — Vector-based content discovery | 🟡 P3 | `packages/core/src/services/search.ts` |
| 7 | **Environment branching** — Staging → production promotion pipeline | 🟡 P3 | `new: packages/core/src/services/promotion.ts` |
| 8 | **Plugin hooks system** — Collection operation hooks + admin component injection | 🟡 P3 | `packages/core/src/plugins/index.ts`, `packages/types/src/index.ts` |

### P3 — SDK Enhancements

| # | Task | Priority | Files |
|---|------|----------|-------|
| 9 | **SDK stale-while-revalidate** — SWR cache layer for storefront performance | 🟡 P3 | `packages/sdk/src/index.ts` |
| 10 | **SDK batch operations** — Batch create/update/delete | 🟡 P3 | `packages/sdk/src/index.ts` |
| 11 | **SDK file upload** — Native file upload support | 🟡 P3 | `packages/sdk/src/index.ts` |
| 12 | **SDK aggregation/count** — Expose count and aggregation methods | 🟡 P3 | `packages/sdk/src/index.ts` |

### Code Quality / Refactoring

| # | Task | Priority | Files |
|---|------|----------|-------|
| 13 | **Remove production secrets** — Delete `.env` from git, rotate API key | 🔴 | `templates/storefront-glass/.env` |
| 14 | **Add tests** — Unit + integration tests for API routes, adapters, SDK | 🔴 | `packages/*/src/**/*.test.ts` |
| 15 | **Reduce `any` types** — ~530 occurrences across 110+ files | 🟠 | Multiple files |
| 16 | **Split oversized components** — 7 files over 700 lines | 🟠 | `packages/admin/src/pages/*.tsx` |
| 17 | **Code splitting** — Add `manualChunks` + `React.lazy()` to Vite build | 🟠 | `packages/admin/vite.config.ts` |
| 18 | **Standardize error handling** — All routes should use typed errors | 🟡 | `packages/core/src/api/*.ts` |
| 19 | **Expand admin `lib/`** — Add helpers, formatters, validation schemas | 🟡 | `packages/admin/src/lib/` |
| 20 | **Clean dead code** — Remove unused exports (MediaVisionPipeline, LicensingService) | 🟢 | `packages/core/src/index.ts` |

---

## Execution Order

1. **Immediate** — Task 13 (secrets cleanup, manual git operation)
2. **Next sprint** — Tasks 1-8 (P3 new capabilities: OAuth, import/export, AI vision, etc.)
3. **Following sprint** — Tasks 9-12 (SDK enhancements: SWR, batch, upload, count)
4. **Ongoing** — Tasks 14-20 (code quality, incremental refactoring)
