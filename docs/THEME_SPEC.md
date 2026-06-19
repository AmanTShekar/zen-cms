# Zenith CMS — Theme Specification (THEME_SPEC.md)

> **For Agents & Developers:** This document is the authoritative guide for creating, validating, and submitting new themes for Zenith CMS. Follow it exactly to ensure plug-and-play compatibility.

---

## 1. What is a Zenith Theme?

A Zenith theme is a **plain JSON file** conforming to the `ThemePreset` schema. Drop it into the Theme Store (import) or add it to `BUILTIN_PRESETS` / `COMMUNITY_PRESETS` in `BrandContext.tsx` and it works immediately across the entire admin UI — zero code changes required.

Themes control:
- **Accent color system** (active states, glows, borders, badges)
- **Sidebar background** (translucent, tinted)
- **Logo badge** (color + foreground)
- **Typography** (optional font override)
- **Border radius** (sharp / minimal / standard / soft)
- **Custom CSS** (unlimited override power)

---

## 2. Full Schema Reference

```typescript
interface ThemePreset {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string              // REQUIRED. Unique slug. Use snake_case or kebab-case.
                          // For custom themes prefix with "custom_".
                          // Example: "neon-tokyo", "my_brand_blue"

  name: string            // REQUIRED. Display name. Max 32 chars.
                          // Example: "Neon Tokyo", "Corporate Steel"

  version?: string        // Semver. Example: "1.0.0"
  description?: string    // Short description. Max 120 chars.
  author?: string         // Your name / org. Example: "Zenith Team"
  
  category?: 'builtin' | 'custom' | 'community'
                          // Set to 'community' for submitted themes.
                          // Defaults to 'custom' when imported by users.

  tags?: string[]         // Search tags. Use lowercase.
                          // Recommended: base color, mood, style.
                          // Example: ["dark", "purple", "creative"]

  // ── Primary Accent ──────────────────────────────────────────────────────────
  accentHex: string       // REQUIRED. Primary brand hex color.
                          // Example: "#8B5CF6"
                          // This is the single most important token.
                          // All other tokens can be auto-derived from this.

  accent: string          // HSL space-separated. Example: "263 70% 50%"
                          // Auto-derivable from accentHex if omitted.

  // ── Active / Selected State ─────────────────────────────────────────────────
  // These control: active nav items, selected rows, focused elements.

  activeBg: string        // REQUIRED. Semi-transparent accent background.
                          // Formula: rgba(R, G, B, 0.10–0.15)
                          // Example: "rgba(139,92,246,0.1)"

  activeBorder: string    // REQUIRED. Accent border color for active items.
                          // Formula: rgba(R, G, B, 0.30–0.40)
                          // Example: "rgba(139,92,246,0.3)"

  activeText: string      // REQUIRED. Bright readable text on active items.
                          // Typically lighter/more saturated than accentHex.
                          // Formula: rgb(R+50, G+50, B+50) clamped to 255
                          // Example: "rgb(167,139,250)"

  activeGlow: string      // REQUIRED. Box-shadow glow for active elements.
                          // Formula: "0 0 20px rgba(R, G, B, 0.15–0.25)"
                          // Example: "0 0 20px rgba(139,92,246,0.15)"

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  sidebarBg: string       // REQUIRED. Sidebar panel background.
                          // Use semi-transparent dark for glassmorphism.
                          // Example: "rgba(0,0,0,0.65)"  ← standard
                          // Example: "rgba(5,0,20,0.80)"  ← deep indigo tint
                          // IMPORTANT: Always use rgba(), never solid colors.
                          //            The blur effect requires transparency.

  // ── Logo Badge ──────────────────────────────────────────────────────────────
  logoIconBg: string      // REQUIRED. Background of the logo/icon badge in sidebar.
                          // Usually the solid accentHex value.
                          // Example: "#8B5CF6"

  logoIconText: string    // REQUIRED. Text/icon color inside the badge.
                          // Use "#000" for light badges, "#fff" for dark.
                          // Contrast ratio must be ≥ 4.5:1.

  // ── Optional Background Overrides (Full Theme) ──────────────────────────────
  // When set, these override the mode default --z-bg-* vars.
  // Leave undefined to inherit the dark/light mode defaults.
  bgBase?: string         // Main canvas e.g. "#02000A"
  bgSidebar?: string      // Sidebar panel (replaces sidebarBg)
  bgHeader?: string       // Top header
  bgPanel?: string        // Cards/panels
  bgInput?: string        // Form inputs
  bgHover?: string        // Hover overlay

  // ── Optional Border/Text Overrides ──────────────────────────────────────────
  borderColor?: string    // Default border
  borderStrong?: string   // Strong border
  textPrimary?: string    // Primary text
  textSecondary?: string  // Secondary text
  textMuted?: string      // Muted text

  // ── Optional Design Tokens ──────────────────────────────────────────────────
  fontFamily?: string     // Override font. Must be a Google Font name.
                          // Example: "Space Grotesk", "Fira Code"

  borderRadius?: 'none' | 'sm' | 'md' | 'lg'
                          // UI corner rounding. Default: "none" (Zenith sharp).

  designStyle?: 'glass' | 'classic'
                          // 'glass': requires rgba() backgrounds, applies blur filters.
                          // 'classic': removes blur filters, designed for solid hex colors.
                          // Default: 'glass'

  layoutVariant?: 'sidebar' | 'topnav' | 'minimal'
                          // 'sidebar': Standard left-side vertical navigation
                          // 'topnav': Horizontal top navigation layout
                          // 'minimal': Stripped-down, borderless, text-focused layout
                          // Default: 'sidebar'

  customCSS?: string      // Raw CSS injected into the page <head>.
}
```

