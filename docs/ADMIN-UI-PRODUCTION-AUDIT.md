# Zenith CMS Admin UI - Production Readiness Audit

**Date:** 2026-05-22  
**Component:** Admin Dashboard - Page Editor (`packages/admin/src/pages/editor/`)  
**Target Production Grade:** Enterprise SaaS CMS comparable to Strapi, Payload, Contentful  
**Auditor:** Claude Code  

---

## Executive Summary

The Zenith CMS admin UI demonstrates **strong visual design** with a sophisticated glassmorphic aesthetic and smooth animations. However, from a **production CMS perspective**, the editor has **critical gaps** in accessibility, responsive behavior, error handling, and user workflow that would prevent it from being enterprise-ready.

**Overall Assessment:**  
- ✅ **Visual Excellence:** 9/10  
- ⚠️ **Usability & Accessibility:** 4/10  
- ⚠️ **Reliability & Error Handling:** 3/10  
- ❌ **Mobile/Responsive:** 2/10 (is mobile neded?)
- ⚠️ **Code Maintainability:** 6/10  

**Key Finding:** The editor prioritizes aesthetics over usability and robustness. Production deployment requires addressing 47 actionable issues classified below.

---

## 1. Current State Strengths

### 1.1 What Works Well

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Glassmorphism Theme** | ✅ Excellent | Consistent dark/light mode with proper backdrop blurs and HSL colors |
| **Micro-interactions** | ✅ Excellent | Smooth Framer Motion animations, hover states, transitions |
| **Undo/Redo System** | ✅ Good | Immer-based with 50-item stack limit |
| **i18n Foundation** | ✅ Good | Store exists with locale fallback logic |
| **Modular Architecture** | ✅ Good | Components split reasonably (FieldRenderer, SectionBlock, etc.) |
| **Auto-save** | ⚠️ Fair | 30s debounced but missing UI feedback & conflict resolution |
| **Keyboard Shortcuts** | ⚠️ Fair | Basic shortcuts exist but accessibility is poor |
| **Live Preview iframe** | ✅ Good | PostMessage protocol with versioned guard |

---

## 2. Critical Issues (Must Fix Before Production)

### 2.1 Accessibility (WCAG 2.1 AA Compliance)

**Issue:** The editor is **not wheelchair accessible**, fails keyboard navigation, and lacks screen reader support.

**Specific Failures:**

| File | Line | Issue | Impact |
|------|------|-------|--------|
| `EditorToolbar.tsx` | 114-121 | Buttons lack `aria-label` (Undo/Redo, Panel toggles) | Screen readers read generic labels |
| `LeftPanel.tsx` | 88-105 | Layer buttons missing `aria-selected`, `aria-label` | Blind users cannot identify active layer |
| `SectionBlock.tsx` | 556, 579, etc. | Icon-only buttons (Insert, Duplicate, Delete) have no accessible names | WCAG Failure |
| `FieldRenderer.tsx` | 94-107 | Text inputs missing associated `<label>` elements (only div wrappers) | No label association for screen readers |
| `MediaPicker.tsx` | 155-341 | Modal lacks `role="dialog"`, `aria-modal`, focus trap | Keyboard users trapped outside modal |
| `RichTextEditor.tsx` | 545-630 | Toolbar buttons have no `aria-pressed` states | Screen readers cannot detect active formatting |
| `RightPanel.tsx` | 73-98 | Tab buttons missing `role="tab"`, `aria-selected` | Tab navigation not announced |
| `DashboardLayout.tsx` | 422-450 | Sidebar links missing focus indicators | Keyboard-only users cannot see focus |
| `SpatialEditor.tsx` | 152-168 | Keyboard shortcut handlers do not trap focus or provide announcements | Invisible to assistive tech |

**Recommendation:**  
- Implement proper semantic HTML with ARIA attributes
- Add `aria-label` to all icon buttons
- Ensure focus management in modals (trap focus, return focus on close)
- Add `role="dialog"` and `aria-labelledby` to modals
- Implement visible focus indicators (outline, not outline:none)
- Test with NVDA/JAWS and VoiceOver

---

### 2.2 Error Handling & User Feedback

