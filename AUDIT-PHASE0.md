# Zenith CMS — Production Audit Report

**Audit Date:** 2026-06-16  
**Auditor:** OpenCode AI Agent (Staff Engineer / Security Architect / DevOps Principal / CTO)  
**Classification:** MAXIMUM THOROUGHNESS — ZERO EXCEPTIONS  
**Status:** In Progress

---

## PHASE 0 — COMPLETE CODEBASE INVENTORY

### Package Map

| Package | Purpose | Entry Point | Built Output | Publish Status |
|---------|---------|-------------|--------------|----------------|
| zenith-cms (root) | Monorepo workspace coordination | — | — | Private |
| @zenith-open/zenithcms-core | Backend API (Express, Mongo/Postgres adapters, Zod/Ajv) | src/index.ts / src/server.ts | dist/ | Public |
| @zenith-open/zenithcms-admin | Headless Admin UI (React 19, Zustand, Tailwind) | src/main.tsx | dist/ | Private |
| @zenith-open/zenithcms-types | Shared TypeScript types | src/index.ts | dist/ | Public |
| @zenith-open/zenithcms-db-mongodb | MongoDB adapter | src/index.ts | dist/ | Public |
| @zenith-open/zenithcms-db-postgres | PostgreSQL adapter (Drizzle) | src/index.ts | dist/ | Public |
| @zenith-open/zenithcms-sdk | JavaScript/TypeScript client SDK | src/index.ts | dist/ | Public |
| @zenith-open/zenithcms-cli | CLI tooling | src/index.ts | dist/ | Public |
| create-zenithcms-app | Project scaffolding CLI | src/index.ts | dist/ | Public |
| templates/* | Demo/storefront templates | various | dist/ | Private |

### Internal Dependencies
- core → types, db-mongodb (conditional), db-postgres (conditional)
- admin → sdk, types
- sdk → types
- db-mongodb → types
- db-postgres → types
- cli → types (implicit)
- create-zenithcms-app → none (standalone)

### Dependency Red Flags
- **Tiptap AND Lexical both installed** in node_modules — Tiptap is inferred as dead weight; admin explicitly uses Lexical 0.44.0 only.

### File Inventory — packages/core/src (161 files)
[See full inventory in agent output above]

### File Inventory — packages/admin/src (175 files)
[See full inventory in agent output above]

### Database Inventory — 23 Collections/Tables

| # | Collection | Has siteId | Indexes | Timestamps |
|---|------------|-----------|---------|------------|
| 1 | z_users | **NO** | No | Yes |
| 2 | z_members | **NO** | No | Yes |
| 3 | z_audit_logs | YES | Yes | No |
| 4 | z_settings | YES | Yes (unique on siteId) | Yes |
| 5 | z_schemas | YES | Yes (unique slug+siteId) | Yes |
| 6 | z_roles | **NO** | No | Yes |
| 7 | z_releases | YES | Yes | Yes |
| 8 | z_templates | YES | Yes | Yes |
| 9 | z_password_resets | **NO** | Yes (TTL) | No |
| 10 | z_comments | YES | Yes | Yes |
| 11 | z_plugins | **NO** | Yes | No |
| 12 | z_preferences | YES | Yes (unique userId+key+siteId) | No |
| 13 | z_locks | YES | Yes (unique coll+docId+siteId) | No |
| 14 | z_redirects | YES | Yes (unique from+siteId) | Yes |
| 15 | z_onboarding | **NO** | No | Yes |
| 16 | z_api_keys | **NO** | No | Yes |
| 17 | sites | **NO** | Yes | Yes |
| 18 | z_webhook_configs | **NO** | Yes | No |
| 19 | z_dashboard_layouts | YES | Yes (unique userId+siteId) | Yes |
| 20 | flows | **NO** | No | Yes |
| 21 | z_versions | **NO** | Yes | No |
| 22 | z_webhook_deliveries | **NO** | Yes | No |
| 23 | workspaces | **NO** | Yes | Yes |

### CRITICAL FINDINGS — PHASE 0

#### FINDING-PHASE0-001
**Severity:** CRITICAL  
**File:** `packages/core/src/database/user-model.ts`, `member-model.ts`, `role-model.ts`, `api-key-model.ts`, `plugin-model.ts`, `onboarding-state-model.ts`  
**Title:** Core tenant-scoped collections missing `siteId` field  
**Root Cause:** User, member, role, API key, plugin, and onboarding models do not have a `siteId` field, meaning tenant isolation cannot be enforced at the database level for these entities.  
**Blast Radius:** Cross-tenant user enumeration, role leakage, API key sharing, plugin configuration bleeding between tenants.  
**Remediation:** Add `siteId: { type: String, index: true }` to all models. Update all CRUD operations to filter by `siteId`.  
**Blocks Launch:** YES

#### FINDING-PHASE0-002
**Severity:** HIGH  
**File:** `packages/admin/src/index.css` (line 36)  
**Title:** Cyber-Purple accent color incorrectly mapped to Emerald Green  
**Root Cause:** `--color-cyber-purple: #10B981` (Emerald Green) instead of `#8B5CF6` (Cyber-Purple).  
**Blast Radius:** Violates design system contract; brand inconsistency across UI.  
**Remediation:** Fix CSS variable to `--color-cyber-purple: #8B5CF6`.  
**Blocks Launch:** NO

#### FINDING-PHASE0-003
**Severity:** MEDIUM  
**File:** `packages/admin/src/index.css` (line 123), `SortableWidget.tsx`  
**Title:** Glassmorphism design system partially unimplemented  
**Root Cause:** `.card` uses `border-radius: 12px` instead of `0px`; dashboard widgets use opaque `bg-black` without `backdrop-filter`.  
**Blast Radius:** UI does not match premium design spec; visual inconsistency.  
**Remediation:** Enforce `rounded-none` globally; add `backdrop-blur-xl` and `bg-black/65` to widget containers.  
**Blocks Launch:** NO

#### FINDING-PHASE0-004
**Severity:** CRITICAL  
**File:** `packages/core/src/database/models.ts`  
**Title:** Empty models stub file present in production source  
**Root Cause:** `models.ts` contains only `export {}` — appears to be a leftover debug/fix file with no purpose.  
**Blast Radius:** None if truly dead, but signals poor code hygiene and potential boot path dependency.  
**Remediation:** Verify no import depends on this file; delete if confirmed dead.  
**Blocks Launch:** NO

---

## CARRY-FORWARD REGISTER (PHASE 0 → 1)

| ID | Severity | Phase | Description | File |
|---|---|---|---|---|
| CF-001 | CRITICAL | 0 | User/Member/Role models lack siteId | user-model.ts, member-model.ts, role-model.ts |
| CF-002 | CRITICAL | 0 | API Key, Plugin, Onboarding models lack siteId | api-key-model.ts, plugin-model.ts, onboarding-state-model.ts |
| CF-003 | HIGH | 0 | Cyber-Purple color mis-mapped | admin/src/index.css |
| CF-004 | MEDIUM | 0 | Glassmorphism partial implementation | admin/src/index.css, SortableWidget.tsx |
| CF-005 | LOW | 0 | Dead models.ts stub file | core/src/database/models.ts |

---

*Next: PHASE 1 — Security Audit*
