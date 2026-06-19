# Zenith CMS — Theming Agent Guide (THEMING_AGENT.md)

> **READ THIS FIRST** if you are an AI agent (Claude, GPT, Gemini, etc.) tasked with creating, editing, or registering a new theme for Zenith CMS. This document is the complete, authoritative reference. Following it ensures 100% coverage with zero missed tokens.

---

## 1. Architecture Overview

Zenith CMS uses a **two-layer CSS variable system**:

```
Layer 1: Mode tokens  (set by index.css :root / .light)
  These define the base dark/light palette.
  Every component reads these. They change when light/dark is toggled.

Layer 2: Brand tokens  (injected by BrandContext.tsx useEffect on :root)
  These override Layer 1 for the active theme's accent and optional bg overrides.
  They change when the user switches themes in Settings → Theme Store.
```

**Single source of truth:** `packages/admin/src/context/BrandContext.tsx`
**Token definitions:** `packages/admin/src/index.css`
**Theme store UI:** `packages/admin/src/pages/settings/SettingsThemeStore.tsx`
**Spec document:** `docs/THEME_SPEC.md`

---

## 2. Complete CSS Variable Reference

These are ALL CSS variables set on `:root`. When you create a theme, `BrandContext` injects the brand-specific ones. The mode ones are inherited from `index.css`.

### 2a. Layer 1 — Mode Variables (index.css)

