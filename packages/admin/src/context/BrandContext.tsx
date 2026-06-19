import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

// ── Theme Preset Schema ───────────────────────────────────────────────────────
export interface ThemePreset {
  id: string
  name: string
  version?: string
  description?: string
  category?: 'builtin' | 'custom' | 'community'
  tags?: string[]
  author?: string
  designStyle?: 'glass' | 'classic'

  // ── Primary accent ──────────────────────────────────────────
  accent: string // HSL e.g. "160 84% 39%"
  accentHex: string // Hex e.g. "var(--z-accent)"

  // ── Active / selected state ─────────────────────────────────
  activeBg: string // rgba(R,G,B,0.10–0.15)
  activeBorder: string // rgba(R,G,B,0.30–0.40)
  activeText: string // rgb(R+50,G+50,B+50)
  activeGlow: string // box-shadow glow

  // ── Sidebar badge ───────────────────────────────────────────
  logoIconBg: string
  logoIconText: string

  // ── Optional background overrides (full theme) ──────────────
  // When set, these override the mode default --z-bg-* vars.
  // Leave undefined to inherit the dark/light mode defaults.
  bgBase?: string // Main canvas  e.g. "#02000A"
  bgSidebar?: string // Sidebar panel
  bgHeader?: string // Top header
  bgPanel?: string // Cards/panels
  bgInput?: string // Form inputs
  bgHover?: string // Hover overlay

  // ── Optional border/text overrides ──────────────────────────
  borderColor?: string // default border
  borderStrong?: string // strong border
  textPrimary?: string // primary text
  textSecondary?: string // secondary text
  textMuted?: string // muted text

  // ── Optional design tokens ──────────────────────────────────
  fontFamily?: string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg'
  customCSS?: string
}

// ── Built-in presets ──────────────────────────────────────────────────────────
export const BUILTIN_PRESETS: ThemePreset[] = [
  {
    id: 'zenith',
    name: 'Zenith Dark',
    category: 'builtin',
    description: 'The default Zenith dark experience with emerald accents.',
    tags: ['dark', 'green', 'default'],
    accent: '160 84% 39%',
    accentHex: 'var(--z-accent)',
    sidebarBg: 'rgba(0,0,0,0.65)',
    activeBg: 'rgba(16,185,129,0.1)',
    activeBorder: 'rgba(16,185,129,0.3)',
    activeText: 'rgb(52,211,153)',
    activeGlow: '0 0 20px rgba(16,185,129,0.15)',
    logoIconBg: 'var(--z-accent)',
    logoIconText: '#000',
  },
  {
    id: 'classic-enterprise',
    name: 'Classic Enterprise',
    category: 'builtin',
    description: 'Solid panels, no blur. Traditional SaaS enterprise layout.',
    tags: ['dark', 'blue', 'classic', 'enterprise', 'solid'],
    designStyle: 'classic',
    accent: '215 100% 50%',
    accentHex: '#0066FF',
    activeBg: 'rgba(0,102,255,0.15)',
    activeBorder: 'rgba(0,102,255,0.40)',
    activeText: 'rgb(51,153,255)',
    activeGlow: '0 0 10px rgba(0,102,255,0.20)',
    logoIconBg: '#0066FF',
    logoIconText: '#fff',
    bgBase: '#050505',
    bgSidebar: '#0A1120',
    bgHeader: '#0A1120',
    bgPanel: '#111827',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 'md',
  },
  {
    id: 'violet',
    name: 'Violet Studio',
    category: 'builtin',
    description: 'Creative purple palette for design-focused teams.',
    tags: ['dark', 'purple', 'creative'],
    accent: '263 70% 50%',
    accentHex: 'var(--z-accent)',
    sidebarBg: 'rgba(0,0,0,0.65)',
    activeBg: 'rgba(139,92,246,0.1)',
    activeBorder: 'rgba(139,92,246,0.3)',
    activeText: 'rgb(167,139,250)',
    activeGlow: '0 0 20px rgba(139,92,246,0.15)',
    logoIconBg: 'var(--z-accent)',
    logoIconText: '#fff',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    category: 'builtin',
    description: 'Deep blue tones for a calm, focused workspace.',
    tags: ['dark', 'blue', 'calm'],
    accent: '217 91% 60%',
    accentHex: '#3B82F6',
    sidebarBg: 'rgba(0,4,20,0.8)',
    activeBg: 'rgba(59,130,246,0.1)',
    activeBorder: 'rgba(59,130,246,0.3)',
    activeText: 'rgb(96,165,250)',
    activeGlow: '0 0 20px rgba(59,130,246,0.15)',
    logoIconBg: '#3B82F6',
    logoIconText: '#fff',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'builtin',
    description: 'Warm orange tones — high energy, high impact.',
    tags: ['dark', 'orange', 'warm'],
    accent: '21 90% 58%',
    accentHex: '#F97316',
    sidebarBg: 'rgba(10,2,0,0.75)',
    activeBg: 'rgba(249,115,22,0.1)',
    activeBorder: 'rgba(249,115,22,0.3)',
    activeText: 'rgb(251,146,60)',
    activeGlow: '0 0 20px rgba(249,115,22,0.15)',
    logoIconBg: '#F97316',
    logoIconText: '#fff',
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    category: 'builtin',
    description: 'Bold red-pink for brands that demand attention.',
    tags: ['dark', 'red', 'bold'],
    accent: '346 77% 49%',
    accentHex: '#E11D48',
    sidebarBg: 'rgba(8,0,4,0.75)',
    activeBg: 'rgba(225,29,72,0.1)',
    activeBorder: 'rgba(225,29,72,0.3)',
    activeText: 'rgb(251,113,133)',
    activeGlow: '0 0 20px rgba(225,29,72,0.15)',
    logoIconBg: '#E11D48',
    logoIconText: '#fff',
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'builtin',
    description: 'Deep forest greens for a grounded, earthy feel.',
    tags: ['dark', 'green', 'nature'],
    accent: '142 70% 35%',
    accentHex: '#15803D',
    sidebarBg: 'rgba(0,8,2,0.75)',
    activeBg: 'rgba(21,128,61,0.1)',
    activeBorder: 'rgba(21,128,61,0.3)',
    activeText: 'rgb(74,222,128)',
    activeGlow: '0 0 20px rgba(21,128,61,0.15)',
    logoIconBg: '#15803D',
    logoIconText: '#fff',
  },
  {
    id: 'gold',
    name: 'Gold Rush',
    category: 'builtin',
    description: 'Premium amber-gold for luxury brands.',
    tags: ['dark', 'gold', 'premium'],
    accent: '38 92% 50%',
    accentHex: '#F59E0B',
    sidebarBg: 'rgba(8,5,0,0.8)',
    activeBg: 'rgba(245,158,11,0.1)',
    activeBorder: 'rgba(245,158,11,0.3)',
    activeText: 'rgb(252,211,77)',
    activeGlow: '0 0 20px rgba(245,158,11,0.15)',
    logoIconBg: '#F59E0B',
    logoIconText: '#000',
  },
  {
    id: 'arctic',
    name: 'Arctic Cyan',
    category: 'builtin',
    description: 'Ice-cold cyan for tech-first, data-driven teams.',
    tags: ['dark', 'cyan', 'tech'],
    accent: '188 94% 43%',
    accentHex: '#06B6D4',
    sidebarBg: 'rgba(0,4,8,0.8)',
    activeBg: 'rgba(6,182,212,0.1)',
    activeBorder: 'rgba(6,182,212,0.3)',
    activeText: 'rgb(34,211,238)',
    activeGlow: '0 0 20px rgba(6,182,212,0.15)',
    logoIconBg: '#06B6D4',
    logoIconText: '#000',
  },
]

