import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { Copy, Check, Link2 } from 'lucide-react'

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
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ settings, setSettings, theme }) => {
  const [copied, setCopied] = useState(false)

  // Read active site ID from localStorage (stored by SitePicker on site selection)
  const activeSiteId = localStorage.getItem('activeSiteId') || ''
  const activeSiteName = localStorage.getItem('activeSiteName') || 'Unknown Site'

  const handleCopy = () => {
    if (!activeSiteId) return
    navigator.clipboard.writeText(activeSiteId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* ── Site ID Banner ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'p-5 rounded-none border col-span-1 md:col-span-2 space-y-3',
          theme === 'dark'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-emerald-50 border-emerald-200'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={13} className="text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
            Site Identifier
          </span>
        </div>
        <div className="flex items-center gap-3">
          <code
            className={cn(
              'flex-1 font-mono text-sm px-3 py-2 rounded-none border truncate',
              theme === 'dark'
                ? 'bg-black/40 border-white/10 text-emerald-300'
                : 'bg-white border-emerald-200 text-emerald-700'
            )}
          >
            {activeSiteId || <span className="opacity-40 italic">No site selected — pick a site first</span>}
          </code>
          <button
            onClick={handleCopy}
            disabled={!activeSiteId}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-none text-xs font-bold transition-all',
              activeSiteId
                ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            )}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className={cn('text-xs leading-relaxed', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
          This is the <strong>VITE_CMS_SITE_ID</strong> for <strong>{activeSiteName}</strong>.
          Paste it into the <code className="px-1 py-0.5 rounded bg-white/10">.env</code> file of any
          Zenith template (storefront-glass, demo, blog-demo) to connect it to this site's content.
        </p>
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Application Name
        </label>
        <input
          type="text"
          value={settings.siteName}
          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Site Description
        </label>
        <textarea
          value={settings.siteDescription || ''}
          onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
          rows={3}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black resize-none',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Logo URL
        </label>
        <input
          type="text"
          value={settings.logoUrl || ''}
          placeholder="https://..."
          onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Favicon URL
        </label>
        <input
          type="text"
          value={settings.faviconUrl || ''}
          placeholder="https://..."
          onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Public Endpoint
        </label>
        <input
          type="text"
          value={settings.publicUrl}
          onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          Default Locale
        </label>
        <input
          type="text"
          value={settings.defaultLocale || 'en'}
          onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div
        className={cn(
          'p-5 rounded-none border flex items-center justify-between transition-all group col-span-1 md:col-span-2',
          theme === 'dark'
            ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20'
            : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            Maintenance Protocol
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Restrict public access to the system while active
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-white/10 shadow-inner"></div>
        </label>
      </div>
    </>
  )
}

export default SettingsGeneral