**Issue:** Failures are **silent** or show generic toasts that provide no recovery path.

**Specific Failures:**

| Location | Issue | Example |
|----------|-------|---------|
| `MediaPicker.tsx:30-36` | `catch` block only logs to console, no user feedback | Upload fails silently |
| `MediaPicker.tsx:103-106` | Same silent failure on upload error | User thinks upload succeeded |
| `SpatialEditor.tsx:256` | `catch { toast.error('Failed to sync editor') }` - no retry, no details | Generic error, user cannot act |
| `SpatialEditor.tsx:210` | Templates loading error swallowed: `catch(() => {})` | Never knows template failed |
| `FormBuilder.tsx:524-528` | `onSubmit` errors caught but no error display | Form appears to submit but silently fails |
| `FieldRenderer.tsx:358-377` | Relation picker errors not handled | No feedback if relation fetch fails |
| `RichTextEditor.tsx:310-318` | Media fetch errors only console logged | User sees blank editor |
| `useEditorStore.ts:238-253` | `save()` method fails silently if no data | Wasted clicks |

**Recommendation:**
- Replace all `catch {}` with meaningful error UI:
  - Show error toast with **Retry** button
  - Display inline error messages below relevant fields
  - Add a global error boundary component that shows recoverable UI
- Implement exponential backoff for failed API calls
- Log errors to a monitoring service (Sentry, LogRocket)

---

### 2.3 Responsive Design & Mobile Support

**Issue:** The editor is **desktop-only**. No tablet or mobile support exists.

**Specific Failures:**

| Issue | Evidence | Impact |
|-------|----------|--------|
| Left/Right panels fixed pixel widths (300px, 420px) | `panelStore.ts:56-57`, `LeftPanel.tsx:50`, `RightPanel.tsx:44` | On screens <1024px, panels overflow or collapse incorrectly |
| Canvas has horizontal padding `px-10` | `SpatialEditor.tsx:506` | Wastes precious mobile space |
| RightPanel iframe not responsive | `RightPanel.tsx:110-122` iframe uses `w-full h-full` but parent has fixed width | Iframe may be unusable on small screens |
| Modal sizes use `max-w-6xl` | `MediaPicker.tsx:162` | 768×580px modal overflows on mobile |
| DashboardLayout: sidebar collapses but content not adjusted | `DashboardLayout.tsx:57-71` collapses sidebar but no mobile menu optimization |
| Grid layouts break on mobile | `FormBuilder.tsx:446` uses `md:grid-cols-2` but no `sm` or `xs` fallback | Single column only, wastes space |
| Font sizes too small for touch | `EditorToolbar.tsx:257` buttons `min-w-[140px] h-11` - good, but LeftPanel layer buttons: `text-[10px]` (line 102) too tiny for touch | Users cannot tap accurately |

**Recommendation:**
- Implement **responsive panel behavior**:
  - Mobile: Panels become full-screen overlays (bottom sheet style)
  - Tablet: Right panel collapses to icon-only rail
- Replace fixed pixel widths with percentages or CSS grid
- Add `<meta name="viewport" content="width=device-width, initial-scale=1">` if missing
- Increase touch target sizes to minimum 44×44px (WCAG)
- Test on iPhone SE (375×667) and iPad (768×1024) viewports

---

### 2.4 Keyboard Navigation & Focus Management

**Issue:** The editor **claims** keyboard shortcuts but lacks proper focus trapping and visible focus states.

**Specific Failures:**

| Issue | Code | Impact |
|-------|------|--------|
| `Escape` resets but does not return focus to origin | `SpatialEditor.tsx:161` closes modals but doesn't track last focused element | Focus lost, screen readers confused |
| Shortcuts use `usePanelStore.getState()` anti-pattern | `SpatialEditor.tsx:163-164` | Bypasses React state, stale closures possible |
| No `tabindex` management in modals | All modal components | Tab order escapes modal, user can tab to background |
| Focus indicators removed with `outline: none` | `FormBuilder.tsx:115, 148`, etc. | No visible focus for keyboard users |
| `onClick` handlers missing `onKeyDown` equivalents | All buttons | Cannot activate with Enter/Space when focused |
| RightPanel version items not keyboard accessible | `RightPanel.tsx:164-171` `<button>` is fine but missing `tabIndex` control | N/A actually OK, but needs focus styles |