| Variable | Dark Default | Light Override | What It Controls |
|---|---|---|---|
| `--z-bg-base` | `#050505` | `#f3f4f6` | Main app canvas background |
| `--z-bg-sidebar` | `rgba(0,0,0,0.65)` | `rgba(255,255,255,0.80)` | Sidebar panel background |
| `--z-bg-header` | `rgba(0,0,0,0.65)` | `rgba(255,255,255,0.85)` | Top header bar background |
| `--z-bg-panel` | `rgba(0,0,0,0.65)` | `#ffffff` | Card/panel backgrounds |
| `--z-bg-input` | `rgba(0,0,0,0.50)` | `#ffffff` | Form input backgrounds |
| `--z-bg-hover` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.03)` | Hover overlay |
| `--z-bg-popover` | `rgba(5,5,5,0.98)` | `#ffffff` | Dropdown/popover bg |
| `--z-bg-tooltip` | `rgba(20,20,20,0.95)` | `rgba(17,24,39,0.95)` | Tooltip bg |
| `--z-bg-modal` | `rgba(0,0,0,0.75)` | `rgba(0,0,0,0.50)` | Modal backdrop |
| `--z-bg-row-hover` | `rgba(255,255,255,0.02)` | `rgba(0,0,0,0.02)` | Table row hover |
| `--z-bg-selected` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | Selected row |
| `--z-bg-code` | `rgba(0,0,0,0.40)` | `#f8f9fa` | Code block bg |
| `--z-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Default border color |
| `--z-border-strong` | `rgba(255,255,255,0.15)` | `rgba(0,0,0,0.15)` | Emphasized borders |
| `--z-border-focus` | `rgba(255,255,255,0.25)` | `rgba(0,0,0,0.25)` | Focus ring border |
| `--z-border-input` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.12)` | Input border |
| `--z-text-primary` | `#ffffff` | `#111827` | Main text color |
| `--z-text-secondary` | `#9ca3af` | `#4b5563` | Secondary text |
| `--z-text-muted` | `#6b7280` | `#9ca3af` | Muted/placeholder text |
| `--z-text-inverse` | `#000000` | `#ffffff` | Text on inverted bg |
| `--z-scrollbar` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.12)` | Scrollbar thumb |
| `--z-scrollbar-hover` | `rgba(255,255,255,0.20)` | `rgba(0,0,0,0.25)` | Scrollbar thumb (hover) |

### 2b. Layer 2 — Brand Variables (injected by BrandContext)

| Variable | ThemePreset field | Description |
|---|---|---|
| `--z-accent` | `accentHex` | Primary accent hex color |
| `--z-accent-hsl` | `accent` | HSL version |
| `--z-active-bg` | `activeBg` | Active nav item background |
| `--z-active-border` | `activeBorder` | Active nav item border |
| `--z-active-text` | `activeText` | Active nav item text/icon |
| `--z-active-glow` | `activeGlow` | Active element box-shadow |
| `--z-logo-bg` | `logoIconBg` | Sidebar logo badge bg |
| `--z-logo-text` | `logoIconText` | Sidebar logo badge text |
| `--z-scrollbar` | auto from `activeBg` | Overridden to match accent |
| `--z-scrollbar-hover` | auto from `activeBorder` | Overridden to match accent |

**Optional overrides** (only injected if set in ThemePreset):

| Variable | ThemePreset field | When to set |
|---|---|---|
| `--z-bg-base` | `bgBase` | When theme has a custom canvas (e.g., deep navy) |
| `--z-bg-sidebar` | `bgSidebar` | When sidebar tint differs from default |
| `--z-bg-header` | `bgHeader` | When header tint differs |
| `--z-bg-panel` | `bgPanel` | When cards have a custom bg |
| `--z-bg-input` | `bgInput` | When inputs have custom bg |
| `--z-bg-hover` | `bgHover` | When hover tint uses the accent color |
| `--z-border` | `borderColor` | When borders use a custom shade |
| `--z-border-strong` | `borderStrong` | When strong borders use a custom shade |
| `--z-text-primary` | `textPrimary` | For themes with custom text colors |
| `--z-text-secondary` | `textSecondary` | For themes with custom secondary text |
| `--z-text-muted` | `textMuted` | For themes with custom muted text |

### 2c. Legacy compat variables (also set by BrandContext)

These older variables are kept for backward compat. They alias to `--z-*`:
- `--brand-accent` → same as `--z-accent`
- `--brand-active-bg` → same as `--z-active-bg`
- `--brand-active-border` → same as `--z-active-border`
- `--brand-active-text` → same as `--z-active-text`
- `--brand-logo-bg` → same as `--z-logo-bg`
- `--brand-logo-text` → same as `--z-logo-text`
- `--bg-app`, `--bg-surface`, `--text-primary`, `--border`, `--glass-bg` → alias to `--z-*`

---

## 3. ThemePreset Interface (TypeScript)

Location: `packages/admin/src/context/BrandContext.tsx`

```typescript
interface ThemePreset {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string               // REQUIRED. Unique. kebab-case. E.g. "neon-tokyo"
  name: string             // REQUIRED. Display name. Max 32 chars.
  version?: string         // Semver. Default: "1.0.0"
  description?: string     // Max 120 chars.
  author?: string          // Your name or org.
  category?: 'builtin' | 'custom' | 'community'
  tags?: string[]          // Lowercase. E.g. ["dark", "neon", "cyberpunk"]

  // ── Required accent tokens ──────────────────────────────────────────────
  accent: string           // HSL format: "H S% L%". E.g. "330 100% 60%"
  accentHex: string        // Hex: "#FF2D78"
  activeBg: string         // rgba(R,G,B, 0.10–0.15)
  activeBorder: string     // rgba(R,G,B, 0.30–0.40)
  activeText: string       // rgb(R+50, G+50, B+50) — clamped to 255
  activeGlow: string       // "0 0 22px rgba(R,G,B,0.20)"
  logoIconBg: string       // Usually = accentHex
  logoIconText: string     // "#000" or "#fff" (contrast with logoIconBg)

  // ── Optional background overrides ───────────────────────────────────────
  bgBase?: string          // Override --z-bg-base (main canvas)
  bgSidebar?: string       // Override --z-bg-sidebar
  bgHeader?: string        // Override --z-bg-header
  bgPanel?: string         // Override --z-bg-panel (cards)
  bgInput?: string         // Override --z-bg-input
  bgHover?: string         // Override --z-bg-hover

