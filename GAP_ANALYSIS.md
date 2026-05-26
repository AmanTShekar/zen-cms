# Zenith CMS Editor - Gap Analysis

## Executive Summary

This analysis identifies missing features and improvements needed in the Zenith CMS editor compared to enterprise-grade CMS platforms like Strapi, Payload, and Contentful. The current implementation has solid foundations but lacks critical functionality for production readiness.

**Critical Missing Areas:**
- Empty states and error handling
- Full accessibility compliance (WCAG 2.1 AA)
- Responsive mobile/tablet layouts
- Validation for root document fields
- Drag-and-drop for dynamic zones
- Modal state management consolidation
- Standardized design system

---

## 1. Core Editing Experience

### ✅ Implemented
- Section-based canvas with block types
- Field rendering for all basic types (text, richtext, media, relation, array, etc.)
- Draft/Publish status
- Undo/Redo with 50-entry stack
- Version history (basic)
- Internationalization (per-field translations)
- Media library picker
- Relation picker modal
- Templates system

### ❌ Missing / Incomplete

#### 1.1 Empty States
- **LeftPanel (Layers)**: No message when no sections exist
- **RightPanel Versions**: Empty state when no versions saved
- **MediaPicker**: No placeholder when media library is empty or search returns no results
- **SectionBlock**: No fallback when `fieldsToRender` is empty (misconfigured block)
- **BlockPickerModal**: Empty state for filtered/no results

#### 1.2 Error Handling with Retry
- Silent catches in API calls (e.g., "Failed to sync editor" toast without retry)
- Media upload errors should offer retry button
- Template operations failures need explicit retry
- Network error indicator in toolbar status

#### 1.3 Performance
- No virtualization for long section lists or version history
- No memoization on expensive renders (check `SectionBlock` re-renders)
- FieldRenderer may re-render unnecessarily

---

## 2. Accessibility (WCAG 2.1 AA)

### ✅ Partially Implemented
- Some `aria-label`s on toolbar buttons (recently added)
- Form inputs labeling (mostly present)
- Error messages have `role="alert"` and `aria-live="polite"`

### ❌ Missing

#### 2.1 Focus Management
- **No focus traps** in any modal:
  - `BlockPickerModal`
  - `TemplatesModal`
  - `SEOModal`
  - `RelationsModal`
  - `MediaLibrary` (embedded modal)
  - `DynamicZoneModal`
- Focus not restored to triggering element on modal close
- No initial autofocus on first focusable element in modal

#### 2.2 Visible Focus Indicators
- Extensive use of `outline-none` across form inputs and buttons
- Must replace with `focus-visible` styles or browser default
- Affected files: `FieldRenderer.tsx`, `FormBuilder.tsx`, `EditorToolbar.tsx`, `SectionBlock.tsx`, etc.

#### 2.3 ARIA Roles & Labels
- Modals missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Toolbar toggle buttons for panels need labels that reflect state (e.g., "Open left panel", not just "Panel")
- Dynamic updates (save complete, publish) need `aria-live="polite"` region or accessible toast
- Icon-only buttons need `aria-label` (some already fixed)

#### 2.4 Keyboard Navigation
- Modal close on `Escape` (check each modal)
- Tab trapping in modals
- Arrow key navigation in list-based modals (BlockPicker, Relations, Templates)
- Shortcuts help modal removed or marked "Coming Soon" — should be implemented with accessible dialog

---

## 3. Responsive Layout

### ❌ Missing

#### 3.1 Panel Behavior by Viewport
- **Desktop (>1024px)**: Current fixed widths (Left 300px, Right 420px, Canvas flexible) — OK
- **Tablet (768px-1024px)**:
  - Right panel should collapse to icon rail (48px wide, icons only)
  - Left panel remains full width or also collapsible to icon rail
- **Mobile (<768px)**:
  - Panels become full-screen overlays
  - Default both panels hidden
  - Toolbar has toggle buttons to slide panels in/out
  - Canvas takes full viewport with safe area insets

#### 3.2 Canvas & Typography Adjustments
- Reduce padding on mobile: `px-4 sm:px-6 md:pt-10 lg:px-10`
- `SectionBlock` spacing: `space-y-8` on mobile, `space-y-12` on desktop
- Field grid: some full-width fields need adjustment on small screens

#### 3.3 Toolbar Responsiveness
- Toolbar items should wrap or scroll horizontally on narrow viewports
- Hide less critical items on mobile (Undo/Redo may stay; Theme/Locale may go into menu)

---

## 4. Validation & Error Display

### ✅ Recently Implemented
- Field-level errors stored in `editorStore.fieldErrors`
- `FieldRenderer` displays error message with accessible markup
- Errors cleared on field change
- Validation errors block save and show toast summary

### ❌ Still Missing
- **Root document fields validation**: Title, slug, metaDescription should be validated
- Real-time validation (onBlue) vs. only on save (acceptable for MVP)
- Error summary component for screen readers (list of all errors at top)
- Scroll to first error on save failure
- Validation for SEO modal fields (max lengths: title 60, description 160)

---

## 5. Store Architecture Simplification

### ✅ Cleanup Needed

#### 5.1 Split Modal State into `useModalStore`
Current state scattered across:
- `editorStore`: `mediaLibraryOpen`, `blockPickerOpen`, `relationsModalOpen`, `mediaAssets`, `mediaSearch`, `selectedSections`, etc.
- `panelStore`: `templatesOpen`, `keyboardShortcutsOpen`, `mediaLibraryOpen`, `seoOpen`, `schemaMode` (these belong with modal UI state)

**Needed**: New `store/modalStore.ts` that centralizes all modal visibility flags and their temporary data. Keep `editorStore` for document data only; `panelStore` for panel dimensions/view mode.

#### 5.2 Remove Dead State from `panelStore`
- `activeLeftTab` and `setActiveLeftTab` (unused; LeftPanel only shows layers)
- Any modal open/close flags moved to `modalStore`

#### 5.3 Modal Store Shape (suggested)
```ts
interface ModalState {
  // Visibility
  blockPickerOpen: boolean
  mediaLibraryOpen: boolean
  relationsModalOpen: boolean
  templatesOpen: boolean
  seoOpen: boolean
  dynamicZoneModalOpen: boolean
  // Context
  mediaAssets: any[]
  mediaSearch: string
  relationsField: { sectionId: string; fieldKey: string } | null
  selectedSections: string[]
  blockSearch: string
  // Actions
  openBlockPicker: () => void
  closeBlockPicker: () => void
  // ... etc for each modal
}
```

---

## 6. Dynamic Zones

### ❌ Critical Gap

#### 6.1 Drag-and-Drop Reordering
- Current UI says "drag to reorder" but no DnD implemented
- `DynamicZoneModal` needs `<Reorder.Group>` from `@dnd-kit`
- Drag handle visible on hover/active
- Smooth reorder animation

#### 6.2 Zone Management
- Can zones be nested? (likely yes, need to verify)
- Ability to delete zone item with confirmation

---

## 7. SEO Modal

### ❌ Incomplete

#### 7.1 Explicit Save
- Relies solely on auto-save; user expects explicit "Save SEO" button
- Add primary button at bottom of modal
- On click: update document meta in parent store and trigger immediate save

#### 7.2 Validation
- Title: max 60 characters, display counter
- Description: max 160 characters, display counter
- Slug: no spaces, URL-safe validation

---

## 8. Media Library

### ❌ Missing Features

#### 8.1 Upload Experience
- Progress indicator during upload (percentage)
- Cancel upload button
- Retry on failure (with error toast action)

#### 8.2 Management
- Bulk selection (for relation picker with `hasMany`)
- Folder organization / navigation
- Image cropping/editing (advanced)
- Drag-and-drop upload area
- File type filters (images, videos, documents)

#### 8.3 Search & Pagination
- Debounced search input
- Infinite scroll or pagination for large libraries
- Sort by date, name, size

---

## 9. Relations Picker

### ❌ Missing Features

#### 9.1 Search & Filtering
- Debounced search (already present? verify)
- Filter by collection/type

#### 9.2 Pagination / Infinite Scroll
- Large relation sets need paging

#### 9.3 Relation Type UI
- Visual distinction between one-to-one, one-to-many, many-to-many
- Show relation field name in picker item

---

## 10. Templates

### ✅ Implemented
- Fetch template list
- Apply template to canvas
- Save as template (from toolbar)

### ❌ Missing
- Edit existing template (rename, delete, update content)
- Template categorization/folder organization
- Template preview thumbnail
- Template versioning

---

## 11. Keyboard Shortcuts

### ❌ Missing / Removed
- Help modal for shortcuts currently removed; should be restored with accessible dialog
- Common shortcuts in typical CMS:
  - `Ctrl+S` / `Cmd+S`: Save
  - `Ctrl+Z` / `Cmd+Z`: Undo
  - `Ctrl+Y` / `Cmd+Shift+Z`: Redo
  - `Ctrl+P` / `Cmd+P`: Publish (toggle)
  - `Ctrl+B` / `Cmd+B`: Bold (in richtext)
  - `Ctrl+I` / `Cmd+I`: Italic (in richtext)
  - `Ctrl+K` / `Cmd+K`: Link (in richtext)
  - `Escape`: Close modal / Deselect
  - `Ctrl+D`: Duplicate section
  - `Delete/Backspace`: Delete selected section (with confirmation)
