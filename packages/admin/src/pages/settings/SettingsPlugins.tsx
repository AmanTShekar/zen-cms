import React, { useState, useEffect, useRef } from 'react'
import {
 Puzzle,
 Plus,
 Trash2,
 ToggleLeft,
 ToggleRight,
 ExternalLink,
 Loader2,
 Search,
 Download,
 Shield,
 Settings,
 ChevronDown,
 ChevronRight,
 Package,
 AlertTriangle,
 CheckCircle2,
 XCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { confirm } from '../../store/confirmStore'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface PluginDoc {
 id: string
 name: string
 version: string
 description: string
 author: string
 homepage: string
 packageName: string
 configSchema: Record<string, {
 type: string
 label: string
 description?: string
 default?: any
 options?: Array<{ label: string; value: string }>
 required?: boolean
 }>
 config: any
 enabled: boolean
 installedAt: string
 updatedAt: string
}

interface SettingsPluginsProps {
 theme: 'light' | 'dark'
}

const SettingsPlugins: React.FC<SettingsPluginsProps> = ({ theme }) => {
 const [plugins, setPlugins] = useState<PluginDoc[]>([])
 const [loading, setLoading] = useState(true)
 const [searchQuery, setSearchQuery] = useState('')
 const [expandedId, setExpandedId] = useState<string | null>(null)
 const [saving, setSaving] = useState<string | null>(null)
 const [showInstallForm, setShowInstallForm] = useState(false)
 const [installForm, setInstallForm] = useState({
 id: '',
 name: '',
 version: '1.0.0',
 description: '',
 author: '',
 homepage: '',
 packageName: '',
 })
 const isMountedRef = useRef(true)
 useEffect(() => { return () => { isMountedRef.current = false } }, [])

 const fetchPlugins = async () => {
 if (!isMountedRef.current) return
 setLoading(true)
 try {
 const res = await api.get('/system/plugins')
 if (isMountedRef.current) setPlugins(res.data.data || [])
 } catch {
 if (isMountedRef.current) toast.error('Failed to load plugins')
 } finally {
 if (isMountedRef.current) setLoading(false)
 }
 }

 React.useEffect(() => { fetchPlugins() }, [])

 const handleToggle = async (plugin: PluginDoc) => {
 setSaving(plugin.id)
 try {
 await api.put(`/system/plugins/${plugin.id}`, { enabled: !plugin.enabled })
 setPlugins(prev => prev.map(p => p.id === plugin.id ? { ...p, enabled: !p.enabled } : p))
 toast.success(plugin.enabled ? 'Plugin disabled' : 'Plugin enabled')
 } catch {
 toast.error('Failed to toggle plugin')
 } finally {
 setSaving(null)
 }
 }

 const handleDelete = async (id: string) => {
 if (!await confirm({ message: 'Uninstall this plugin? Its functionality will be removed.' })) return
 setSaving(id)
 try {
 await api.delete(`/system/plugins/${id}`)
 setPlugins(prev => prev.filter(p => p.id !== id))
 toast.success('Plugin uninstalled')
 } catch {
 toast.error('Failed to uninstall plugin')
 } finally {
 setSaving(null)
 }
 }

 const handleConfigChange = (pluginId: string, key: string, value: any) => {
 setPlugins(prev => prev.map(p => {
 if (p.id !== pluginId) return p
 return { ...p, config: { ...p.config, [key]: value } }
 }))
 }

 const handleSaveConfig = async (plugin: PluginDoc) => {
 setSaving(plugin.id)
 try {
 await api.put(`/system/plugins/${plugin.id}`, { config: plugin.config })
 toast.success('Plugin settings saved')
 } catch {
 toast.error('Failed to save plugin settings')
 } finally {
 setSaving(null)
 }
 }

 const handleInstall = async () => {
 if (!installForm.id.trim()) { toast.error('Plugin ID is required'); return }
 if (!installForm.name.trim()) { toast.error('Plugin name is required'); return }
 setSaving('install')
 try {
 await api.post('/system/plugins', installForm)
 toast.success(`Plugin "${installForm.name}" installed`)
 setShowInstallForm(false)
 setInstallForm({ id: '', name: '', version: '1.0.0', description: '', author: '', homepage: '', packageName: '' })
 fetchPlugins()
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Failed to install plugin')
 } finally {
 setSaving(null)
 }
 }

 const filteredPlugins = plugins.filter(p =>
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.description.toLowerCase().includes(searchQuery.toLowerCase())
 )

 const enabledCount = plugins.filter(p => p.enabled).length

 return (
 <div className="col-span-full space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-z-border pb-4">
 <div className="flex flex-col">
 <h3 className="text-sm font-semibold flex items-center gap-3">
 <Puzzle size={16} className="text-z-secondary" />
 Plugin Registry
 </h3>
 <span className="text-sm text-z-secondary font-bold mt-1">
 {plugins.length} installed · {enabledCount} active · Community extensibility framework
 </span>
 </div>
 <button
 type="button"
 onClick={() => setShowInstallForm(!showInstallForm)}
 className="flex items-center gap-2 px-4 py-2 border border-z-active-border hover:border-z-accent hover:bg-z-active-bg text-sm font-semibold transition-all text-z-accent dark:text-z-active-text hover:text-z-primary"
 >
 <Plus size={12} />
 Install Plugin
 </button>
 </div>

 {/* Install form */}
 <AnimatePresence>
 {showInstallForm && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className={cn(
 'border rounded-none overflow-hidden shadow-sm',
 'bg-z-panel backdrop-blur-md border-z-border'
 )}
 >
 <div className="p-6 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm font-semibold text-z-secondary">
 Register New Plugin
 </span>
 <button onClick={() => setShowInstallForm(false)} className="text-z-secondary hover:text-z-primary text-sm font-semibold">
 Cancel
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Plugin ID *</label>
 <input
 type="text"
 value={installForm.id}
 onChange={(e) => setInstallForm(prev => ({ ...prev, id: e.target.value }))}
 placeholder="acme-analytics"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Display Name *</label>
 <input
 type="text"
 value={installForm.name}
 onChange={(e) => setInstallForm(prev => ({ ...prev, name: e.target.value }))}
 placeholder="ACME Analytics"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Version</label>
 <input
 type="text"
 value={installForm.version}
 onChange={(e) => setInstallForm(prev => ({ ...prev, version: e.target.value }))}
 placeholder="1.0.0"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Author</label>
 <input
 type="text"
 value={installForm.author}
 onChange={(e) => setInstallForm(prev => ({ ...prev, author: e.target.value }))}
 placeholder="ACME Corp"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Homepage URL</label>
 <input
 type="url"
 value={installForm.homepage}
 onChange={(e) => setInstallForm(prev => ({ ...prev, homepage: e.target.value }))}
 placeholder="https://example.com/plugin"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">NPM Package</label>
 <input
 type="text"
 value={installForm.packageName}
 onChange={(e) => setInstallForm(prev => ({ ...prev, packageName: e.target.value }))}
 placeholder="zenith-plugin-acme-analytics"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Description</label>
 <textarea
 value={installForm.description}
 onChange={(e) => setInstallForm(prev => ({ ...prev, description: e.target.value }))}
 placeholder="What does this plugin do?"
 rows={2}
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black resize-none',
 theme === 'dark' ? 'bg-app border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
 )}
 />
 </div>

 <div className="flex justify-end">
 <button
 onClick={handleInstall}
 disabled={saving === 'install'}
 className={cn("flex items-center gap-2 px-6 py-3 text-z-primary text-sm font-semibold   transition-all disabled:opacity-40", 'bg-z-accent hover:brightness-110 shadow-sm text-z-logo-text')}
 >
 {saving === 'install' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
 Install Plugin
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Search */}
 <div className="relative">
 <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-z-secondary" />
 <input
 type="text"
 placeholder="Search plugins..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={cn(
 'w-full border rounded-none py-3 pl-11 pr-4 text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark' ? 'bg-z-panel border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
 )}
 />
 </div>

 {/* Plugin list */}
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 size={24} className="text-z-secondary  animate-spin" />
 </div>
 ) : filteredPlugins.length === 0 ? (
 <div className={cn(
 'p-12 border border-dashed rounded-none text-center space-y-4',
 'border-z-border'
 )}>
 <Package size={40} className="mx-auto text-z-secondary" />
 <p className="text-sm font-semibold text-z-secondary">
 {plugins.length === 0 ? 'No plugins installed' : 'No plugins match your search'}
 </p>
 <p className="text-sm text-z-secondary">
 {plugins.length === 0
 ? 'Install plugins to extend Zenith CMS functionality'
 : 'Try a different search term'}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredPlugins.map((plugin) => {
 const isExpanded = expandedId === plugin.id
 const hasConfig = plugin.configSchema && Object.keys(plugin.configSchema).length > 0
 return (
 <motion.div
 key={plugin.id}
 layout
 className={cn(
 'border rounded-none overflow-hidden transition-all shadow-sm',
 plugin.enabled
 ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm'
 : 'bg-z-input border-z-border opacity-60'
 )}
 >
 {/* Plugin header */}
 <div className="px-5 py-4 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={cn(
 'w-10 h-10 rounded-none border flex items-center justify-center',
 plugin.enabled
 ? 'bg-z-panel/5 border-z-border text-z-secondary'
 : theme === 'dark' ? 'bg-z-hover border-z-border text-z-secondary' : 'bg-[var(--z-bg-hover)] border-z-border text-z-muted'
 )}>
 <Puzzle size={18} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-z-primary">{plugin.name}</span>
 <span className="text-sm font-semibold text-z-secondary font-mono">v{plugin.version}</span>
 {plugin.enabled
 ? <CheckCircle2 size={12} className="text-z-secondary " />
 : <XCircle size={12} className="text-z-secondary" />
 }
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-sm font-bold text-z-secondary font-mono">{plugin.id}</span>
 {plugin.author && (
 <>
 <span className="text-z-primary">·</span>
 <span className="text-sm font-bold text-z-secondary">{plugin.author}</span>
 </>
 )}
 </div>
 {plugin.description && (
 <p className="text-sm text-z-muted mt-1 max-w-lg">{plugin.description}</p>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2">
 {plugin.homepage && (
 <a
 href={plugin.homepage}
 target="_blank"
 rel="noopener noreferrer"
 className={cn(
 'p-2 border rounded-none transition-colors',
 'border-z-border text-z-secondary hover:text-z-primary'
 )}
 title="Plugin homepage"
 >
 <ExternalLink size={12} />
 </a>
 )}
 <button
 onClick={() => handleToggle(plugin)}
 disabled={saving === plugin.id}
 className={cn(
 'p-2 border rounded-none transition-colors',
 plugin.enabled
 ? 'border-amber-500/20 text-amber-500 hover:text-amber-400'
 : 'border-z-border text-z-secondary hover:text-z-primary'
 )}
 title={plugin.enabled ? 'Disable' : 'Enable'}
 >
 {saving === plugin.id
 ? <Loader2 size={14} className="animate-spin" />
 : plugin.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />
 }
 </button>
 {hasConfig && (
 <button
 onClick={() => setExpandedId(isExpanded ? null : plugin.id)}
 className={cn(
 'p-2 border rounded-none transition-colors',
 isExpanded
 ? 'border-z-border/30 text-z-secondary'
 : theme === 'dark' ? 'border-z-border text-z-secondary hover:text-z-primary' : 'border-z-border text-z-muted hover:text-z-secondary'
 )}
 title="Configure"
 >
 <Settings size={14} />
 </button>
 )}
 <button
 onClick={() => handleDelete(plugin.id)}
 disabled={saving === plugin.id}
 className={cn(
 'p-2 border rounded-none transition-colors',
 'border-z-border text-z-secondary hover:text-status-red'
 )}
 title="Uninstall"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 {/* Config panel */}
 <AnimatePresence>
 {isExpanded && hasConfig && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className={cn(
 'border-t px-5 py-4 space-y-4',
 theme === 'dark' ? 'border-z-border bg-app/20' : 'border-z-border shadow-sm bg-[var(--z-bg-input)]/50'
 )}
 >
 <span className="text-sm font-semibold text-z-muted">Plugin Settings</span>
 {Object.entries(plugin.configSchema).map(([key, schema]) => (
 <div key={key} className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">
 {schema.label}
 {schema.required && <span className="text-red-400 ml-1">*</span>}
 </label>
 {schema.description && (
 <p className="text-sm text-z-secondary">{schema.description}</p>
 )}
 {schema.type === 'boolean' ? (
 <button
 onClick={() => handleConfigChange(plugin.id, key, !plugin.config?.[key])}
 className={cn(
 'flex items-center gap-2 px-3 py-2 border rounded-none transition-colors',
 plugin.config?.[key]
 ? 'border-z-border/30 bg-z-panel text-z-secondary'
 : 'border-z-border text-z-secondary'
 )}
 >
 {plugin.config?.[key] ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
 <span className="text-sm font-semibold">{plugin.config?.[key] ? 'Enabled' : 'Disabled'}</span>
 </button>
 ) : schema.type === 'select' ? (
 <select
 value={plugin.config?.[key] || schema.default || ''}
 onChange={(e) => handleConfigChange(plugin.id, key, e.target.value)}
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 >
 {schema.options?.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 ) : schema.type === 'secret' ? (
 <input
 type="password"
 value={plugin.config?.[key] || ''}
 onChange={(e) => handleConfigChange(plugin.id, key, e.target.value)}
 placeholder="••••••••"
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 ) : (
 <input
 type={schema.type === 'url' ? 'url' : schema.type === 'number' ? 'number' : 'text'}
 value={plugin.config?.[key] || schema.default || ''}
 onChange={(e) => handleConfigChange(plugin.id, key, e.target.value)}
 className={cn(
 'w-full border rounded-none py-2.5 px-3 text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 'bg-z-panel border-z-border text-z-primary focus:border-z-active-border'
 )}
 />
 )}
 </div>
 ))}
 <div className="flex justify-end pt-2">
 <button
 onClick={() => handleSaveConfig(plugin)}
 disabled={saving === plugin.id}
 className={cn("flex items-center gap-2 px-5 py-2.5 text-z-primary text-sm font-semibold   transition-all disabled:opacity-40", 'bg-z-accent hover:brightness-110 shadow-sm text-z-logo-text')}
 >
 {saving === plugin.id ? <Loader2 size={10} className="animate-spin" /> : null}
 Save Settings
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 )
 })}
 </div>
 )}

 {/* Info footer */}
 <div className={cn(
 'p-5 border rounded-none-none space-y-3',
 theme === 'dark' ? 'bg-z-hover border-z-border/10' : 'bg-[var(--z-bg-input)] border-z-border'
 )}>
 <div className="flex items-center gap-3">
 <AlertTriangle size={14} className="text-amber-400" />
 <span className="text-sm font-semibold text-amber-400">Developer Note</span>
 </div>
 <ul className="space-y-1.5 text-sm text-z-muted font-bold leading-relaxed">
 <li>• Plugins are registered in the database and managed via this UI</li>
 <li>• Plugin code must be loaded at engine startup via cms.config.ts</li>
 <li>• Community plugins should be published as <code className="text-z-secondary font-mono">zenith-plugin-*</code> on npm</li>
 <li>• Use <code className="text-z-secondary font-mono">configSchema</code> to expose settings that admins can configure here</li>
 <li>• Disabled plugins are not applied but remain installed for easy re-enabling</li>
 </ul>
 </div>
 </div>
 )
}

export default SettingsPlugins
