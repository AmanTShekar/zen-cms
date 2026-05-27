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
      <div className="space-y-3">
        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
          SMTP Relay Host
        </label>
        <input
          type="text"
          value={settings.smtpHost}
          onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
          className={cn(
            'w-full border rounded-none py-4 px-6 text-[12px] font-black italic focus:ring-4 transition-all outline-none',
            theme === 'dark'
              ? 'bg-white/5 border-white/5 text-white focus:ring-emerald-500/5 focus:border-emerald-500/20'
              : 'bg-gray-50 border-gray-100'
          )}
          placeholder="smtp.relay.net"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
          SMTP User
        </label>
        <input
          type="text"
          value={settings.smtpUser}
          onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
          className={cn(
            'w-full border rounded-none py-4 px-6 text-[12px] font-black italic focus:ring-4 transition-all outline-none',
            theme === 'dark'
              ? 'bg-white/5 border-white/5 text-white focus:ring-emerald-500/5 focus:border-emerald-500/20'
              : 'bg-gray-50 border-gray-100'
          )}
        />
      </div>
      <div className="col-span-full pt-4">
        <button
          onClick={handleTestSmtp}
          disabled={testingSmtp}
          className={cn(
            'flex items-center gap-3 px-8 py-4 rounded-none text-[10px] font-black uppercase tracking-widest italic border transition-all active:scale-95',
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-gray-900 text-white'
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
