# UI Redesign Specification

## Introduction

This document details the user interface changes required to transform the Zenith CMS editor into a production-ready, accessible, responsive, and visually consistent application. The redesign preserves the signature glassmorphic aesthetic while improving usability, keyboard navigation, and mobile experience.

## Design Tokens

### Typography
- **Base font**: Inter or Outfit, 16px (1rem) base
- **Scale**:
  - `text-xs`: 12px (0.75rem) - field labels, metadata
  - `text-sm`: 14px (0.875rem) - body text, button labels
  - `text-base`: 16px (1rem) - input text, body copy
  - `text-lg`: 18px (1.125rem)
  - `text-xl`: 20px (1.25rem)
  - `text-2xl`: 24px (1.5rem) - section titles, modal headings
  - `text-3xl`: 32px (2rem) - page titles
- **Line height**: 1.5 for body, 1.25 for headings
- **Weight**: 400 normal, 600 semibold, 700 bold, 900 black (for uppercase labels)
- **Eliminate**: arbitrary sizes like `text-[8px]`, `text-[9px]`, `text-[10px]`

### Spacing
- **Base unit**: 4px
- **Scale**: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px), `gap-12` (48px)
- **Section vertical spacing**: `space-y-8` on mobile, `space-y-12` on desktop
- **Padding**: Use `px-4`, `px-6`, `px-8`, `px-10` consistently

### Colors

**Dark Mode (Primary)**
- Background: `#0B0F19`
- Surface (glass): `bg-white/[0.02]` to `bg-white/[0.08]`
- Border: `border-white/10`
- Primary: `indigo-600` / `indigo-500`
- Text primary: `text-white`
- Text secondary: `text-gray-300`
- Text muted: `text-gray-400`

**Light Mode**
- Background: `#F9FAFB`
- Surface: `bg-white` with subtle border
- Border: `border-gray-200`
- Primary: `indigo-600`
- Text primary: `text-black`
- Text secondary: `text-gray-700`

**Contrast**: All normal text must meet 4.5:1 ratio; large text 3:1. Verify with contrast checker.

### Focus Styles
- **Default**: `focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2` (dark) or `ring-indigo-500/20` (light)
- **Alternative**: `focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2`
- **Never**: `outline-none` without visible focus replacement

### Border Radius
- Consistent `rounded-none` (square corners) per design system.

## Component Changes

### 1. EditorToolbar

**Current Issues:**
- Icon-only buttons lack accessible labels
- Buttons use `outline-none` without fallback focus style
- No visual grouping; cramped spacing
- Theme toggle label unclear

**Required Changes:**

```tsx
// BEFORE: simple icon button
<button onClick={undo} className="p-2">
  <Undo2 size={18} />
</button>

// AFTER: accessible with focus style
<button
  onClick={undo}
  aria-label="Undo (Ctrl+Z)"
  className="w-10 h-10 flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all"
>
  <Undo2 size={18} />
</button>
```

- Add `aria-label` to all icon buttons: Undo, Redo, LeftPanel toggle, RightPanel toggle, Theme toggle, Publish
- Use consistent size: `w-10 h-10` for icon buttons
- Add separator between button groups: `<div className="w-px h-6 bg-white/10 mx-1" />`
- On mobile: toolbar should scroll horizontally without wrap: `overflow-x-auto`

### 2. SectionBlock

**Current Issues:**
- Field labels use arbitrary `text-[8px]`
- Alignment buttons missing accessible labels
- Delete/duplicate buttons opacity-only hover state
- Spacing inconsistent across breakpoints

**Required Changes:**

**Field Label**
```tsx
// BEFORE
<label className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic block">
  {field.label || field.name}
</label>

// AFTER
<label className="text-xs font-black uppercase tracking-widest text-gray-400 block">
  {field.label || field.name}
</label>
```

**Header Icons (Alignment, Actions)**
```tsx
// Add accessible labels
<button
  onClick={(e) => { e.stopPropagation(); onAlign('left') }}
  aria-label="Align left"
  className={cn(
    'p-1.5 transition-all',
    section.align === 'left' ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'
  )}
>
  <AlignLeft size={14} />
</button>
```

**Spacing**: Increase gap between fields from `gap-2` to `gap-6` on desktop, `gap-4` on mobile.

**Delete/Duplicate Buttons**: Ensure always visible on mobile (not just hover). Use `opacity-100` on small screens.

### 3. FieldRenderer

**Current Issues:**
- All inputs use `outline-none` without visible focus fallback
- Radio/checkbox size too small (3.5 = 14px) for touch
- Placeholder text may be low contrast
- Error messages present but need better spacing and color

