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
 Image,
 FileText,
 ScrollText,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'

import SettingsGeneral from './settings/SettingsGeneral'
import SettingsMedia from './settings/SettingsMedia'
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
import SettingsWebhookLogs from './settings/SettingsWebhookLogs'
import SettingsLegal from './settings/SettingsLegal'

interface Settings {
 siteName: string
 siteDescription: string
 logoUrl: string
 faviconUrl: string
 publicUrl: string
 maintenanceMode: boolean
 defaultLocale: string
 supportedLocales: string[]
 mediaProvider: string
 maxUploadSize: number
 jwtExpiresIn: string
 passwordMinLength: number
 allowRegistration: boolean
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
 [key: string]: any
}

interface User {
 _id: string
 email: string
 role: string
 [key: string]: any
}

interface ApiKey {
 _id: string
 name: string
 role: string
 expiresAt: string | number | Date
 [key: string]: any
}

interface NewKey {
 name: string
 key: string
 [key: string]: any
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
 siteDescription: '',
 logoUrl: '',
 faviconUrl: '',
 publicUrl: '',
 maintenanceMode: false,
 defaultLocale: 'en',
 supportedLocales: ['en'],
 mediaProvider: 'local',
 maxUploadSize: 5242880,
 jwtExpiresIn: '7d',
 passwordMinLength: 8,
 allowRegistration: false,
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

 const tabGroups = [
 {
 label: 'Environment Settings',
 tabs: [
 { id: 'general', label: 'General Info', icon: Globe, sub: 'Site Profile' },
 { id: 'appearance', label: 'Appearance', icon: Palette, sub: 'Custom CSS' },
 { id: 'media', label: 'Storage', icon: Image, sub: 'Storage Config' },
 { id: 'billing', label: 'Billing', icon: CreditCard, sub: 'Site Monetization' },
 ]
 },
 {
 label: 'Access Management',
 tabs: [
 { id: 'users', label: 'Users', icon: Users, sub: 'Admin Registry' },
 { id: 'roles', label: 'Roles & Permissions', icon: Shield, sub: 'Granular Access' },
 { id: 'keys', label: 'API Keys', icon: Key, sub: 'Access Tokens' },
 ]
 },
 {
 label: 'Core Services',
 tabs: [
 { id: 'security', label: 'Security Policies', icon: Shield, sub: 'Access Control' },
 { id: 'database', label: 'Database', icon: Database, sub: 'Storage Stats' },
 { id: 'notifications', label: 'Email Relay', icon: Mail, sub: 'Email Delivery' },
 { id: 'webhooks', label: 'Webhooks', icon: Webhook, sub: 'HTTP Callbacks' },
 { id: 'webhook-logs', label: 'Event Logs', icon: Webhook, sub: 'Webhook History' },
 { id: 'ai', label: 'AI Engine', icon: Sparkles, sub: 'Model Settings' },
 { id: 'plugins', label: 'Plugins', icon: Puzzle, sub: 'Extensions' },
 ]
 },
 {
 label: 'Legal & Compliance',
 tabs: [
 { id: 'legal', label: 'Compliance', icon: FileText, sub: 'Privacy & GDPR' },
 ]
 }
 ]

 const activeTabDetails = tabGroups.flatMap(g => g.tabs).find(t => t.id === activeTab)

 const renderTab = () => {
 switch (activeTab) {
 case 'general':
 return <SettingsGeneral settings={settings} setSettings={setSettings} theme={theme} />
 case 'media':
 return <SettingsMedia settings={settings} setSettings={setSettings} theme={theme} />
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
  case 'webhook-logs':
  return <SettingsWebhookLogs theme={theme} />
  case 'legal':
  return <SettingsLegal theme={theme} />
  default:
 return null
 }
 }

 if (loading) {
 return (
 <div className="min-h-[80vh] flex items-center justify-center">
 <Loader2 size={32} className="text-gray-600 dark:text-gray-500 animate-spin" />
 </div>
 )
 }

 return (
 <div className="max-w-[1400px] mx-auto space-y-8">
 <div className={cn(
 "flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-8 border-b transition-colors",
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
 )}>
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] shrink-0">
 <SettingsIcon size={24} />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">
 System Configuration
 </span>
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none shadow-[0_0_10px_#10b981]" />
 </div>
 <h1 className={cn(
 "text-2xl font-black tracking-tighter uppercase leading-none",
 theme === 'dark' ? 'text-white' : 'text-gray-900'
 )}>
 Settings
 </h1>
 <p className={cn(
 "text-xs font-medium mt-2",
 theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
 )}>
 Configure environment preferences, integrations, and access control.
 </p>
 </div>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className={cn(
 'flex items-center justify-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold transition-all disabled:opacity-50',
 theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-emerald-600 text-white hover:bg-emerald-500'
 )}
 >
 {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 Save Settings
 </button>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
 <div className="xl:col-span-1 space-y-8 h-fit">
 {tabGroups.map((group) => (
 <div key={group.label}>
 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">
 {group.label}
 </h3>
 <div className="space-y-1">
 {group.tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={cn(
 'w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all group border',
 activeTab === tab.id
 ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-emerald-50 border-emerald-500/20 shadow-sm text-emerald-700'
 : theme === 'dark' ? 'text-gray-400 border-transparent hover:bg-white/[0.02] hover:text-gray-200' : 'text-gray-500 border-transparent hover:bg-gray-50'
 )}
 >
 <div className={cn(
 "w-8 h-8 rounded-none flex items-center justify-center transition-colors",
 activeTab === tab.id ? "bg-emerald-400 scale-110 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/5 text-gray-400 group-hover:text-gray-300"
 )}>
 <tab.icon size={16} />
 </div>
 <div className="flex flex-col items-start leading-tight">
 <span className="text-sm font-semibold">{tab.label}</span>
 </div>
 </button>
 ))}
 </div>
 </div>
 ))}
 </div>

 <div className="xl:col-span-3">
 <div className={cn(
 'p-8 min-h-[600px] transition-colors',
 theme === 'dark' 
 ? 'bg-black/65 backdrop-blur-[12px] border border-white/[0.08] rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.1)]' 
 : 'bg-white border border-gray-200 shadow-sm shadow-sm rounded-none'
 )}>
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="space-y-8 relative z-10"
 >
 <div className="flex items-center gap-4 border-b border-white/[0.05] pb-6">
 <div className="w-10 h-10 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-400">
 {activeTabDetails?.icon && <activeTabDetails.icon size={20} />}
 </div>
 <div>
 <h2 className="text-xl font-bold text-white tracking-tight">
 {activeTabDetails?.label}
 </h2>
 <p className="text-xs text-gray-400 mt-1">{activeTabDetails?.sub}</p>
 </div>
 </div>
 
 <div className="space-y-6 w-full">
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
