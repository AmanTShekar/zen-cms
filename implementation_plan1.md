# Zenith CMS Page Editor — Full Audit & Fix Plan

## Goal
Beat Strapi and Payload CMS at the editor experience. Fix every broken/subpar thing in the spatial page editor.

---

## 🐛 Bugs Found (20 Issues)

### 🔴 Critical — Breaking Functionality

| # | File | Issue |
|---|------|-------|
| 1 | `SpatialEditor.tsx` | **422 on save**: `backgroundImage: ''` and other empty media/relation fields fail Zod validation (schema rejects empty string for media ID). Need to strip empty falsy media values before sending. |
| 2 | `SpatialEditor.tsx` | **ID instability**: `nodeCounter.current` resets to `0` on every component mount. If user re-navigates to same page, IDs collide (`block_0`, `block_1` again). UUIDs should be used instead. |
| 3 | `SectionBlock.tsx` | **Disconnected local undo/redo**: Per-section `undoStack`/`redoStack` are independent of `editorStore`'s global undo. Ctrl+Z in toolbar doesn't revert field edits from per-section undo; they're two separate histories. The local undo also doesn't push to global store, so global undo can't undo granular field changes. |
| 4 | `SpatialEditor.tsx` | **`handleFieldChange` signature mismatch**: In `SpatialEditor` the prop is `handleFieldChange={(key, val) => handleFieldChange(section.id, key, val)}` — but the component receives it as `(sectionId, key, value)`. This double-wrapping means the `section.id` gets passed as the first arg AND is captured in the closure. OK actually this is fine. But the `handleFieldChange` uses Immer mutable API: mutates `prev.sections[sIdx].content[key]` without returning — this is valid Immer usage but never sets `hasUnsavedChanges`. Wait, `updateData` in the store does set `hasUnsavedChanges: true`. OK. |

### 🟡 Major — Broken UX

