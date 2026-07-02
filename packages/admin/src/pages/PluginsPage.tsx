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
  Code,
  Copy,
  Check,
  X
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
  const [installGuidePlugin, setInstallGuidePlugin] = useState<any>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const MARKETPLACE_PLUGINS: PluginData[] = [
    {
      id: 'cloudinary-asset-storage',
      name: 'Cloudinary Asset Storage',
      author: 'Cloudinary Inc.',
      version: '2.1.0',
      description: "Synchronizes Zenith's media manager to your Cloudinary cloud bucket with auto-responsive imaging and AVIF/WebP transformations.",
      downloads: 12482,
      verified: true,
      icon: <Database size={16} className="text-z-active-text" />,
    },
    {
      id: 'resend-email-engine',
      name: 'Resend Email Engine',
      author: 'Resend Team',
      version: '1.4.3',
      description: 'Integrates high-performance transactional email flows via React Email templates and Resend SMTP nodes.',
      downloads: 8912,
      verified: true,
      icon: <Mail size={16} className="text-z-secondary" />,
    },
    {
      id: 'algolia-search-matrix',
      name: 'Algolia Search Matrix',
      author: 'Algolia Labs',
      version: '3.0.1',
      description: 'Automatically indexes newly published content collections to Algolia indexes for instantaneous keyword discovery.',
      downloads: 6104,
      verified: true,
      icon: <Search size={16} className="text-z-active-text" />,
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
      icon: <Cpu size={16} className="text-z-secondary" />,
    },
    {
      id: 'aws-s3-storage',
      name: 'AWS S3 Storage Driver',
      author: 'Amazon Web Services',
      version: '3.1.5',
      description: 'Directly mount AWS S3 buckets as your primary asset storage with multi-region CDN routing and edge caching.',
      downloads: 42100,
      verified: true,
      icon: <Database size={16} className="text-amber-500" />,
    },
    {
      id: 'stripe-billing-portal',
      name: 'Stripe Billing Portal',
      author: 'Stripe, Inc.',
      version: '1.2.9',
      description: 'Native integration for subscription management, checkout sessions, and automated invoice syncing for Zenith Commerce.',
      downloads: 27503,
      verified: true,
      icon: <Activity size={16} className="text-indigo-400" />,
    },
    {
      id: 'posthog-analytics',
      name: 'PostHog Analytics',
      author: 'PostHog Team',
      version: '2.0.0',
      description: 'Capture product telemetry, user session recordings, and feature flags directly into your Zenith dashboard.',
      downloads: 11200,
      verified: true,
      icon: <Activity size={16} className="text-rose-500" />,
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
    if (lowercaseName.includes('cloudinary')) return <Database size={16} className="text-z-active-text" />
    if (lowercaseName.includes('resend') || lowercaseName.includes('mail')) return <Mail size={16} className="text-z-secondary" />
    if (lowercaseName.includes('algolia') || lowercaseName.includes('search')) return <Search size={16} className="text-z-active-text" />
    if (lowercaseName.includes('vercel') || lowercaseName.includes('deploy')) return <Activity size={16} className="text-amber-500" />
    if (lowercaseName.includes('openai') || lowercaseName.includes('copilot') || lowercaseName.includes('ai')) return <Cpu size={16} className="text-z-secondary" />
    return <Puzzle size={16} className="text-z-secondary" />
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
    setInstallGuidePlugin(mpPlugin)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    toast.success('Copied to clipboard')
  }

  useEffect(() => {
    fetchPlugins()
  }, [])

  const mergedMarketplacePlugins = [
    ...MARKETPLACE_PLUGINS,
    ...plugins.filter(p => !MARKETPLACE_PLUGINS.some(mp => mp.name.toLowerCase() === p.name.toLowerCase()))
  ]

  const displayList = (activeTab === 'installed'
    ? plugins.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : mergedMarketplacePlugins.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) as PluginData[]

  const isInstalled = (name: string) => plugins.some((p) => p.name.toLowerCase() === name.toLowerCase())

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-z-secondary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Plugin System"
        actions={
          <div className="flex gap-2">
            <div className={cn('flex p-1 border', dark ? 'bg-app border-z-border' : 'bg-z-panel border-z-border')}>
              <button
                onClick={() => setActiveTab('installed')}
                className={cn('px-4 py-1.5 text-sm font-semibold   transition-colors', activeTab === 'installed' ? (dark ? 'bg-white/15 text-white' : 'bg-z-primary text-z-inverse') : 'text-z-secondary')}
              >
                Installed
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={cn('px-4 py-1.5 text-sm font-semibold   transition-colors', activeTab === 'marketplace' ? (dark ? 'bg-white/15 text-white' : 'bg-z-primary text-z-inverse') : 'text-z-secondary')}
              >
                Marketplace
              </button>
            </div>
            <button
              onClick={fetchPlugins}
              className={cn('px-3 border text-z-secondary hover:text-z-primary transition-colors', dark ? 'bg-app border-z-border' : 'bg-z-panel border-z-border')}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-6">
        <div className="max-w-md">
          <div className={cn('flex items-center gap-3 px-4 py-2 border transition-all', dark ? 'bg-app border-z-border' : 'bg-z-panel border-z-border')}>
            <Search size={14} className="text-z-secondary" />
            <input
              type="text"
              placeholder={activeTab === 'installed' ? 'Search installed plugins...' : 'Search marketplace...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-semibold text-z-secondary w-full placeholder:text-z-secondary"
            />
          </div>
        </div>

        {displayList.length === 0 ? (
          <div className="text-center py-20 text-z-secondary">
            <Box size={32} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm font-semibold">No plugins found</p>
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
                            <div className={cn('w-8 h-8 flex items-center justify-center border', dark ? 'bg-app border-z-border' : 'bg-z-input border-z-border')}>
                              {plugin.icon}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold">{plugin.name}</h3>
                              <p className="text-sm text-z-secondary font-bold">
                                {plugin.author === 'ROOT_KERNEL' ? 'Zenith Core' : plugin.author} • v{plugin.version}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Minimalist features instead of descriptive text */}
                        <div className="flex-1">
                           <p className="text-sm text-z-secondary leading-relaxed line-clamp-2">
                             {plugin.description}
                           </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-z-border">
                          <div className="flex items-center gap-3 text-sm text-z-secondary font-bold">
                            {plugin.verified && <span className="flex items-center gap-1"><ShieldCheck size={10} /> Verified</span>}
                            <span>{plugin.downloads?.toLocaleString()} DLs</span>
                          </div>

                          <div className="flex gap-2">
                            {activeTab === 'installed' ? (
                              <>
                                <button
                                  onClick={() => togglePlugin(plugin.id, plugin.status)}
                                  className={cn('px-3 py-1.5 border text-sm font-semibold   transition-colors', plugin.status === 'active' ? 'text-red-500 border-red-500/20 hover:bg-red-500/10' : 'text-z-secondary border-z-border/20 hover:bg-z-panel')}
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
                                className={cn('px-4 py-1.5 border text-sm font-semibold   transition-colors flex items-center gap-2', installed ? 'text-z-secondary border-z-border/20 cursor-not-allowed' : 'text-z-primary bg-z-accent border-z-accent hover:bg-z-accent shadow-sm')}
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

      {/* Plugin Install Guide Modal */}
      {installGuidePlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={cn('max-w-2xl w-full border shadow-2xl flex flex-col', dark ? 'bg-app border-z-border' : 'bg-z-panel border-z-border')}>
            <div className="flex justify-between items-center p-5 border-b border-z-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-z-border bg-z-input flex items-center justify-center">
                  {installGuidePlugin.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{installGuidePlugin.name}</h3>
                  <p className="text-xs text-z-secondary font-semibold">Official Installation Guide</p>
                </div>
              </div>
              <button onClick={() => setInstallGuidePlugin(null)} className="p-2 text-z-secondary hover:text-z-primary transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-editor-scrollbar">
              <p className="text-sm text-z-secondary leading-relaxed">
                To keep Zenith extremely lightweight and production-safe, plugins are installed via your terminal instead of the web dashboard. This guarantees your code repository matches your production environment.
              </p>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-z-primary">
                  <span className="w-5 h-5 flex items-center justify-center bg-z-accent text-z-primary text-xs rounded-full">1</span> 
                  Install the NPM Package
                </h4>
                <div className="relative group">
                  <pre className="bg-black text-[#A1B3CD] p-4 text-xs font-mono border border-[rgba(255,255,255,0.1)] overflow-x-auto whitespace-pre-wrap">
                    pnpm add @zenith-open/{installGuidePlugin.id || installGuidePlugin.name.toLowerCase().replace(/\s+/g, '-')}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(`pnpm add @zenith-open/${installGuidePlugin.id || installGuidePlugin.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    className="absolute top-2 right-2 p-1.5 bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-z-primary">
                  <span className="w-5 h-5 flex items-center justify-center bg-z-accent text-z-primary text-xs rounded-full">2</span> 
                  Enable in your config
                </h4>
                <p className="text-xs text-z-secondary">Open <code className="bg-z-input px-1.5 py-0.5 text-z-primary font-mono border border-z-border">cms.config.ts</code> and add the plugin to the array.</p>
                <div className="relative group">
                  <pre className="bg-black text-[#A1B3CD] p-4 text-xs font-mono border border-[rgba(255,255,255,0.1)] overflow-x-auto whitespace-pre-wrap">
{`import { zenithPlugin } from '@zenith-open/${installGuidePlugin.id || installGuidePlugin.name.toLowerCase().replace(/\s+/g, '-')}'

export default buildConfig({
  collections: [...],
  plugins: [
    zenithPlugin({
      // Provide any necessary config options here
    })
  ]
})`}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(`import { zenithPlugin } from '@zenith-open/${installGuidePlugin.id || installGuidePlugin.name.toLowerCase().replace(/\s+/g, '-')}'\n\nexport default buildConfig({\n  collections: [...],\n  plugins: [\n    zenithPlugin({\n      // Provide any necessary config options here\n    })\n  ]\n})`)}
                    className="absolute top-2 right-2 p-1.5 bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-z-primary">
                  <span className="w-5 h-5 flex items-center justify-center bg-z-accent text-z-primary text-xs rounded-full">3</span> 
                  Restart the Server
                </h4>
                <p className="text-xs text-z-secondary">Restart your development server and the plugin will be instantly active!</p>
              </div>

            </div>
            <div className="p-4 border-t border-z-border bg-z-input flex justify-end">
              <button 
                onClick={() => setInstallGuidePlugin(null)}
                className="px-6 py-2 bg-z-panel text-z-primary border border-z-border text-sm font-bold shadow-sm hover:bg-z-input transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PluginsPage