  // ── Optional text/border overrides ─────────────────────────────────────
  borderColor?: string     // Override --z-border
  borderStrong?: string    // Override --z-border-strong
  textPrimary?: string     // Override --z-text-primary
  textSecondary?: string   // Override --z-text-secondary
  textMuted?: string       // Override --z-text-muted

  // ── Optional design tokens ──────────────────────────────────────────────
  fontFamily?: string      // Google Font name. E.g. "Space Grotesk"
  borderRadius?: 'none' | 'sm' | 'md' | 'lg'
  customCSS?: string       // Raw CSS injected into <head> when theme is active
  designStyle?: 'glass' | 'classic' // Controls structural layout (blur vs solid)
  layoutVariant?: 'sidebar' | 'topnav' | 'minimal' // Controls React DOM structure
}
```

---

## 4. Derivation Formula

Given **one hex** `accentHex`, derive all required tokens:

```
R, G, B = hexToRgb(accentHex)

accent        = hexToHsl(accentHex)   // e.g. "330 100% 60%"
activeBg      = rgba(R, G, B, 0.12)
activeBorder  = rgba(R, G, B, 0.35)
activeText    = rgb(min(R+55,255), min(G+55,255), min(B+55,255))
activeGlow    = "0 0 22px rgba(R, G, B, 0.20)"
logoIconBg    = accentHex
logoIconText  = luminance(R,G,B) > 150 ? "#000" : "#fff"
              where luminance = R*0.299 + G*0.587 + B*0.114

// Sidebar tint (optional but recommended for full themes):
bgSidebar     = rgba(R*0.04, G*0.04, B*0.04, 0.80)   // subtle tint of accent
```

**HexToHSL algorithm:**
```
r=R/255, g=G/255, b=B/255
max=max(r,g,b), min=min(r,g,b)
l=(max+min)/2
if max==min: s=0, h=0
else:
  d=max-min
  s = l>0.5 ? d/(2-max-min) : d/(max+min)
  h = (depending on which channel is max)
return f"{round(h*360)} {round(s*100)}% {round(l*100)}%"
```

---

## 5. Registration Methods

### Method A: Add to built-in presets (code change)
File: `packages/admin/src/context/BrandContext.tsx`
Array: `BUILTIN_PRESETS`

```typescript
export const BUILTIN_PRESETS: ThemePreset[] = [
  // ... existing themes ...
  {
    id: 'my-theme',
    name: 'My Theme',
    // ... all required fields ...
  },
]
```

### Method B: Add to community themes
Same file, `COMMUNITY_PRESETS` array.

### Method C: User import (no code change)
Export a valid JSON file → user imports via Settings → Theme Store → Import.
The `importTheme()` function in BrandContext handles validation and storage.

### Method D: Programmatic (via React component)
```typescript
import { useBrand } from '../context/BrandContext'

const { saveCustomTheme, applyPreset } = useBrand()

// Save a theme
saveCustomTheme({
  id: 'my-theme',
  name: 'My Theme',
  // ... all required fields
})