**Recommendation:**
- Implement proper **focus trapping** in all modals using `focus-trap-react` or manual implementation
- Add visible `:focus-visible` styles to all interactive elements
- Replace shortcuts anti-pattern with proper `useStore` subscriptions
- Ensure every `<button>` has accessible name and can be triggered via keyboard (already works)
- Add `onKeyDown` handlers for non-button elements that act like buttons

---

## 3. High Priority Issues

### 3.1 Inconsistent Field Rendering

**Problem:** Two different field rendering systems exist:

1. `FormBuilder.tsx` (used in collection list views) - handles many field types, validation, error display
2. `SectionBlock.tsx` + `FieldRenderer.tsx` (used in page editor) - different styling, no validation

**Impact:**
- Field behavior differs between contexts (confusing)
- Validation rules not enforced in editor (section content never validated on save)
- Inconsistent visual design (different border styles, spacing)

**Example Discrepancy:**

```tsx
// FormBuilder select - has error display
{!isReadOnly && getFieldError(getFieldName(field)) && (
  <p className="text-xs text-danger mt-1 font-medium">...</p>
)}

// FieldRenderer select - NO error display at all
// (FieldRenderer.tsx:318-352)
```

**Recommendation:**  
- Consolidate to single `FormBuilder` component used everywhere
- OR extract common `FieldRenderer` used in both places with error support
- Validate section content on save (already called in `SpatialEditor.tsx:264` via `validate(data)` but unclear what validator does)

---

### 3.2 Missing Empty States

**Problem:** When no data exists, components render blank or crash.

| Location | Current Behavior | Should Show |
|----------|------------------|-------------|
| `LeftPanel.tsx:86-107` | If `data?.sections` empty, renders empty div | "No sections yet. Click '+' to add." |
| `RightPanel.tsx:143-175` | If `history` empty, renders empty div | "No version history yet." with illustration |
| `SectionBlock.tsx:205-256` | If `fieldsToRender` empty, renders nothing | "No fields configured for this block." |
| `MediaPicker.tsx:262-307` | If `files` empty after load, renders nothing | "No media assets. Upload your first image." |
| `DashboardLayout.tsx:341-377` | If `collections` empty, renders nothing | "No collections defined. Create one to get started." |

**Recommendation:** Add styled empty state components with icons and CTAs.

---

### 3.3 Performance: Unnecessary Re-renders

**Problem:** Massive `useEditorStore` destructuring with 20+ properties causes entire editor to re-render on any store change.

**Example:** `SpatialEditor.tsx:49-78` destructures almost entire store. Any change to `history`, `templates`, `relationsField`, etc. triggers full re-render.

**Impact:**  
- Frame drops during typing in richtext editor  
- UI feels sluggish with many sections  

**Evidence:**  
The `useMemo` and `useCallback` usage is minimal. The `FieldRenderer` re-renders on every keystroke in the parent due to store changes.

**Recommendation:**
- Select only needed store properties with granular selectors:
  ```tsx
  const data = useEditorStore(s => s.data)
  const setData = useEditorStore(s => s.setData)
  const activeSection = useEditorStore(s => s.activeSection)
  ```
- Move `history`, `templates`, `relationsField` into separate stores (feature-based splitting)
- Add `React.memo` to `SectionBlock` and `FieldRenderer` with custom comparison

---

### 3.4 Validation Gaps

**Problem:** Field-level validation exists in `FormBuilder` but not in editor. Required fields not enforced.

**Evidence:**
- `useValidation.ts` hook imported in `SpatialEditor.tsx:100` but used only for autosave, not on manual save
- No visual error indicators next to required fields in `SectionBlock`
- Required star (`*`) shown but no error message if empty on save

**Recommendation:**
- Validate all required fields on save and display errors inline
- Highlight fields with errors (red border or indicator)
- Disable Publish button if validation fails

---

### 3.5 State Persistence Loss

**Problem:** All state (unsaved changes, undo stack, panel positions) cleared on page refresh.

