import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert, Cookie, FileText, Scale, Globe, Mail,
  Database, Download, Trash2, Eye, EyeOff, Loader2,
  CheckCircle2, AlertTriangle, ExternalLink, Clock, Calendar,
  Lock, Shield, Info, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface ComplianceSettings {
  // GDPR / Privacy
  gdprEnabled: boolean
  ccpaEnabled: boolean
  cookieConsentEnabled: boolean
  cookieConsentCategories: string[]
  cookieExpiryDays: number
  // Policy URLs
  privacyPolicyUrl: string
  termsOfServiceUrl: string
  cookiePolicyUrl: string
  // Data Management
  dataRetentionDays: number
  autoDeleteExpiredData: boolean
  // Contact
  dpoEmail: string
  dpoName: string
  companyName: string
  companyAddress: string
  // Compliance Badges
  soc2Compliant: boolean
  iso27001Compliant: boolean
  hipaaCompliant: boolean
}

const DEFAULTS: ComplianceSettings = {
  gdprEnabled: false,
  ccpaEnabled: false,
  cookieConsentEnabled: false,
  cookieConsentCategories: ['necessary', 'analytics', 'marketing'],
  cookieExpiryDays: 365,
  privacyPolicyUrl: '',
  termsOfServiceUrl: '',
  cookiePolicyUrl: '',
  dataRetentionDays: 365,
  autoDeleteExpiredData: false,
  dpoEmail: '',
  dpoName: '',
  companyName: '',
  companyAddress: '',
  soc2Compliant: false,
  iso27001Compliant: false,
  hipaaCompliant: false,
}

const COOKIE_CATEGORIES = [
  { id: 'necessary', label: 'Necessary', desc: 'Required for the site to function. Cannot be disabled.', forced: true },
  { id: 'analytics', label: 'Analytics', desc: 'Help understand how visitors interact (Google Analytics, Plausible).' },
  { id: 'marketing', label: 'Marketing', desc: 'Used for advertising and retargeting (Facebook Pixel, Google Ads).' },
  { id: 'personalization', label: 'Personalization', desc: 'Remember user preferences and personalize the experience.' },
  { id: 'functional', label: 'Functional', desc: 'Enable additional features like live chat, videos, social media.' },
]

interface SettingsLegalProps {
  theme?: 'light' | 'dark'
}