| # | File | Issue |
|---|------|-------|
| 5 | `EditorToolbar.tsx` | **Panel toggle buttons always show inactive**: `iconBtnActive(false)` is hardcoded for Left Panel and Right Panel toggles. They never appear active even when panel is open. |
| 6 | `SpatialEditor.tsx` | **`selectedSections` (multi-select) never passed to blocks**: `selectedSections: Set<string>` is tracked in state but never passed into `ReorderableSectionBlock` → `SectionBlock`. Multi-select (Shift+click) has zero visual feedback on the canvas. |
| 7 | `SpatialEditor.tsx` + `LeftPanel.tsx` | **Clicking section in LeftPanel doesn't scroll canvas to it**: `editorSetActiveSection(section.id)` is called but no `scrollIntoView` or smooth-scroll happens on canvas. |
| 8 | `LeftPanel.tsx` | **Reorder in LeftPanel uses `filteredSections` for display but `data.sections` for reorder values**: When a search filter is active, `filteredSections` only shows a subset, but `Reorder.Group values` passes ALL sections. Reordering while searching produces incorrect results. |
| 9 | `SpatialEditor.tsx` | **`injectionIndex` not reset on BlockPicker cancel**: If user opens "Insert Section" popup at index 3, then cancels, `injectionIndex` remains `3`. Next time they click "+ Append Section" button (which doesn't set injectionIndex), the block still inserts at index 3 instead of at the end. |
| 10 | `FieldRenderer.tsx` | **Array items use `idx` as Reorder.Item key instead of stable ID**: `<Reorder.Item key={(item as any)?._arrayId || idx}` — the `_arrayId` is never set when creating items in `handleAddArrayItem`. So drag-reorder of array items causes React key conflicts. |

### 🟠 Design & Visual Issues

| # | File | Issue |
|---|------|-------|
| 11 | `SectionBlock.tsx` | **Block type pill shows raw camelCase slug**: Shows `richTextSection`, `announcementBar`, `videoHero` instead of human-readable `Rich Text`, `Announcement Bar`, `Video Hero`. |
| 12 | `SectionBlock.tsx` | **Double active indicator**: Active state adds both `ring-2 ring-indigo-500/50` on outer div AND `div.absolute.inset-0.border-2.border-indigo-500/20` overlay — redundant and visually noisy. |
| 13 | `SectionBlock.tsx` | **Sub-toolbar layout breaks for collapsed sections**: The sub-toolbar (align + undo/redo) uses `-mx-6 -mt-6` negative margins. When `isCollapsed` is true, this toolbar still renders (inside the AnimatePresence area — actually it doesn't render when collapsed, correct). Fine. |
| 14 | `EditorToolbar.tsx` | **View mode toggle shows wrong colors**: In light mode, active view button shows `bg-black text-white` but in dark mode shows `bg-white text-black` — this is actually intentional inverse. OK but the inactive state text is `text-gray-500` which can be hard to read. |
| 15 | `SpatialEditor.tsx` | **Insert section portal button is nearly invisible**: `opacity-30 hover:opacity-100` with tiny `text-[8px]` text. Very hard to discover. |
| 16 | `SectionBlock.tsx` | **`grid-cols-1 md:grid-cols-2` always applies**: Some blocks have 10+ fields in a 2-col grid creating very cramped UI. Fields should only use 2-col when there are ≥4 non-fullwidth fields. |
| 17 | `SpatialEditor.tsx` | **Auto-save toast fires too aggressively**: Toast appears every 30s auto-save even in quiet background sessions. Should be silent auto-save with indicator, not toast. |
| 18 | `LeftPanel.tsx` | **Layer item shows blockType twice**: Each layer item shows `{section.title || section.blockType}` as the main label AND `{section.blockType}` as a secondary badge. If title matches blockType (no custom name), the same text is shown twice. |
| 19 | `SectionBlock.tsx` | **No visible drag affordance on hover**: Grip icon is always visible but has no hover highlight. Hard to know it's draggable. |
| 20 | `FieldRenderer.tsx` | **`select` field uses native `<select>`**: A native HTML select is inconsistent with the glassmorphic design. Should use a styled custom dropdown (or at minimum have the dark background applied consistently). |

---

## Proposed Changes

### Fix 1 — 422 Save: Sanitize Empty Media/Relation Fields
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Add a `sanitizePayloadSections` helper that strips `null`, `''`, `{}`, and `[]` values from media/relation fields before building the save payload.

---

### Fix 2 — Stable Section IDs via UUID
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Replace `block_${nodeCounter.current++}` with `crypto.randomUUID()` (available in all modern browsers & Node 22). Remove the `nodeCounter` ref.

---

### Fix 3 — Remove Disconnected Per-Section Undo
#### [MODIFY] [SectionBlock.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/SectionBlock.tsx)
Remove local `undoStack`/`redoStack` state entirely from `SectionBlock`. Wire the Undo/Redo buttons in the sub-toolbar to call the global `undo`/`redo` from `editorStore` instead. This makes Ctrl+Z and the UI buttons consistent.

---

### Fix 5 — Panel Toggle Active State
#### [MODIFY] [EditorToolbar.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/EditorToolbar.tsx)
Change `iconBtnActive(false)` to `iconBtnActive(leftOpen)` and `iconBtnActive(rightOpen)`.

---

### Fix 6 — Multi-Select Visual Feedback
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Pass `selectedSections` into `ReorderableSectionBlock` and forward into `SectionBlock` to show a secondary selection ring.

---

### Fix 7 — Scroll-to-Active Section
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Add a `useEffect` that calls `document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` whenever `editorActiveSection` changes from a LeftPanel click.

---

### Fix 8 — LeftPanel Reorder while Searching
#### [MODIFY] [LeftPanel.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/LeftPanel.tsx)
Disable drag reordering when search is active (disable `Reorder.Group`).

---

### Fix 9 — InjectionIndex Reset on Cancel/Append
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Call `setInjectionIndex(null)` when BlockPicker modal closes without adding. Also ensure "Append Section" button always calls `setInjectionIndex(null)` before opening picker.

---

### Fix 10 — Stable Array Item Keys
#### [MODIFY] [FieldRenderer.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/FieldRenderer.tsx)
In `handleAddArrayItem`, assign `_id: crypto.randomUUID()` to each new item. Use `item._id` as the Reorder.Item key.

---

### Fix 11 — Human-readable Block Type Labels
#### [MODIFY] [SectionBlock.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/SectionBlock.tsx)
Apply `humanize()` to `section.blockType` in the block type pill.

---

### Fix 12 — Remove Double Active Indicator
#### [MODIFY] [SectionBlock.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/SectionBlock.tsx)
Remove the redundant absolute overlay `div`. Keep only the `ring-2` on the outer container.

---

### Fix 15 — Better Insert Section Button
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Increase opacity to `opacity-0 group-hover/item:opacity-80` and improve button size.

---

### Fix 17 — Silent Auto-save (No Toast)
#### [MODIFY] [SpatialEditor.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/SpatialEditor.tsx)
Remove `toast.success` from auto-save path. The `AutoSaveIndicator` component already provides visual feedback.

---

### Fix 18 — Remove Duplicate Label in LeftPanel
#### [MODIFY] [LeftPanel.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/LeftPanel.tsx)
Show `section.blockName || section.title || humanize(section.blockType)` as label and only show blockType badge when it differs from the display name.

---

### Fix 19 — Drag Handle Hover Highlight
#### [MODIFY] [SectionBlock.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/SectionBlock.tsx)
Add `hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-400` to drag handle div.

---

### Fix 20 — Styled Select Field
#### [MODIFY] [FieldRenderer.tsx](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/FieldRenderer.tsx)
Replace native `<select>` with a proper styled custom dropdown using a `<div>` + popover pattern for consistency with the glassmorphic design.

---

## Verification Plan

### Automated
```bash
pnpm run build   # TypeScript compilation
pnpm test        # 17/17 tests
```

### Manual
1. Open Landing Page global in editor → save → confirm no 422
2. Add Hero block → confirm UUID-based ID in JSON view
3. Ctrl+Z → confirm global undo reverses last field edit
4. Click section in LeftPanel → confirm canvas scrolls to it
5. Open BlockPicker → cancel → click Append → confirm block appended at end
6. Add array item → drag reorder → confirm no key errors in console
7. Toggle Left panel → confirm toolbar button highlights when open