**Impact:**  
- User loses work if they accidentally refresh  
- Undo history wiped (only in-memory)  
- Panel sizes reset to defaults  

**Recommendation:**
- Persist `panelStore` state to `localStorage` (widths, open/closed states)
- Implement **indexedDB** or **localStorage** autosave draft for unsaved changes
- On mount, check for saved draft and prompt to restore

---

## 4. Medium Priority Issues

### 4.1 Visual Design Inconsistencies

| Issue | File | Lines | Fix |
|-------|------|-------|-----|
| Mixed border radius: `rounded-none` vs `rounded-xl` vs `rounded-2xl` | Multiple | - | Standardize: use `rounded-none` or very subtle rounding (0.25rem) |
| Inconsistent button heights: some `h-11`, some `h-9`, some `py-1.5` | `EditorToolbar.tsx`, `LeftPanel.tsx` | - | Set design token: `--btn-height: 36px` |
| Hardcoded colors instead of CSS variables | Throughout | - | Move `#6366f1` (indigo-500) to `--color-primary` in `:root` |
| Inconsistent typography scale | `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-xs` everywhere | - | Adopt Type Scale: `text-xs:12px`, `text-sm:14px`, `text-base:16px` |

---

### 4.2 Toast Notification Limitations

**Issues:**
- `toast` library (react-hot-toast) used but no action buttons
- No queue management (toasts stack up infinitely)
- No persistence (toasts disappear before user can read)
- No undo action after delete

**Recommendation:**
- Replace with `sonner` or custom toast component with actions:
  ```tsx
  toast.success('Section deleted', {
    action: { label: 'Undo', onClick: () => undoDelete() },
    duration: 5000
  })
  ```

---

### 4.3 Internationalization (i18n) Gaps

**Good:** `i18nStore` exists, locale switcher in toolbar.

**Gaps:**
- No **RTL** support (Arabic, Hebrew)
- Date formats not localized (`new Date().toLocaleDateString()` used but not centralized)
- Number formats (thousands separators) not localized
- Directionality not set on `<html>` tag
- `useI18nStore.getLocalizedValue` fallback to default but UI doesn't indicate which locale is showing

**Recommendation:**
- Add `dir="rtl"` support via Tailwind `:dir()` modifiers
- Use `date-fns` or `luxon` for locale-aware formatting
- Show locale badge next to field label when viewing non-default locale (already exists in FormBuilder but not SectionBlock)

---

### 4.4 Missing Keyboard Shortcuts

**Current Shortcuts:** Cmd+S, Cmd+Z, Cmd+Shift+Z/Cmd+Y, Cmd+D, Cmd+P, Cmd+\

**Missing (compared to VS Code & Strapi):**

| Shortcut | Action | Priority |
|----------|--------|----------|
| `Cmd+,` | Open Settings | High |
| `Cmd+F` | Focus search/block picker | High |
| `Cmd+E` | Toggle right panel | Medium |
| `Cmd+B` | Toggle bold (in richtext) | High (already works in editor but not globally) |
| `Cmd+I` | Toggle italic | High |
| `Cmd+U` | Toggle underline | Medium |
| `Cmd+/` | Show keyboard shortcuts help | High |
| `Tab` | Navigate between fields (currently moves out of editor) | Critical |

**Recommendation:** Add keyboard shortcut modal (partially exists but not comprehensive) and improve Tab traversal.

---

### 4.5 Confirmation Dialogs Missing

**Destructive actions without confirmation:**

| Action | File | Risk |
|--------|------|------|
| Delete section | `SpatialEditor.tsx:315-320` | One-click accidental delete |
| Delete field (no UI but potential) | N/A | Could be added later |
| Discard unsaved changes on navigation | `useUnsavedGuard.ts` - shows confirm but not customizable | Browser default is ugly |
| Remove from array (FieldRenderer array type) | `FieldRenderer.tsx:426` | One-click removal |
| Delete media asset (MediaPicker) | MediaPicker lacks delete button entirely | Could cause orphaned files |

**Recommendation:**  
- Use `window.confirm()` replacement (custom modal) for delete operations
- Add "Soft delete" (trash bin) capability for media
- Make browser nav guard consistent with app theme

