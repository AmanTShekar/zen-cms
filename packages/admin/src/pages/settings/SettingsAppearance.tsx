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
    <div className="col-span-full space-y-6">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">
          CSS Protocol Override
        </label>
        <span className="text-[8px] font-black text-indigo-500 italic uppercase">
          Global Stylesheet
        </span>
      </div>
      <div className="relative group">
        <div className="absolute top-4 left-6 flex flex-col gap-1.5 opacity-20">
          <div className="w-6 h-0.5 bg-indigo-500"></div>
          <div className="w-4 h-0.5 bg-indigo-500"></div>
        </div>
        <textarea
          value={settings.customCSS}
          onChange={(e) => setSettings({ ...settings, customCSS: e.target.value })}
          rows={16}
          className={cn(
            'w-full border rounded-none py-8 pl-16 pr-8 text-[13px] font-mono font-black italic focus:ring-8 transition-all outline-none resize-none no-scrollbar',
            theme === 'dark'
              ? 'bg-black border-white/5 text-indigo-100 focus:ring-indigo-500/5 focus:border-indigo-500/20'
              : 'bg-gray-50 border-gray-100 shadow-inner'
          )}
          placeholder="/* Inject custom CSS protocols here... */"
        />
      </div>
    </div>
  )
}

export default SettingsAppearance
