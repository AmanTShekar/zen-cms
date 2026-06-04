import React from 'react'
import { cn } from '../../lib/utils'

interface SettingsAppearanceProps {
 settings: {
 customCSS: string
 }
 setSettings: (s: any) => void
 theme: 'light' | 'dark'
}

const SettingsAppearance: React.FC<SettingsAppearanceProps> = ({ settings, setSettings, theme }) => {
 return (
 <div className="col-span-full space-y-4">
 <div className="flex items-center justify-between px-1">
 <label className="text-xs font-semibold text-gray-400">
 CSS Protocol Override
 </label>
 <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-none">
 Global Stylesheet
 </span>
 </div>
 <div className="relative group">
 <div className="absolute top-4 left-6 flex flex-col gap-1.5 opacity-30">
 <div className="w-4 h-0.5 bg-emerald-500 rounded-none"></div>
 <div className="w-2 h-0.5 bg-emerald-500 rounded-none"></div>
 </div>
 <textarea
 value={settings.customCSS}
 onChange={(e) => setSettings({ ...settings, customCSS: e.target.value })}
 rows={16}
 className={cn(
 'w-full border rounded-none py-6 pl-14 pr-6 text-sm font-mono font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black resize-none',
 theme === 'dark'
 ? 'bg-[#0f141f]/80 border-white/[0.08] text-emerald-50 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30 shadow-inner'
 : 'bg-gray-50 border-gray-200 shadow-inner focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30'
 )}
 placeholder="/* Inject custom CSS protocols here... */"
 />
 </div>
 </div>
 )
}

export default SettingsAppearance