---

### 4.6 Undo/Redo UX Issues

- Undo/Redo stack cleared on page load (should be persisted to localStorage)
- No visual indicator of redo stack size
- `toast.success('Undone', { icon: '↩️' })` - icon not obvious, consider "Action undone" with undo button
- Cannot undo after Publish (publish clears stack?)

**Recommendation:**
- Persist undo stack across refresh (last 50 states)
- Show stack size in toolbar: `↩ 5 / ↩ ↩ 3`
- Add "Redo" button to toast after undo

---

### 4.7 Preview iframe Limitations

- No preview mode toggle (desktop/tablet/mobile) - RightPanel only has "Live"
- Iframe size not adjustable (should have zoom control)
- Iframe reloads on every save (can cause flicker)
- No "Open in new tab" button
- `iframeRef` not cleared on unmount (memory leak potential)
- Preview URL constructed with string concatenation (security: XSS if untrusted input)

**Recommendation:**
- Add viewport size toggles (mobile/tablet/desktop) with device frames
- Debounce iframe postMessage on save
- Use `srcDoc` or sandboxed iframe with CSP headers

---

## 5. Low Priority / Nice-to-Have

### 5.1 Aesthetic Polish

- **SectionBlock** drag handle icon (`Grip`) visibility: only visible on hover but should have subtle always-visible indicator for accessibility
- **FieldRenderer** field indicator (`⚡`) is tiny and low contrast (Fig 5.1) - consider larger icon or pulse effect
- **Loading spinners** inconsistent: sometimes `<Loader2 size={48} />` sometimes `<Cpu size={48} />`
- **Empty left panel** when collapsed shows nothing; add drag handle always visible?

### 5.2 Developer Experience

- Add React DevTools escape hatch (currently z-index layering may interfere)
- Add performance monitors (why re-renders) in dev mode
- Expose `__RELAY_DEVTOOLS__` if using Relay (not used here)

### 5.3 Analytics & Telemetry

- No user interaction tracking (where do users click? which features used?)
- No performance metrics (LCP, FCP, CLS)
- No error reporting to backend

---

## 6. Payload CMS Comparison - Missing Features

Payload CMS editor layout (three-pane) is the target, but our implementation lacks:

| Feature | Payload equivalent | Zenith status | Gap |
|---------|-------------------|---------------|-----|
| **Slug field with live preview** | Auto-generated from title | ❌ Missing | Users must manually fill slug |
| **Meta fields (SEO title, description, image)** | Built-in SEO tab | ⚠️ Partial (SeoModal exists but not integrated) | Not shown in editor canvas |
| **Rich text with relationship embedding** | Blocks with modal picker | ✅ Present but UI cramped | Entity picker UX could improve |
| **Upload progress indicator** | Progress bar | ❌ Missing | MediaPicker shows spinner but no % progress |
| **Block duplication** | Duplicate block button | ✅ Present | Good |
| **Version restore diff view** | Side-by-side diff | ❌ Missing | Only shows version list, no diff |
| **Schedule publishing** | Date picker in toolbar | ⚠️ Partial (workflow store has `scheduledAt` but no UI) | No button/modal to set schedule |
| **Workflow status badges** | Status badge on document | ⚠️ Partial (workflow store exists but UI hidden) | Not displayed in toolbar |
| **Releases management** | Group changes into release | ⚠️ Partial (release store exists but no UI) | Not integrated with publish |
| **Field validation in real-time** | Red outline on invalid | ❌ Missing | Validation only on save |
| **Autosave indicator** | "All changes saved" vs "Saving..." | ⚠️ Partial (toast shows but not persistent indicator) | No status in toolbar |

---

## 7. Security Considerations

### 7.1 XSS Risks

- `RichTextEditor` content sanitization: **unclear**. TipTap outputs HTML, but no DOMPurify usage visible before render in iframe preview.  
  **Risk:** Stored XSS if malicious HTML saved.  
  **Fix:** Sanitize on server AND client before rendering.

- `iframe` `src` uses string interpolation:  
  ```tsx
  src={`${storefrontUrl}?preview=true&pageId=${id}`}
  ```  
  If `id` contains URL-encoded payload, could lead to XSS in iframe. Ensure `encodeURIComponent(id)`.

- `dangerouslySetInnerHTML` not used (good), but `EditorContent` from TipTap does internal HTML injection.

### 7.2 CSRF & Authentication

- API calls use custom `api` instance (axios-like) - need to verify `withCredentials: true` or JWT in headers  
  Check `lib/api.ts` (not read in audit) to ensure tokens sent securely (HttpOnly cookies vs localStorage).

### 7.3 Content Security Policy

- No CSP headers set in admin panel  
  **Recommendation:** Add `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'` (inline scripts needed for hydration)  
  Use nonce for inline scripts instead of `'unsafe-inline'`.

---

## 8. Store Architecture Issues

### 8.1 State Bloat & Unnecessary Getters

`editorStore.ts` has 51 properties in `EditorState` interface. But `SpatialEditor` only uses ~15. Unused state (like `mediaAssets`, `mediaSearch`, `relationsModalOpen`) kept in memory but never read in editor context.

**Recommendation:** Split editor-specific state from global UI state:
- `useEditorStore()` → only editor data, sections, undo/redo
- `useModalStore()` → all modal visibility states (media, relations, templates, block picker, etc.)
- `useUIStore()` → panel open/close, widths, view mode

---

### 8.2 `usePanelStore` Still Contains Dead Tabs

```ts
// panelStore.ts:3
export type LeftTab = 'layers' | 'components' | 'schema' | 'api'  // components, schema, api removed
```

But `activeLeftTab` still exists and setter unused. LeftPanel now only shows layers; tabs removed entirely.

**Fix:** Remove dead types and properties:
- Delete `activeLeftTab`, `setActiveLeftTab`
- Delete LeftTab type (reduce to just 'layers' if only one tab)

---

### 8.3 `workflowStore` and `i18nStore` Integration Incomplete

Workflow status (`draft`, `in_review`, `published`) stored in store but UI only shows Draft/Publish buttons.  
`workflowStatus` changes (submit for review, approve, request changes) are called in `SpatialEditor.tsx:373-381` but no UI to trigger them.

**Gap:** Missing workflow actions panel in toolbar or right panel.

---

## 9. Specific Refactoring Recommendations

### 9.1 Immediate "Quick Wins" (1-2 days)

1. **Add empty states** to LeftPanel, RightPanel, MediaPicker, SectionBlock
2. **Fix keyboard shortcuts** anti-pattern: replace `usePanelStore.getState()` with proper store subscription
3. **Add aria-labels** to all icon buttons (use consistent naming pattern)
4. **Persist panel widths** to localStorage:
   ```ts
   useEffect(() => { localStorage.setItem('panelLeftWidth', leftWidth) }, [leftWidth])
   ```
5. **Replace `toast.error({})` with actionable error UI** (add retry callbacks)
6. **Add validation error display** to SectionBlock fields
7. **Fix responsive canvas** - reduce padding on mobile: `px-4` instead of `px-10`

---

### 9.2 Short-term (1 week)

1. **Consolidate FieldRenderer** into FormBuilder or extract unified component with validation support
2. **Implement focus trap** in all modals (MediaPicker, BlockPicker, Relations, Templates, SEOModal, DynamicZoneEditor, KeyboardShortcutsModal)
3. **Add visible focus-visible styles**:
   ```css
   :focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
   ```
4. **Add version diff view** (side-by-side or unified diff) in RightPanel Versions tab
5. **Implement schedule publish UI** (date picker modal)
6. **Add media upload progress** - use Axios `onUploadProgress` or fetch `ReadableStream`
7. **Fix store state bloat** - split into multiple stores

---

### 9.3 Medium-term (2-4 weeks)

1. **Mobile-responsive layout** - redesign panels as overlays
2. **Full WCAG audit** - hire accessibility consultant or use WAVE tool
3. **Implement soft delete** for media with trash bin and restore
4. **Persist undo stack** to localStorage with size limit (50 states)
5. **Add field-level real-time validation** with errorSummary at top of section
6. **Implement preview device toggles** (desktop/tablet/mobile) with iframe sizing
7. **Add analytics** (PostHog, Mixpanel) for feature usage
8. **Add error boundary** with reload option and error reporting to Sentry

