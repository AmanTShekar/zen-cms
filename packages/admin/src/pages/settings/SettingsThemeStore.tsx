import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Edit3,
  Eye,
  Info,
  Layers,
  Package,
  Paintbrush,
  Search,
  Star,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { ThemePreset } from '../../context/BrandContext'
import { BUILTIN_PRESETS, COMMUNITY_PRESETS, useBrand } from '../../context/BrandContext'
import { cn } from '../../lib/utils'

interface Props {
  theme: 'light' | 'dark'
}

// ── Auto-derive all tokens from a single hex ──────────────────────────────────
function hexToRgb(hex: string) {
  const n = hex.replace('#', '')
  const full =
    n.length === 3
      ? n
          .split('')
          .map((c) => c + c)
          .join('')
      : n
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function hexToHsl(hex: string): string {
  let { r, g, b } = hexToRgb(hex)
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function derivePreset(hex: string, overrides: Partial<ThemePreset> = {}): ThemePreset {
  const { r, g, b } = hexToRgb(hex)
  const luminance = r * 0.299 + g * 0.587 + b * 0.114
  const lift = 55
  const isClassic = overrides.designStyle === 'classic'

  return {
    id: overrides.id || 'preview',
    name: overrides.name || '',
    description: overrides.description,
    author: overrides.author,
    category: overrides.category || 'custom',
    tags: overrides.tags,
    version: overrides.version || '1.0.0',
    designStyle: overrides.designStyle || 'glass',
    accentHex: hex,
    accent: hexToHsl(hex),
    sidebarBg: overrides.sidebarBg || (isClassic ? '#0A1120' : 'rgba(0,0,0,0.65)'),
    activeBg: overrides.activeBg || `rgba(${r},${g},${b},0.12)`,
    activeBorder: overrides.activeBorder || `rgba(${r},${g},${b},0.35)`,
    activeText:
      overrides.activeText ||
      `rgb(${Math.min(r + lift, 255)},${Math.min(g + lift, 255)},${Math.min(b + lift, 255)})`,
    activeGlow:
      overrides.activeGlow ||
      (isClassic ? `0 0 10px rgba(${r},${g},${b},0.20)` : `0 0 22px rgba(${r},${g},${b},0.20)`),
    logoIconBg: overrides.logoIconBg || hex,
    logoIconText: overrides.logoIconText || (luminance > 150 ? '#000' : '#fff'),
    fontFamily: overrides.fontFamily,
    borderRadius: overrides.borderRadius || (isClassic ? 'md' : 'none'),
    customCSS: overrides.customCSS || '',
    bgBase: overrides.bgBase || (isClassic ? '#050505' : undefined),
    bgPanel: overrides.bgPanel || (isClassic ? '#111827' : undefined),
    bgHeader: overrides.bgHeader || (isClassic ? '#0A1120' : undefined),
  }
}

function getThemePreviewVars(p: ThemePreset) {
  const isClassic = p.designStyle === 'classic'
  const br =
    p.borderRadius === 'sm'
      ? '2px'
      : p.borderRadius === 'md'
        ? '4px'
        : p.borderRadius === 'lg'
          ? '6px'
          : '0px'
  return {
    bgBase: p.bgBase || (isClassic ? '#050505' : '#000'),
    bgPanel: p.bgPanel || (isClassic ? '#111827' : 'rgba(255,255,255,0.02)'),
    borderColor: p.borderColor || (isClassic ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'),
    radius: br,
  }
}

// ── Mini sidebar preview ──────────────────────────────────────────────────────
function MiniPreview({ p, label }: { p: ThemePreset; label?: string }) {
  const v = getThemePreviewVars(p)
  return (
    <div className="border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {label && (
        <div
          className="px-2 py-1 text-[7px] font-black uppercase tracking-widest text-z-secondary border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {label}
        </div>
      )}
      <div className="flex h-28" style={{ background: v.bgBase }}>
        {/* Sidebar */}
        <div
          className="w-12 flex flex-col gap-1 p-1.5 shrink-0"
          style={{ background: p.sidebarBg }}
        >
          <div
            className="w-6 h-6 flex items-center justify-center text-[7px] font-black mb-1"
            style={{ background: p.logoIconBg, color: p.logoIconText, borderRadius: v.radius }}
          >
            Z
          </div>
          {[100, 80, 65, 75].map((w, i) => (
            <div
              key={i}
              className="h-1.5"
              style={
                i === 0
                  ? {
                      background: p.activeBg,
                      borderLeft: `2px solid ${p.activeText}`,
                      width: `${w}%`,
                      borderRadius: v.radius,
                    }
                  : { background: 'rgba(255,255,255,0.05)', width: `${w}%`, borderRadius: v.radius }
              }
            />
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 p-2 space-y-1.5">
          <div className="h-1.5 bg-gray-700/50" style={{ width: '50%', borderRadius: v.radius }} />
          <div className="grid grid-cols-2 gap-1">
            <div
              className="h-7 border"
              style={{
                borderColor: p.activeBorder,
                background: p.activeBg,
                borderRadius: v.radius,
              }}
            >
              <div
                className="h-1 mt-1.5 mx-1.5"
                style={{
                  background: p.activeText,
                  width: '55%',
                  opacity: 0.9,
                  borderRadius: v.radius,
                }}
              />
            </div>
            <div
              className="h-7 border"
              style={{ borderColor: v.borderColor, background: v.bgPanel, borderRadius: v.radius }}
            />
          </div>
          <div
            className="h-4 border flex items-center justify-center text-[7px] font-black"
            style={{
              borderColor: p.activeBorder,
              background: p.activeBg,
              color: p.activeText,
              boxShadow: p.activeGlow,
              borderRadius: v.radius,
            }}
          >
            {p.name || 'ACTIVE'}
          </div>
          <div
            className="h-4 border"
            style={{ borderColor: v.borderColor, background: v.bgPanel, borderRadius: v.radius }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Theme Card ────────────────────────────────────────────────────────────────
function ThemeCard({
  preset,
  isActive,
  onApply,
  onDelete,
  onExport,
  onEdit,
  dark,
}: {
  preset: ThemePreset
  isActive: boolean
  onApply: () => void
  onDelete?: () => void
  onExport?: () => void
  onEdit?: () => void
  dark: boolean
}) {
  const v = getThemePreviewVars(preset)
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={cn('relative border transition-all overflow-hidden group')}
      style={
        isActive
          ? { borderColor: preset.activeBorder, boxShadow: preset.activeGlow }
          : { borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }
      }
    >
      {/* Preview */}
      <div className="h-28 relative overflow-hidden">
        <div className="flex h-full" style={{ background: v.bgBase }}>
          <div
            className="w-11 flex flex-col gap-1 p-1.5 shrink-0"
            style={{ background: preset.sidebarBg }}
          >
            <div
              className="w-5 h-5 flex items-center justify-center text-[7px] font-black mb-1"
              style={{
                background: preset.logoIconBg,
                color: preset.logoIconText,
                borderRadius: v.radius,
              }}
            >
              {(preset.name || 'Z')[0]}
            </div>
            {[90, 70, 55, 80].map((w, i) => (
              <div
                key={i}
                className="h-1.5"
                style={
                  i === 1
                    ? {
                        background: preset.activeText,
                        width: `${w}%`,
                        opacity: 0.9,
                        borderRadius: v.radius,
                      }
                    : {
                        background: 'rgba(255,255,255,0.06)',
                        width: `${w}%`,
                        borderRadius: v.radius,
                      }
                }
              />
            ))}
          </div>
          <div className="flex-1 p-2 space-y-1.5">
            <div
              className="h-1.5 bg-gray-700/40"
              style={{ width: '50%', borderRadius: v.radius }}
            />
            <div className="grid grid-cols-2 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 border"
                  style={{
                    borderColor: i === 0 ? preset.activeBorder : v.borderColor,
                    background: i === 0 ? preset.activeBg : v.bgPanel,
                    borderRadius: v.radius,
                  }}
                >
                  {i === 0 && (
                    <div
                      className="h-1 mt-1.5 mx-1.5"
                      style={{
                        background: preset.accentHex,
                        width: '60%',
                        opacity: 0.8,
                        borderRadius: v.radius,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div
              className="h-3.5 border flex items-center justify-center"
              style={{
                borderColor: preset.activeBorder,
                background: preset.activeBg,
                borderRadius: v.radius,
              }}
            >
              <div
                className="w-6 h-0.5"
                style={{ background: preset.activeText, opacity: 0.8, borderRadius: v.radius }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Info */}
      <div
        className={cn(
          'p-3 border-t relative',
          dark ? 'bg-black/60 border-z-border' : 'bg-white border-z-border'
        )}
      >
        {/* Structural Badge */}
        <div className="absolute top-0 right-3 -translate-y-1/2 flex items-center">
          <span
            className={cn(
              'px-2 py-0.5 text-[6px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-sm',
              preset.designStyle === 'classic'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400'
            )}
          >
            {preset.designStyle === 'classic' ? 'CLASSIC' : 'GLASS'}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <div
            className="w-3 h-3 flex-shrink-0 mt-0.5"
            style={{ background: preset.accentHex, borderRadius: v.radius }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-wide truncate',
                  dark ? 'text-white' : 'text-z-primary'
                )}
              >
                {preset.name}
              </span>
              {isActive && <Check size={9} style={{ color: preset.activeText, flexShrink: 0 }} />}
            </div>
            {preset.description && (
              <p className="text-[8px] text-z-secondary mt-0.5 line-clamp-1">
                {preset.description}
              </p>
            )}
            {preset.tags && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {preset.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 border text-z-secondary rounded-sm"
                    style={{ borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 border text-z-secondary hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                title="Edit"
              >
                <Edit3 size={9} />
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="p-1 border text-z-secondary hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                title="Export JSON"
              >
                <Download size={9} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 border border-red-500/20 text-red-400 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 size={9} />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Apply / Active badge */}
      {isActive ? (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border"
          style={{
            background: preset.activeBg,
            borderColor: preset.activeBorder,
            color: preset.activeText,
            borderRadius: v.radius,
          }}
        >
          Active
        </div>
      ) : (
        <button
          onClick={onApply}
          className="absolute bottom-3 right-3 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-widest border opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            borderColor: dark ? 'rgba(255,255,255,0.1)' : '#d1d5db',
            color: dark ? '#ccc' : '#555',
            borderRadius: v.radius,
          }}
        >
          Apply
        </button>
      )}
    </motion.div>
  )
}

// ── Full Theme Creator Wizard ──────────────────────────────────────────────────
const FONTS = [
  'Inter',
  'Roboto',
  'Outfit',
  'DM Sans',
  'Sora',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Fira Code',
  'JetBrains Mono',
  'Merriweather',
]
const SIDEBAR_PRESETS = [
  { label: 'Standard', value: 'rgba(0,0,0,0.65)' },
  { label: 'Deep Void', value: 'rgba(0,0,0,0.88)' },
  { label: 'Warm Tint', value: 'rgba(8,4,0,0.78)' },
  { label: 'Cold Tint', value: 'rgba(0,4,16,0.78)' },
  { label: 'Purple Tint', value: 'rgba(4,0,12,0.80)' },
  { label: 'Green Tint', value: 'rgba(0,6,2,0.80)' },
  { label: 'Custom', value: '' },
]

function ThemeCreatorWizard({
  dark,
  onClose,
  onSave,
  editing,
}: {
  dark: boolean
  onClose: () => void
  onSave: (t: ThemePreset) => void
  editing?: ThemePreset
}) {
  const [step, setStep] = useState(0)
  const [hex, setHex] = useState(editing?.accentHex || 'var(--z-accent)')
  const [draft, setDraft] = useState<Partial<ThemePreset>>(
    editing || {
      name: '',
      description: '',
      author: '',
      tags: [],
      version: '1.0.0',
      category: 'custom',
      designStyle: 'glass',
      borderRadius: 'none',
      customCSS: '',
    }
  )
  const [preview, setPreview] = useState<ThemePreset>(
    editing ? { ...editing } : derivePreset('var(--z-accent)', { designStyle: 'glass' })
  )
  const [customSidebar, setCustomSidebar] = useState('')
  const [tagInput, setTagInput] = useState(editing?.tags?.join(', ') || '')
  const [autoDerive, setAutoDerive] = useState(!editing)

  const update = (k: keyof ThemePreset, v: any) => {
    const next = { ...draft, [k]: v }
    setDraft(next)
    if (autoDerive) {
      setPreview(derivePreset(hex, next))
    } else {
      setPreview((p) => ({ ...p, [k]: v }))
    }
  }

  const updateHex = (h: string) => {
    setHex(h)
    if (autoDerive) setPreview(derivePreset(h, draft))
    else setPreview((p) => ({ ...p, accentHex: h }))
  }

  const updateToken = (k: keyof ThemePreset, v: string) => {
    setPreview((p) => ({ ...p, [k]: v }))
  }

  const inp = cn(
    'w-full border py-2 px-3 text-[10px] font-black outline-none focus:ring-1 focus:ring-z-active-border transition-all',
    dark
      ? 'bg-black border-z-border text-white placeholder:text-gray-600'
      : 'bg-z-panel border-z-border text-z-primary'
  )
  const lbl = 'text-[8px] font-black uppercase tracking-widest text-z-secondary block mb-1.5'

  const steps = [
    { label: 'Identity', icon: Info },
    { label: 'Structure', icon: Layers },
    { label: 'Colors', icon: Paintbrush },
    { label: 'Advanced', icon: Wand2 },
    { label: 'Preview', icon: Eye },
  ]

  const canProceed = step === 0 ? !!draft.name?.trim() : true

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={cn(
          'w-full max-w-2xl border shadow-2xl my-auto',
          dark ? 'bg-[#050505] border-z-border' : 'bg-z-panel border-z-border'
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
        >
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-wider">
              {editing ? 'Edit Theme' : 'Theme Creator'}
            </h3>
            <p className="text-[8px] text-z-secondary uppercase tracking-widest mt-0.5">
              Step {step + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border text-z-secondary hover:text-white"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicators */}
        <div
          className="flex border-b"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
        >
          {steps.map(({ label, icon: Icon }, i) => (
            <button
              key={i}
              onClick={() => (i < step || canProceed ? setStep(i) : null)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-[8px] font-black uppercase tracking-widest border-b-2 transition-all',
                i === step
                  ? 'border-z-accent text-z-active-text'
                  : i < step
                    ? 'border-transparent text-z-muted hover:text-gray-300'
                    : 'border-transparent text-gray-600'
              )}
            >
              <Icon size={10} />
              <span className="hidden sm:block">{label}</span>
              <span className="text-[7px] opacity-50">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[320px]">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Identity ─────────────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Theme Name *</label>
                    <input
                      value={draft.name || ''}
                      onChange={(e) => update('name', e.target.value)}
                      className={inp}
                      placeholder="My Awesome Theme"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Author</label>
                    <input
                      value={draft.author || ''}
                      onChange={(e) => update('author', e.target.value)}
                      className={inp}
                      placeholder="Your Name"
                    />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <input
                    value={draft.description || ''}
                    onChange={(e) => update('description', e.target.value)}
                    className={inp}
                    placeholder="A short description of your theme..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Tags (comma separated)</label>
                    <input
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value)
                        update(
                          'tags',
                          e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                        )
                      }}
                      className={inp}
                      placeholder="dark, minimal, neon"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Version</label>
                    <input
                      value={draft.version || '1.0.0'}
                      onChange={(e) => update('version', e.target.value)}
                      className={inp}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    'p-3 border text-[9px] text-z-secondary',
                    dark ? 'border-z-border bg-z-panel' : 'border-z-border bg-gray-50'
                  )}
                >
                  <p className="font-black uppercase tracking-widest text-z-active-text mb-1">
                    Tip
                  </p>
                  Give your theme a memorable name. The ID will be auto-generated. Tags help users
                  find your theme in search.
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Structure ────────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-[12px] font-black uppercase tracking-wider mb-1 text-z-primary">
                    Design Paradigm
                  </h3>
                  <p className="text-[9px] text-z-secondary mb-4">
                    Choose the foundational layout structure for your theme. This completely changes
                    how backgrounds, borders, and shadows behave.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        update('designStyle', 'glass')
                        if (autoDerive)
                          setPreview(derivePreset(hex, { ...draft, designStyle: 'glass' }))
                      }}
                      className={cn(
                        'flex-1 p-4 border transition-all text-left group',
                        draft.designStyle !== 'classic'
                          ? 'border-[var(--z-accent)] bg-[var(--z-active-bg)]'
                          : dark
                            ? 'border-z-border hover:border-z-active-border'
                            : 'border-z-border hover:border-z-active-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            draft.designStyle !== 'classic'
                              ? 'text-[var(--z-active-text)]'
                              : 'text-z-muted'
                          )}
                        >
                          Glassmorphic
                        </span>
                        {draft.designStyle !== 'classic' && (
                          <Check size={14} className="text-[var(--z-active-text)]" />
                        )}
                      </div>
                      <p className="text-[8px] text-z-secondary uppercase tracking-widest leading-relaxed">
                        Translucent panels, deep blurs, and glowing layered shadows.
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        update('designStyle', 'classic')
                        if (autoDerive)
                          setPreview(derivePreset(hex, { ...draft, designStyle: 'classic' }))
                      }}
                      className={cn(
                        'flex-1 p-4 border transition-all text-left group',
                        draft.designStyle === 'classic'
                          ? 'border-[var(--z-accent)] bg-[var(--z-active-bg)]'
                          : dark
                            ? 'border-z-border hover:border-z-active-border'
                            : 'border-z-border hover:border-z-active-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            draft.designStyle === 'classic'
                              ? 'text-[var(--z-active-text)]'
                              : 'text-z-muted'
                          )}
                        >
                          Classic Enterprise
                        </span>
                        {draft.designStyle === 'classic' && (
                          <Check size={14} className="text-[var(--z-active-text)]" />
                        )}
                      </div>
                      <p className="text-[8px] text-z-secondary uppercase tracking-widest leading-relaxed">
                        Solid backgrounds, strict borders, standard shadows. No blur.
                      </p>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Colors ───────────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Auto-derive toggle */}
                <div
                  className={cn(
                    'flex items-center justify-between p-3 border',
                    dark ? 'border-z-border' : 'border-z-border'
                  )}
                >
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest">
                      Auto-derive all colors
                    </p>
                    <p className="text-[8px] text-z-secondary mt-0.5">
                      Compute all tokens from your single accent hex
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAutoDerive((p) => !p)
                      if (!autoDerive) setPreview(derivePreset(hex, draft))
                    }}
                    className={cn(
                      'w-10 h-5 border transition-all relative',
                      autoDerive
                        ? 'border-z-accent'
                        : dark
                          ? 'border-z-border'
                          : 'border-z-border-strong'
                    )}
                  >
                    <motion.div
                      animate={{ x: autoDerive ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 w-4 h-4"
                      style={{ background: autoDerive ? 'var(--z-accent)' : '#555' }}
                    />
                  </button>
                </div>

                {/* Primary accent */}
                <div>
                  <label className={lbl}>Primary Accent *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => updateHex(e.target.value)}
                      className="w-12 h-9 cursor-pointer border-0 p-0.5 bg-transparent"
                    />
                    <input
                      value={hex}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateHex(e.target.value)
                      }}
                      className={cn(inp, 'flex-1')}
                      placeholder="var(--z-accent)"
                    />
                    <div className="text-[8px] text-z-secondary font-mono">
                      HSL: {hexToHsl(hex)}
                    </div>
                  </div>
                </div>

                {!autoDerive && (
                  <div className="space-y-3">
                    {[
                      { key: 'activeBg', label: 'Active Bg', placeholder: 'rgba(139,92,246,0.12)' },
                      {
                        key: 'activeBorder',
                        label: 'Active Border',
                        placeholder: 'rgba(139,92,246,0.35)',
                      },
                      { key: 'activeText', label: 'Active Text', placeholder: 'rgb(167,139,250)' },
                      {
                        key: 'activeGlow',
                        label: 'Glow (box-shadow)',
                        placeholder: '0 0 22px rgba(139,92,246,0.20)',
                      },
                      { key: 'logoIconBg', label: 'Badge Bg', placeholder: 'var(--z-accent)' },
                      { key: 'logoIconText', label: 'Badge Text', placeholder: '#fff' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className={lbl}>{label}</label>
                        <input
                          value={(preview as any)[key] || ''}
                          onChange={(e) => updateToken(key as keyof ThemePreset, e.target.value)}
                          className={inp}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Sidebar bg */}
                <div>
                  <label className={lbl}>Sidebar Background</label>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {SIDEBAR_PRESETS.filter((s) => s.value).map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          update('sidebarBg', s.value)
                          updateToken('sidebarBg', s.value)
                        }}
                        className={cn(
                          'py-1.5 border text-[7px] font-black uppercase tracking-wider transition-all',
                          preview.sidebarBg === s.value
                            ? 'border-z-accent/50 text-z-active-text'
                            : dark
                              ? 'border-z-border text-z-secondary hover:text-gray-300'
                              : 'border-z-border text-z-muted'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={preview.sidebarBg}
                    onChange={(e) => {
                      update('sidebarBg', e.target.value)
                      updateToken('sidebarBg', e.target.value)
                    }}
                    className={inp}
                    placeholder="rgba(0,0,0,0.65)"
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Advanced ─────────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Font Family</label>
                    <select
                      value={draft.fontFamily || ''}
                      onChange={(e) => update('fontFamily', e.target.value)}
                      className={inp}
                    >
                      <option value="">Inherit (brand setting)</option>
                      {FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Border Radius</label>
                    <select
                      value={draft.borderRadius || 'none'}
                      onChange={(e) => update('borderRadius', e.target.value)}
                      className={inp}
                    >
                      <option value="none">None — 0px Sharp</option>
                      <option value="sm">SM — 2px Minimal</option>
                      <option value="md">MD — 4px Standard</option>
                      <option value="lg">LG — 8px Soft</option>
                    </select>
                  </div>
                </div>

                {/* Structural Design Variant removed and placed in Step 1 */}

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Code2 size={10} className="text-z-active-text" />
                    <label className={cn(lbl, 'mb-0')}>Custom CSS Override</label>
                  </div>
                  <textarea
                    value={draft.customCSS || ''}
                    onChange={(e) => update('customCSS', e.target.value)}
                    rows={6}
                    spellCheck={false}
                    className={cn(inp, 'resize-none font-mono text-[10px]')}
                    placeholder={`:root {\n  /* Available vars:\n     --brand-accent  --brand-active-bg\n     --brand-active-border  --brand-active-text\n     --brand-logo-bg  --brand-logo-text\n  */\n}\n\n/* Custom styles */\n.custom-glow { box-shadow: 0 0 40px var(--brand-active-bg); }`}
                  />
                  <p className="text-[8px] text-z-secondary mt-1.5 uppercase tracking-wider">
                    Injected into &lt;head&gt; when this theme is active
                  </p>
                </div>

                <div
                  className={cn(
                    'p-3 border text-[8px]',
                    dark ? 'border-z-border bg-z-panel' : 'border-z-border bg-gray-50'
                  )}
                >
                  <p className="font-black uppercase tracking-widest text-z-active-text mb-1">
                    CSS Variables Available
                  </p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-z-secondary">
                    {[
                      '--brand-accent',
                      '--brand-active-bg',
                      '--brand-active-border',
                      '--brand-active-text',
                      '--brand-logo-bg',
                      '--brand-logo-text',
                    ].map((v) => (
                      <span key={v} className="truncate">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Preview ──────────────────────────────────────────────── */}
            {step === 4 && (
              <motion.div
                key="s4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <MiniPreview p={preview} label="Sidebar & Active States" />

                {/* Token summary */}
                <div
                  className={cn(
                    'border divide-y text-[9px] font-mono',
                    dark ? 'border-z-border divide-white/[0.04]' : 'border-z-border divide-gray-100'
                  )}
                >
                  {[
                    ['Accent', preview.accentHex],
                    ['Active Bg', preview.activeBg],
                    ['Active Border', preview.activeBorder],
                    ['Active Text', preview.activeText],
                    ['Sidebar Bg', preview.sidebarBg],
                    ['Badge', `${preview.logoIconBg} / ${preview.logoIconText}`],
                    ['Font', preview.fontFamily || 'Inherited'],
                    ['Radius', preview.borderRadius || 'none'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 px-3 py-2">
                      <span
                        className={cn(
                          'w-24 shrink-0 font-black uppercase tracking-widest text-[8px]',
                          dark ? 'text-z-secondary' : 'text-z-muted'
                        )}
                      >
                        {k}
                      </span>
                      <span className={cn('truncate', dark ? 'text-gray-300' : 'text-gray-700')}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Export JSON preview */}
                <details
                  className={cn('border text-[8px]', dark ? 'border-z-border' : 'border-z-border')}
                >
                  <summary
                    className={cn(
                      'px-3 py-2 cursor-pointer font-black uppercase tracking-widest',
                      dark ? 'text-z-secondary hover:text-gray-300' : 'text-z-secondary'
                    )}
                  >
                    View JSON output
                  </summary>
                  <pre
                    className={cn(
                      'p-3 font-mono text-[8px] overflow-auto max-h-40 border-t',
                      dark
                        ? 'border-z-border text-z-muted bg-black/30'
                        : 'border-z-border text-gray-600 bg-gray-50'
                    )}
                  >
                    {JSON.stringify(
                      { ...preview, ...draft, name: draft.name, tags: draft.tags },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div
          className="flex gap-2 px-6 py-4 border-t"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
        >
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2.5 border text-[9px] font-black uppercase tracking-wider transition-all',
              dark
                ? 'border-z-border text-z-muted hover:text-white'
                : 'border-z-border text-z-secondary'
            )}
          >
            Cancel
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className={cn(
                'px-4 py-2.5 border text-[9px] font-black uppercase tracking-wider flex items-center gap-2 transition-all',
                dark
                  ? 'border-z-border text-z-muted hover:text-white'
                  : 'border-z-border text-z-secondary'
              )}
            >
              <ChevronLeft size={12} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < steps.length - 1 ? (
            <button
              disabled={!canProceed}
              onClick={() => setStep((s) => s + 1)}
              className={cn(
                'px-6 py-2.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-2 transition-all',
                canProceed
                  ? 'bg-z-accent text-white hover:opacity-90'
                  : 'bg-gray-700 text-z-secondary cursor-not-allowed'
              )}
            >
              Next <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={() => {
                if (!draft.name?.trim()) {
                  toast.error('Theme name required')
                  setStep(0)
                  return
                }
                const id = editing?.id || `custom_${Date.now()}`
                const final: ThemePreset = {
                  ...preview,
                  ...draft,
                  id,
                  name: draft.name!.trim(),
                  tags: draft.tags,
                  accentHex: hex,
                }
                onSave(final)
              }}
              className="px-6 py-2.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-2 transition-all"
              style={{ background: preview.accentHex, color: preview.logoIconText }}
            >
              <Check size={12} /> {editing ? 'Save Changes' : 'Create & Apply'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Theme Store ──────────────────────────────────────────────────────────
export default function SettingsThemeStore({ theme }: Props) {
  const dark = theme === 'dark'
  const {
    brand,
    allPresets,
    customThemes,
    applyPreset,
    saveCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
  } = useBrand()
  const [tab, setTab] = useState<'builtin' | 'community' | 'custom'>('builtin')
  const [search, setSearch] = useState('')
  const [showCreator, setShowCreator] = useState(false)
  const [editingTheme, setEditingTheme] = useState<ThemePreset | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  const card = cn('border', 'z-panel shadow-sm')

  const filterP = useCallback(
    (presets: ThemePreset[]) => {
      if (!search.trim()) return presets
      const q = search.toLowerCase()
      return presets.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.includes(q)) ||
          p.description?.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q)
      )
    },
    [search]
  )

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const r = importTheme(ev.target?.result as string)
      if (r) {
        toast.success(`Imported "${r.name}"`)
        setTab('custom')
      } else toast.error('Invalid theme JSON — check THEME_SPEC.md')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const tabs = [
    { id: 'builtin' as const, label: 'Built-in', count: BUILTIN_PRESETS.length, icon: Star },
    {
      id: 'community' as const,
      label: 'Community',
      count: COMMUNITY_PRESETS.length,
      icon: Package,
    },
    { id: 'custom' as const, label: 'My Themes', count: customThemes.length, icon: Layers },
  ]

  const activeP =
    allPresets.find((p) => p.id === brand.themePresetId) ||
    COMMUNITY_PRESETS.find((p) => p.id === brand.themePresetId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={cn(card, 'p-5')}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center border"
              style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' }}
            >
              <Paintbrush size={18} className="text-z-active-text" />
            </div>
            <div>
              <h2 className="text-[13px] font-black uppercase tracking-wider">Theme Store</h2>
              <p className="text-[8px] text-z-secondary uppercase tracking-widest mt-0.5">
                {BUILTIN_PRESETS.length + COMMUNITY_PRESETS.length + customThemes.length} themes ·
                plug-and-play · import/export JSON
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex items-center gap-2 px-3 py-2 border text-[9px] font-black uppercase tracking-widest transition-all',
                dark
                  ? 'border-z-border text-z-muted hover:text-white'
                  : 'border-z-border text-z-secondary hover:text-z-primary'
              )}
            >
              <Upload size={11} /> Import .json
            </button>
            <button
              onClick={() => {
                setEditingTheme(undefined)
                setShowCreator(true)
              }}
              className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
              style={{
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: 'rgb(167,139,250)',
              }}
            >
              <Wand2 size={11} /> Create Theme
            </button>
          </div>
        </div>

        {activeP && (
          <div
            className="mt-4 flex items-center gap-3 px-3 py-2 border"
            style={{ background: activeP.activeBg, borderColor: activeP.activeBorder }}
          >
            <div className="w-3 h-3" style={{ background: activeP.accentHex }} />
            <span
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: activeP.activeText }}
            >
              Active: {activeP.name}
            </span>
            <span className="text-[8px] text-z-secondary ml-1">{activeP.description || ''}</span>
            <button
              onClick={() => exportTheme(activeP)}
              className="ml-auto flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
              style={{ color: activeP.activeText, opacity: 0.7 }}
            >
              <Download size={9} /> Export
            </button>
          </div>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase tracking-widest transition-all',
                tab === id
                  ? 'border-z-active-border bg-z-active-bg text-z-active-text'
                  : dark
                    ? 'border-z-border text-z-secondary hover:text-gray-300'
                    : 'border-z-border text-z-secondary hover:text-gray-700'
              )}
            >
              <Icon size={10} /> {label} <span className="text-[7px] opacity-50">({count})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className={cn(
              'pl-8 pr-3 py-2 border text-[10px] font-black outline-none w-44 focus:ring-1 focus:ring-z-active-border',
              dark
                ? 'bg-black border-z-border text-white placeholder:text-gray-600'
                : 'bg-z-panel border-z-border'
            )}
          />
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {tab === 'builtin' && (
          <motion.div
            key="builtin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filterP(BUILTIN_PRESETS).map((p) => (
              <ThemeCard
                key={p.id}
                preset={p}
                dark={dark}
                isActive={brand.themePresetId === p.id}
                onApply={() => {
                  applyPreset(p.id)
                  toast.success(`Applied "${p.name}"`)
                }}
                onExport={() => exportTheme(p)}
              />
            ))}
          </motion.div>
        )}

        {tab === 'community' && (
          <motion.div
            key="community"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className={cn(
                'mb-4 px-4 py-3 border flex items-center gap-3 text-[9px] font-black uppercase tracking-widest',
                dark
                  ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                  : 'border-amber-500/20 bg-amber-50 text-amber-600'
              )}
            >
              <Star size={11} />
              Community themes · Apply installs to your library · Export to share
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filterP(COMMUNITY_PRESETS).map((p) => {
                const installed = customThemes.some((c) => c.name === p.name)
                return (
                  <ThemeCard
                    key={p.id}
                    preset={p}
                    dark={dark}
                    isActive={
                      brand.themePresetId === p.id || brand.themePresetId === `custom_${p.id}`
                    }
                    onApply={() => {
                      const installedTheme = customThemes.find((c) => c.name === p.name)
                      if (installedTheme) {
                        applyPreset(installedTheme.id)
                        return
                      }
                      const newT = { ...p, id: `custom_${p.id}`, category: 'custom' as const }
                      saveCustomTheme(newT)
                      applyPreset(newT.id)
                      toast.success(`Applied "${p.name}"`)
                    }}
                    onExport={() => exportTheme(p)}
                  />
                )
              })}
            </div>
          </motion.div>
        )}

        {tab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {customThemes.length === 0 ? (
              <div className={cn(card, 'flex flex-col items-center justify-center py-20 gap-5')}>
                <Wand2 size={32} className="text-gray-600" />
                <div className="text-center">
                  <p
                    className={cn(
                      'text-[11px] font-black uppercase tracking-widest mb-1',
                      dark ? 'text-z-muted' : 'text-gray-600'
                    )}
                  >
                    No Custom Themes Yet
                  </p>
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest">
                    Create one with the wizard, or import a <code>.json</code> file
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase tracking-widest',
                      dark
                        ? 'border-z-border text-z-muted hover:text-white'
                        : 'border-z-border text-z-secondary'
                    )}
                  >
                    <Upload size={11} /> Import JSON
                  </button>
                  <button
                    onClick={() => {
                      setEditingTheme(undefined)
                      setShowCreator(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest"
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: 'rgb(167,139,250)',
                    }}
                  >
                    <Wand2 size={11} /> Open Creator
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filterP(customThemes).map((p) => (
                  <ThemeCard
                    key={p.id}
                    preset={p}
                    dark={dark}
                    isActive={brand.themePresetId === p.id}
                    onApply={() => {
                      applyPreset(p.id)
                      toast.success(`Applied "${p.name}"`)
                    }}
                    onEdit={() => {
                      setEditingTheme(p)
                      setShowCreator(true)
                    }}
                    onDelete={() => {
                      deleteCustomTheme(p.id)
                      if (brand.themePresetId === p.id) applyPreset('zenith')
                      toast.success('Deleted')
                    }}
                    onExport={() => exportTheme(p)}
                  />
                ))}
                <button
                  onClick={() => {
                    setEditingTheme(undefined)
                    setShowCreator(true)
                  }}
                  className={cn(
                    'border-2 border-dashed flex flex-col items-center justify-center gap-2 py-16 transition-all',
                    dark
                      ? 'border-z-border text-gray-600 hover:border-white/20 hover:text-z-muted'
                      : 'border-z-border text-z-muted hover:border-gray-400'
                  )}
                >
                  <Wand2 size={20} />
                  <span className="text-[9px] font-black uppercase tracking-widest">New Theme</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <AnimatePresence>
        {showCreator && (
          <ThemeCreatorWizard
            dark={dark}
            editing={editingTheme}
            onClose={() => {
              setShowCreator(false)
              setEditingTheme(undefined)
            }}
            onSave={(t) => {
              saveCustomTheme(t)
              applyPreset(t.id)
              setShowCreator(false)
              setEditingTheme(undefined)
              setTab('custom')
              toast.success(`"${t.name}" saved & applied!`)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