export default function SettingsLegal({ theme = 'dark' }: SettingsLegalProps) {
  const dark = theme === 'dark'
  const [settings, setSettings] = useState<ComplianceSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const [dataRequests, setDataRequests] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string>('gdpr')

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/system/settings/compliance')
      if (res.data?.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }))
      }
    } catch {
      // Use defaults — backend may not have compliance endpoint yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/system/settings/compliance', settings)
      toast.success('Compliance settings saved')
    } catch (err: any) {
      // Also try saving via main settings endpoint
      try {
        await api.patch('/system/settings', { compliance: settings })
        toast.success('Compliance settings saved')
      } catch {
        toast.error('Failed to save compliance settings')
      }
    } finally {
      setSaving(false)
    }
  }

  const card = cn(
    'border rounded-none transition-all',
    dark
      ? 'bg-z-panel backdrop-blur-md border-z-border shadow-[var(--z-active-glow)]'
      : 'bg-z-panel border-z-border shadow-sm'
  )

  const inp = cn(
    'w-full border rounded-none py-2.5 px-4 text-[11px] font-mono outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-black/80 border-z-border text-white placeholder:text-gray-700' : 'bg-z-panel border-z-border text-z-primary'
  )

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className={cn("w-11 h-6 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-5 after:w-5 after:transition-all border shadow-inner", dark ? 'bg-black/80 peer-checked:bg-z-accent border-z-border' : 'bg-gray-200 peer-checked:bg-z-accent')}></div>
    </label>
  )

  const Section = ({ id, icon: Icon, title, desc, children }: { id: string; icon: any; title: string; desc: string; children: React.ReactNode }) => (
    <div className={card}>
      <button
        className="w-full flex items-center gap-4 p-5 text-left"
        onClick={() => setExpanded(expanded === id ? '' : id)}
      >
        <div className={cn('w-10 h-10 flex items-center justify-center border flex-shrink-0', dark ? 'bg-z-active-bg border-z-active-border text-z-active-text' : 'bg-z-active-bg border-z-active-border text-z-accent')}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-[11px] font-black uppercase tracking-wider', dark ? 'text-white' : 'text-z-primary')}>{title}</h3>
          <p className="text-[9px] text-z-secondary uppercase tracking-widest mt-0.5">{desc}</p>
        </div>
        {expanded === id ? <ChevronUp size={16} className="text-z-secondary" /> : <ChevronDown size={16} className="text-z-secondary" />}
      </button>
      {expanded === id && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  )

  const ToggleRow = ({
    label, desc, value, onChange, disabled = false
  }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <div className={cn('flex items-center justify-between p-4 border', dark ? 'bg-black/40 border-z-border' : 'bg-gray-50 border-z-border')}>
      <div>
        <p className={cn('text-[10px] font-black uppercase tracking-wider', dark ? 'text-gray-200' : 'text-gray-800')}>{label}</p>
        <p className="text-[8px] text-z-secondary uppercase tracking-widest mt-0.5">{desc}</p>
      </div>
      <Toggle checked={value} onChange={disabled ? () => {} : onChange} />
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-z-active-text animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Compliance Badges */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { key: 'gdprEnabled', label: 'GDPR', color: 'violet', icon: Shield },
          { key: 'ccpaEnabled', label: 'CCPA', color: 'blue', icon: Shield },
          { key: 'soc2Compliant', label: 'SOC 2', color: 'emerald', icon: CheckCircle2 },
          { key: 'iso27001Compliant', label: 'ISO 27001', color: 'amber', icon: Lock },
          { key: 'hipaaCompliant', label: 'HIPAA', color: 'pink', icon: Database },
          { key: 'cookieConsentEnabled', label: 'Cookie Consent', color: 'teal', icon: Cookie },
        ].map(({ key, label, color, icon: Icon }) => {
          const enabled = !!(settings as any)[key]
          return (
            <button
              key={key}
              onClick={() => setSettings(prev => ({ ...prev, [key]: !enabled }))}
              className={cn(
                'flex items-center gap-3 p-4 border text-left transition-all',
                enabled
                  ? dark ? `bg-${color}-500/10 border-${color}-500/30 shadow-[var(--z-active-glow)]` : `bg-${color}-50 border-${color}-200`
                  : dark ? 'bg-black/40 border-z-border hover:border-white/20' : 'bg-z-input border-z-border hover:border-z-border-strong'
              )}
            >
              <Icon size={16} className={enabled ? `text-${color}-400` : 'text-gray-600'} />
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider', enabled ? dark ? `text-${color}-300` : `text-${color}-700` : dark ? 'text-z-muted' : 'text-gray-600')}>{label}</p>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest">{enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* GDPR & Privacy */}
      <Section id="gdpr" icon={ShieldAlert} title="GDPR & Privacy Compliance" desc="EU/UK General Data Protection Regulation configuration">
        <ToggleRow
          label="GDPR Mode"
          desc="Enables GDPR-compliant data handling across all system modules"
          value={settings.gdprEnabled}
          onChange={v => setSettings(prev => ({ ...prev, gdprEnabled: v }))}
        />
        <ToggleRow
          label="CCPA Compliance"
          desc="California Consumer Privacy Act — enables opt-out of data sale"
          value={settings.ccpaEnabled}
          onChange={v => setSettings(prev => ({ ...prev, ccpaEnabled: v }))}
        />
        <ToggleRow
          label="Auto-Delete Expired Data"
          desc="Automatically purge user data beyond the retention period"
          value={settings.autoDeleteExpiredData}
          onChange={v => setSettings(prev => ({ ...prev, autoDeleteExpiredData: v }))}
        />
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Data Retention Period (days)</label>
          <input
            type="number"
            value={settings.dataRetentionDays}
            onChange={e => setSettings(prev => ({ ...prev, dataRetentionDays: parseInt(e.target.value) || 365 }))}
            className={inp}
            placeholder="365"
          />
          <p className="text-[8px] text-gray-600">User content and logs older than this will be eligible for deletion. Default: 365 days.</p>
        </div>
      </Section>

      {/* Cookie Consent */}
      <Section id="cookies" icon={Cookie} title="Cookie Consent & Tracking" desc="Banner configuration and cookie category management">
        <ToggleRow
          label="Show Cookie Consent Banner"
          desc="Display an EU-compliant consent banner to all visitors on first visit"
          value={settings.cookieConsentEnabled}
          onChange={v => setSettings(prev => ({ ...prev, cookieConsentEnabled: v }))}
        />
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Cookie Categories</label>
          <div className="space-y-2">
            {COOKIE_CATEGORIES.map(cat => {
              const isEnabled = settings.cookieConsentCategories.includes(cat.id)
              return (
                <div key={cat.id} className={cn('flex items-start gap-3 p-3 border', dark ? 'border-z-border bg-black/30' : 'border-z-border bg-gray-50')}>
                  <input
                    type="checkbox"
                    checked={isEnabled || cat.forced}
                    disabled={cat.forced}
                    onChange={e => {
                      const cats = e.target.checked
                        ? [...settings.cookieConsentCategories, cat.id]
                        : settings.cookieConsentCategories.filter(c => c !== cat.id)
                      setSettings(prev => ({ ...prev, cookieConsentCategories: cats }))
                    }}
                    className="mt-0.5 accent-z-accent"
                  />
                  <div>
                    <p className={cn('text-[9px] font-black uppercase tracking-wider', dark ? 'text-gray-200' : 'text-gray-800')}>
                      {cat.label} {cat.forced && <span className="text-z-secondary">(Required)</span>}
                    </p>
                    <p className="text-[8px] text-z-secondary mt-0.5">{cat.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Cookie Expiry (days)</label>
          <input
            type="number"
            value={settings.cookieExpiryDays}
            onChange={e => setSettings(prev => ({ ...prev, cookieExpiryDays: parseInt(e.target.value) || 365 }))}
            className={inp}
            placeholder="365"
          />
        </div>
      </Section>

      {/* Legal Documents */}
      <Section id="docs" icon={FileText} title="Legal Document URLs" desc="Privacy policy, terms of service, and cookie policy links">
        {[
          { key: 'privacyPolicyUrl', label: 'Privacy Policy URL', placeholder: 'https://yoursite.com/privacy' },
          { key: 'termsOfServiceUrl', label: 'Terms of Service URL', placeholder: 'https://yoursite.com/terms' },
          { key: 'cookiePolicyUrl', label: 'Cookie Policy URL', placeholder: 'https://yoursite.com/cookies' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
              {(settings as any)[key] && (
                <a href={(settings as any)[key]} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[8px] text-z-active-text hover:text-z-active-text">
                  Preview <ExternalLink size={9} />
                </a>
              )}
            </div>
            <input
              type="url"
              value={(settings as any)[key] || ''}
              onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className={inp}
            />
          </div>
        ))}
      </Section>

      {/* DPO Contact */}
      <Section id="dpo" icon={Mail} title="Data Protection Officer (DPO)" desc="Required for GDPR compliance — DPO contact details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'dpoName', label: 'DPO Full Name', placeholder: 'Jane Doe' },
            { key: 'dpoEmail', label: 'DPO Email Address', placeholder: 'dpo@company.com' },
            { key: 'companyName', label: 'Legal Entity Name', placeholder: 'Acme Corp Ltd.' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
              <input
                type={key === 'dpoEmail' ? 'email' : 'text'}
                value={(settings as any)[key] || ''}
                onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className={inp}
              />
            </div>
          ))}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Registered Business Address</label>
            <textarea
              value={settings.companyAddress || ''}
              onChange={e => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
              rows={2}
              placeholder="123 Business St, City, Country"
              className={cn(inp, 'resize-none')}
            />
          </div>
        </div>
      </Section>

      {/* Certification Toggles */}
      <Section id="certs" icon={Scale} title="Compliance Certifications" desc="Declare certification status for your enterprise compliance posture">
        <div className={cn('p-4 border flex items-start gap-3', dark ? 'bg-z-accent/5 border-z-accent/20' : 'bg-z-active-bg border-z-active-border')}>
          <Info size={14} className="text-z-active-text mt-0.5 flex-shrink-0" />
          <p className="text-[8px] text-z-active-text uppercase tracking-widest leading-relaxed">
            These flags are informational declarations only — enabling them does not automatically enforce the certification. Ensure your infrastructure and processes meet the actual certification requirements.
          </p>
        </div>
        <ToggleRow
          label="SOC 2 Type II"
          desc="Declare SOC 2 certification for security, availability, and confidentiality"
          value={settings.soc2Compliant}
          onChange={v => setSettings(prev => ({ ...prev, soc2Compliant: v }))}
        />
        <ToggleRow
          label="ISO 27001"
          desc="Information security management system standard compliance"
          value={settings.iso27001Compliant}
          onChange={v => setSettings(prev => ({ ...prev, iso27001Compliant: v }))}
        />
        <ToggleRow
          label="HIPAA"
          desc="Health Insurance Portability and Accountability Act — healthcare data handling"
          value={settings.hipaaCompliant}
          onChange={v => setSettings(prev => ({ ...prev, hipaaCompliant: v }))}
        />
      </Section>

      {/* Data Subject Rights */}
      <Section id="rights" icon={Database} title="Data Subject Rights" desc="Handle GDPR data export and deletion requests">
        <div className={cn('p-4 border flex items-start gap-3', dark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200')}>
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[8px] text-amber-400 uppercase tracking-widest leading-relaxed">
            GDPR Articles 15-17 require you to fulfill data access, portability, and deletion requests within 30 days.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={async () => {
              setRequestLoading(true)
              try {
                const res = await api.post('/system/settings/gdpr/export-all')
                toast.success(res.data?.message || 'Export initiated — check your email')
              } catch {
                toast.error('Export request failed')
              } finally {
                setRequestLoading(false)
              }
            }}
            className={cn('flex items-center justify-center gap-2 p-4 border text-[9px] font-black uppercase tracking-widest transition-all', dark ? 'bg-z-hover border-white/10 text-gray-300 hover:border-z-active-border hover:text-z-active-text' : 'bg-z-input border-z-border text-gray-700 hover:bg-z-active-bg hover:text-z-accent')}
          >
            {requestLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export All User Data
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('This will queue deletion of all expired user data. Are you sure?')) return
              setRequestLoading(true)
              try {
                const res = await api.post('/system/settings/gdpr/purge-expired')
                toast.success(res.data?.message || 'Purge queued')
              } catch {
                toast.error('Purge request failed')
              } finally {
                setRequestLoading(false)
              }
            }}
            className={cn('flex items-center justify-center gap-2 p-4 border text-[9px] font-black uppercase tracking-widest transition-all', dark ? 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')}
          >
            {requestLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Purge Expired Records
          </button>
        </div>
      </Section>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn('flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all', dark ? 'bg-z-accent hover:opacity-90 text-white shadow-[var(--z-active-glow)]' : 'bg-z-accent text-white hover:opacity-90')}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          Save Compliance Config
        </button>
      </div>
    </div>
  )
}
