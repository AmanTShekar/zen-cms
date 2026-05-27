import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface SettingsSecurityProps {
  settings: {
    jwtExpiresIn: string
    passwordMinLength: number
    allowRegistration: boolean
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsSecurity: React.FC<SettingsSecurityProps> = ({ settings, setSettings, theme }) => {
  const { user, checkAuth } = useAuthStore()
  const [setupState, setSetupState] = useState<'idle' | 'loading' | 'qrcode'>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(user?.twoFactorEnabled || false)

  const handleSetup = async () => {
    setSetupState('loading')
    try {
      const res = await api.post('/auth/2fa/setup')
      setQrCode(res.data.data.qrCodeImage)
      setSetupState('qrcode')
    } catch {
      toast.error('Failed to initiate 2FA setup')
      setSetupState('idle')
    }
  }

  const handleVerify = async () => {
    if (!token) return toast.error('Enter the 6-digit code')
    setVerifying(true)
    try {
      await api.post('/auth/2fa/verify-setup', { token })
      toast.success('2FA successfully enabled')
      setEnabled(true)
      setSetupState('idle')
    } catch {
      toast.error('Invalid token')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'p-4 rounded-none border transition-all space-y-3',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
            Open Registration
          </label>
          <button
            onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
            className={cn(
              'w-10 h-5 rounded-full relative transition-colors',
              settings.allowRegistration ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/10'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                settings.allowRegistration ? 'left-[22px]' : 'left-0.5'
              )}
            />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 italic px-1 mb-4">
          Allow anyone to sign up. When disabled, users must be explicitly invited by an admin.
        </p>

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
              ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/20'
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
              ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/20'
              : 'bg-gray-50 border-gray-100'
          )}
        />
      </div>
      <div
        className={cn(
          'p-6 rounded-none border transition-all space-y-6',
          theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50/50 border-gray-100'
        )}
      >
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500">
            {enabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] italic">Two-Factor Authentication (2FA)</h3>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest mt-1 uppercase">Enhance account security with an authenticator app.</p>
          </div>
        </div>

        {enabled ? (
          <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest italic flex items-center gap-2">
            <ShieldCheck size={16} /> 2FA is Active
          </div>
        ) : setupState === 'idle' ? (
          <button
            onClick={handleSetup}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg flex items-center gap-2"
          >
            Configure 2FA
          </button>
        ) : setupState === 'loading' ? (
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">1. Scan the QR code with your authenticator app.</p>
            {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border-4 border-white" />}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">2. Enter the 6-digit code below to verify.</p>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                className={cn(
                  'w-48 border rounded-none py-3 px-4 text-center text-xl font-mono transition-all outline-none tracking-widest',
                  theme === 'dark'
                    ? 'bg-black border-white/20 text-white focus:border-emerald-500'
                    : 'bg-white border-gray-300 focus:border-emerald-500'
                )}
              />
              <button
                onClick={handleVerify}
                disabled={token.length !== 6 || verifying}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                {verifying ? <Loader2 size={14} className="animate-spin" /> : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default SettingsSecurity