- Customizable shortcuts (advanced)

---

## 12. Workflow & Publishing

### ✅ Implemented
- Draft/Publish toggle

### ❌ Missing
- Workflow state UI (Submit for review, Approve, Request changes)
- Scheduled publishing (set future date/time)
- Release bundling (group multiple changes)
- Notification system (email/in-app for reviews, mentions)
- Content calendar view

---

## 13. Internationalization

### ✅ Implemented
- Per-field translation storage
- Locale switcher in toolbar

### ❌ Missing
- RTL language support (CSS direction, UI mirroring)
- Bulk translation management UI (translate all fields at once)
- Translation status indicators (untranslated, in-progress)
- Translation memory / suggestions

---

## 14. Visual Design Consistency

### ❌ Gaps

#### 14.1 Typography Scale
Replace arbitrary sizes (`text-[8px]`, `text-[9px]`, `text-[10px]`) with consistent scale:
- `text-xs` (12px)
- `text-sm` (14px)
- `text-base` (16px)
- `text-lg` (18px)
- `text-xl` (20px)
- `text-2xl` (24px)
- `text-3xl` (32px)

**Affected**: SectionBlock labels, field labels, toolbar items, badges, etc.

#### 14.2 Spacing Scale
Use consistent spacing: 4, 8, 12, 16, 24, 32, 48, 64 (Tailwind default). Audit and replace magic numbers.

#### 14.3 Button Styles
Define standard variants:
- Primary: `bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-4 text-sm font-semibold`
- Secondary: `bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 h-10 px-4 text-sm`
- Icon button: `w-10 h-10 flex items-center justify-center`

#### 14.4 Color Contrast
- Verify dark mode contrast ratios (especially disabled states, borders)
- Ensure text meets 4.5:1 for normal, 3:1 for large text

---

## 15. Build & Quality

### ❌ To-Do

#### 15.1 Build Verification
- Run `pnpm run build` and fix any TypeScript errors (strict mode)
- Run `pnpm test` and ensure all tests pass

#### 15.2 Code Quality
- ESLint compliance (fix warnings)
- Add unit tests for:
  - `useValidation` hook
  - `editorStore` undo/redo logic
  - `FieldRenderer` error rendering
- End-to-end tests for:
  - Create section, fill fields, save
  - Open/close modals with keyboard
  - Undo/redo section delete

#### 15.3 Documentation
- README for admin package with development setup
- Inline comments for complex parts (validation schema merging, i18n value resolution)

---

## 16. Advanced Features (Low Priority)

- AI content generation (mentioned in plan as non-goal)
- Real-time collaboration (cursors presence)
- Content scheduling calendar
- Advanced media editing (crop, filters, trim video)
- Webhook triggers on events
- GraphQL API schema introspection in admin
- Plugin system for custom field types

---

## Priority Roadmap

### Sprint 1: Critical UX Gaps (1-2 weeks)
1. Add empty states throughout
2. Implement retry actions on error toasts
3. Add root document validation
4. SEO modal explicit save button
5. Drag-and-drop reorder for DynamicZone

### Sprint 2: Accessibility Compliance (1 week)
1. Implement focus trap hook and apply to all modals
2. Replace `outline-none` with `focus-visible`
3. Add missing ARIA roles/labels
4. Test with screen reader and keyboard-only navigation

### Sprint 3: Responsive Layout (1 week)
1. CSS grid layout for panels with breakpoints
2. Tablet right-panel icon rail
3. Mobile full-screen overlays
4. Adjust canvas padding and typography

### Sprint 4: Store & Architecture (1 week)
1. Create `useModalStore` and migrate modal state
2. Clean `panelStore` dead code
3. Standardize button and spacing classes

### Sprint 5: Polish & Performance (1 week)
1. Add virtualization for long lists (if needed)
2. Memoize expensive components
3. Audit color contrast
4. Add unit and e2e tests
5. Run build and fix all TypeScript errors

---

## Conclusion

The Zenith CMS editor has a strong functional core but requires focused effort on accessibility, responsive design, error resilience, and store simplification to reach production readiness. The gaps outlined above represent work that is achievable within 4-6 sprints with a small team.
