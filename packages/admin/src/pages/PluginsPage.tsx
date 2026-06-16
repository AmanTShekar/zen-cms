import { useState, useEffect } from 'react'
import {
  Puzzle,
  Settings,
  Trash2,
  ExternalLink,
  Plus,
  Zap,
  Search,
  Box,
  Loader2,
  RefreshCw,
  Cpu,
  Activity,
  ShieldCheck,
  Database,
  Mail,
  DownloadCloud,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

interface PluginData {
  id?: string
  name: string
  author?: string
  enabled?: boolean
  version?: string
  description?: string
  status?: string
  type?: string
  verified?: boolean
  downloads?: number
  icon?: React.ReactNode
}

const PluginsPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed')
  const [loading, setLoading] = useState(true)
  const [plugins, setPlugins] = useState<PluginData[]>([])
  const [installingId, setInstallingId] = useState<string | null>(null)

  const MARKETPLACE_PLUGINS: PluginData[] = [
    {
      id: 'cloudinary-asset-storage',
      name: 'Cloudinary Asset Storage',
      author: 'Cloudinary Inc.',
      version: '2.1.0',
      description: "Synchronizes Zenith's media manager to your Cloudinary cloud bucket with auto-responsive imaging and AVIF/WebP transformations.",
      downloads: 12482,
      verified: true,
      icon: <Database size={16} className="text-emerald-500" />,
    },
    {
      id: 'resend-email-engine',
      name: 'Resend Email Engine',
      author: 'Resend Team',
      version: '1.4.3',
      description: 'Integrates high-performance transactional email flows via React Email templates and Resend SMTP nodes.',
      downloads: 8912,
      verified: true,
      icon: <Mail size={16} className="text-gray-500" />,
    },
    {
      id: 'algolia-search-matrix',
      name: 'Algolia Search Matrix',
      author: 'Algolia Labs',
      version: '3.0.1',
      description: 'Automatically indexes newly published content collections to Algolia indexes for instantaneous keyword discovery.',
      downloads: 6104,
      verified: true,
      icon: <Search size={16} className="text-emerald-500" />,
    },
    {
      id: 'vercel-deploy-webhook',
      name: 'Vercel Deploy Webhook',
      author: 'Vercel Core',
      version: '1.0.8',
      description: 'Dispatches static regeneration webhooks to Vercel/Netlify environments automatically whenever collection documents change.',
      downloads: 15221,
      verified: true,
      icon: <Activity size={16} className="text-amber-500" />,
    },
    {
      id: 'openai-copilot-extension',
      name: 'OpenAI Copilot Extension',
      author: 'OpenAI Inc.',
      version: '4.2.0',
      description: 'Power tip-tap rich text editors with inline content draft generation, grammar correction, and dynamic prompt templates.',
      downloads: 19823,
      verified: true,
      icon: <Cpu size={16} className="text-gray-500" />,
    },
  ]

  const fetchPlugins = async () => {
    try {
      const res = await api.get('/system/plugins')
      const realPlugins = res.data.data || []
      setPlugins(
        realPlugins.map((p: any) => ({
          ...p,
          id: p.id || p.name.toLowerCase().replace(/\s+/g, '-'),
          status: p.status || (p.disabled ? 'inactive' : 'active'),
          type: p.author === 'ROOT_KERNEL' ? 'core' : 'third-party',
          verified: p.author === 'ROOT_KERNEL',
          icon: getPluginIcon(p.name),
        }))
      )
    } catch (err) {
      console.error('Failed to fetch plugins', err)
      toast.error('Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }

  const getPluginIcon = (name: string) => {
    const lowercaseName = name.toLowerCase()
    if (lowercaseName.includes('cloudinary')) return <Database size={16} className="text-emerald-500" />
    if (lowercaseName.includes('resend') || lowercaseName.includes('mail')) return <Mail size={16} className="text-gray-500" />
    if (lowercaseName.includes('algolia') || lowercaseName.includes('search')) return <Search size={16} className="text-emerald-500" />
    if (lowercaseName.includes('vercel') || lowercaseName.includes('deploy')) return <Activity size={16} className="text-amber-500" />
    if (lowercaseName.includes('openai') || lowercaseName.includes('copilot') || lowercaseName.includes('ai')) return <Cpu size={16} className="text-gray-500" />
    return <Puzzle size={16} className="text-gray-500" />
  }

  const togglePlugin = async (id: string | undefined, currentStatus: string | undefined) => {
    if (!id || !currentStatus) return
    try {
      const newEnabled = currentStatus === 'inactive'
      await api.post(`/system/plugins/${id}/${newEnabled ? 'enable' : 'disable'}`)
      toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}`)
      fetchPlugins()
    } catch {
      toast.error('Failed to toggle plugin status')
    }
  }

  const installMarketplacePlugin = async (mpPlugin: (typeof MARKETPLACE_PLUGINS)[0]) => {
    setInstallingId(mpPlugin.id || null)
    try {
      await api.post('/system/plugins/inject', {
        name: mpPlugin.name,
        version: mpPlugin.version,
        author: mpPlugin.author,
        description: mpPlugin.description,
      })
      toast.success(`${mpPlugin.name} successfully installed!`)
      await fetchPlugins()
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to install ${mpPlugin.name}`)
    } finally {
      setInstallingId(null)
    }
  }

  useEffect(() => {
    fetchPlugins()
  }, [])

  const displayList = (activeTab === 'installed'
    ? plugins.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : MARKETPLACE_PLUGINS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) as PluginData[]

  const isInstalled = (name: string) => plugins.some((p) => p.name.toLowerCase() === name.toLowerCase())

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Plugin System"
        actions={
          <div className="flex gap-2">
            <div className={cn('flex p-1 border', dark ? 'bg-black border-white/[0.05]' : 'bg-white border-gray-200')}>
              <button
                onClick={() => setActiveTab('installed')}
                className={cn('px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors', activeTab === 'installed' ? (dark ? 'bg-white text-black' : 'bg-gray-900 text-white') : 'text-gray-500')}
              >
                Installed
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={cn('px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors', activeTab === 'marketplace' ? (dark ? 'bg-white text-black' : 'bg-gray-900 text-white') : 'text-gray-500')}
              >
                Marketplace
              </button>
            </div>
            <button
              onClick={fetchPlugins}
              className={cn('px-3 border text-gray-500 hover:text-white transition-colors', dark ? 'bg-black border-white/[0.05]' : 'bg-white border-gray-200')}
            >
              <RefreshCw size={14} />
            </button>
            {activeTab === 'installed' && (
              <button
                onClick={() => {
                  const name = prompt('Enter plugin package name:')
                  if (name) {
                    toast.promise(api.post('/system/plugins/inject', { name }), {
                      loading: 'Injecting package...',
                      success: 'Package injected successfully',
                      error: 'Injection failed',
                    }).then(() => fetchPlugins())
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Plus size={14} /> Inject Plugin
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-6">
        <div className="max-w-md">
          <div className={cn('flex items-center gap-3 px-4 py-2 border transition-all', dark ? 'bg-black border-white/[0.05]' : 'bg-white border-gray-200')}>
            <Search size={14} className="text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === 'installed' ? 'Search installed plugins...' : 'Search marketplace...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-black text-gray-500 w-full placeholder:text-gray-600 uppercase tracking-widest"
            />
          </div>
        </div>

        {displayList.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Box size={32} className="mx-auto mb-4 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">No plugins found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {displayList.map((plugin) => {
                const installed = isInstalled(plugin.name)
                return (
                  <motion.div
                    key={plugin.id || plugin.name}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="h-full flex flex-col">
                      <CardContent className="p-5 flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3 items-center">
                            <div className={cn('w-8 h-8 flex items-center justify-center border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200')}>
                              {plugin.icon}
                            </div>
                            <div>
                              <h3 className="text-[11px] font-black tracking-widest uppercase">{plugin.name}</h3>
                              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                                {plugin.author === 'ROOT_KERNEL' ? 'Zenith Core' : plugin.author} • v{plugin.version}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Minimalist features instead of descriptive text */}
                        <div className="flex-1">
                           <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                             {plugin.description}
                           </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                          <div className="flex items-center gap-3 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                            {plugin.verified && <span className="flex items-center gap-1"><ShieldCheck size={10} /> Verified</span>}
                            <span>{plugin.downloads?.toLocaleString()} DLs</span>
                          </div>

                          <div className="flex gap-2">
                            {activeTab === 'installed' ? (
                              <>
                                <button
                                  onClick={() => togglePlugin(plugin.id, plugin.status)}
                                  className={cn('px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest transition-colors', plugin.status === 'active' ? 'text-red-500 border-red-500/20 hover:bg-red-500/10' : 'text-gray-500 border-gray-500/20 hover:bg-gray-500/10')}
                                >
                                  {plugin.status === 'active' ? 'Disable' : 'Enable'}
                                </button>
                                {plugin.author !== 'ROOT_KERNEL' && (
                                  <button onClick={() => toast.error('Core Protection: Delete via CLI')} className="p-1.5 text-red-500/70 hover:bg-red-500/10">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                disabled={installed || installingId !== null}
                                onClick={() => installMarketplacePlugin(plugin as any)}
                                className={cn('px-4 py-1.5 border text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2', installed ? 'text-gray-500 border-gray-500/20 cursor-not-allowed' : 'text-white bg-emerald-500 border-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]')}
                              >
                                {installingId === plugin.id ? <Loader2 size={10} className="animate-spin" /> : <DownloadCloud size={10} />}
                                {installed ? 'Installed' : 'Install'}
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default PluginsPage
