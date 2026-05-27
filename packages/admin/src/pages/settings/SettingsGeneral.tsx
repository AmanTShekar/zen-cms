import React from 'react'
import { cn } from '../../lib/utils'

interface SettingsGeneralProps {
  settings: {
    siteName: string
    publicUrl: string
    maintenanceMode: boolean
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ settings, setSettings, theme }) => {
  return (
    <>
      <div
        className={cn(
          'p-4 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
          Application Name
        </label>
        <input
          type="text"
          value={settings.siteName}
          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
          className={cn(
            'w-full border rounded-none py-3 px-4 text-[14px] font-black italic transition-all outline-none',
            theme === 'dark'
              ? 'bg-black border-white/10 text-white focus:border-emerald-500'
              : 'bg-white border-gray-200 focus:border-emerald-500'
          )}
        />
      </div>
      <div
        className={cn(
          'p-4 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
          Public Endpoint
        </label>
        <input
          type="text"
          value={settings.publicUrl}
          onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })}
          className={cn(
            'w-full border rounded-none py-3 px-4 text-[14px] font-black italic transition-all outline-none',
            theme === 'dark'
              ? 'bg-black border-white/10 text-white focus:border-emerald-500'
              : 'bg-white border-gray-200 focus:border-emerald-500'
          )}
        />
      </div>
      <div
        className={cn(
          'col-span-1 md:col-span-2 p-6 rounded-none border flex items-center justify-between transition-all group',
          theme === 'dark'
            ? 'bg-white/[0.01] border-white/5 hover:border-emerald-500/20'
            : 'bg-white border-gray-100'
        )}
      >
        <div className="flex flex-col">
          <span className="text-[12px] font-black uppercase italic leading-none">
            Maintenance Protocol
          </span>
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1.5">
            Restrict public access to system kernel
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-none after:h-4 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner border border-white/5"></div>
        </label>
      </div>
    </>
  )
}

export default SettingsGeneral