**Required Changes:**

**Input Focus**
```tsx
// BEFORE (text input)
className={cn(
  "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none",
  theme === 'dark'
    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
    : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
)}

// AFTER: remove outline-none, add focus-visible ring
className={cn(
  "w-full px-4 py-2.5 text-xs rounded-none transition-all",
  theme === 'dark'
    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
    : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
)}
```

**Radio/Checkbox Size**
```tsx
// Increase from w-3.5 h-3.5 to w-4 h-4 (16px)
<input
  type="radio"
  className="w-4 h-4 accent-indigo-500"
/>
```

**Error Display**
```tsx
{error && (
  <p className="text-xs text-red-500 mt-1.5" role="alert" aria-live="polite">
    {error}
  </p>
)}
```

**Placeholder Contrast**: Ensure `placeholder-gray-400` on dark, `placeholder-gray-500` on light.

### 4. Modals (All: BlockPicker, SEO, Templates, DynamicZone, MediaLibrary, Relations)

**Current Issues:**
- Missing ARIA roles (`dialog`, `modal`)
- No focus trapping
- Escape key not handled in some modals
- Title not linked via `aria-labelledby`
- On mobile, modals do not occupy full screen

**Required Changes:**

**Step 1: ARIA Attributes**
```tsx
// On the main dialog container (motion.div)
<motion.div
  ref={dialogRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby={modalTitleId}
  ...
>
  {/* Inside: */}
  <h3 id={modalTitleId}>Add Block</h3>
```

**Step 2: Focus Trap Hook**
```tsx
import { useRef } from 'react'
import { useFocusTrap } from '../../../hooks/useFocusTrap'

const dialogRef = useRef<HTMLDivElement>(null)
const modalTitleId = 'block-picker-modal-title' // unique per modal

useFocusTrap(blockPickerOpen, {
  onEscape: () => setBlockPickerOpen(false),
  containerRef: dialogRef
})
```

**Step 3: Escape Handling**
If modal already has `onKeyDown` that handles Escape, remove it and rely on hook.

**Step 4: Responsive Full-Screen (Mobile)**
```tsx
className={cn(
  'absolute right-0 top-0 bottom-0 w-[400px] border-l shadow-2xl flex flex-col',
  theme === 'dark' ? 'bg-[#050505] border-white/10' : 'bg-white border-gray-200',
  'md:w-[400px] md:right-0 md:top-0 md:bottom-0',
  'max-md:inset-0 max-md:w-full max-md:h-full max-md:border-none max-md:rounded-none'
)}
```

**Step 5: Close Button Accessible**
```tsx
<button
  onClick={() => setBlockPickerOpen(false)}
  aria-label="Close"
  className="..."
>
  <X size={16} />
</button>
```

### 5. LeftPanel (Layers)

**Current Issues:**
- No empty state when no sections
- Drag handle may be too small
- Selected section indicator not clear enough

**Required Changes:**

**Empty State**
```tsx
{sections.length === 0 && (
  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
    <p className="text-sm font-medium">No content sections</p>
    <p className="text-xs mt-1">Click "Add Block" to create your first section</p>
  </div>
)}
```

**Drag Handle**: Increase touch target: `className="w-8 h-8 p-1"`.

**Selected Indicator**: Add left border-2 border-indigo-500 on the section card when active (already exists in SectionBlock). Enhance with subtle background tint.

### 6. RightPanel (Versions)

**Current Issues:**
- No empty state
- Version list items may lack accessible date format

**Required Changes:**

**Empty State**: When `versions.length === 0`, show:
```tsx
<div className="flex flex-col items-center justify-center h-64 text-gray-400">
  <p className="text-sm">No versions yet</p>
  <p className="text-xs mt-1">Save the page to create a version</p>
</div>
```

**Version Item**
```tsx
// Use semantic time element
<time dateTime={version.createdAt} className="text-xs">
  {new Date(version.createdAt).toLocaleDateString()}
</time>

// Restore button
<button
  onClick={() => restoreVersion(version.id)}
  aria-label={`Restore version from ${formattedDate}`}
  className="text-xs text-indigo-500 hover:text-indigo-400"
>
  Restore
</button>
```

### 7. Buttons (Global Standard)

Replace all button variants with these classes:

| Variant | Classes |
|---------|---------|
| Primary | `h-10 px-4 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent focus-visible:ring-2 focus-visible:ring-indigo-500/50` |
| Secondary | `h-10 px-4 text-sm bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500/50` |
| Icon | `w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500/50` |
| Destructive | `h-10 px-4 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 focus-visible:ring-2 focus-visible:ring-rose-500/50` |