// ── Community themes (pre-made, read-only, install to custom) ─────────────────
export const COMMUNITY_PRESETS: ThemePreset[] = [
  {
    id: 'neon-tokyo',
    name: 'Neon Tokyo',
    category: 'community',
    author: 'Zenith Team',
    description: 'Vibrant neon pink inspired by Tokyo nightlife.',
    tags: ['neon', 'pink', 'cyberpunk'],
    accent: '330 100% 60%',
    accentHex: '#FF2D78',
    sidebarBg: 'rgba(5,0,10,0.85)',
    activeBg: 'rgba(255,45,120,0.12)',
    activeBorder: 'rgba(255,45,120,0.4)',
    activeText: 'rgb(255,100,160)',
    activeGlow: '0 0 25px rgba(255,45,120,0.25)',
    logoIconBg: '#FF2D78',
    logoIconText: '#fff',
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    category: 'community',
    author: 'Zenith Team',
    description: 'Cosmic indigo, built for long night sessions.',
    tags: ['dark', 'indigo', 'space'],
    accent: '240 80% 60%',
    accentHex: '#6366F1',
    sidebarBg: 'rgba(2,0,12,0.9)',
    activeBg: 'rgba(99,102,241,0.12)',
    activeBorder: 'rgba(99,102,241,0.35)',
    activeText: 'rgb(129,140,248)',
    activeGlow: '0 0 25px rgba(99,102,241,0.2)',
    logoIconBg: '#6366F1',
    logoIconText: '#fff',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    category: 'community',
    author: 'Zenith Team',
    description: 'Classic green-on-black terminal aesthetic.',
    tags: ['dark', 'green', 'hacker', 'mono'],
    accent: '120 100% 40%',
    accentHex: '#00CC44',
    sidebarBg: 'rgba(0,6,0,0.92)',
    activeBg: 'rgba(0,204,68,0.08)',
    activeBorder: 'rgba(0,204,68,0.3)',
    activeText: 'rgb(0,255,85)',
    activeGlow: '0 0 20px rgba(0,204,68,0.2)',
    logoIconBg: '#00CC44',
    logoIconText: '#000',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    category: 'community',
    author: 'Zenith Team',
    description: 'Soft pink blossom theme — elegant and refined.',
    tags: ['light', 'pink', 'minimal'],
    accent: '340 75% 70%',
    accentHex: '#F48FB1',
    sidebarBg: 'rgba(0,0,0,0.65)',
    activeBg: 'rgba(244,143,177,0.12)',
    activeBorder: 'rgba(244,143,177,0.4)',
    activeText: 'rgb(249,168,212)',
    activeGlow: '0 0 20px rgba(244,143,177,0.2)',
    logoIconBg: '#F48FB1',
    logoIconText: '#fff',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'community',
    author: 'Zenith Team',
    description: 'Minimal monochrome for distraction-free work.',
    tags: ['dark', 'mono', 'minimal'],
    accent: '0 0% 80%',
    accentHex: '#CCCCCC',
    sidebarBg: 'rgba(0,0,0,0.7)',
    activeBg: 'rgba(200,200,200,0.08)',
    activeBorder: 'rgba(200,200,200,0.2)',
    activeText: 'rgb(229,229,229)',
    activeGlow: '0 0 15px rgba(200,200,200,0.1)',
    logoIconBg: '#333',
    logoIconText: '#fff',
  },
  {
    id: 'lava',
    name: 'Lava',
    category: 'community',
    author: 'Zenith Team',
    description: 'Intense red-orange for power users.',
    tags: ['dark', 'red', 'intense'],
    accent: '15 95% 55%',
    accentHex: '#F73B10',
    sidebarBg: 'rgba(10,2,0,0.85)',
    activeBg: 'rgba(247,59,16,0.1)',
    activeBorder: 'rgba(247,59,16,0.35)',
    activeText: 'rgb(253,109,84)',
    activeGlow: '0 0 22px rgba(247,59,16,0.2)',
    logoIconBg: '#F73B10',
    logoIconText: '#fff',
  },
]

