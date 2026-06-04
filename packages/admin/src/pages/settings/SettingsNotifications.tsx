import React from 'react'
import { Zap, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface SettingsNotificationsProps {
  settings: {
    smtpHost: string
    smtpUser: string
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
  testingSmtp: boolean
  setTestingSmtp: (v: boolean) => void
}

const SettingsNotifications: React.FC<SettingsNotificationsProps> = ({
  settings, setSettings, theme, testingSmtp, setTestingSmtp,
}) => {
  const handleTestSmtp = async () => {
    setTestingSmtp(true)
    try {
      const res = await api.post('/system/smtp/test', settings)
      toast.success(res.data.data.handshake === 'OK' ? 'SMTP connected' : 'Relay verified')
    } catch {
      toast.error('SMTP connection failed')
    } finally {
      setTestingSmtp(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          SMTP Relay Host
        </label>
        <input
          type="text"
          value={settings.smtpHost}
          onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
          placeholder="smtp.relay.net"
        />
      </div>
      
      <div
        className={cn(
          'p-5 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-100 hover:border-emerald-500/30'
        )}
      >
        <label className="text-xs font-semibold text-gray-400 px-1">
          SMTP User
        </label>
        <input
          type="text"
          value={settings.smtpUser}
          onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-[#0f141f] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
              : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
          )}
        />
      </div>

      <div className="col-span-full pt-4">
        <button
          onClick={handleTestSmtp}
          disabled={testingSmtp}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-none text-xs font-bold transition-all active:scale-95 border',
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-gray-900 text-white border-transparent hover:bg-gray-800'
          )}
        >
          {testingSmtp ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
          Test Connection
        </button>
      </div>
    </>
  )
}

export default SettingsNotifications