---

## 3. Color Derivation Formula

Given a single `accentHex` (e.g., `#8B5CF6`), all required tokens can be auto-derived:

```
R, G, B = parse(accentHex)

activeBg     = rgba(R, G, B, 0.12)
activeBorder = rgba(R, G, B, 0.35)
activeText   = rgb(min(R+50,255), min(G+50,255), min(B+50,255))
activeGlow   = 0 0 22px rgba(R, G, B, 0.20)
logoIconBg   = accentHex
logoIconText = "#000" if (R*0.299 + G*0.587 + B*0.114) > 150 else "#fff"
sidebarBg    = rgba(0, 0, 0, 0.65)   ← default; customize for unique feel
```

---

## 4. Minimal Valid Theme Example

```json
{
  "id": "corporate-steel",
  "name": "Corporate Steel",
  "version": "1.0.0",
  "description": "Clean silver-blue for enterprise dashboards.",
  "author": "Your Name",
  "category": "community",
  "tags": ["dark", "blue", "enterprise", "minimal"],
  "accentHex": "#64748B",
  "accent": "215 16% 47%",
  "sidebarBg": "rgba(2, 4, 10, 0.78)",
  "activeBg": "rgba(100, 116, 139, 0.12)",
  "activeBorder": "rgba(100, 116, 139, 0.35)",
  "activeText": "rgb(148, 163, 184)",
  "activeGlow": "0 0 20px rgba(100, 116, 139, 0.18)",
  "logoIconBg": "#64748B",
  "logoIconText": "#fff",
  "fontFamily": "Space Grotesk",
  "borderRadius": "none",
  "customCSS": ""
}
```

---

## 5. Full-Featured Theme Example

```json
### Neon Hacker

```json
{
  "id": "neon-hacker",
  "name": "Neon Hacker",
  "version": "1.2.0",
  "description": "Vibrant neon green terminal. High energy, high contrast.",
  "author": "Zenith Team",
  "category": "community",
  "tags": ["neon", "green", "cyberpunk", "dark"],
  "designStyle": "glass",
  "accentHex": "#00FF41",
  "accent": "130 100% 50%",
  "sidebarBg": "rgba(0, 6, 0, 0.88)",
  "activeBg": "rgba(0, 255, 65, 0.12)",
  "activeBorder": "rgba(0, 255, 65, 0.40)",
  "activeText": "rgb(0, 255, 65)",
  "activeGlow": "0 0 25px rgba(0, 255, 65, 0.25)",
  "logoIconBg": "#00FF41",
  "logoIconText": "#000",
  "fontFamily": "JetBrains Mono",
  "borderRadius": "none"
}
```

### Classic Enterprise (Solid Design)

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

## 6. How to Register a New Theme

### Option A — Add to Built-ins (for repo contributors)
Add your theme object to the `BUILTIN_PRESETS` array in:
```
packages/admin/src/context/BrandContext.tsx
```
Built-in themes appear in **Settings → Theme Store → Built-in** and cannot be deleted.

### Option B — Community Themes (for Zenith Team)
Add to `COMMUNITY_PRESETS` in the same file. Community themes appear in the **Community** tab.

### Option C — User/Agent Import (plug-and-play)
Export a valid `.json` file and import via **Settings → Theme Store → Import**.
The theme is saved to `localStorage` under `zenith_custom_themes` and appears in **My Themes**.

### Option D — Programmatic (via code or agent)
```typescript
import { useBrand } from './context/BrandContext'