// Apply it immediately
applyPreset('my-theme')
```

### Method E: Direct localStorage (for scripts/tests)
```javascript
const existing = JSON.parse(localStorage.getItem('zenith_custom_themes') || '[]')
existing.push(myThemeObject)
localStorage.setItem('zenith_custom_themes', JSON.stringify(existing))
// Then reload or trigger re-render
```

---

## 6. Complete Theme Examples

### Minimal (accent only — inherits all mode defaults)
```json
{
  "id": "coral-reef",
  "name": "Coral Reef",
  "version": "1.0.0",
  "description": "Warm coral for a friendly, inviting workspace.",
  "author": "Agent",
  "category": "community",
  "tags": ["warm", "coral", "orange", "friendly"],
  "accentHex": "#FF6B6B",
  "accent": "0 100% 71%",
  "activeBg": "rgba(255,107,107,0.12)",
  "activeBorder": "rgba(255,107,107,0.35)",
  "activeText": "rgb(255,162,162)",
  "activeGlow": "0 0 22px rgba(255,107,107,0.20)",
  "logoIconBg": "#FF6B6B",
  "logoIconText": "#000"
}
```

### Full Theme (custom bg, borders, text, sidebar, font)
```json
{
  "id": "deep-ocean",
  "name": "Deep Ocean",
  "version": "1.0.0",
  "description": "Dark blue-teal with custom backgrounds. Feels like deep water.",
  "author": "Agent",
  "category": "community",
  "tags": ["dark", "blue", "teal", "deep", "ocean"],
  "accentHex": "#14B8A6",
  "accent": "174 72% 40%",
  "activeBg": "rgba(20,184,166,0.12)",
  "activeBorder": "rgba(20,184,166,0.35)",
  "activeText": "rgb(75,239,221)",
  "activeGlow": "0 0 22px rgba(20,184,166,0.20)",
  "logoIconBg": "#14B8A6",
  "logoIconText": "#000",

  "bgBase":    "rgba(0,8,20,1.0)",
  "bgSidebar": "rgba(0,12,28,0.85)",
  "bgHeader":  "rgba(0,10,24,0.85)",
  "bgPanel":   "rgba(0,14,32,0.70)",
  "bgInput":   "rgba(0,10,24,0.60)",
  "bgHover":   "rgba(20,184,166,0.04)",

  "borderColor":  "rgba(20,184,166,0.10)",
  "borderStrong": "rgba(20,184,166,0.20)",

  "fontFamily": "Space Grotesk",
  "borderRadius": "none",
  "customCSS": ""
}
```

### Neon Hacker
```json
{
  "id": "neon-hacker",
  "name": "Neon Hacker",
  "version": "1.0.0",
  "description": "Terminal green on pure black. Max focus.",
  "author": "Agent",
  "category": "community",
  "tags": ["dark", "green", "terminal", "hacker", "mono"],
  "designStyle": "glass",
  "accentHex": "#00FF41",
  "accent": "130 100% 50%",
  "activeBg": "rgba(0,255,65,0.08)",
  "activeBorder": "rgba(0,255,65,0.30)",
  "activeText": "rgb(0,255,65)",
  "activeGlow": "0 0 25px rgba(0,255,65,0.25)",
  "logoIconBg": "#00FF41",
  "logoIconText": "#000",

  "bgBase":    "#000000",
  "bgSidebar": "rgba(0,6,0,0.95)",
  "bgPanel":   "rgba(0,4,0,0.80)",
  "bgHover":   "rgba(0,255,65,0.03)",
  "borderColor": "rgba(0,255,65,0.08)",

  "fontFamily": "JetBrains Mono",
  "customCSS": ":root { --z-scrollbar: rgba(0,255,65,0.15); }"
}
```

### Classic Enterprise
```json
{
  "id": "classic-enterprise",
  "name": "Classic Enterprise",
  "version": "1.0.0",
  "description": "Solid panels, no blur. Traditional SaaS enterprise layout.",
  "author": "Agent",
  "category": "builtin",
  "tags": ["dark", "blue", "classic", "enterprise", "solid"],
  "designStyle": "classic",
  "accentHex": "#0066FF",
  "accent": "215 100% 50%",
  "activeBg": "rgba(0,102,255,0.15)",
  "activeBorder": "rgba(0,102,255,0.40)",
  "activeText": "rgb(51,153,255)",
  "activeGlow": "0 0 10px rgba(0,102,255,0.20)",
  "logoIconBg": "#0066FF",
  "logoIconText": "#fff",

  "bgBase":    "#050505",
  "bgSidebar": "#0A1120",
  "bgHeader":  "#0A1120",
  "bgPanel":   "#111827",
  "borderColor": "rgba(255,255,255,0.12)",

  "borderRadius": "md"
}
```

---

## 7. Agent Checklist

Before saving or submitting a theme, verify:

- [ ] `id` is unique, lowercase, kebab-case (e.g. `deep-ocean`, `neon-hacker`)
- [ ] `name` is max 32 chars, human-readable
- [ ] `accentHex` is a valid 6-digit hex with `#` prefix
- [ ] `accent` is `"H S% L%"` matching `accentHex`
- [ ] `activeBg` uses `rgba()` with alpha `0.08–0.15`
- [ ] `activeBorder` uses `rgba()` with alpha `0.28–0.42`
- [ ] `activeText` is visibly brighter/lighter than `accentHex` (add ~55 to R,G,B)
- [ ] `activeGlow` is a valid `box-shadow` value
- [ ] `logoIconBg` is typically the same as `accentHex`
- [ ] `logoIconText` is `#000` if luminance > 150, else `#fff`
- [ ] `designStyle` is either `'glass'` (default) or `'classic'`
- [ ] If `designStyle` is `'classic'`, ensure `bgBase`, `bgSidebar`, `bgHeader`, and `bgPanel` are set to solid colors (hex).
- [ ] All `rgba()` values use numbers, not CSS variable references
- [ ] Optional `bgBase`/`bgSidebar` etc. for `'glass'` style are `rgba()` values.
- [ ] `sidebarBg` — NOTE: This field existed in old themes. In new themes, use `bgSidebar` instead. If you see old data with `sidebarBg`, map it to `bgSidebar`.
- [ ] JSON is valid (no trailing commas, all strings quoted)
- [ ] If `fontFamily` is set, it is a real Google Font name
- [ ] `tags` are lowercase strings