---

### 9.4 Long-term (1-3 months)

1. **Redesign toolbar** with grouped related actions (like Figma/Strapi)
2. **Implement version diff visualization** (highlight changed fields)
3. **Add collaborative features** (presence, comments on fields) using Yjs orsimilar
4. **Implement offline mode** with background sync (PWA)
5. **Add power user features**: Command palette (Cmd+K) with fuzzy search for blocks, fields, actions
6. **Rewrite field rendering** using render props or compound components pattern
7. **Add multi-site switching** (current `isGlobal` prop suggests multi-tenancy)
8. **Implement audit log viewer** in admin panel

---

## 10. Detailed Action Items by Category

### 10.1 Accessibility

- [ ] Add `aria-label` to all buttons without visible text
- [ ] Implement focus trap in 7 modals
- [ ] Replace `outline-none` with `focus-visible:outline`
- [ ] Add `role="dialog"` and `aria-labelledby` to all modal wrappers
- [ ] Ensure color contrast ratios ≥ 4.5:1 (test with axe DevTools)
- [ ] Add skip links to bypass navigation
- [ ] Test keyboard navigation: Tab, Shift+Tab, Enter, Space, Escape
- [ ] Add `tabindex="-1"` to non-interactive elements that receive focus
- [ ] Announce dynamic content changes with `aria-live`

---

### 10.2 Responsive Design

- [ ] Convert LeftPanel/RightPanel widths from `px` to `%` or `fr` units
- [ ] On mobile (<768px): make panels full-screen bottom sheets with drag handle
- [ ] On tablet (768-1024px): collapse right panel to icon rail (32px wide, tooltips on hover)
- [ ] Reduce canvas padding to `px-4` on mobile
- [ ] Make toolbar scrollable horizontally on small screens
- [ ] Test at 320×568 (iPhone SE), 768×1024 (iPad), 1280×800 (laptop)

---

### 10.3 Error Handling

- [ ] Replace all `catch {}` with `toast.error(msg, { action: { label: 'Retry', onClick } })`
- [ ] Add error boundary at root of editor: `<ErrorBoundary fallback={<ErrorUI onRetry={()=>refresh()} />}>`
- [ ] Show inline errors below form fields with `<p className="text-sm text-red-500">`
- [ ] Add retry logic with exponential backoff for failed API calls
- [ ] Log errors to monitoring service (Sentry) with context (userId, pageId, action)

---

### 10.4 UX Improvements

- [ ] Add empty state illustrations (use SVG or icon) when sections/media/history empty
- [ ] Show confirmation modal before delete section
- [ ] Add "Undo" toast after delete with action button
- [ ] Persist panel widths & collapsed state to localStorage
- [ ] Add live word/character count in richtext footer
- [ ] Show autosave spinner in toolbar continuously (not just toast)
- [ ] Add keyboard shortcuts modal (Cmd+/)
- [ ] Add "Copy section link" button to copy anchor URL
- [ ] Show unsaved changes indicator with count: "3 unsaved changes"

---

### 10.5 Code Quality

- [ ] Remove dead code: `transformToFrontendFormat`, unused imports (`Box` from lucide-react in SpatialEditor)
- [ ] Fix TypeScript destructuring warnings - remove unused variables
- [ ] Add `eslint` rule to prevent `any` types (currently `FieldConfig = any`)
- [ ] Extract magic numbers (indigo-500 `#6366f1`) to CSS variables or theme tokens
- [ ] Add JSDoc comments to complex functions (e.g., `load`, `save` in editorStore)
- [ ] Convert class components to functional (none present - good)
- [ ] Add loading skeletons instead of spinners for better perceived performance

---

## 11. Implementation Roadmap (Prioritized)

### Phase 1: Critical Stability (Week 1)

- [x] Simplify panels (✅ DONE)
- [ ] Fix keyboard shortcuts anti-pattern
- [ ] Add empty states
- [ ] Add basic aria-labels
- [ ] Persist panel widths
- [ ] Fix all silent catch blocks
- [ ] Add field validation errors on save

