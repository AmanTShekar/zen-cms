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
  Sparkles,
  Key,
  Users,
  CreditCard,
  Webhook,
  Puzzle,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'

import SettingsGeneral from './settings/SettingsGeneral'
import SettingsBilling from './settings/SettingsBilling'
import SettingsSecurity from './settings/SettingsSecurity'
import SettingsNotifications from './settings/SettingsNotifications'
import SettingsUsers from './settings/SettingsUsers'
import SettingsApiKeys from './settings/SettingsApiKeys'
import SettingsAi from './settings/SettingsAi'
import SettingsDatabase from './settings/SettingsDatabase'
import SettingsRoles from './settings/SettingsRoles'
import SettingsAppearance from './settings/SettingsAppearance'
import SettingsWebhooks from './settings/SettingsWebhooks'
import SettingsPlugins from './settings/SettingsPlugins'
import SettingsApiKeyModal from './settings/SettingsApiKeyModal'

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

interface Role {
  _id: string
  roleName: string
  roleType: 'admin' | 'editor' | 'viewer' | 'custom'
  description: string
  isSystem: boolean
  permissions: Array<{ resource: string; actions: string[] }>
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
  const [activeSite, setActiveSite] = useState<any>(null)
  const [activeSiteId] = useState(localStorage.getItem('activeSiteId'))
  const [healthData, setHealthData] = useState<any>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'system' | 'custom'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, dbRes, usersRes, keysRes, healthRes, rolesRes] = await Promise.all([
        api.get('/system/settings'),
        api.get('/system/db/stats'),
        api.get('/system/users'),
        api.get('/system/api-keys'),
        api.get('/system/health'),
        api.get('/roles').catch(() => ({ data: { data: [] } })),
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
          toast.error('Failed to load site details')
        }
      }
    } catch {
      console.error('Failed to fetch system parameters')
      toast.error('Failed to fetch system parameters')
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }, [activeSiteId])

  useEffect(() => {
    const timer = setTimeout(() => { fetchData() }, 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  useEffect(() => {
    const tab = queryParams.get('tab')
    if (tab) { setTimeout(() => setActiveTab(tab), 0) }
  }, [location.search])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/system/settings', settings)
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
    { id: 'webhooks', label: 'Webhooks', icon: Webhook, sub: 'HTTP Callbacks' },
    { id: 'plugins', label: 'Plugins', icon: Puzzle, sub: 'Extensions' },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return <SettingsGeneral settings={settings} setSettings={setSettings} theme={theme} />
      case 'billing':
        return <SettingsBilling activeSite={activeSite} setActiveSite={setActiveSite} healthData={healthData} theme={theme} />
      case 'security':
        return <SettingsSecurity settings={settings} setSettings={setSettings} theme={theme} />
      case 'notifications':
        return <SettingsNotifications settings={settings} setSettings={setSettings} theme={theme} testingSmtp={testingSmtp} setTestingSmtp={setTestingSmtp} />
      case 'users':
        return <SettingsUsers users={users} theme={theme} fetchData={fetchData} />
      case 'keys':
        return <SettingsApiKeys apiKeys={apiKeys} theme={theme} fetchData={fetchData} setNewKey={setNewKey} />
      case 'ai':
        return <SettingsAi settings={settings} setSettings={setSettings} theme={theme} />
      case 'database':
        return <SettingsDatabase dbStats={dbStats} theme={theme} />
      case 'roles':
        return <SettingsRoles roles={roles} setRoles={setRoles} editingRole={editingRole} setEditingRole={setEditingRole} roleFilter={roleFilter} setRoleFilter={setRoleFilter} healthData={healthData} users={users} theme={theme} />
      case 'appearance':
        return <SettingsAppearance settings={settings} setSettings={setSettings} theme={theme} />
      case 'webhooks':
        return <SettingsWebhooks theme={theme} />
      case 'plugins':
        return <SettingsPlugins theme={theme} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
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
            'flex items-center justify-center gap-3 px-8 py-4 rounded-none text-[10px] font-black uppercase tracking-widest italic transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50',
            theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
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
                  ? theme === 'dark' ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-gray-100 shadow-md text-gray-900'
                  : theme === 'dark' ? 'text-gray-500 border-transparent hover:bg-white/[0.02] hover:text-gray-300' : 'text-gray-500 border-transparent hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={16} className={activeTab === tab.id ? 'text-emerald-500' : 'opacity-30 group-hover:opacity-60'} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[12px] font-black uppercase tracking-tight italic">{tab.label}</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1 opacity-60">{tab.sub}</span>
                </div>
              </div>
              {activeTab === tab.id && <div className="w-1 h-3 bg-emerald-500 rounded-none shadow-[0_0_8px_#10b981]" />}
            </button>
          ))}
        </div>

        <div className="xl:col-span-5">
          <div className={cn(
            'border rounded-none p-8 shadow-xl relative overflow-hidden transition-colors backdrop-blur-3xl min-h-[600px]',
            theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100 shadow-sm'
          )}>
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
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Config Active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {renderTab()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {newKey && <SettingsApiKeyModal newKey={newKey} setNewKey={setNewKey} theme={theme} />}
      </AnimatePresence>
    </div>
  )
}

export default SettingsPage
