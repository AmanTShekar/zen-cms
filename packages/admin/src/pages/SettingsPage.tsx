import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Save,
  Globe,
  Shield,
  Mail,
  Database,
  Palette,
  Loader2,
  HardDrive,
  Layers,
  Activity,
  Zap,
  Terminal,
  Users,
  Key,
  RefreshCw,
  Trash2,
  Lock,
  Sparkles,
  Copy,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  PlusCircle,
  Trash,
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

interface Settings {
  siteName: string
  publicUrl: string
  maintenanceMode: boolean
  jwtExpiresIn: string
  passwordMinLength: number
  customCSS: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  fromEmail: string
  rateLimitWindow: number
  rateLimitMax: number
  aiModel: string
  aiApiKey: string
  enableTelemetry: boolean
}

interface DBStats {
  size?: number
  collections?: number | string
  [key: string]: unknown
}

interface User {
  _id: string
  email: string
  role: string
  [key: string]: unknown
}

interface ApiKey {
  _id: string
  name: string
  role: string
  expiresAt: string | number | Date
  [key: string]: unknown
}

interface NewKey {
  name: string
  key: string
  [key: string]: unknown
}

const SettingsPage = () => {
  const { theme } = useTheme()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const [activeTab, setActiveTab] = useState(queryParams.get('tab') || 'general')
  const [settings, setSettings] = useState<Settings>({
    siteName: '',
    publicUrl: '',
    maintenanceMode: false,
    jwtExpiresIn: '7d',
    passwordMinLength: 8,
    customCSS: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    rateLimitWindow: 15,
    rateLimitMax: 100,
    aiModel: 'claude-3-5-sonnet',
    aiApiKey: '',
    enableTelemetry: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [dbStats, setDbStats] = useState<DBStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<NewKey | null>(null)

  // Tenant / Scoped Site Monetization Settings State
  const [activeSite, setActiveSite] = useState<any>(null)
  const [activeSiteId] = useState(localStorage.getItem('activeSiteId'))
  const [healthData, setHealthData] = useState<any>(null)

  interface Role {
    id?: string
    _id?: string
    roleName: string
    permissions: Array<{
      resource: string
      actions: string[]
    }>
  }

  const [roles, setRoles] = useState<Role[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, dbRes, usersRes, keysRes, healthRes, rolesRes] = await Promise.all([
        api.get('/system/settings'),
        api.get('/system/db/stats'),
        api.get('/system/users'),
        api.get('/system/api-keys'),
        api.get('/system/health'),
        api.get('/system/roles').catch(() => ({ data: { data: [] } })),
      ])
      setSettings(settingsRes.data.data)
      setDbStats(dbRes.data.data)
      setUsers(usersRes.data.data)
      setApiKeys(keysRes.data.data)
      setHealthData(healthRes.data.data)
      setRoles(rolesRes.data?.data || [])

      if (activeSiteId) {
        try {
          const siteRes = await api.get(`/sites/${activeSiteId}`)
          setActiveSite(siteRes.data.data)
        } catch (e) {
          console.error('Failed to load active site details', e)
        }
      }
    } catch {
      console.error('Failed to fetch system parameters')
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }, [activeSiteId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  useEffect(() => {
    const tab = queryParams.get('tab')
    if (tab) {
      setTimeout(() => setActiveTab(tab), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Commit Global Settings
      await api.patch('/system/settings', settings)

      // 2. Commit Scoped Site Billing / Monetization Settings
      if (activeSite && activeSiteId) {
        await api.patch(`/sites/${activeSiteId}`, {
          billingEnabled: activeSite.billingEnabled,
          stripePublicKey: activeSite.stripePublicKey,
          stripeSecretKey: activeSite.stripeSecretKey,
          stripeWebhookSecret: activeSite.stripeWebhookSecret,
          currency: activeSite.currency,
          pricingPlans: activeSite.pricingPlans,
        })
      }

      toast.success('Settings committed successfully')
    } catch (err: any) {
      toast.error('Failed to commit settings')
    } finally {
      setSaving(false)
    }
  }

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

  const handleAddOperator = async () => {
    const email = window.prompt('Initialize operator node (email):')
    if (!email) return
    try {
      toast.promise(api.post('/system/members', { email, role: 'editor' }), {
        loading: 'Adding user...',
        success: 'User added successfully',
        error: 'Failed to add user',
      })
      fetchData()
    } catch {
      console.error('Failed to add operator')
    }
  }

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('REVOKE_ACCESS_CREDENTIAL?')) return
    try {
      await api.patch(`/system/api-keys/${id}`, { revoked: true })
      toast.success('Access revoked')
      fetchData()
    } catch {
      toast.error('Failed to revoke access')
    }
  }

  const handleGenerateKey = async () => {
    const name = window.prompt('Key_Name (e.g. Prod_Relay):')
    if (!name) return
    try {
      const res = await api.post('/system/api-keys', { name, role: 'editor', expiresInDays: 30 })
      setNewKey(res.data.data)
      toast.success('API key generated')
      fetchData()
    } catch {
      toast.error('Failed to generate key')
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe, sub: 'Site Profile' },
    { id: 'billing', label: 'Plans & Paywalls', icon: CreditCard, sub: 'Site Monetization' },
    { id: 'security', label: 'Security', icon: Shield, sub: 'Access Control' },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield, sub: 'Granular Access' },
    { id: 'notifications', label: 'Email', icon: Mail, sub: 'SMTP Relay' },
    { id: 'users', label: 'Users', icon: Users, sub: 'Admin Registry' },
    { id: 'keys', label: 'API Keys', icon: Key, sub: 'Access Tokens' },
    { id: 'database', label: 'Database', icon: Database, sub: 'Storage Stats' },
    { id: 'ai', label: 'AI Engine', icon: Sparkles, sub: 'Model Settings' },
    { id: 'appearance', label: 'Styles', icon: Palette, sub: 'Custom CSS' },
  ]

  if (loading)
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
      </div>
    )

  return (
    <div className="max-w-[1400px] mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-none bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic leading-none tracking-tight">
              System Parameters
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">
              Adjust core configurations and security layers
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center justify-center gap-3 px-8 py-4 rounded-none text-[10px] font-black uppercase tracking-widest italic transition-all shadow-xl shadow-indigo-500/10 active:scale-95 disabled:opacity-50',
            theme === 'dark'
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-7 gap-8">
        <div className="xl:col-span-2 space-y-px border border-white/5 bg-white/[0.01] backdrop-blur-3xl h-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 rounded-none transition-all group relative border',
                activeTab === tab.id
                  ? theme === 'dark'
                    ? 'bg-white/[0.04] border-white/10 text-white'
                    : 'bg-white border-gray-100 shadow-md text-gray-900'
                  : theme === 'dark'
                    ? 'text-gray-500 border-transparent hover:bg-white/[0.02] hover:text-gray-300'
                    : 'text-gray-500 border-transparent hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon
                  size={16}
                  className={
                    activeTab === tab.id ? 'text-indigo-500' : 'opacity-30 group-hover:opacity-60'
                  }
                />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[12px] font-black uppercase tracking-tight italic">
                    {tab.label}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1 opacity-60">
                    {tab.sub}
                  </span>
                </div>
              </div>
              {activeTab === tab.id && (
                <div className="w-1 h-3 bg-indigo-500 rounded-none shadow-[0_0_8px_#6366f1]" />
              )}
            </button>
          ))}
        </div>

        <div className="xl:col-span-5">
          <div
            className={cn(
              'border rounded-none p-8 shadow-xl relative overflow-hidden transition-colors backdrop-blur-3xl min-h-[600px]',
              theme === 'dark'
                ? 'bg-[#080808] border-white/5'
                : 'bg-white border-gray-100 shadow-sm'
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8 relative z-10"
              >
                <div className="flex items-center gap-6 border-b border-white/5 pb-8">
                  <h2 className="text-2xl font-black uppercase italic leading-none tracking-tight">
                    {tabs.find((t) => t.id === activeTab)?.label}
                  </h2>
                  <div className="w-px h-6 bg-white/10" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">
                    Config Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {activeTab === 'general' && (
                    <>
                      <div
                        className={cn(
                          'p-4 rounded-none border transition-all space-y-3',
                          theme === 'dark'
                            ? 'bg-white/[0.01] border-white/5'
                            : 'bg-gray-50/50 border-gray-100'
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
                              ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                              : 'bg-white border-gray-200 focus:border-indigo-500'
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          'p-4 rounded-none border transition-all space-y-3',
                          theme === 'dark'
                            ? 'bg-white/[0.01] border-white/5'
                            : 'bg-gray-50/50 border-gray-100'
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
                              ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                              : 'bg-white border-gray-200 focus:border-indigo-500'
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          'col-span-1 md:col-span-2 p-6 rounded-none border flex items-center justify-between transition-all group',
                          theme === 'dark'
                            ? 'bg-white/[0.01] border-white/5 hover:border-indigo-500/20'
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
                            onChange={(e) =>
                              setSettings({ ...settings, maintenanceMode: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-12 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-none after:h-4 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner border border-white/5"></div>
                        </label>
                      </div>
                    </>
                  )}

                  {activeTab === 'billing' && (
                    <div className="col-span-1 md:col-span-2 space-y-8">
                      {!activeSite ? (
                        <div
                          className={cn(
                            'p-8 rounded-none border text-center space-y-4',
                            theme === 'dark'
                              ? 'bg-white/[0.01] border-white/5 text-gray-400'
                              : 'bg-gray-50 border-gray-100 text-gray-500'
                          )}
                        >
                          <CreditCard size={48} className="mx-auto text-indigo-500 animate-pulse" />
                          <h3 className="text-lg font-black uppercase italic tracking-wider">
                            No Active Workspace Selected
                          </h3>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-md mx-auto">
                            Select a site from the top-left sidebar switcher or workspace launchpad
                            to configure pricing plans, paywalls, and subscription billing keys.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Enable Billing Switcher card */}
                          <div
                            className={cn(
                              'p-6 rounded-none border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all group',
                              theme === 'dark'
                                ? 'bg-white/[0.01] border-white/5 hover:border-indigo-500/20'
                                : 'bg-white border-gray-100 shadow-sm'
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-[12px] font-black uppercase italic leading-none flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-400" />
                                Enable Custom Pricing Plans & Monetization
                              </span>
                              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 leading-relaxed">
                                Instantly deploy paywalls, premium plans, and check-out rules for
                                client frontends
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <select
                                value={activeSite.currency || 'USD'}
                                onChange={(e) =>
                                  setActiveSite({ ...activeSite, currency: e.target.value })
                                }
                                className={cn(
                                  'border rounded-none py-1.5 px-3 text-[11px] font-black uppercase italic outline-none',
                                  theme === 'dark'
                                    ? 'bg-black border-white/10 text-white'
                                    : 'bg-white border-gray-200 text-gray-800'
                                )}
                              >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="AUD">AUD ($)</option>
                                <option value="CAD">CAD ($)</option>
                              </select>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={activeSite.billingEnabled || false}
                                  onChange={(e) =>
                                    setActiveSite({
                                      ...activeSite,
                                      billingEnabled: e.target.checked,
                                    })
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-12 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-none after:h-4 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner border border-white/5"></div>
                              </label>
                            </div>
                          </div>

                          {activeSite.billingEnabled && (
                            <>
                              {/* Stripe Credentials Setup Card */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div
                                  className={cn(
                                    'p-4 rounded-none border transition-all space-y-3',
                                    theme === 'dark'
                                      ? 'bg-white/[0.01] border-white/5'
                                      : 'bg-gray-50/50 border-gray-100'
                                  )}
                                >
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
                                    Stripe Publishable Key
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="pk_test_..."
                                    value={activeSite.stripePublicKey || ''}
                                    onChange={(e) =>
                                      setActiveSite({
                                        ...activeSite,
                                        stripePublicKey: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      'w-full border rounded-none py-3 px-4 text-[12px] font-black italic transition-all outline-none',
                                      theme === 'dark'
                                        ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                                        : 'bg-white border-gray-200 focus:border-indigo-500'
                                    )}
                                  />
                                </div>
                                <div
                                  className={cn(
                                    'p-4 rounded-none border transition-all space-y-3',
                                    theme === 'dark'
                                      ? 'bg-white/[0.01] border-white/5'
                                      : 'bg-gray-50/50 border-gray-100'
                                  )}
                                >
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
                                    Stripe Secret Key
                                  </label>
                                  <input
                                    type="password"
                                    placeholder="sk_test_..."
                                    value={activeSite.stripeSecretKey || ''}
                                    onChange={(e) =>
                                      setActiveSite({
                                        ...activeSite,
                                        stripeSecretKey: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      'w-full border rounded-none py-3 px-4 text-[12px] font-black italic transition-all outline-none',
                                      theme === 'dark'
                                        ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                                        : 'bg-white border-gray-200 focus:border-indigo-500'
                                    )}
                                  />
                                </div>
                                <div
                                  className={cn(
                                    'p-4 rounded-none border transition-all space-y-3',
                                    theme === 'dark'
                                      ? 'bg-white/[0.01] border-white/5'
                                      : 'bg-gray-50/50 border-gray-100'
                                  )}
                                >
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
                                    Stripe Webhook Secret
                                  </label>
                                  <input
                                    type="password"
                                    placeholder="whsec_..."
                                    value={activeSite.stripeWebhookSecret || ''}
                                    onChange={(e) =>
                                      setActiveSite({
                                        ...activeSite,
                                        stripeWebhookSecret: e.target.value,
                                      })
                                    }
                                    className={cn(
                                      'w-full border rounded-none py-3 px-4 text-[12px] font-black italic transition-all outline-none',
                                      theme === 'dark'
                                        ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                                        : 'bg-white border-gray-200 focus:border-indigo-500'
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Subscriptions Plans Grid */}
                              <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                  <div className="flex flex-col">
                                    <h3 className="text-sm font-black uppercase italic tracking-wider">
                                      Subscription Tiers & Paywalls
                                    </h3>
                                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                      Configure subscription plans, features list, and restrict
                                      collection access
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPlan = {
                                        id: Date.now().toString(),
                                        name: 'Premium Subscription Plan',
                                        slug: 'premium-tier',
                                        price: 29,
                                        billingPeriod: 'monthly',
                                        features: [
                                          'All dynamic contents',
                                          'Elite developer modules',
                                          'SLA operational bounds',
                                        ],
                                        isPopular: false,
                                        paywalledCollections: [],
                                      }
                                      setActiveSite({
                                        ...activeSite,
                                        pricingPlans: [...(activeSite.pricingPlans || []), newPlan],
                                      })
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-[10px] font-black uppercase italic transition-all text-indigo-400 hover:text-white"
                                  >
                                    <PlusCircle size={12} />
                                    Add Plan
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                  {(activeSite.pricingPlans || []).map(
                                    (plan: any, planIndex: number) => (
                                      <div
                                        key={plan.id || planIndex}
                                        className={cn(
                                          'p-6 border rounded-none relative transition-all flex flex-col justify-between space-y-6',
                                          plan.isPopular
                                            ? theme === 'dark'
                                              ? 'bg-indigo-500/[0.03] border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                                              : 'bg-indigo-50 border-indigo-200'
                                            : theme === 'dark'
                                              ? 'bg-white/[0.01] border-white/5'
                                              : 'bg-white border-gray-100 shadow-sm'
                                        )}
                                      >
                                        {/* Details Column */}
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between">
                                            <input
                                              type="text"
                                              value={plan.name}
                                              onChange={(e) => {
                                                const plans = [...activeSite.pricingPlans]
                                                plans[planIndex] = { ...plan, name: e.target.value }
                                                setActiveSite({
                                                  ...activeSite,
                                                  pricingPlans: plans,
                                                })
                                              }}
                                              className={cn(
                                                'text-sm font-black uppercase italic outline-none border-b border-transparent focus:border-indigo-500 bg-transparent w-full mr-4',
                                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                                              )}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const plans = activeSite.pricingPlans.filter(
                                                  (_: any, idx: number) => idx !== planIndex
                                                )
                                                setActiveSite({
                                                  ...activeSite,
                                                  pricingPlans: plans,
                                                })
                                              }}
                                              className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                                            >
                                              <Trash size={14} />
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                              <label className="text-[7px] font-black text-gray-500 uppercase tracking-wider">
                                                Plan Slug
                                              </label>
                                              <input
                                                type="text"
                                                value={plan.slug}
                                                onChange={(e) => {
                                                  const plans = [...activeSite.pricingPlans]
                                                  plans[planIndex] = {
                                                    ...plan,
                                                    slug: e.target.value
                                                      .toLowerCase()
                                                      .replace(/\s+/g, '-'),
                                                  }
                                                  setActiveSite({
                                                    ...activeSite,
                                                    pricingPlans: plans,
                                                  })
                                                }}
                                                className={cn(
                                                  'w-full border rounded-none py-1.5 px-3 text-[10px] font-black italic transition-all outline-none',
                                                  theme === 'dark'
                                                    ? 'bg-black border-white/10 text-white'
                                                    : 'bg-white border-gray-200'
                                                )}
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[7px] font-black text-gray-500 uppercase tracking-wider">
                                                Pricing ({activeSite.currency || 'USD'})
                                              </label>
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="number"
                                                  value={plan.price}
                                                  onChange={(e) => {
                                                    const plans = [...activeSite.pricingPlans]
                                                    plans[planIndex] = {
                                                      ...plan,
                                                      price: Number(e.target.value),
                                                    }
                                                    setActiveSite({
                                                      ...activeSite,
                                                      pricingPlans: plans,
                                                    })
                                                  }}
                                                  className={cn(
                                                    'w-full border rounded-none py-1.5 px-3 text-[10px] font-black italic transition-all outline-none',
                                                    theme === 'dark'
                                                      ? 'bg-black border-white/10 text-white'
                                                      : 'bg-white border-gray-200'
                                                  )}
                                                />
                                                <select
                                                  value={plan.billingPeriod || 'monthly'}
                                                  onChange={(e) => {
                                                    const plans = [...activeSite.pricingPlans]
                                                    plans[planIndex] = {
                                                      ...plan,
                                                      billingPeriod: e.target.value,
                                                    }
                                                    setActiveSite({
                                                      ...activeSite,
                                                      pricingPlans: plans,
                                                    })
                                                  }}
                                                  className={cn(
                                                    'border rounded-none py-1.5 px-2 text-[9px] font-black uppercase italic outline-none',
                                                    theme === 'dark'
                                                      ? 'bg-black border-white/10 text-white'
                                                      : 'bg-white border-gray-200'
                                                  )}
                                                >
                                                  <option value="monthly">/mo</option>
                                                  <option value="yearly">/yr</option>
                                                  <option value="one-time">once</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Paywalled Collections */}
                                          <div className="space-y-2">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">
                                              Paywall Restricted Collections
                                            </label>
                                            <div
                                              className={cn(
                                                'p-3 border rounded-none flex flex-wrap gap-3 max-h-32 overflow-y-auto',
                                                theme === 'dark'
                                                  ? 'bg-black border-white/5'
                                                  : 'bg-gray-50 border-gray-200'
                                              )}
                                            >
                                              {(healthData?.registry?.collections || []).length ===
                                              0 ? (
                                                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                                                  No active collections defined
                                                </span>
                                              ) : (
                                                (healthData?.registry?.collections || []).map(
                                                  (col: any) => {
                                                    const checked = (
                                                      plan.paywalledCollections || []
                                                    ).includes(col.slug)
                                                    return (
                                                      <label
                                                        key={col.slug}
                                                        className="flex items-center gap-2 cursor-pointer group"
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={checked}
                                                          onChange={(e) => {
                                                            const current =
                                                              plan.paywalledCollections || []
                                                            const next = e.target.checked
                                                              ? [...current, col.slug]
                                                              : current.filter(
                                                                  (s: string) => s !== col.slug
                                                                )
                                                            const plans = [
                                                              ...activeSite.pricingPlans,
                                                            ]
                                                            plans[planIndex] = {
                                                              ...plan,
                                                              paywalledCollections: next,
                                                            }
                                                            setActiveSite({
                                                              ...activeSite,
                                                              pricingPlans: plans,
                                                            })
                                                          }}
                                                          className="rounded-none border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-black cursor-pointer"
                                                        />
                                                        <span
                                                          className={cn(
                                                            'text-[9px] font-black uppercase italic tracking-widest transition-colors',
                                                            checked
                                                              ? 'text-indigo-400'
                                                              : 'text-gray-500 group-hover:text-gray-400'
                                                          )}
                                                        >
                                                          {col.label || col.slug}
                                                        </span>
                                                      </label>
                                                    )
                                                  }
                                                )
                                              )}
                                            </div>
                                          </div>

                                          {/* Features */}
                                          <div className="space-y-2">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">
                                              Plan Features & Deliverables
                                            </label>
                                            <div className="space-y-1.5">
                                              {(plan.features || []).map(
                                                (feat: string, featIdx: number) => (
                                                  <div
                                                    key={featIdx}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <span className="text-indigo-500 text-[10px] font-black">
                                                      •
                                                    </span>
                                                    <input
                                                      type="text"
                                                      value={feat}
                                                      onChange={(e) => {
                                                        const feats = [...plan.features]
                                                        feats[featIdx] = e.target.value
                                                        const plans = [...activeSite.pricingPlans]
                                                        plans[planIndex] = {
                                                          ...plan,
                                                          features: feats,
                                                        }
                                                        setActiveSite({
                                                          ...activeSite,
                                                          pricingPlans: plans,
                                                        })
                                                      }}
                                                      className={cn(
                                                        'flex-1 border-b border-transparent focus:border-white/20 bg-transparent text-[10px] font-bold outline-none py-0.5',
                                                        theme === 'dark'
                                                          ? 'text-gray-300'
                                                          : 'text-gray-700'
                                                      )}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const feats = plan.features.filter(
                                                          (_: any, idx: number) => idx !== featIdx
                                                        )
                                                        const plans = [...activeSite.pricingPlans]
                                                        plans[planIndex] = {
                                                          ...plan,
                                                          features: feats,
                                                        }
                                                        setActiveSite({
                                                          ...activeSite,
                                                          pricingPlans: plans,
                                                        })
                                                      }}
                                                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                                                    >
                                                      <Trash size={10} />
                                                    </button>
                                                  </div>
                                                )
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const feats = [
                                                    ...(plan.features || []),
                                                    'Premium value deliverable',
                                                  ]
                                                  const plans = [...activeSite.pricingPlans]
                                                  plans[planIndex] = { ...plan, features: feats }
                                                  setActiveSite({
                                                    ...activeSite,
                                                    pricingPlans: plans,
                                                  })
                                                }}
                                                className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest italic flex items-center gap-1 mt-1 shrink-0"
                                              >
                                                <PlusCircle size={10} />
                                                Add Feature bullet
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Bottom line popular switcher */}
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between shrink-0">
                                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                                            Mark Popular / Recommend Plan
                                          </span>
                                          <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={plan.isPopular || false}
                                              onChange={(e) => {
                                                const plans = [...activeSite.pricingPlans]
                                                plans[planIndex] = {
                                                  ...plan,
                                                  isPopular: e.target.checked,
                                                }
                                                setActiveSite({
                                                  ...activeSite,
                                                  pricingPlans: plans,
                                                })
                                              }}
                                              className="sr-only peer"
                                            />
                                            <div className="w-9 h-4 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-3 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 shadow-inner border border-white/5"></div>
                                          </label>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <>
                      <div
                        className={cn(
                          'p-4 rounded-none border transition-all space-y-3',
                          theme === 'dark'
                            ? 'bg-white/[0.01] border-white/5'
                            : 'bg-gray-50/50 border-gray-100'
                        )}
                      >
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
                          Token Lifetime
                        </label>
                        <input
                          type="text"
                          value={settings.jwtExpiresIn}
                          onChange={(e) =>
                            setSettings({ ...settings, jwtExpiresIn: e.target.value })
                          }
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
                          theme === 'dark'
                            ? 'bg-white/[0.01] border-white/5'
                            : 'bg-gray-50/50 border-gray-100'
                        )}
                      >
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">
                          Min Password Length
                        </label>
                        <input
                          type="number"
                          value={settings.passwordMinLength}
                          onChange={(e) =>
                            setSettings({ ...settings, passwordMinLength: Number(e.target.value) })
                          }
                          className={cn(
                            'w-full border rounded-none py-4 px-6 text-[12px] font-black italic transition-all outline-none',
                            theme === 'dark'
                              ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/20'
                              : 'bg-gray-50 border-gray-100'
                          )}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'notifications' && (
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
                              ? 'bg-white/5 border-white/5 text-white focus:ring-indigo-500/5 focus:border-indigo-500/20'
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
                              ? 'bg-white/5 border-white/5 text-white focus:ring-indigo-500/5 focus:border-indigo-500/20'
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
                          {testingSmtp ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Zap size={16} />
                          )}
                          Test Connection
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === 'users' && (
                    <div className="col-span-full space-y-4">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-indigo-500">
                          {users.length} Active Operators
                        </span>
                        <button
                          onClick={handleAddOperator}
                          className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all"
                        >
                          Add User
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map((user) => (
                          <div
                            key={user._id}
                            className={cn(
                              'flex items-center justify-between p-4 border rounded-none transition-all group',
                              theme === 'dark'
                                ? 'bg-black/40 border-white/5 hover:border-indigo-500/20'
                                : 'bg-gray-50 border-gray-100'
                            )}
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                <Users size={20} />
                              </div>
                              <div className="flex flex-col leading-none">
                                <span className="text-[12px] font-black italic uppercase leading-none">
                                  {user.email}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 opacity-60">
                                  Auth Tier: {user.role}
                                </span>
                              </div>
                            </div>
                            <button className="p-3 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'keys' && (
                    <div className="col-span-full space-y-4">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-indigo-500">
                          {apiKeys.length} Active Credentials
                        </span>
                        <button
                          onClick={handleGenerateKey}
                          className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all"
                        >
                          Generate Token
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {apiKeys.map((key) => (
                          <div
                            key={key._id}
                            className={cn(
                              'flex items-center justify-between p-6 border rounded-none transition-all group',
                              theme === 'dark'
                                ? 'bg-black/40 border-white/5 hover:border-indigo-500/20'
                                : 'bg-gray-50 border-gray-100'
                            )}
                          >
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                <Key size={24} />
                              </div>
                              <div className="flex flex-col leading-none">
                                <span className="text-[14px] font-black italic uppercase leading-none">
                                  {key.name}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2.5 opacity-60">
                                  Permissions: {key.role} • Registry Node:{' '}
                                  {new Date(key.expiresAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRevokeKey(key._id)}
                              className="p-4 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Shield size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">
                          AI Model Context
                        </label>
                        <div className="relative group">
                          <select
                            value={settings.aiModel}
                            onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                            className={cn(
                              'w-full border rounded-none py-5 px-8 text-[12px] font-black italic transition-all outline-none appearance-none cursor-pointer',
                              theme === 'dark'
                                ? 'bg-white/5 border-white/5 text-white hover:border-indigo-500/20'
                                : 'bg-gray-50 border-gray-100 hover:border-indigo-500/20'
                            )}
                          >
                            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          </select>
                          <ChevronDown
                            size={18}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-indigo-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">
                          AI Key (Encrypted)
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={settings.aiApiKey}
                            onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
                            className={cn(
                              'w-full border rounded-none py-5 px-8 text-[12px] font-black italic focus:ring-4 transition-all outline-none pr-16',
                              theme === 'dark'
                                ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/20'
                                : 'bg-gray-50 border-gray-100'
                            )}
                            placeholder="sk-..."
                          />
                          <Lock
                            size={18}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600"
                          />
                        </div>
                      </div>
                      <div className="col-span-full p-6 border rounded-none border-dashed border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/10">
                            <Terminal size={24} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase italic leading-none">
                              Neural Bridge: ACTIVE
                            </span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                              Latency: 240ms • Mode: Production
                            </span>
                          </div>
                        </div>
                        <button className="px-8 py-3.5 rounded-none bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                          Validate Pulse
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === 'database' && (
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          label: 'Cluster Scale',
                          value: dbStats?.size
                            ? `${(dbStats.size / 1024 / 1024).toFixed(2)} MB`
                            : '0.00 MB',
                          icon: HardDrive,
                          color: 'text-indigo-500',
                        },
                        {
                          label: 'Registry Map',
                          value: dbStats?.collections || '0',
                          icon: Layers,
                          color: 'text-emerald-500',
                        },
                        {
                          label: 'Pulse Health',
                          value: 'OPTIMAL',
                          icon: Activity,
                          color: 'text-emerald-500',
                        },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className={cn(
                            'p-8 border rounded-none flex flex-col gap-6 relative overflow-hidden group transition-all',
                            theme === 'dark'
                              ? 'bg-white/[0.01] border-white/5 hover:border-indigo-500/20'
                              : 'bg-gray-50 border-gray-100 shadow-sm'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                'w-12 h-12 rounded-none flex items-center justify-center border',
                                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white'
                              )}
                            >
                              <stat.icon
                                size={22}
                                className="text-gray-400 group-hover:text-indigo-500 transition-colors"
                              />
                            </div>
                            <span
                              className={cn(
                                'text-[10px] font-black uppercase tracking-widest italic',
                                stat.color
                              )}
                            >
                              Synchronized
                            </span>
                          </div>
                          <div className="flex flex-col leading-none">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">
                              {stat.label}
                            </span>
                            <span className="text-xl font-black italic tracking-tighter mt-2">
                              {stat.value}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="col-span-full mt-4">
                        <button
                          onClick={async () => {
                            await api.post('/system/cache/flush')
                            toast.success('Cache cleared')
                          }}
                          className="flex items-center gap-3 px-8 py-4 rounded-none bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase italic hover:bg-red-500/20 transition-all active:scale-95"
                        >
                          <Trash2 size={16} />
                          Flush System Cache
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'roles' && (
                    <div className="col-span-full space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex flex-col">
                          <h3 className="text-sm font-black uppercase italic tracking-wider">
                            Dynamic Roles & Custom Permissions
                          </h3>
                          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Configure granular resource-level capabilities for custom team roles
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const namePrompt = window.prompt('Enter custom role name (e.g. content_creator):')
                            if (!namePrompt) return
                            const normalized = namePrompt.trim().toLowerCase().replace(/\s+/g, '_')
                            if (roles.some(r => r.roleName === normalized)) {
                              toast.error('Role already exists')
                              return
                            }
                            const newRole: Role = {
                              roleName: normalized,
                              permissions: [
                                { resource: '*', actions: ['read'] }
                              ]
                            }
                            setRoles([...roles, newRole])
                            setEditingRole(newRole)
                          }}
                          className="flex items-center gap-2 px-4 py-2 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-[10px] font-black uppercase italic transition-all text-indigo-400 hover:text-white"
                        >
                          <PlusCircle size={12} />
                          Create Custom Role
                        </button>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-1 space-y-3">
                          {roles.map((role) => (
                            <div
                              key={role.roleName}
                              onClick={() => setEditingRole(role)}
                              className={cn(
                                "p-4 border rounded-none flex items-center justify-between cursor-pointer transition-all",
                                editingRole?.roleName === role.roleName
                                  ? "bg-indigo-500/10 border-indigo-500/40"
                                  : "bg-white/[0.01] border-white/5 hover:border-white/10"
                              )}
                            >
                              <div className="flex flex-col leading-none">
                                <span className="text-[12px] font-black uppercase tracking-tight italic text-white">
                                  {role.roleName}
                                </span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                  {role.permissions?.length || 0} Resource Rules
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!window.confirm(`Delete custom role "${role.roleName}"?`)) return
                                  try {
                                    await api.delete(`/system/roles/${role.roleName}`)
                                    toast.success('Role deleted successfully')
                                    if (editingRole?.roleName === role.roleName) setEditingRole(null)
                                    setRoles(roles.filter(r => r.roleName !== role.roleName))
                                  } catch {
                                    toast.error('Failed to delete role')
                                  }
                                }}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {roles.length === 0 && (
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic py-4">
                              No custom roles created. Standard roles (admin, editor, viewer) are active by default.
                            </p>
                          )}
                        </div>

                        <div className="xl:col-span-2">
                          {editingRole ? (
                            <div className="space-y-6 p-6 border border-white/5 bg-white/[0.01] backdrop-blur-3xl">
                              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h4 className="text-xs font-black uppercase italic tracking-widest text-indigo-400">
                                  Permissions for "{editingRole.roleName}"
                                </h4>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await api.post('/system/roles', editingRole)
                                      toast.success('Role permissions saved')
                                      setRoles(roles.map(r => r.roleName === editingRole.roleName ? editingRole : r))
                                    } catch {
                                      toast.error('Failed to save role permissions')
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase italic tracking-wider transition-all"
                                >
                                  <Save size={12} />
                                  Save Role
                                </button>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                    Resource / Collection Rules
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPerm = { resource: '*', actions: ['read'] }
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: [...(editingRole.permissions || []), newPerm]
                                      })
                                    }}
                                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest italic flex items-center gap-1"
                                  >
                                    <PlusCircle size={10} />
                                    Add Rule
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {(editingRole.permissions || []).map((perm, permIdx) => (
                                    <div
                                      key={permIdx}
                                      className="p-4 border border-white/5 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                      <div className="flex items-center gap-4 flex-1">
                                        <select
                                          value={perm.resource}
                                          onChange={(e) => {
                                            const updated = [...editingRole.permissions]
                                            updated[permIdx] = { ...perm, resource: e.target.value }
                                            setEditingRole({ ...editingRole, permissions: updated })
                                          }}
                                          className="bg-black border border-white/10 text-white text-[11px] font-black uppercase italic outline-none py-1.5 px-3 rounded-none focus:border-indigo-500"
                                        >
                                          <option value="*">All Resources (*)</option>
                                          <option value="media">Media / Uploads</option>
                                          {(healthData?.registry?.collections || []).map((col: any) => (
                                            <option key={col.slug} value={col.slug}>
                                              {col.label || col.slug}
                                            </option>
                                          ))}
                                        </select>

                                        <div className="flex items-center gap-3">
                                          {['create', 'read', 'update', 'delete', '*'].map((act) => {
                                            const checked = perm.actions.includes(act)
                                            return (
                                              <label key={act} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={(e) => {
                                                    let nextActions = [...perm.actions]
                                                    if (e.target.checked) {
                                                      nextActions.push(act)
                                                    } else {
                                                      nextActions = nextActions.filter(a => a !== act)
                                                    }
                                                    const updated = [...editingRole.permissions]
                                                    updated[permIdx] = { ...perm, actions: nextActions }
                                                    setEditingRole({ ...editingRole, permissions: updated })
                                                  }}
                                                  className="rounded-none border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-black cursor-pointer"
                                                />
                                                <span className={cn(
                                                  "text-[9px] font-black uppercase italic tracking-wider",
                                                  checked ? "text-indigo-400" : "text-gray-500"
                                                )}>
                                                  {act}
                                                </span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = editingRole.permissions.filter((_, idx) => idx !== permIdx)
                                          setEditingRole({ ...editingRole, permissions: updated })
                                        }}
                                        className="text-gray-500 hover:text-red-400 transition-colors shrink-0 md:self-center"
                                      >
                                        <Trash size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full min-h-[300px] border border-dashed border-white/10 flex items-center justify-center text-center p-8">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-xs">
                                Select a custom role on the left or create a new one to design its capabilities matrix.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
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
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {newKey && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                'w-full max-w-md rounded-none p-6 border shadow-2xl relative overflow-hidden',
                theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-100'
              )}
            >
              <div className="absolute top-0 right-0 p-6 text-indigo-500/10 pointer-events-none">
                <Key size={120} strokeWidth={0.5} />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic leading-none">
                    Key Generated
                  </h3>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                    Vault Node: {newKey.name}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-widest leading-relaxed">
                  CRITICAL: Copy this key now. It will never be displayed again for security
                  integrity.
                </p>
                <div
                  className={cn(
                    'p-4 rounded-none border flex items-center justify-between gap-4 font-mono text-[10px] font-bold break-all transition-colors',
                    theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'
                  )}
                >
                  {newKey.key}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKey.key)
                      toast.success('KEY_COPIED_TO_CLIPBOARD')
                    }}
                    className="p-2.5 rounded-none bg-indigo-500 text-white shrink-0 shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setNewKey(null)}
                className="w-full py-4 rounded-none bg-white text-black font-black text-[10px] uppercase tracking-widest italic hover:bg-gray-200 transition-all"
              >
                I've copied the key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SettingsPage