### Phase 2: Accessibility Foundation (Week 2)

- [ ] Focus trap in modals
- [ ] Visible focus styles
- [ ] Color contrast fixes
- [ ] Screen reader testing
- [ ] Keyboard navigation pass

### Phase 3: Responsive & Mobile (Week 3)

- [ ] Tablet layout (icon rail)
- [ ] Mobile full-screen panels
- [ ] Touch target sizing
- [ ] Viewport meta tag verification

### Phase 4: Polish & Scale (Week 4+)

- [ ] Undo stack persistence
- [ ] Version diff view
- [ ] Schedule publish UI
- [ ] Upload progress
- [ ] Store splitting
- [ ] Error boundary & reporting

---

## 12. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss from unsaved changes refresh | High | Critical | Implement indexedDB autosave draft |
| XSS from rich text content | Medium | Critical | Integrate DOMPurify before rendering |
| Users accidentally delete content | High | High | Add confirmation dialogs + undo toast |
| Accessibility lawsuit (ADA non-compliance) | Medium | High | Fix WCAG failures before launch |
| Keyboard users unable to edit | High | High | Implement focus trap & Tab navigation |
| Mobile users completely blocked | Medium | Medium | Responsive redesign |
| Concurrent edit conflicts | Low | Medium | Implement optimistic locking or last-write-wins with warning |
| API rate limits on auto-save | Medium | Medium | Debounce + exponential backoff |

---

## 13. Conclusion

Zenith CMS admin UI has a **world-class visual foundation** but requires **significant engineering investment** to meet production standards. The current state prioritizes aesthetics over robustness, accessibility, and mobile usability.

**Minimum Viable Production (MVP)** requires completing **Phase 1 (Critical Stability)** and **Phase 2 (Accessibility)**. Without these, the editor should **not** be deployed to enterprise customers.

**Estimated effort to production readiness:**  
- **Phase 1-2:** 2 weeks (1 developer)  
- **Phase 3:** 1 week (1 developer + designer)  
- **Phase 4:** 2–4 weeks (depending on feature scope)  

**Total:** 5–7 weeks to reach **Production-Ready v1.0**

---

## Appendix A: Files Reviewed

- `packages/admin/src/pages/editor/SpatialEditor.tsx`
- `packages/admin/src/pages/editor/EditorToolbar.tsx`
- `packages/admin/src/pages/editor/components/LeftPanel.tsx`
- `packages/admin/src/pages/editor/components/RightPanel.tsx`
- `packages/admin/src/pages/editor/components/SectionBlock.tsx`
- `packages/admin/src/pages/editor/components/SchemaFieldRenderer.tsx`
- `packages/admin/src/pages/editor/FieldRenderer.tsx`
- `packages/admin/src/components/RichTextEditor.tsx`
- `packages/admin/src/components/MediaPicker.tsx`
- `packages/admin/src/layouts/DashboardLayout.tsx`
- `packages/admin/src/store/editorStore.ts`
- `packages/admin/src/store/panelStore.ts`
- `packages/admin/src/store/workflowStore.ts`
- `packages/admin/src/store/i18nStore.ts`
- `packages/admin/src/context/ThemeContext.tsx`
- `packages/admin/src/components/FormBuilder.tsx`

---

## Appendix B: Payload CMS Features Checklist

For full parity with Payload CMS editor, implement:

- [ ] Slug field with auto-generation and edit capability
- [ ] SEO tab with meta title, description, share image
- [ ] Field validation with real-time feedback
- [ ] Version history with diff viewer
- [ ] Scheduled publishing with date/time picker
- [ ] Workflow states UI (badge + actions)
- [ ] Release management UI
- [ ] Collapsible field groups with persistence
- [ ] Conditional field rendering (based on other field values)
- [ ] Field-level help text & descriptions
- [ ] Required field indicators (asterisk + validation)
- [ ] Duplicate page/document feature
- [ ] Export/import JSON
- [ ] Globalization: per-field translation UI
- [ ] Access control: role-based field visibility
- [ ] Relationship field with search + pagination + infinite scroll
- [ ] Blocks with real-time preview thumbnails

---

*End of Audit Report*