Apply to all buttons in EditorToolbar, SectionBlock, Modals, etc.

### 8. Empty States (Summary)

Add consistent empty states across:

| Location | Message | Icon/Illustration |
|----------|---------|-------------------|
| LeftPanel (no sections) | "No sections. Add your first block." | Plus icon |
| RightPanel (no versions) | "No versions yet. Save to create one." | Clock icon |
| BlockPickerModal (no results) | "No blocks match your search." | SearchX icon |
| MediaPicker (empty library) | "No media files. Upload your first image." | Image icon |
| TemplatesModal (none) | "No templates. Save current page as template." | FilePlus icon |
| RelationsModal (no relations) | "No related items." | Link2 icon |

Style: centered, text-gray-400, `text-sm` heading + `text-xs` subtext, optional icon with opacity-30.

### 9. Responsive Layout

**Breakpoints**
- Desktop: `>1024px` - three-column layout
- Tablet: `768px-1024px` - right panel collapses to icon rail
- Mobile: `<768px` - panels become full-screen overlays

**Implementation**

```tsx
// SpatialEditor container
<div className="grid grid-cols-[300px_1fr_420px] lg:grid-cols-[260px_1fr_420px] md:grid-cols-[260px_1fr_48px] block relative">
  <LeftPanel className="left-panel ..." />
  <Canvas />
  <RightPanel className="right-panel ..." />
</div>
```

CSS (Tailwind):
```css
@layer utilities {
  .left-panel, .right-panel {
    transition: transform 0.3s ease;
  }
  /* Mobile overrides */
  @media (max-width: 768px) {
    .left-panel {
      position: fixed; z-index: 50; inset: 0; transform: translateX(-100%);
    }
    .left-panel.open { transform: translateX(0); }
    .right-panel {
      position: fixed; z-index: 50; inset: 0; transform: translateX(100%);
    }
    .right-panel.open { transform: translateX(0); }
  }
}
```

**Panel Toggle Buttons**: In toolbar, add buttons that toggle `leftOpen` / `rightOpen` state. On mobile, these open panels as overlays.

### 10. Validation & Error Summary

**Field-level errors**: Already implemented in FieldRenderer. Ensure styling: `text-red-500`, `mt-1.5`, `text-xs`.

**Error Summary on Save**: When validation fails, show toast with count and "View errors" button that scrolls to first invalid field and focuses it.

**Implementation**:
```tsx
const handleSave = async () => {
  const errors = validate(documentData)
  if (errors.length > 0) {
    setFieldErrors(/* map */)
    toast.error(`Please fix ${errors.length} errors`, {
      action: {
        label: 'View errors',
        onClick: () => {
          const firstErrorField = document.getElementById(`field-${errors[0].fieldKey}`)
          firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstErrorField?.focus()
        }
      }
    })
    return
  }
  // proceed with save
}
```

## Accessibility Checklist

- [ ] All modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Focus trap implemented in every modal
- [ ] All icon-only buttons have `aria-label`
- [ ] All interactive elements have visible `focus-visible` style
- [ ] Form inputs properly associated with `<label>` or `aria-label`
- [ ] Checkboxes/radios have larger touch target (min 44×44px including padding)
- [ ] Error messages have `role="alert"` and `aria-live="polite"`
- [ ] Keyboard navigation works: Tab cycles, Esc closes modals, arrow keys navigate lists
- [ ] Color contrast meets WCAG AA
- [ ] Skip links provided if needed (e.g., "Skip to canvas")

## Migration Steps

1. Create `useFocusTrap` hook in `packages/admin/src/hooks/useFocusTrap.ts`
2. Update `useFocusTrap` with visibility check (already done)
3. Apply focus trap to each modal component, adding ARIA attributes
4. Replace all `outline-none` with proper focus-visible classes (use search/replace)
5. Standardize button classes throughout codebase
6. Update typography: replace `text-[8px]`, `text-[9px]`, `text-[10px]` with `text-xs` or `text-sm`
7. Add empty state components to panels and modals
8. Implement responsive panel layout with CSS grid and media queries in `SpatialEditor.tsx`
9. Add accessible labels to toolbar icons and alignment buttons
10. Test with keyboard-only, screen reader, and on mobile viewport

## Conclusion

This specification provides a clear path to a polished, accessible editor. Implementation should be done component-by-component, verifying each change with accessibility tools and responsive testing. Maintain the glassmorphic visual identity while ensuring readability and usability.
