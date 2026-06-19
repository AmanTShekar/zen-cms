import React, { useRef } from 'react'
import { Paintbrush, Code2, Sun, Moon, Type, Upload, RotateCcw, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useBrand, THEME_PRESETS } from '../../context/BrandContext'
import toast from 'react-hot-toast'

interface Props {
  settings: { customCSS: string; [k: string]: any }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const FONTS = ['Inter', 'Roboto', 'Outfit', 'DM Sans', 'Sora', 'Plus Jakarta Sans', 'Space Grotesk', 'Fira Code', 'Merriweather']

const card = (dark: boolean) =>
  cn('p-6 border transition-all', 'z-card')

const inp = (dark: boolean) =>
  cn('w-full border py-2 px-3 text-[11px] font-black outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-black border-z-border text-white' : 'bg-z-panel border-z-border text-z-primary')

const label = 'text-[9px] font-black uppercase tracking-widest text-z-secondary block mb-2'

export default function SettingsAppearance({ settings, setSettings, theme }: Props) {
  const dark = theme === 'dark'
  const { brand, preset, setBrand, applyPreset } = useBrand()
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (file: File, field: 'logoUrl' | 'faviconUrl') => {
    if (!file.type.startsWith('image/')) return toast.error('Must be an image file')
    const reader = new FileReader()
    reader.onload = (e) => {
      setBrand({ [field]: e.target?.result as string })
      toast.success(field === 'logoUrl' ? 'Logo updated' : 'Favicon updated')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">

      {/* ── Row 1: Brand Identity + Theme Presets ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Brand Identity */}
        <div className={card(dark) + ' space-y-5'}>
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <div className="w-8 h-8 flex items-center justify-center border" style={{ background: 'var(--z-active-bg)', borderColor: 'var(--z-active-border)' }}>
              <Paintbrush size={15} className="text-z-active-text" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider">Brand Identity</h3>
              <p className={label + ' mt-0.5 mb-0'}>White-label your CMS</p>
            </div>
          </div>

          {/* App Name & Tagline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>App Name</label>
              <input
                value={brand.appName}
                onChange={e => setBrand({ appName: e.target.value })}
                className={inp(dark)}
                placeholder="Zenith"
              />
            </div>
            <div>
              <label className={label}>Tagline / Version</label>
              <input
                value={brand.appTagline}
                onChange={e => setBrand({ appTagline: e.target.value })}
                className={inp(dark)}
                placeholder="v1.0 Beta"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className={label}>Logo Image</label>
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt="Logo" className="w-10 h-10 object-contain border" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
              ) : (
                <div className="w-10 h-10 border flex items-center justify-center text-gray-600 text-[9px] font-black uppercase tracking-wider"
                  style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
                  None
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <button onClick={() => logoRef.current?.click()}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2 border text-[9px] font-black uppercase tracking-widest transition-all',
                    dark ? 'border-z-border text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:text-z-primary')}>
                  <Upload size={11} /> Upload
                </button>
                {brand.logoUrl && (
                  <button onClick={() => setBrand({ logoUrl: '' })}
                    className="px-3 py-2 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all">
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logoUrl')} />
            </div>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className={label}>Favicon</label>
            <div className="flex items-center gap-3">
              {brand.faviconUrl ? (
                <img src={brand.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain border" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />
              ) : (
                <div className="w-8 h-8 border flex items-center justify-center text-gray-600 text-[8px]"
                  style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>ico</div>
              )}
              <button onClick={() => faviconRef.current?.click()}
                className={cn('flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase tracking-widest transition-all',
                  dark ? 'border-z-border text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:text-z-primary')}>
                <Upload size={11} /> Upload
              </button>
              <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'faviconUrl')} />
            </div>
          </div>

          {/* Font */}
          <div>
            <label className={label}>Typography</label>
            <div className="relative">
              <Type size={12} className="absolute left-3 top-2.5 text-z-secondary" />
              <select value={brand.fontFamily} onChange={e => setBrand({ fontFamily: e.target.value })} className={cn(inp(dark), 'pl-9')}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Default Theme */}
          <div>
            <label className={label}>Default Color Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {['light', 'dark'].map(t => (
                <button key={t} type="button"
                  onClick={() => setSettings({ ...settings, theme: t })}
                  className={cn('flex items-center justify-center gap-2 py-2.5 border text-[10px] font-black uppercase tracking-wider transition-all',
                    (settings.theme === t || (!settings.theme && t === 'dark'))
                      ? 'border-z-accent bg-z-active-bg text-z-active-text'
                      : dark ? 'border-z-border text-z-secondary hover:border-z-active-border' : 'border-z-border text-z-secondary')}>
                  {t === 'light' ? <Sun size={13} /> : <Moon size={13} />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Presets */}
        <div className={card(dark) + ' space-y-5'}>
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <div className="w-8 h-8 flex items-center justify-center border" style={{ background: 'var(--z-active-bg)', borderColor: 'var(--z-active-border)' }}>
              <Paintbrush size={15} className="text-z-active-text" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider">Accent Theme</h3>
              <p className={label + ' mt-0.5 mb-0'}>Plug-and-play presets</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {THEME_PRESETS.map(p => {
              const active = brand.themePresetId === p.id
              return (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className={cn('relative flex items-center gap-3 p-3 border text-left transition-all group',
                    active
                      ? 'border-z-accent/50 bg-z-accent/5'
                      : dark ? 'border-z-border hover:border-white/20' : 'border-z-border hover:border-gray-400')}>
                  {/* Swatch */}
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-lg"
                    style={{ backgroundColor: p.accentHex, color: p.logoIconText }}>
                    {p.name[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn('text-[10px] font-black uppercase tracking-wider truncate', active ? 'text-z-active-text' : dark ? 'text-gray-300' : 'text-gray-700')}>{p.name}</span>
                    <span className="text-[8px] font-mono text-z-secondary">{p.accentHex}</span>
                  </div>
                  {active && <Check size={11} className="absolute top-2 right-2 text-z-active-text" />}
                </button>
              )
            })}
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <label className={label}>Live Preview</label>
            <div className="p-4 border space-y-2" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb', background: dark ? 'rgba(0,0,0,0.4)' : '#f9fafb' }}>
              {/* Simulated sidebar item active */}
              <div className="flex items-center gap-3 px-3 py-2 border"
                style={{ background: preset.activeBg, borderColor: preset.activeBorder, boxShadow: preset.activeGlow }}>
                <div className="w-2 h-2" style={{ background: preset.activeText }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: preset.activeText }}>{brand.appName || 'Zenith'}</span>
              </div>
              {/* Simulated sidebar item default */}
              <div className={cn('flex items-center gap-3 px-3 py-2 border', dark ? 'border-z-border' : 'border-z-border')}>
                <div className="w-2 h-2 bg-gray-600" />
                <span className={cn('text-[10px] font-black uppercase tracking-wider', dark ? 'text-z-secondary' : 'text-z-muted')}>Collections</span>
              </div>
              {/* Simulated logo badge */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-7 h-7 flex items-center justify-center font-black text-[11px]"
                  style={{ background: preset.logoIconBg, color: preset.logoIconText }}>
                  {(brand.appName || 'Z')[0]}
                </div>
                <span className="text-[11px] font-black uppercase tracking-tight" style={{ color: dark ? '#fff' : '#000' }}>
                  {brand.appName || 'Zenith'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom CSS ─────────────────────────────────────────────────── */}
      <div className={card(dark) + ' space-y-4'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <Code2 size={15} className="text-z-active-text" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider">CSS Override</h3>
              <p className={label + ' mt-0.5 mb-0'}>Global stylesheet injection</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-z-active-text border border-z-accent/20 bg-z-accent/10 px-2 py-1">Live</span>
        </div>
        <textarea
          value={settings.customCSS}
          onChange={e => { setSettings({ ...settings, customCSS: e.target.value }); setBrand({ customCSS: e.target.value }) }}
          rows={10}
          spellCheck={false}
          className={cn('w-full border py-4 px-5 text-sm font-mono outline-none transition-all focus:ring-1 focus:ring-z-active-border resize-none',
            dark ? 'bg-black/80 border-z-border text-gray-300' : 'bg-z-input border-z-border text-gray-800')}
          placeholder={`:root {\n  /* Override brand accent */\n  --brand-accent: var(--z-accent);\n}\n\n/* Custom panel styles */\n.my-panel {\n  backdrop-filter: blur(12px);\n}`}
        />
      </div>
    </div>
  )
}
