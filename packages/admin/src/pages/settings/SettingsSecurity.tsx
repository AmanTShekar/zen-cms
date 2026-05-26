import React from 'react'
import { cn } from '../../lib/utils'

interface SettingsSecurityProps {
  settings: {
    jwtExpiresIn: string
    passwordMinLength: number
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsSecurity: React.FC<SettingsSecurityProps> = ({ settings, setSettings, theme }) => {
  return (
    <>
      <div
        className={cn(
          'p-4 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
          Token Lifetime
        </label>
        <input
          type="text"
          value={settings.jwtExpiresIn}
          onChange={(e) => setSettings({ ...settings, jwtExpiresIn: e.target.value })}
          className={cn(
            'w-full border rounded-none py-4 px-6 text-[12px] font-black italic transition-all outline-none',
            theme === 'dark'
              ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/20'
              : 'bg-gray-50 border-gray-100'
          )}
        />
      </div>
      <div
        className={cn(
          'p-4 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
          Min Password Length
        </label>
        <input
          type="number"
          value={settings.passwordMinLength}
          onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
          className={cn(
            'w-full border rounded-none py-4 px-6 text-[12px] font-black italic transition-all outline-none',
            theme === 'dark'
              ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/20'
              : 'bg-gray-50 border-gray-100'
          )}
        />
      </div>
    </>
  )
}

export default SettingsSecurity