// ── Brand Config ──────────────────────────────────────────────────────────────
export interface BrandConfig {
  appName: string
  appTagline: string
  logoUrl: string
  faviconUrl: string
  themePresetId: string
  customCSS: string
  primaryColor: string
  fontFamily: string
}

const DEFAULTS: BrandConfig = {
  appName: 'Zenith',
  appTagline: 'v1.0 Beta',
  logoUrl: '',
  faviconUrl: '',
  themePresetId: 'zenith',
  customCSS: '',
  primaryColor: 'var(--z-accent)',
  fontFamily: 'Inter',
}

interface BrandContextType {
  brand: BrandConfig
  preset: ThemePreset
  allPresets: ThemePreset[] // builtin + custom installed
  customThemes: ThemePreset[] // user-created themes
  setBrand: (b: Partial<BrandConfig>) => void
  applyPreset: (id: string) => void
  saveCustomTheme: (t: ThemePreset) => void
  deleteCustomTheme: (id: string) => void
  exportTheme: (t: ThemePreset) => void
  importTheme: (json: string) => ThemePreset | null
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

const BRAND_KEY = 'zenith_brand_config'
const CUSTOM_THEMES_KEY = 'zenith_custom_themes'

function loadBrand(): BrandConfig {
  try {
    const raw = localStorage.getItem(BRAND_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

function loadCustomThemes(): ThemePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

// ── Exported for use outside context ─────────────────────────────────────────
export const THEME_PRESETS = BUILTIN_PRESETS

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrandState] = useState<BrandConfig>(loadBrand)
  const [customThemes, setCustomThemesState] = useState<ThemePreset[]>(loadCustomThemes)

  const allPresets = [...BUILTIN_PRESETS, ...customThemes]
  const preset = allPresets.find((p) => p.id === brand.themePresetId) || BUILTIN_PRESETS[0]

  useEffect(() => {
    const root = document.documentElement
    const set = (v: string, val: string) => root.style.setProperty(v, val)
    const unset = (v: string) => root.style.removeProperty(v)

    // ── Structural Design Style ────────────────────────────────
    root.setAttribute('data-design-style', preset.designStyle || 'glass')

    // ── Brand accent tokens (always set) ─────────────────────
    set('--z-accent', preset.accentHex)
    set('--z-accent-hsl', preset.accent)
    set('--z-active-bg', preset.activeBg)
    set('--z-active-border', preset.activeBorder)
    set('--z-active-text', preset.activeText)
    set('--z-active-glow', preset.activeGlow)
    set('--z-logo-bg', preset.logoIconBg)
    set('--z-logo-text', preset.logoIconText)
    // Scrollbar uses accent
    set('--z-scrollbar', `${preset.activeBg}`)
    set('--z-scrollbar-hover', `${preset.activeBorder}`)

    // ── Legacy compat (old --brand-* vars) ───────────────────
    set('--brand-accent', preset.accentHex)
    set('--brand-accent-hsl', preset.accent)
    set('--brand-active-bg', preset.activeBg)
    set('--brand-active-border', preset.activeBorder)
    set('--brand-active-text', preset.activeText)
    set('--brand-logo-bg', preset.logoIconBg)
    set('--brand-logo-text', preset.logoIconText)

    // ── Optional background overrides ────────────────────────
    // These let a theme fully override the dark/light defaults.
    if (preset.bgBase) set('--z-bg-base', preset.bgBase)
    else unset('--z-bg-base')
    if (preset.bgSidebar) set('--z-bg-sidebar', preset.bgSidebar)
    else unset('--z-bg-sidebar')
    if (preset.bgHeader) set('--z-bg-header', preset.bgHeader)
    else unset('--z-bg-header')
    if (preset.bgPanel) set('--z-bg-panel', preset.bgPanel)
    else unset('--z-bg-panel')
    if (preset.bgInput) set('--z-bg-input', preset.bgInput)
    else unset('--z-bg-input')
    if (preset.bgHover) set('--z-bg-hover', preset.bgHover)
    else unset('--z-bg-hover')

    // ── Optional border/text overrides ───────────────────────
    if (preset.borderColor) set('--z-border', preset.borderColor)
    else unset('--z-border')
    if (preset.borderStrong) set('--z-border-strong', preset.borderStrong)
    else unset('--z-border-strong')
    if (preset.textPrimary) set('--z-text-primary', preset.textPrimary)
    else unset('--z-text-primary')
    if (preset.textSecondary) set('--z-text-secondary', preset.textSecondary)
    else unset('--z-text-secondary')
    if (preset.textMuted) set('--z-text-muted', preset.textMuted)
    else unset('--z-text-muted')

    // ── Favicon ──────────────────────────────────────────────
    if (brand.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = brand.faviconUrl
    }
    if (brand.appName) document.title = brand.appName

    // ── Font ─────────────────────────────────────────────────
    const fontToLoad = preset.fontFamily || brand.fontFamily
    if (fontToLoad && fontToLoad !== 'Inter') {
      const id = 'zenith-brand-font'
      let el = document.getElementById(id)
      if (!el) {
        el = document.createElement('link')
        el.id = id
        ;(el as HTMLLinkElement).rel = 'stylesheet'
        document.head.appendChild(el)
      }
      ;(el as HTMLLinkElement).href =
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontToLoad)}:wght@400;700;900&display=swap`
      set('--brand-font', `'${fontToLoad}', sans-serif`)
    } else {
      unset('--brand-font')
    }

    // ── Custom CSS ───────────────────────────────────────────
    const combined = [preset.customCSS || '', brand.customCSS || ''].filter(Boolean).join('\n')
    let styleEl = document.getElementById('zenith-custom-css') as HTMLStyleElement
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'zenith-custom-css'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = combined
  }, [brand, preset])

  const setBrand = useCallback((partial: Partial<BrandConfig>) => {
    setBrandState((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(BRAND_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const applyPreset = useCallback(
    (id: string) => {
      const all = [...BUILTIN_PRESETS, ...loadCustomThemes()]
      const p = all.find((t) => t.id === id)
      if (!p) return
      setBrand({ themePresetId: id, primaryColor: p.accentHex })
    },
    [setBrand]
  )

  const saveCustomTheme = useCallback((t: ThemePreset) => {
    setCustomThemesState((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id)
      const next = idx >= 0 ? prev.map((x, i) => (i === idx ? t : x)) : [...prev, t]
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteCustomTheme = useCallback((id: string) => {
    setCustomThemesState((prev) => {
      const next = prev.filter((x) => x.id !== id)
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const exportTheme = useCallback((t: ThemePreset) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zenith-theme-${t.id}.json`
    a.click()
  }, [])

  const importTheme = useCallback(
    (json: string): ThemePreset | null => {
      try {
        const t = JSON.parse(json) as ThemePreset
        if (!t.id || !t.name || !t.accentHex) return null
        const imported = { ...t, id: `custom_${Date.now()}`, category: 'custom' as const }
        saveCustomTheme(imported)
        return imported
      } catch {
        return null
      }
    },
    [saveCustomTheme]
  )

  return (
    <BrandContext.Provider
      value={{
        brand,
        preset,
        allPresets,
        customThemes,
        setBrand,
        applyPreset,
        saveCustomTheme,
        deleteCustomTheme,
        exportTheme,
        importTheme,
      }}
    >
      {children}
    </BrandContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBrand = () => {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
