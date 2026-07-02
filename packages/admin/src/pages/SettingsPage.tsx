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
 Terminal,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'

import { PageHeader } from '../components/ui/PageHeader'
import { ActionPanel } from '../components/ui/ActionPanel'
import { Card, CardContent } from '../components/ui/Card'

import SettingsGeneral from './settings/SettingsGeneral'
import SettingsSecurity from './settings/SettingsSecurity'
import SettingsNotifications from './settings/SettingsNotifications'
import SettingsUsers from './settings/SettingsUsers'
import SettingsApiKeys from './settings/SettingsApiKeys'
import SettingsDatabase from './settings/SettingsDatabase'
import SettingsRoles from './settings/SettingsRoles'
import SettingsAppearance from './settings/SettingsAppearance'
import SettingsWebhooks from './settings/SettingsWebhooks'
import SettingsPlugins from './settings/SettingsPlugins'
import SettingsApiKeyModal from './settings/SettingsApiKeyModal'
import SettingsWebhookLogs from './settings/SettingsWebhookLogs'
import SettingsLegal from './settings/SettingsLegal'
import SettingsSystem from './settings/SettingsSystem'
import ApiExplorerPage from './ApiExplorerPage'

interface Settings {
  siteName: string
  siteDescription: string
  logoUrl: string
  faviconUrl: string
  ogImageUrl: string
  publicUrl: string
  maintenanceMode: boolean
  defaultLocale: string
  supportedLocales: string[]
  timezone: string
  dateFormat: string
  enableTelemetry: boolean
  jwtExpiresIn?: string
  passwordMinLength?: number
  allowRegistration?: boolean
  rateLimitWindow?: number
  rateLimitMax?: number
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  fromEmail?: string
  customCSS?: string
  [key: string]: any
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
 const { isAdmin, isEditor } = usePermissions()
 const location = useLocation()
 const queryParams = new URLSearchParams(location.search)
 const [activeTab, setActiveTab] = useState(queryParams.get('tab') || 'general')
 const [settings, setSettings] = useState<Settings>({
  siteName: '',
  siteDescription: '',
  logoUrl: '',
  faviconUrl: '',
  ogImageUrl: '',
  publicUrl: '',
  maintenanceMode: false,
  defaultLocale: 'en',
  supportedLocales: ['en'],
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  supportEmail: '',
  mediaProvider: 'local',
  maxUploadSize: 5242880,
  jwtExpiresIn: '7d',
  passwordMinLength: 8,
  allowRegistration: false,
  rateLimitWindow: 15,
  rateLimitMax: 100,
  corsOrigins: [],
  customCSS: '',
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
          paymentProvider: activeSite.paymentProvider,
          stripePublicKey: activeSite.stripePublicKey,
          stripeSecretKey: activeSite.stripeSecretKey,
          stripeWebhookSecret: activeSite.stripeWebhookSecret,
          paypalClientId: activeSite.paypalClientId,
          paypalClientSecret: activeSite.paypalClientSecret,
          paypalWebhookId: activeSite.paypalWebhookId,
          razorpayKeyId: activeSite.razorpayKeyId,
          razorpayKeySecret: activeSite.razorpayKeySecret,
          razorpayWebhookSecret: activeSite.razorpayWebhookSecret,
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
  { id: 'general', label: 'General Info', icon: Globe, sub: 'Site Profile', adminOnly: true },
  { id: 'appearance', label: 'Appearance', icon: Palette, sub: 'White-Label', adminOnly: true },
  ]
  },
  {
  label: 'Access Management',
  tabs: [
  { id: 'users', label: 'Users', icon: Users, sub: 'Admin Registry', adminOnly: true },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, sub: 'Granular Access', adminOnly: true },
  { id: 'keys', label: 'API Keys', icon: Key, sub: 'Access Tokens', adminOnly: true },
  ]
  },
  {
   label: 'Core Services',
   tabs: [
   { id: 'security', label: 'Security Policies', icon: Shield, sub: 'Access Control', adminOnly: true },
   { id: 'api-explorer', label: 'API Explorer', icon: Terminal, sub: 'GraphQL & REST' },
   { id: 'database', label: 'Database', icon: Database, sub: 'Storage Stats', adminOnly: true },
   { id: 'notifications', label: 'Email Relay', icon: Mail, sub: 'Email Delivery', adminOnly: true },
   { id: 'webhooks', label: 'Webhooks', icon: Webhook, sub: 'HTTP Callbacks', adminOnly: true },
   { id: 'webhook-logs', label: 'Event Logs', icon: Webhook, sub: 'Webhook History', adminOnly: true },
   { id: 'plugins', label: 'Plugins', icon: Puzzle, sub: 'Extensions', adminOnly: true },
   { id: 'system', label: 'System Ops', icon: SettingsIcon, sub: 'Restart & Maintenance', adminOnly: true },
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
 case 'security':
 return <SettingsSecurity settings={settings as any} setSettings={setSettings as any} theme={theme} />
 case 'notifications':
 return <SettingsNotifications settings={settings as any} setSettings={setSettings as any} theme={theme} testingSmtp={testingSmtp} setTestingSmtp={setTestingSmtp} />
 case 'users':
 return <SettingsUsers users={users} theme={theme} fetchData={fetchData} />
 case 'keys':
 return <SettingsApiKeys apiKeys={apiKeys} theme={theme} fetchData={fetchData} setNewKey={setNewKey} />
 case 'database':
 return <SettingsDatabase dbStats={dbStats} theme={theme} />
 case 'roles':
 return <SettingsRoles roles={roles} setRoles={setRoles} editingRole={editingRole} setEditingRole={setEditingRole} roleFilter={roleFilter} setRoleFilter={setRoleFilter} healthData={healthData} users={users} theme={theme} />
 case 'appearance':
 return <SettingsAppearance settings={settings as any} setSettings={setSettings as any} theme={theme} />
 case 'api-explorer':
 return <ApiExplorerPage />
 case 'webhooks':
 return <SettingsWebhooks theme={theme} />
  case 'plugins':
  return <SettingsPlugins theme={theme} />
  case 'webhook-logs':
  return <SettingsWebhookLogs theme={theme} />
  case 'legal':
  return <SettingsLegal theme={theme} />
  case 'system':
  return <SettingsSystem theme={theme} />
  default:
 return null
 }
 }

 if (loading) {
 return (
 <div className="min-h-[80vh] flex items-center justify-center">
 <Loader2 size={32} className="text-z-secondary  animate-spin" />
 </div>
 )
 }

  return (
  <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
 <PageHeader 
   title="Settings"
   description="Configure environment preferences, integrations, and access control."
   icon={<SettingsIcon size={24} />}
   backLink={{ to: '/', label: 'Dashboard' }}
   actions={
     <button
       onClick={handleSave}
       disabled={saving}
       className={cn(
         'flex items-center justify-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold transition-all disabled:opacity-50',
         theme === 'dark' ? 'bg-z-accent hover:brightness-110 text-z-logo-text shadow-sm' : 'bg-z-accent text-z-logo-text hover:opacity-90'
       )}
     >
       {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
       Commit Config
     </button>
   }
 />

 <ActionPanel
   sidebarPosition="left"
   sidebarWidth="w-full lg:w-[320px]"
   className="flex-1 min-h-0"
   sidebar={
     <div className="p-6 space-y-8 h-full overflow-y-auto pb-24">
       {tabGroups.map((group) => (
         <div key={group.label}>
           <h3 className="text-sm font-semibold text-z-muted mb-3 px-3">
             {group.label}
           </h3>
           <div className="space-y-1">
             {group.tabs.filter(tab => !tab.adminOnly || isAdmin).map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={cn(
                   'w-full flex items-center gap-3 px-3 py-2.5 rounded-none transition-all group border',
                   activeTab === tab.id
                     ? 'bg-z-active-bg border-z-active-border text-z-active-text shadow-sm transform scale-[1.02]'
                     : 'text-z-secondary border-transparent hover:bg-z-hover hover:text-z-primary'
                 )}
               >
                 <div className={cn(
                   "w-8 h-8 flex items-center justify-center transition-colors shadow-sm",
                   activeTab === tab.id ? "bg-z-accent text-z-logo-text" : "bg-z-hover text-z-secondary group-hover:text-z-primary"
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
   }
 >
    <div className={cn("flex-1 overflow-y-auto p-6 lg:p-10 pb-32 lg:pb-32", theme === 'dark' && 'bg-app')}>
      <div className={cn("min-h-[600px] border mb-16", 'z-card p-8')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 relative z-10"
          >
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--z-border)' }}>
              <div className="w-10 h-10 bg-z-active-bg flex items-center justify-center text-z-active-text">
                {activeTabDetails?.icon && <activeTabDetails.icon size={20} />}
              </div>
             <div>
               <h2 className={cn("text-xl font-bold ", 'text-z-primary')}>
                 {activeTabDetails?.label}
               </h2>
               <p className={cn("text-xs mt-1", theme === 'dark' ? 'text-z-muted' : 'text-z-secondary')}>{activeTabDetails?.sub}</p>
             </div>
           </div>
           
           <div className="space-y-6 w-full">
             {renderTab()}
           </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
 </ActionPanel>

 <AnimatePresence>
 {newKey && <SettingsApiKeyModal newKey={newKey} setNewKey={setNewKey} theme={theme} />}
 </AnimatePresence>
 </div>
 )
}

export default SettingsPage
