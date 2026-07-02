import React, { useState, useEffect, useCallback } from 'react'
import {
  Mail, Send, Eye, EyeOff, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, Info, Zap, Lock, Server, Clock, Shield
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface SettingsNotificationsProps {
  settings: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPass: string
    fromEmail: string
    smtpSecure?: boolean
    smtpFromName?: string
    emailSubjectPrefix?: string
    [key: string]: any
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
  testingSmtp: boolean
  setTestingSmtp: (v: boolean) => void
}

const SMTP_PROVIDERS = [
  { id: 'custom', label: 'Custom SMTP', host: '', port: 587 },
  { id: 'gmail', label: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { id: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587 },
  { id: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587 },
  { id: 'ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587 },
  { id: 'outlook', label: 'Outlook / Office365', host: 'smtp.office365.com', port: 587 },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.com', port: 587 },
  { id: 'postmark', label: 'Postmark', host: 'smtp.postmarkapp.com', port: 587 },
  { id: 'resend', label: 'Resend', host: 'smtp.resend.com', port: 587 },
]

const SettingsNotifications: React.FC<SettingsNotificationsProps> = ({
  settings, setSettings, theme, testingSmtp, setTestingSmtp,
}) => {
  const dark = theme === 'dark'
  const [showPass, setShowPass] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('custom')
  const [testEmail, setTestEmail] = useState('')
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [lastTestResult, setLastTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handlePresetSelect = (providerId: string) => {
    const preset = SMTP_PROVIDERS.find(p => p.id === providerId)
    if (!preset) return
    setSelectedProvider(providerId)
    if (preset.host) {
      setSettings({ ...settings, smtpHost: preset.host, smtpPort: preset.port })
    }
  }

  const handleTestSmtp = async () => {
    setTestingSmtp(true)
    setLastTestResult(null)
    try {
      const res = await api.post('/system/smtp/test', {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        resendKey: settings.resendKey,
        fromEmail: settings.fromEmail,
        smtpSecure: settings.smtpSecure,
      })
      setLastTestResult({ ok: true, msg: res.data?.message || 'Connection successful' })
      toast.success(res.data?.message || 'SMTP connected successfully')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'SMTP connection failed'
      setLastTestResult({ ok: false, msg })
      toast.error('SMTP connection failed')
    } finally {
      setTestingSmtp(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) return toast.error('Enter a recipient email')
    setSendingTest(true)
    try {
      await api.post('/system/smtp/send-test', {
        to: testEmail,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        resendKey: settings.resendKey,
        fromEmail: settings.fromEmail,
      })
      toast.success(`Test email sent to ${testEmail}`)
      setTestEmailOpen(false)
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const card = cn(
    'p-5 border rounded-none transition-all',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' : 'bg-[var(--z-bg-input)]/50 border-z-border shadow-sm'
  )

  const inp = cn(
    'w-full border rounded-none py-2.5 px-4 text-sm outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-app/80 border-z-border text-z-primary placeholder:text-z-primary' : 'bg-z-panel border-z-border'
  )

  const portMode = settings.smtpPort === 465 ? 'SSL' : settings.smtpPort === 587 ? 'TLS/STARTTLS' : 'Custom'

  return (
    <div className="space-y-5">
      {/* Provider Presets */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-z-secondary px-1">Quick Configure</p>
        <div className="flex flex-wrap gap-2">
          {SMTP_PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetSelect(p.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-semibold   border transition-all',
                selectedProvider === p.id
                  ? dark ? 'bg-z-accent/20 border-z-active-border text-z-active-text' : 'bg-z-active-bg border-z-active-border text-z-accent'
                  : dark ? 'bg-z-hover border-z-border text-z-secondary hover:text-z-secondary' : 'bg-z-input border-z-border text-z-secondary'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Host */}
        <div className={cn(card, 'space-y-2')}>
          <label className="text-sm font-semibold text-z-secondary">SMTP Relay Host</label>
          <div className="flex items-center gap-2">
            <Server size={12} className="text-z-secondary shrink-0" />
            <input type="text" value={settings.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} className={inp} placeholder="smtp.example.com" />
          </div>
        </div>

        {/* Port + TLS */}
        <div className={cn(card, 'space-y-2')}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-z-secondary">Port & Encryption</label>
            <span className={cn('text-sm font-semibold   px-2 py-0.5 border', portMode === 'SSL' ? 'text-z-active-text border-z-active-border bg-z-active-bg' : portMode === 'TLS/STARTTLS' ? 'text-z-active-text border-z-accent/30 bg-z-accent/10' : 'text-z-secondary border-z-border bg-z-hover')}>{portMode}</span>
          </div>
          <div className="flex gap-2">
            {[25, 465, 587, 2525].map(p => (
              <button key={p} onClick={() => setSettings({ ...settings, smtpPort: p })}
                className={cn('px-3 py-2 text-sm font-semibold border transition-all', settings.smtpPort === p ? dark ? 'bg-z-accent/20 border-z-active-border text-z-active-text' : 'bg-z-active-bg border-z-active-border text-z-accent' : dark ? 'bg-z-hover border-z-border text-z-secondary' : 'bg-z-input border-z-border text-z-secondary')}>
                {p}
              </button>
            ))}
            <input type="number" value={settings.smtpPort || 587} onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })} className={cn(inp, 'max-w-20')} />
          </div>
        </div>

        {/* User */}
        <div className={cn(card, 'space-y-2')}>
          <label className="text-sm font-semibold text-z-secondary">SMTP Username</label>
          <input type="text" value={settings.smtpUser || ''} onChange={e => setSettings({ ...settings, smtpUser: e.target.value })} className={inp} placeholder="user@example.com" />
        </div>

        {/* Password */}
        <div className={cn(card, 'space-y-2')}>
          <label className="text-sm font-semibold text-z-secondary">SMTP Password</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={settings.smtpPass || ''} onChange={e => setSettings({ ...settings, smtpPass: e.target.value })} className={cn(inp, 'pr-10')} placeholder="••••••••" />
            <button onClick={() => setShowPass(!showPass)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-z-secondary hover:text-z-secondary transition-colors">
              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Resend API Key */}
        <div className={cn(card, 'space-y-2 md:col-span-2 mt-4')}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-z-accent" />
            <label className="text-sm font-semibold text-z-primary">Resend Integration</label>
          </div>
          <p className="text-xs text-z-secondary mb-2">If provided, Zenith will use Resend instead of custom SMTP.</p>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={settings.resendKey || ''} onChange={e => setSettings({ ...settings, resendKey: e.target.value })} className={cn(inp, 'pr-10')} placeholder="re_123456789" />
            <button onClick={() => setShowPass(!showPass)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-z-secondary hover:text-z-secondary transition-colors">
              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* From Email */}
        <div className={cn(card, 'space-y-2')}>
          <label className="text-sm font-semibold text-z-secondary">From Email Address</label>
          <input type="email" value={settings.fromEmail || ''} onChange={e => setSettings({ ...settings, fromEmail: e.target.value })} className={inp} placeholder="noreply@yoursite.com" />
        </div>

        {/* From Name */}
        <div className={cn(card, 'space-y-2')}>
          <label className="text-sm font-semibold text-z-secondary">From Display Name</label>
          <input type="text" value={settings.smtpFromName || ''} onChange={e => setSettings({ ...settings, smtpFromName: e.target.value })} className={inp} placeholder="Zenith CMS" />
        </div>
      </div>

      {/* Subject Prefix */}
      <div className={cn(card, 'space-y-2')}>
        <label className="text-sm font-semibold text-z-secondary">Email Subject Prefix (optional)</label>
        <input type="text" value={settings.emailSubjectPrefix || ''} onChange={e => setSettings({ ...settings, emailSubjectPrefix: e.target.value })} className={inp} placeholder="[MyApp] " />
        <p className="text-sm text-z-secondary">Prepended to all outgoing email subjects, e.g. "[Zenith] Password Reset"</p>
      </div>

      {/* SSL Toggle */}
      <div className={cn('flex items-center justify-between p-4 border', 'bg-z-panel border-z-border')}>
        <div>
          <p className={cn('text-sm font-semibold  ', dark ? 'text-z-primary' : 'text-z-primary')}>Force SSL/TLS</p>
          <p className="text-sm text-z-secondary mt-0.5">Use implicit TLS (port 465). Disable for STARTTLS (port 587)</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={!!settings.smtpSecure} onChange={e => setSettings({ ...settings, smtpSecure: e.target.checked, smtpPort: e.target.checked ? 465 : 587 })} className="sr-only peer" />
          <div className={cn("w-11 h-6 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-z-panel after:rounded-none after:h-5 after:w-5 after:transition-all border shadow-inner", 'bg-z-input peer-checked:bg-z-accent border-z-border')}></div>
        </label>
      </div>

      {/* Test Result */}
      {lastTestResult && (
        <div className={cn('flex items-center gap-3 p-4 border', lastTestResult.ok ? dark ? 'bg-z-accent/5 border-z-accent/20' : 'bg-z-active-bg border-z-active-border' : dark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200')}>
          {lastTestResult.ok ? <CheckCircle2 size={14} className="text-z-active-text shrink-0" /> : <AlertTriangle size={14} className="text-red-400 shrink-0" />}
          <p className={cn('text-sm font-semibold  ', lastTestResult.ok ? 'text-z-active-text' : 'text-red-400')}>{lastTestResult.msg}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleTestSmtp}
          disabled={testingSmtp}
          className={cn('flex items-center gap-2 px-6 py-3 text-sm font-semibold   border transition-all active:scale-95',
            dark ? 'bg-z-accent border-transparent text-z-primary hover:opacity-90 shadow-sm' : 'bg-z-accent text-z-primary border-transparent hover:brightness-110')}
        >
          {testingSmtp ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          Test Connection
        </button>
        <button
          onClick={() => setTestEmailOpen(!testEmailOpen)}
          className={cn('flex items-center gap-2 px-4 py-3 text-sm font-semibold   border transition-all',
            dark ? 'border-z-border text-z-muted hover:text-z-primary' : 'border-z-border text-z-secondary')}
        >
          <Send size={12} />
          Send Test Email
        </button>
      </div>

      {/* Test Email Inline Form */}
      {testEmailOpen && (
        <div className={cn('p-4 border space-y-3', dark ? 'bg-z-panel border-z-border' : 'bg-z-input border-z-border')}>
          <label className="text-sm font-semibold text-z-secondary">Test Recipient Email</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(inp, 'flex-1')}
              onKeyDown={e => e.key === 'Enter' && handleSendTestEmail()}
            />
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTest || !testEmail.trim()}
              className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-semibold  border transition-all disabled:opacity-40',
                dark ? 'bg-z-accent text-z-logo-text border-transparent hover:opacity-90' : 'bg-z-accent text-z-primary border-transparent hover:brightness-110')}
            >
              {sendingTest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send
            </button>
          </div>
          <p className="text-sm text-z-secondary">A sample email will be sent using the SMTP settings above.</p>
        </div>
      )}
    </div>
  )
}

export default SettingsNotifications
