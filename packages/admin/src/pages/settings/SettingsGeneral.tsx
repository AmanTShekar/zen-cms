import React, { useState, useEffect, useCallback } from 'react'
import {
  Globe, Palette, Upload, Image, Check, Copy, Link2, MapPin,
  Clock, Mail, Loader2, Eye, ExternalLink, Calendar, Tag
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

// IANA Timezone list — abbreviated
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Honolulu', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Stockholm', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Prague',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Seoul', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Karachi', 'Asia/Tehran',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
]

const LOCALES = [
  { value: 'en', label: 'English (en)' },
  { value: 'en-US', label: 'English US (en-US)' },
  { value: 'en-GB', label: 'English UK (en-GB)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'de', label: 'German (de)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'it', label: 'Italian (it)' },
  { value: 'pt', label: 'Portuguese (pt)' },
  { value: 'ar', label: 'Arabic (ar)' },
  { value: 'zh', label: 'Chinese (zh)' },
  { value: 'ja', label: 'Japanese (ja)' },
  { value: 'ko', label: 'Korean (ko)' },
  { value: 'hi', label: 'Hindi (hi)' },
  { value: 'ru', label: 'Russian (ru)' },
  { value: 'nl', label: 'Dutch (nl)' },
  { value: 'pl', label: 'Polish (pl)' },
  { value: 'tr', label: 'Turkish (tr)' },
]

interface SettingsGeneralProps {
  settings: {
    siteName: string
    siteDescription: string
    logoUrl: string
    faviconUrl: string
    publicUrl: string
    defaultLocale: string
    supportedLocales: string[]
    maintenanceMode: boolean
    timezone?: string
    supportEmail?: string
    dateFormat?: string
    ogImageUrl?: string
    [key: string]: any
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ settings, setSettings, theme }) => {
  const dark = theme === 'dark'
  const [copied, setCopied] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingOg, setUploadingOg] = useState(false)

  const activeSiteId = localStorage.getItem('activeSiteId') || ''
  const activeSiteName = localStorage.getItem('activeSiteName') || 'Unknown Site'

  const handleCopy = () => {
    if (!activeSiteId) return
    navigator.clipboard.writeText(activeSiteId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleImageUpload = async (
    file: File,
    field: 'logoUrl' | 'faviconUrl' | 'ogImageUrl',
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data?.data?.url || res.data?.url
      if (url) {
        setSettings({ ...settings, [field]: url })
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const card = cn(
    'p-5 border rounded-none transition-all space-y-3',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-[var(--z-active-glow)]' : 'bg-gray-50/50 border-z-border shadow-sm'
  )

  const inp = cn(
    'w-full border rounded-none py-2.5 px-4 text-sm transition-all outline-none focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-black/80 border-z-border text-white placeholder:text-gray-700' : 'bg-z-panel border-z-border'
  )

  const ImageUploadField = ({
    field, label, value, uploading, setUploading
  }: { field: 'logoUrl' | 'faviconUrl' | 'ogImageUrl'; label: string; value: string; uploading: boolean; setUploading: (v: boolean) => void }) => (
    <div className={card}>
      <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className={cn('w-16 h-16 flex-shrink-0 border flex items-center justify-center overflow-hidden', dark ? 'bg-black/80 border-z-border' : 'bg-gray-100 border-z-border')}>
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" onError={e => { (e.target as any).style.display = 'none' }} />
          ) : (
            <Image size={20} className="text-gray-600" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="url"
            value={value || ''}
            onChange={e => setSettings({ ...settings, [field]: e.target.value })}
            placeholder="https://..."
            className={inp}
          />
          <label className={cn('flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-widest border px-3 py-2 w-fit transition-all', dark ? 'border-white/10 text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:text-gray-800')}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Upload File
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file, field, setUploading)
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Site ID Banner */}
      <div className={cn('p-5 border space-y-3', dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-[var(--z-active-glow)]' : 'bg-z-input border-z-border')}>
        <div className="flex items-center gap-2">
          <Link2 size={12} className="text-z-secondary" />
          <span className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Site Identifier</span>
          <span className="ml-auto text-[7px] text-gray-600 uppercase tracking-widest">{activeSiteName}</span>
        </div>
        <div className="flex items-center gap-3">
          <code className={cn('flex-1 font-mono text-sm px-3 py-2 border truncate', dark ? 'bg-black/80 border-z-border text-z-active-text' : 'bg-z-panel border-z-border text-gray-700')}>
            {activeSiteId || <span className="opacity-40">No site selected</span>}
          </code>
          <button
            onClick={handleCopy}
            disabled={!activeSiteId}
            className={cn('flex items-center gap-2 px-4 py-2 text-xs font-bold border transition-all', activeSiteId
              ? dark ? 'bg-z-accent hover:opacity-90 text-white border-transparent shadow-[var(--z-active-glow)]' : 'bg-gray-800 text-white border-transparent hover:bg-gray-700'
              : 'bg-z-hover text-z-secondary cursor-not-allowed border-white/5')}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className={cn('text-[8px] leading-relaxed', dark ? 'text-z-secondary' : 'text-z-secondary')}>
          Use this as <code className="px-1 py-0.5 bg-white/10">VITE_CMS_SITE_ID</code> in template <code className="px-1 py-0.5 bg-white/10">.env</code> files to connect storefronts to this site.
        </p>
      </div>

      {/* Core Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={card}>
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Application Name</label>
          <input type="text" value={settings.siteName || ''} onChange={e => setSettings({ ...settings, siteName: e.target.value })} className={inp} placeholder="My CMS" />
        </div>
        <div className={card}>
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Support Email</label>
          <input type="email" value={settings.supportEmail || ''} onChange={e => setSettings({ ...settings, supportEmail: e.target.value })} className={inp} placeholder="support@company.com" />
        </div>
      </div>

      <div className={card}>
        <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Site Description</label>
        <textarea value={settings.siteDescription || ''} onChange={e => setSettings({ ...settings, siteDescription: e.target.value })} rows={3} className={cn(inp, 'resize-none')} placeholder="A short description of your platform..." />
      </div>

      <div className={card}>
        <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Public API Endpoint</label>
        <input type="url" value={settings.publicUrl || ''} onChange={e => setSettings({ ...settings, publicUrl: e.target.value })} className={inp} placeholder="https://api.yoursite.com" />
        <p className="text-[8px] text-gray-600">The publicly-accessible URL where your CMS API is hosted.</p>
      </div>

      {/* Media Branding */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary px-1">Branding Assets</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ImageUploadField field="logoUrl" label="Site Logo" value={settings.logoUrl} uploading={uploadingLogo} setUploading={setUploadingLogo} />
          <ImageUploadField field="faviconUrl" label="Favicon" value={settings.faviconUrl} uploading={uploadingFavicon} setUploading={setUploadingFavicon} />
          <ImageUploadField field="ogImageUrl" label="OG Share Image" value={settings.ogImageUrl || ''} uploading={uploadingOg} setUploading={setUploadingOg} />
        </div>
      </div>

      {/* Localization */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary px-1">Localization</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={card}>
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Default Locale</label>
            <select value={settings.defaultLocale || 'en'} onChange={e => setSettings({ ...settings, defaultLocale: e.target.value })} className={inp}>
              {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className={card}>
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Timezone</label>
            <select value={settings.timezone || 'UTC'} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className={inp}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className={card}>
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Date Format</label>
            <select value={settings.dateFormat || 'MM/DD/YYYY'} onChange={e => setSettings({ ...settings, dateFormat: e.target.value })} className={inp}>
              {['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMMM D, YYYY', 'D MMMM YYYY'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className={cn('p-5 border flex items-center justify-between transition-all group', dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-[var(--z-active-glow)] hover:border-red-500/30' : 'bg-gray-50/50 border-z-border shadow-sm')}>
        <div>
          <span className={cn('text-[11px] font-black uppercase tracking-wider', dark ? 'text-gray-200' : 'text-gray-800')}>Maintenance Protocol</span>
          <p className="text-[9px] text-z-secondary mt-1">Restrict public access to the system while active. Admins can still log in.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })} className="sr-only peer" />
          <div className={cn("w-11 h-6 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all border shadow-inner", dark ? 'bg-black/80 peer-checked:bg-red-600 border-z-border' : 'bg-gray-200 peer-checked:bg-red-500')}></div>
        </label>
      </div>
    </div>
  )
}

export default SettingsGeneral