---

## 8. Files to Know

| File | Purpose |
|---|---|
| `packages/admin/src/context/BrandContext.tsx` | Theme schema, builtin/community presets, CSS var injection, CRUD |
| `packages/admin/src/index.css` | Mode variable palette (`:root` / `.light`) |
| `packages/admin/src/pages/settings/SettingsThemeStore.tsx` | Theme Store UI, creator wizard, import/export |
| `packages/admin/src/layouts/DashboardLayout.tsx` | Sidebar, header, main — all use `var(--z-*)` |
| `packages/admin/src/pages/settings/SettingsAppearance.tsx` | White-label settings (app name, logo, favicon, font) |
| `docs/THEME_SPEC.md` | User-facing theme specification |
| `docs/THEMING_AGENT.md` | This file — agent guide |

---

## 9. Component Usage Patterns

When building components, use these CSS vars (not hardcoded colors):

```tsx
// ✅ Correct — responds to theme changes
<div style={{ background: 'var(--z-bg-panel)', border: '1px solid var(--z-border)' }}>

// ✅ Correct — Tailwind with CSS var
<div className="border" style={{ borderColor: 'var(--z-border)', background: 'var(--z-bg-panel)' }}>

// ✅ Correct — accent-colored active state
<button style={{ background: 'var(--z-active-bg)', borderColor: 'var(--z-active-border)', color: 'var(--z-active-text)' }}>

// ❌ Wrong — hardcoded, ignores theme
<div className="bg-black/65 border-white/[0.08]">

// ❌ Wrong — Tailwind ternary that doesn't use CSS vars
<div className={dark ? 'bg-black/65 border-white/[0.08]' : 'bg-white border-gray-200'}>
```

### Utility classes (from index.css)

```tsx
<div className="z-card">          // Panel/card bg + border + blur
<div className="z-panel">         // Simpler panel (no blur)
<div className="z-sidebar">       // Sidebar bg + border + blur
<div className="z-header">        // Header bg + border + blur
<input className="z-input" />     // Input bg + border + focus ring
<div className="z-card-interactive"> // z-card + hover scale + glow
```
