import React, { useState, useEffect } from 'react'
import {
  Shield, ShieldCheck, ShieldAlert, Loader2, AlertTriangle, Globe,
  Lock, Clock, Users, Wifi, Eye, EyeOff, XCircle, Trash2, RefreshCw,
  Info, CheckCircle2, Server, Activity
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useShallow } from 'zustand/react/shallow'

interface SettingsSecurityProps {
  settings: {
    jwtExpiresIn: string
    passwordMinLength: number
    allowRegistration: boolean
    rateLimitWindow?: number
    rateLimitMax?: number
    [key: string]: any
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

interface Session {
  id: string
  userId: string
  ipAddress: string
  userAgent: string
  createdAt: string
  lastActivityAt?: string
  current?: boolean
}

const SettingsSecurity: React.FC<SettingsSecurityProps> = ({ settings, setSettings, theme }) => {
  const dark = theme === 'dark'
  const { user } = useAuthStore(useShallow(state => ({ user: state.user })))
  const [setupState, setSetupState] = useState<'idle' | 'loading' | 'qrcode'>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(user?.twoFactorEnabled || false)
  const [showCorsInput, setShowCorsInput] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  const fetchSessions = async () => {
    setSessionsLoading(true)
    try {
      const res = await api.get('/auth/sessions')
      const data = res.data?.data || res.data
      setSessions(Array.isArray(data) ? data : [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => { fetchSessions() }, [])

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

  const handleRevokeSession = async (id: string) => {
    setRevokingSessionId(id)
    try {
      await api.delete(`/auth/sessions/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Session revoked')
    } catch {
      toast.error('Failed to revoke session')
    } finally {
      setRevokingSessionId(null)
    }
  }

  const card = cn(
    'p-5 border rounded-none transition-all space-y-3',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' : 'bg-gray-50/50 border-z-border shadow-sm'
  )

  const inp = cn(
    'w-full border rounded-none py-2.5 px-4 text-sm font-mono outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-black/80 border-z-border text-white placeholder:text-gray-700' : 'bg-z-panel border-z-border'
  )

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className={cn("w-11 h-6 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all border shadow-inner", dark ? 'bg-black/80 peer-checked:bg-z-accent border-z-border' : 'bg-gray-200 peer-checked:bg-z-accent')}></div>
    </label>
  )

  return (
    <div className="space-y-5">
      {/* Authentication Controls */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-z-secondary px-1">Authentication</p>
        <div className={cn('border rounded-none divide-y', dark ? 'border-z-border divide-white/[0.06]' : 'border-z-border divide-gray-100')}>
          {/* Open Registration */}
          <div className={cn('flex items-center justify-between p-5', dark ? 'bg-z-panel backdrop-blur-md' : 'bg-white')}>
            <div>
              <p className={cn('text-sm font-semibold  ', dark ? 'text-gray-200' : 'text-gray-800')}>Open Registration</p>
              <p className="text-sm text-z-secondary mt-1">Allow anyone to sign up. When off, users must be explicitly invited.</p>
            </div>
            <Toggle checked={settings.allowRegistration} onChange={v => setSettings({ ...settings, allowRegistration: v })} />
          </div>
          {/* Token Lifetime */}
          <div className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-z-secondary" />
              <label className={cn('text-sm font-semibold  ', dark ? 'text-gray-200' : 'text-gray-800')}>Session Token Lifetime</label>
            </div>
            <div className="flex gap-2">
              {['1h', '12h', '24h', '7d', '30d'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setSettings({ ...settings, jwtExpiresIn: opt })}
                  className={cn('px-3 py-2 text-sm font-semibold border transition-all', settings.jwtExpiresIn === opt
                    ? dark ? 'bg-z-accent/20 border-z-active-border text-z-active-text' : 'bg-z-active-bg border-z-active-border text-z-accent'
                    : dark ? 'bg-z-hover border-white/10 text-z-secondary hover:text-gray-300' : 'bg-z-input border-z-border text-z-secondary'
                  )}
                >
                  {opt}
                </button>
              ))}
              <input
                type="text"
                value={settings.jwtExpiresIn}
                onChange={e => setSettings({ ...settings, jwtExpiresIn: e.target.value })}
                placeholder="Custom (e.g. 2d)"
                className={cn(inp, 'max-w-32 py-2')}
              />
            </div>
            <p className="text-sm text-gray-600">Format: 1h, 7d, 30m etc. Tokens will expire after this duration.</p>
          </div>
          {/* Password Policy */}
          <div className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-z-secondary" />
              <label className={cn('text-sm font-semibold  ', dark ? 'text-gray-200' : 'text-gray-800')}>Minimum Password Length</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={6} max={32}
                value={settings.passwordMinLength || 8}
                onChange={e => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                className="flex-1 accent-z-accent"
              />
              <span className={cn('text-lg font-semibold min-w-[3ch] text-right', dark ? 'text-z-active-text' : 'text-z-accent')}>
                {settings.passwordMinLength || 8}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-z-secondary px-1">Rate Limiting</p>
        <div className={cn('border rounded-none', 'z-panel')}>
          <div className="grid grid-cols-2 gap-4 p-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-z-secondary">Window (minutes)</label>
              <input
                type="number"
                value={settings.rateLimitWindow || 15}
                onChange={e => setSettings({ ...settings, rateLimitWindow: parseInt(e.target.value) || 15 })}
                className={inp}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-z-secondary">Max Requests / Window</label>
              <input
                type="number"
                value={settings.rateLimitMax || 100}
                onChange={e => setSettings({ ...settings, rateLimitMax: parseInt(e.target.value) || 100 })}
                className={inp}
                placeholder="100"
              />
            </div>
          </div>
          <div className={cn('px-5 pb-4 text-sm text-z-secondary flex items-center gap-2 border-t', dark ? 'border-z-border' : 'border-z-border')}>
            <Info size={11} className="text-z-active-text mt-0.5 shrink-0" />
            <p className="mt-3">Requests exceeding {settings.rateLimitMax || 100} per {settings.rateLimitWindow || 15} minutes will receive a 429 Too Many Requests error. Applies per IP address.</p>
          </div>
        </div>
      </div>

      {/* CORS Origins */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-z-secondary px-1">CORS & Origins</p>
        <div className={cn(card)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-z-secondary" />
              <label className={cn('text-sm font-semibold  ', dark ? 'text-gray-200' : 'text-gray-800')}>Allowed Origins</label>
            </div>
            <button onClick={() => setShowCorsInput(!showCorsInput)} className="text-sm text-z-active-text hover:text-z-active-text font-semibold">
              {showCorsInput ? 'Collapse' : 'Configure'}
            </button>
          </div>
          {showCorsInput && (
            <div className="space-y-2 pt-2">
              <textarea
                value={(settings.corsOrigins || []).join('\n')}
                onChange={e => setSettings({ ...settings, corsOrigins: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })}
                rows={4}
                placeholder={'https://yoursite.com\nhttps://app.yoursite.com\nhttp://localhost:3000'}
                className={cn(inp, 'resize-none font-mono')}
              />
              <p className="text-sm text-gray-600">One origin per line. Use * to allow all (not recommended in production).</p>
            </div>
          )}
        </div>
      </div>

      {/* 2FA */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-z-secondary px-1">Two-Factor Authentication</p>
        <div className={cn('border rounded-none p-6 space-y-6', dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' : 'bg-z-panel border-z-border')}>
          <div className="flex items-center gap-4">
            <div className={cn('p-3', dark ? 'bg-z-accent/20 text-z-active-text' : 'bg-z-active-bg text-z-accent')}>
              {enabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <h3 className={cn('text-sm font-semibold  ', dark ? 'text-white' : 'text-z-primary')}>Two-Factor Authentication (TOTP)</h3>
              <p className="text-sm text-z-secondary mt-1">Secure your admin account with an authenticator app (Google Authenticator, Authy, 1Password)</p>
            </div>
          </div>

          {enabled ? (
            <div className={cn('flex items-center gap-2 text-sm font-semibold  ', dark ? 'text-z-active-text' : 'text-z-accent')}>
              <ShieldCheck size={16} /> 2FA is Active on your account
            </div>
          ) : setupState === 'idle' ? (
            <button
              onClick={handleSetup}
              className={cn('px-6 py-3 text-white text-sm font-semibold   border transition-all',
                dark ? 'bg-z-accent border-transparent hover:opacity-90 shadow-sm' : 'bg-gray-900 border-transparent hover:bg-gray-800')}
            >
              Enable 2FA
            </button>
          ) : setupState === 'loading' ? (
            <Loader2 className={cn('animate-spin', dark ? 'text-z-active-text' : 'text-gray-600')} size={24} />
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className={cn('text-sm font-semibold  ', dark ? 'text-z-muted' : 'text-gray-600')}>1. Scan this QR code with your authenticator app</p>
                {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border-4 border-white rounded-none" />}
              </div>
              <div className="space-y-2">
                <p className={cn('text-sm font-semibold  ', dark ? 'text-z-muted' : 'text-gray-600')}>2. Enter the 6-digit code to verify</p>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={token}
                    onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                    className={cn(inp, 'max-w-[140px] text-center text-2xl  font-mono')}
                  />
                  <button
                    onClick={handleVerify}
                    disabled={token.length !== 6 || verifying}
                    className={cn('px-6 py-3 disabled:opacity-50 text-white text-sm font-semibold   border flex items-center gap-2',
                      dark ? 'bg-z-accent border-transparent hover:opacity-90' : 'bg-gray-900 border-transparent hover:bg-gray-800')}
                  >
                    {verifying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Verify & Enable
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-z-secondary">Active Sessions</p>
          <button onClick={fetchSessions} className="text-sm text-z-active-text hover:text-z-active-text font-semibold flex items-center gap-1">
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
        <div className={cn('border rounded-none overflow-hidden', 'z-panel')}>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-z-active-text animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600">No active session data available</p>
              <p className="text-sm text-gray-700 mt-1">Sessions are tracked automatically on login</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
              {sessions.map(session => (
                <div key={session.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={cn('w-8 h-8 flex items-center justify-center flex-shrink-0', dark ? 'bg-z-hover text-z-muted' : 'bg-gray-50 text-z-secondary')}>
                    <Server size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold   truncate', dark ? 'text-gray-200' : 'text-gray-800')}>
                      {session.ipAddress || 'Unknown IP'}
                      {session.current && <span className="ml-2 text-sm text-z-active-text font-semibold px-1.5 border border-z-active-border bg-z-active-bg">CURRENT</span>}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{session.userAgent || 'Unknown device'}</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {session.lastActivityAt ? `Active ${new Date(session.lastActivityAt).toLocaleString()}` : `Created ${new Date(session.createdAt).toLocaleString()}`}
                    </p>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Revoke session"
                    >
                      {revokingSessionId === session.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsSecurity
