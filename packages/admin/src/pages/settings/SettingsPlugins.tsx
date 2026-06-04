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
  config: Record<string, any>
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
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-black uppercase italic tracking-wider flex items-center gap-3">
            <Puzzle size={16} className="text-emerald-400" />
            Plugin Registry
          </h3>
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            {plugins.length} installed · {enabledCount} active · Community extensibility framework
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowInstallForm(!showInstallForm)}
          className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-[10px] font-black uppercase italic transition-all text-emerald-400 hover:text-white"
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
              'border rounded-none overflow-hidden',
              theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-gray-50 border-gray-200'
            )}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase italic tracking-widest text-emerald-400">
                  Register New Plugin
                </span>
                <button onClick={() => setShowInstallForm(false)} className="text-gray-500 hover:text-white text-[10px] font-black uppercase">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Plugin ID *</label>
                  <input
                    type="text"
                    value={installForm.id}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="acme-analytics"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] font-mono italic transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Display Name *</label>
                  <input
                    type="text"
                    value={installForm.name}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ACME Analytics"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Version</label>
                  <input
                    type="text"
                    value={installForm.version}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Author</label>
                  <input
                    type="text"
                    value={installForm.author}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="ACME Corp"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Homepage URL</label>
                  <input
                    type="url"
                    value={installForm.homepage}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, homepage: e.target.value }))}
                    placeholder="https://example.com/plugin"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">NPM Package</label>
                  <input
                    type="text"
                    value={installForm.packageName}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, packageName: e.target.value }))}
                    placeholder="zenith-plugin-acme-analytics"
                    className={cn(
                      'w-full border rounded-none py-2.5 px-3 text-[11px] font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                      theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                <textarea
                  value={installForm.description}
                  onChange={(e) => setInstallForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this plugin do?"
                  rows={2}
                  className={cn(
                    'w-full border rounded-none py-2.5 px-3 text-[11px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black resize-none',
                    theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                  )}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleInstall}
                  disabled={saving === 'install'}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase italic tracking-wider transition-all disabled:opacity-40"
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
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'w-full border rounded-none py-3 pl-11 pr-4 text-[11px] font-bold italic transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
          )}
        />
      </div>

      {/* Plugin list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className={cn(
          'p-12 border border-dashed rounded-none text-center space-y-4',
          theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
        )}>
          <Package size={40} className="mx-auto text-gray-600" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {plugins.length === 0 ? 'No plugins installed' : 'No plugins match your search'}
          </p>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider">
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
                  'border rounded-none overflow-hidden transition-all',
                  plugin.enabled
                    ? theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
                    : theme === 'dark' ? 'bg-white/[0.005] border-white/[0.03] opacity-60' : 'bg-gray-50 border-gray-100 opacity-60'
                )}
              >
                {/* Plugin header */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-none border flex items-center justify-center',
                      plugin.enabled
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : theme === 'dark' ? 'bg-white/5 border-white/[0.08] text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400'
                    )}>
                      <Puzzle size={18} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black uppercase tracking-tight italic text-white">{plugin.name}</span>
                        <span className="text-[8px] font-black text-gray-500 font-mono">v{plugin.version}</span>
                        {plugin.enabled
                          ? <CheckCircle2 size={12} className="text-emerald-500" />
                          : <XCircle size={12} className="text-gray-600" />
                        }
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">{plugin.id}</span>
                        {plugin.author && (
                          <>
                            <span className="text-gray-700">·</span>
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{plugin.author}</span>
                          </>
                        )}
                      </div>
                      {plugin.description && (
                        <p className="text-[9px] text-gray-400 mt-1 max-w-lg">{plugin.description}</p>
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
                          theme === 'dark' ? 'border-white/[0.08] text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
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
                          : theme === 'dark' ? 'border-white/[0.08] text-gray-500 hover:text-emerald-400' : 'border-gray-200 text-gray-400 hover:text-emerald-600'
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
                            ? 'border-emerald-500/30 text-emerald-400'
                            : theme === 'dark' ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-gray-200 text-gray-400 hover:text-gray-600'
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
                        theme === 'dark' ? 'border-white/[0.08] text-gray-500 hover:text-red-400' : 'border-gray-200 text-gray-400 hover:text-red-600'
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
                        theme === 'dark' ? 'border-white/[0.08] bg-[#0B0F19]/20' : 'border-gray-100 bg-gray-50/50'
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Plugin Settings</span>
                      {Object.entries(plugin.configSchema).map(([key, schema]) => (
                        <div key={key} className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                            {schema.label}
                            {schema.required && <span className="text-red-400 ml-1">*</span>}
                          </label>
                          {schema.description && (
                            <p className="text-[8px] text-gray-600 italic">{schema.description}</p>
                          )}
                          {schema.type === 'boolean' ? (
                            <button
                              onClick={() => handleConfigChange(plugin.id, key, !plugin.config?.[key])}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 border rounded-none transition-colors',
                                plugin.config?.[key]
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : theme === 'dark' ? 'border-white/[0.08] text-gray-500' : 'border-gray-200 text-gray-400'
                              )}
                            >
                              {plugin.config?.[key] ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                              <span className="text-[9px] font-black uppercase">{plugin.config?.[key] ? 'Enabled' : 'Disabled'}</span>
                            </button>
                          ) : schema.type === 'select' ? (
                            <select
                              value={plugin.config?.[key] || schema.default || ''}
                              onChange={(e) => handleConfigChange(plugin.id, key, e.target.value)}
                              className={cn(
                                'w-full border rounded-none py-2.5 px-3 text-[11px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                                theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
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
                                'w-full border rounded-none py-2.5 px-3 text-[11px] font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                                theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                              )}
                            />
                          ) : (
                            <input
                              type={schema.type === 'url' ? 'url' : schema.type === 'number' ? 'number' : 'text'}
                              value={plugin.config?.[key] || schema.default || ''}
                              onChange={(e) => handleConfigChange(plugin.id, key, e.target.value)}
                              className={cn(
                                'w-full border rounded-none py-2.5 px-3 text-[11px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                                theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                              )}
                            />
                          )}
                        </div>
                      ))}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleSaveConfig(plugin)}
                          disabled={saving === plugin.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase italic tracking-wider transition-all disabled:opacity-40"
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
        'p-5 border rounded-none space-y-3',
        theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'
      )}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={14} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Developer Note</span>
        </div>
        <ul className="space-y-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          <li>• Plugins are registered in the database and managed via this UI</li>
          <li>• Plugin code must be loaded at engine startup via cms.config.ts</li>
          <li>• Community plugins should be published as <code className="text-emerald-400 font-mono">zenith-plugin-*</code> on npm</li>
          <li>• Use <code className="text-emerald-400 font-mono">configSchema</code> to expose settings that admins can configure here</li>
          <li>• Disabled plugins are not applied but remain installed for easy re-enabling</li>
        </ul>
      </div>
    </div>
  )
}

export default SettingsPlugins