const { saveCustomTheme, applyPreset } = useBrand()

const myTheme = {
  id: 'my-theme',
  name: 'My Theme',
  // ...all required tokens
}

saveCustomTheme(myTheme)   // persists to localStorage
applyPreset('my-theme')    // applies immediately
```

---

## 7. CSS Variables Reference

These CSS custom properties are set on `:root` automatically whenever a theme is applied. Use them in `customCSS` or any component:

| Variable | Source Token | Description |
|---|---|---|
| `--brand-accent` | `accentHex` | Raw hex accent color |
| `--brand-accent-hsl` | `accent` | HSL version for `hsl()` usage |
| `--brand-active-bg` | `activeBg` | Active item background |
| `--brand-active-border` | `activeBorder` | Active item border |
| `--brand-active-text` | `activeText` | Active item text/icon color |
| `--brand-logo-bg` | `logoIconBg` | Logo badge background |
| `--brand-logo-text` | `logoIconText` | Logo badge foreground |
| `--brand-font` | `fontFamily` | Font stack (if custom font set) |

---

## 8. Agent Instructions

If you are an AI agent creating a theme, follow these steps:

1. **Decide on a concept** — pick a mood, palette, and brand personality.
2. **Choose one primary `accentHex`** — use a vivid, saturated color that works against a dark `#000000` background.
3. **Derive all tokens** using the formula in Section 3.
4. **Customize `sidebarBg`** — add a subtle tint matching your accent (e.g., for blue: `rgba(0, 4, 20, 0.80)`).
5. **Validate contrast** — `logoIconText` must be readable against `logoIconBg`. Use the luminance formula.
6. **Export as JSON** — follow the schema in Section 2 exactly.
7. **Test by importing** via the Theme Store import button.

**Quick checklist for agents:**
- [ ] `id` is unique and kebab-case
- [ ] `accentHex` is a valid 6-digit hex with `#` prefix
- [ ] `activeBg` uses `rgba()` with alpha 0.10–0.15
- [ ] `activeBorder` uses `rgba()` with alpha 0.30–0.40
- [ ] `activeGlow` is a valid `box-shadow` value
- [ ] `designStyle` is clearly selected (`glass` or `classic`)
- [ ] If `designStyle` is `glass`, `sidebarBg` (or `bgSidebar`) must be `rgba()` — never a solid color
- [ ] If `designStyle` is `classic`, use solid hex values for `bgBase`, `bgSidebar`, `bgHeader`, `bgPanel`
- [ ] `logoIconText` passes contrast check vs `logoIconBg`
- [ ] All required fields are present (no `undefined`)

---

## 9. Design Guidelines

- **Dark backgrounds first** — all built-in themes are designed for dark mode. The `sidebarBg` should be very dark (alpha ≥ 0.65).
- **Avoid pure whites** — use `rgba(255,255,255,0.08)` for borders, not `#ffffff`.
- **Glow > shadow** — prefer `box-shadow` glows over flat shadows for premium feel.
- **Accent saturation** — accents should be vivid (HSL saturation ≥ 60%) so they pop against black backgrounds.
- **One accent, full system** — a good theme uses a single hue with varying opacity. Don't use multiple colors.
- **Test nav active states** — the most visible effect of a theme. Always verify the sidebar active item looks distinct and readable.
