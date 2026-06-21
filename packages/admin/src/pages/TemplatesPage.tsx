import React, { useState, useRef, useEffect } from 'react'
import {
 Layout,
 GitBranch,
 GitFork,
 ExternalLink,
 Globe,
 Server,
 CheckCircle2,
 ArrowRight,
 Terminal,
 CloudLightning,
 Sparkles,
 Search,
 Layers,
 Activity,
 Copy,
 Check,
 Download,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

interface Template {
 id: string
 name: string
 version: string
 description: string
 gitUrl: string
 tags: string[]
 stars: number
 performanceScore: number
 primaryColor: string
 accentColor: string
 features: string[]
 category: string
 slug: string
}

const TEMPLATES: Template[] = [
 {
 id: 'storefront-glass',
 name: 'Zenith Glassmorphism Storefront',
 version: '2.4.0',
 description:
 'A luxury, dark-obsidian glassmorphic storefront. Features responsive sliding cards, premium translucent grid elements, dynamic hardware-accelerated Framer Motion overlays, and ultra-fast client-side state caching.',
 gitUrl: 'https://github.com/AmanTShekar/zenith-storefront-glass',
 tags: ['React 19', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Zustand'],
 stars: 382,
 performanceScore: 99,
 primaryColor: 'from-z-accent to-transparent',
 accentColor: 'var(--z-accent)',
 features: [
 'Interactive spatial layout engine',
 'Advanced dark mode glassmorphism styles',
 'Unified search & custom command palette',
 'Pre-configured global cache adapters',
 ],
 category: 'E-Commerce / Portfolio',
 slug: 'storefront-glass',
 },
 {
 id: 'storefront-editorial',
 name: 'Zenith Editorial Storefront',
 version: '1.8.0',
 description:
 'A premium magazine-style, bold typography design featuring asymmetrical grids, elegant content layouts, high-impact readability styles, fluid transitions, and pre-integrated Zenith CMS collection feeds.',
 gitUrl: 'https://github.com/AmanTShekar/zenith-storefront-editorial',
 tags: ['Next.js 15', 'React 19', 'Tailwind CSS', 'Radix UI', 'SWR'],
 stars: 219,
 performanceScore: 98,
 primaryColor: 'from-z-accent to-transparent',
 accentColor: 'var(--z-accent)',
 features: [
 'Stunning asymmetric typography grid',
 'Dynamic SWR-based native API integration',
 'Automated content caching out-of-the-box',
 'Flawless SEO & structured semantic schema',
 ],
 category: 'Editorial / Blog',
 slug: 'storefront-editorial',
 },
 {
 id: 'blog-demo',
 name: 'Zenith Blog Demo',
 version: '1.2.0',
 description:
 'A high-performance developer blog and content hub. Features dynamic SWR-based native API integration, automated content caching, and clean modern layout optimized for text readability and coding snippets.',
 gitUrl: 'https://github.com/AmanTShekar/zenith-blog-demo',
 tags: ['React 19', 'Vite', 'Tailwind CSS', 'SWR'],
 stars: 128,
 performanceScore: 100,
 primaryColor: 'from-z-accent to-transparent',
 accentColor: 'var(--z-accent)',
 features: [
 'Pre-integrated SWR data synchronization',
 'Perfect lighthouse readability & layout scores',
 'Support for syntax highlighting & markdown',
 'Optimized asset loading & lazy fetching',
 ],
 category: 'Editorial / Blog',
 slug: 'blog-demo',
 },
 {
 id: 'demo',
 name: 'Zenith Demo Storefront',
 version: '1.5.0',
 description:
 'A sleek storefront showcasing standard components, product catalogs, and interactive features. Includes cart systems, localized product grids, and instant page builder sync.',
 gitUrl: 'https://github.com/AmanTShekar/zenith-demo',
 tags: ['React 19', 'Vite', 'Tailwind CSS', 'Axios'],
 stars: 145,
 performanceScore: 97,
 primaryColor: 'from-z-accent to-transparent',
 accentColor: 'var(--z-accent)',
 features: [
 'Interactive shopping shopping cart system',
 'Real-time bi-directional layout synchronization',
 'Pre-populated product catalog grid feeds',
 'Dynamic multi-locale theme switching',
 ],
 category: 'E-Commerce / Portfolio',
 slug: 'demo',
 },
]

const TemplatesPage: React.FC = () => {
 const { theme } = useTheme()
 const activeSiteSlug = localStorage.getItem('activeSiteSlug') || ''
 const [searchQuery, setSearchQuery] = useState('')
 const [activeCategory, setActiveCategory] = useState<string>('All')
 const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
 const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
 const [provider, setProvider] = useState<'vercel' | 'netlify' | 'cloudflare'>('vercel')
 const [deployStep, setDeployStep] = useState<number>(0) // 0: Config, 1: Connecting, 2: Building, 3: Routing, 4: Success
 const [terminalLogs, setTerminalLogs] = useState<string[]>([])
 const [liveUrl, setLiveUrl] = useState('')
 const [copied, setCopied] = useState(false)

 const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
 const buildIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
 const networkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

 useEffect(() => {
   return () => {
     if (logIntervalRef.current) clearInterval(logIntervalRef.current)
     if (buildIntervalRef.current) clearInterval(buildIntervalRef.current)
     if (networkIntervalRef.current) clearInterval(networkIntervalRef.current)
   }
 }, [])

 // Filter Categories
 const categories = ['All', 'E-Commerce / Portfolio', 'Editorial / Blog']

 const filteredTemplates = TEMPLATES.filter((template) => {
 const matchesSearch =
 template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
 template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
 const matchesCategory = activeCategory === 'All' || template.category === activeCategory
 return matchesSearch && matchesCategory
 })

 // Start continuous deployment simulation
 const handleStartDeployment = () => {
 if (!selectedTemplate) return
 setDeployStep(1)
 setTerminalLogs([])
 
 // Simulate terminal logs generator
 const logs = [
 `[system] Initializing deployment protocol for @zenith-open/${selectedTemplate.slug}...`,
 `[system] Selected target provider: ${provider.toUpperCase()}`,
 `[git] Cloning repository from ${selectedTemplate.gitUrl}...`,
 `[git] Branch: main (HEAD resolved to latest secure release v${selectedTemplate.version})`,
 `[system] Provisioning sandbox container on global edge node...`,
 `[system] Installing workspace dependencies via pnpm...`,
 `[build] Resolving node modules: 173 packages successfully installed.`,
 `[build] Starting project compile step: "pnpm run build"...`,
 `[build] vite v1.0.0-beta building for production...`,
 `[build] ✓ 42 modules transformed.`,
 `[build] dist/assets/index-D8g9sK.js 142.64 kB │ gzip: 43.12 kB`,
 `[build] dist/assets/index-C1h8aD.css 31.42 kB │ gzip: 8.94 kB`,
 `[build] ✓ built in 1.48s`,
 `[system] Bundle generated successfully!`,
 `[network] Uploading assets to global Edge CDN caching layers...`,
 `[network] Synchronizing routing configurations & static revalidation rules...`,
 `[network] Activating secure SameSite=Strict endpoints and HTTPS configurations...`,
 `[system] Deployment completed. SSL handshake verified!`,
 ]

 let logIndex = 0
 const logInterval = setInterval(() => {
 if (logIndex < 6) {
 setTerminalLogs((prev) => [...prev, logs[logIndex]])
 logIndex++
 } else {
 clearInterval(logInterval)
 logIntervalRef.current = null
 setDeployStep(2) // Move to Building state
 
 let buildLogIndex = 6
 const buildInterval = setInterval(() => {
 if (buildLogIndex < 13) {
 setTerminalLogs((prev) => [...prev, logs[buildLogIndex]])
 buildLogIndex++
 } else {
 clearInterval(buildInterval)
 buildIntervalRef.current = null
 setDeployStep(3) // Move to Edge Routing state
 
 let networkLogIndex = 13
 const networkInterval = setInterval(() => {
 if (networkLogIndex < logs.length) {
 setTerminalLogs((prev) => [...prev, logs[networkLogIndex]])
 networkLogIndex++
 } else {
 clearInterval(networkInterval)
 networkIntervalRef.current = null
 setDeployStep(4) // Success!
 setLiveUrl(`https://zenith-${selectedTemplate.slug}.${provider}.app`)
 toast.success('Storefront successfully deployed!')
 }
 }, 800)
 networkIntervalRef.current = networkInterval
 }
 }, 600)
 buildIntervalRef.current = buildInterval
 }
 }, 450)
 logIntervalRef.current = logInterval
 }

 const copyToClipboard = (text: string) => {
 navigator.clipboard.writeText(text)
 setCopied(true)
 toast.success('Live URL copied to clipboard!')
 setTimeout(() => setCopied(false), 2000)
 }

 return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Templates"
        actions={
          <div
            className={cn(
              'p-1 rounded-none-none border flex items-center shadow-sm backdrop-blur-xl',
              'bg-z-panel border-z-border shadow-sm'
            )}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2 text-sm font-semibold   rounded-none-none transition-all leading-none whitespace-nowrap',
                  activeCategory === cat
                    ? theme === 'dark'
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-gray-900 text-white shadow-lg'
                    : 'text-z-secondary hover:text-gray-700'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        }
      />

      <div className={cn(
        'flex-1 overflow-y-auto p-6 md:p-10 space-y-8 transition-colors duration-500 relative pb-12',
        theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-z-primary'
      )}>
        {/* 🌌 High-Tech Glassmorphic Hero Panel */}
        <div
          className={cn(
            'relative p-6 md:p-8 overflow-hidden border backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-all',
            theme === 'dark'
              ? 'bg-gradient-to-r from-zinc-950 via-neutral-900 to-zinc-950 border-z-border shadow-white/5'
              : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-z-border shadow-sm'
          )}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gray-500/10 blur-[100px] pointer-events-none rounded-none-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gray-500/5 blur-[100px] pointer-events-none rounded-none-none" />

          <div className="flex-1 space-y-2 z-10">
            <div className="flex items-center gap-2 text-gray-600 dark:text-z-secondary">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-sm font-semibold">
                Sandbox
              </span>
            </div>
            <h2 className="text-2xl font-semibold leading-tight">
              Deploy Templates
            </h2>
          </div>

          {/* Search Input Box */}
          <div
            className={cn(
              'flex items-center gap-4 px-5 py-3 rounded-none-none border shadow-inner w-full md:max-w-xs transition-all group z-10 shrink-0 self-start md:self-auto',
              theme === 'dark' ? 'bg-z-hover border-z-border' : 'bg-z-panel border-z-border shadow-sm shadow-sm'
            )}
          >
            <Search
              size={14}
              className="text-z-secondary group-focus-within:text-gray-600 dark:text-z-secondary transition-colors"
            />
            <input
              type="text"
              placeholder="Filter by tech or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-sm font-semibold text-z-muted w-full placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* 📋 Showcase Cards Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-30 border border-dashed border-z-border">
            <Layout size={40} strokeWidth={1} className="text-z-secondary animate-pulse" />
            <p className="text-sm font-semibold">
              No templates matching filters found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  interactive
                  padding="none"
                  className="flex flex-col relative group"
                >
                  <CardContent className="flex flex-col flex-1 gap-6">
                  {/* Accent Highlight Bar */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity',
                      template.primaryColor
                    )}
                  />

                  {/* Card Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-z-secondary">
                          {template.category}
                        </span>
                        <span className="w-1 h-1 bg-gray-500 rounded-none-none" />
                        <span className="text-sm font-mono font-semibold text-gray-600 dark:text-z-muted">
                          v{template.version}
                        </span>
                        {template.slug === activeSiteSlug && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-500/10 text-gray-600 dark:text-z-muted border border-gray-500/20 text-sm font-semibold leading-none">
                            <Activity size={8} />
                            Active Workspace / Site
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold leading-none group-hover:text-gray-600 dark:text-z-muted transition-colors mt-1.5">
                        {template.name}
                      </h3>
                    </div>

                    {/* Performance Matrix */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-z-secondary leading-none">
                          Lighthouse
                        </span>
                        <span className="text-lg font-semibold text-gray-600 dark:text-z-secondary mt-1">
                          {template.performanceScore}%
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-none-none border border-gray-500/20 bg-gray-500/5 flex items-center justify-center text-gray-600 dark:text-z-secondary font-bold text-xs">
                        {template.performanceScore}
                      </div>
                    </div>
                  </div>

                  {/* Custom Gradient Mock Image Area */}
                  <div
                    className={cn(
                      'w-full h-40 rounded-none-none relative overflow-hidden border transition-all duration-500 flex items-center justify-center group-hover:scale-[1.01]',
                      theme === 'dark' ? 'bg-black border-z-border' : 'bg-z-input border-z-border shadow-sm'
                    )}
                  >
                    {/* Glass Card Vector Grid Backdrop */}
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                    <div
                      className={cn(
                        'absolute w-48 h-48 rounded-none-none blur-[60px] opacity-20 bg-gradient-to-br',
                        template.primaryColor
                      )}
                    />

                    {/* Decorative Elements mimicking UI */}
                    <div className="w-5/6 h-2/3 border border-z-border rounded-none-none bg-black/45 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-none-none bg-red-500/40" />
                          <div className="w-2 h-2 rounded-none-none bg-yellow-500/40" />
                          <div className="w-2 h-2 rounded-none-none bg-green-500/40" />
                        </div>
                        <div className="px-2 py-0.5 bg-z-hover border border-z-border rounded-none-none text-sm font-mono text-z-secondary">
                          SECURE_SSL
                        </div>
                      </div>

                      <div className="space-y-1.5 my-2">
                        <div className="h-2 w-1/3 bg-white/10 rounded-none-none" />
                        <div className="h-1.5 w-2/3 bg-z-hover rounded-none-none" />
                        <div className="h-1.5 w-1/2 bg-z-hover rounded-none-none" />
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-z-border">
                        <div className="flex items-center gap-1 text-z-secondary text-sm font-semibold">
                          <Layers size={8} /> {template.id === 'storefront-glass' ? 'Glassmorphism' : template.id === 'storefront-editorial' ? 'Editorial' : template.id === 'blog-demo' ? 'Dev Blog' : 'E-Commerce'}
                        </div>
                        <div className="w-8 h-3 bg-white/10 rounded-none-none" />
                      </div>
                    </div>
                  </div>

                  {/* Features Highlights */}
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-z-secondary leading-none">
                      Core Specifications
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {template.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                          <div className="w-1.5 h-1.5 bg-gray-500/40 border border-gray-500 rounded-none-none shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'px-2 py-1 text-sm font-mono font-semibold   border rounded-none-none shadow-sm',
                          theme === 'dark'
                            ? 'bg-z-hover border-z-border text-gray-300'
                            : 'bg-gray-100 border-z-border text-gray-600'
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Clone Command & Zip Download */}
                  <div className={cn(
                    'p-3 border rounded-none-none flex items-center justify-between gap-3 text-sm font-mono',
                    theme === 'dark' ? 'bg-black border-z-border text-z-muted' : 'bg-z-input border-z-border text-gray-600'
                  )}>
                    <div className="flex items-center gap-1.5 truncate">
                      <Terminal size={10} className="text-gray-600 dark:text-z-muted" />
                      <span className="truncate select-all">git clone {template.gitUrl}.git</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`git clone ${template.gitUrl}.git`)
                          toast.success('Clone command copied!')
                        }}
                        className={cn(
                          'p-1.5 rounded-none-none border transition-all flex items-center justify-center hover:scale-105 active:scale-95',
                          theme === 'dark' ? 'border-z-border bg-z-hover hover:text-white' : 'border-z-border bg-white hover:text-black'
                        )}
                        title="Copy clone command"
                      >
                        <Copy size={10} />
                      </button>
                      <a
                        href={`${template.gitUrl}/archive/refs/heads/main.zip`}
                        className={cn(
                          'p-1.5 rounded-none-none border transition-all flex items-center justify-center hover:scale-105 active:scale-95',
                          theme === 'dark' ? 'border-z-border bg-z-hover text-z-muted hover:text-white' : 'border-z-border bg-white text-gray-600 hover:text-black'
                        )}
                        title="Download ZIP"
                      >
                        <Download size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Git Action Panel */}
                  <div className="pt-4 border-t border-z-border mt-auto flex items-center justify-between gap-4">
                    <a
                      href={template.gitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        'px-4 py-3 border rounded-none-none text-sm font-semibold   transition-all leading-none flex items-center gap-2 group/git',
                        theme === 'dark'
                          ? 'border-z-border bg-z-panel text-z-muted hover:text-white hover:border-z-border'
                          : 'border-z-border bg-white text-gray-600 hover:text-black hover:border-z-border-strong shadow-sm'
                      )}
                    >
                      <GitFork size={12} className="group-hover/git:rotate-12 transition-transform" />
                      Git Repository
                      <ExternalLink size={10} className="opacity-40 group-hover/git:opacity-100 transition-opacity" />
                    </a>

                    <button
                      onClick={() => {
                        setSelectedTemplate(template)
                        setDeployStep(0)
                        setIsDeployModalOpen(true)
                      }}
                      className={cn(
                        'px-5 py-3 rounded-none-none text-sm font-semibold   shadow-lg transition-all leading-none flex items-center gap-2 active:scale-95 text-white',
                        template.primaryColor
                      )}
                      style={{
                        boxShadow: `0 4px 15px -4px ${template.accentColor}33`,
                      }}
                    >
                      <CloudLightning size={12} className="animate-bounce" />
                      Deploy Instance
                      <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  </CardContent>
                </Card>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 🚀 Tactical Continuous Deployment Overlay Modal */}
        <AnimatePresence>
          {isDeployModalOpen && selectedTemplate && (
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
              {/* Backdrop blur overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  // Prevent accidental closure during deployment build sequence
                  if (deployStep === 0 || deployStep === 4) {
                    setIsDeployModalOpen(false)
                  } else {
                    toast.error('Build sequence in progress. Please wait for termination.')
                  }
                }}
                className="absolute inset-0 bg-black/85 backdrop-blur-xl"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'w-full max-w-2xl border rounded-none-none p-6 md:p-8 flex flex-col gap-6 relative shadow-2xl overflow-hidden z-10',
                  theme === 'dark' ? 'bg-black border-z-border' : 'bg-z-panel border-z-border'
                )}
              >
                {/* Top Accent Gradient Bar */}
                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r',
                    selectedTemplate.primaryColor
                  )}
                />

                {/* Close Panel Button */}
                {(deployStep === 0 || deployStep === 4) && (
                  <button
                    onClick={() => setIsDeployModalOpen(false)}
                    className={cn(
                      'absolute top-6 right-6 w-8 h-8 rounded-none-none border flex items-center justify-center text-z-secondary hover:text-white transition-all',
                      theme === 'dark' ? 'bg-z-hover border-z-border' : 'bg-z-input border-z-border'
                    )}
                  >
                    ✕
                  </button>
                )}

                {/* Step Title Header */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-none-none flex items-center justify-center text-white',
                      selectedTemplate.primaryColor
                    )}
                  >
                    <Server size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                      Zero-Config Handshake
                    </span>
                    <h3 className="text-xl font-semibold leading-none mt-1">
                      {deployStep === 4 ? 'Deploy Successful!' : `Deploying ${selectedTemplate.name}`}
                    </h3>
                  </div>
                </div>

                {/* Active Deployment Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 border-b border-z-border pb-5">
                  {[
                    { label: 'Configure', activeStep: 0 },
                    { label: 'Connect Repo', activeStep: 1 },
                    { label: 'Compile Code', activeStep: 2 },
                    { label: 'Route Domain', activeStep: 3 },
                  ].map((s, idx) => {
                    const isCompleted = deployStep > s.activeStep || deployStep === 4
                    const isActive = deployStep === s.activeStep
                    return (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div
                          className={cn(
                            'h-1 w-full rounded-none-none transition-all duration-500',
                            isCompleted
                              ? 'bg-gray-500 shadow-sm'
                              : isActive
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-z-hover'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-semibold   leading-none mt-0.5',
                            isCompleted || isActive ? 'text-white' : 'text-gray-600'
                          )}
                        >
                          {idx + 1}. {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* STEP CONTENT SWITCHER */}
                <div className="min-h-[220px] flex flex-col justify-between gap-5">
                  {deployStep === 0 && (
                    <div className="space-y-5">
                      {/* Provider Select Cards */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-z-secondary leading-none">
                          1. Select Cloud Deployment Target
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { id: 'vercel', name: 'Vercel Edge', latency: 'Fastest' },
                            { id: 'netlify', name: 'Netlify CDN', latency: 'Stable' },
                            { id: 'cloudflare', name: 'Cloudflare Pages', latency: 'Zero-Lag' },
                          ].map((prov) => (
                            <button
                              key={prov.id}
                              onClick={() => setProvider(prov.id as any)}
                              className={cn(
                                'border p-3 flex flex-col items-center justify-center gap-2 rounded-none-none transition-all group relative',
                                provider === prov.id
                                  ? 'bg-gray-500/10 border-gray-500 text-white shadow-sm'
                                  : 'bg-white/[0.01] border-z-border text-z-secondary hover:text-gray-300 hover:border-z-border'
                              )}
                            >
                              <span className="text-xs font-semibold">
                                {prov.name}
                              </span>
                              <span
                                className={cn(
                                  'text-sm font-mono   px-1.5 py-0.5 rounded-none-none border',
                                  provider === prov.id
                                    ? 'border-gray-500/30 text-gray-600 dark:text-z-muted bg-gray-500/5'
                                    : 'border-z-border text-gray-600 bg-z-hover'
                                )}
                              >
                                {prov.latency}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Repo Metadata display */}
                      <div
                        className={cn(
                          'p-4 border rounded-none-none flex items-center justify-between gap-4',
                          theme === 'dark' ? 'bg-white/[0.01] border-z-border' : 'bg-z-input border-z-border shadow-sm'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GitBranch size={16} className="text-gray-600 dark:text-z-muted" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold leading-none text-white">
                              AmanTShekar/{selectedTemplate.slug}
                            </span>
                            <span className="text-sm font-bold text-z-secondary mt-1">
                              GitHub Repository Handshake
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-mono text-gray-600 dark:text-z-muted px-2 py-1 bg-gray-500/5 border border-gray-500/20">
                          ● CONNECTED
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-z-border flex justify-end">
                        <button
                          onClick={handleStartDeployment}
                          className={cn(
                            'px-8 py-3.5 rounded-none-none text-sm font-semibold   shadow-lg transition-all leading-none flex items-center gap-2 active:scale-95 text-white',
                            selectedTemplate.primaryColor
                          )}
                        >
                          <CloudLightning size={12} />
                          Trigger Pipeline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SIMULATED ANIMATED TERMINAL / PROGRESS LOGS */}
                  {(deployStep === 1 || deployStep === 2 || deployStep === 3) && (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Terminal size={14} className="text-gray-600 dark:text-z-muted" />
                          <span className="text-sm font-semibold text-z-secondary">
                            Simulated Edge Console Output
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-none-none bg-amber-500 animate-ping" />
                          <span className="text-sm font-mono text-amber-500 font-semibold">
                            {deployStep === 1
                              ? 'GIT_FETCH'
                              : deployStep === 2
                                ? 'COMPILING'
                                : 'EDGE_ROUTING'}
                          </span>
                        </div>
                      </div>

                      {/* Console Logger */}
                      <div className="flex-1 min-h-[160px] bg-black border border-z-border p-4 font-mono text-sm text-z-muted overflow-y-auto space-y-1.5 scroll-smooth">
                        {terminalLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'leading-relaxed  ',
                              log.startsWith('[error]')
                                ? 'text-red-500'
                                : log.startsWith('[build]')
                                  ? 'text-gray-300'
                                  : log.startsWith('[network]')
                                    ? 'text-z-active-text'
                                    : 'text-gray-300'
                            )}
                          >
                            <span className="text-gray-600 mr-2">[{idx + 1}]</span>
                            {log}
                          </div>
                        ))}
                        {/* Interactive Cursor */}
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600 mr-2">[{terminalLogs.length + 1}]</span>
                          <div className="w-1.5 h-3 bg-gray-500 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUCCESS STAGE */}
                  {deployStep === 4 && (
                    <div className="space-y-6 text-center py-4">
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-16 h-16 bg-gray-500/10 border border-gray-500/30 rounded-none-none flex items-center justify-center mx-auto text-gray-600 dark:text-z-secondary shadow-sm"
                      >
                        <CheckCircle2 size={32} strokeWidth={2.5} />
                      </motion.div>

                      <div className="space-y-2">
                        <h4 className="text-lg font-semibold leading-none text-white">
                          Production Live Ready
                        </h4>
                        <p className="text-sm text-z-secondary max-w-sm mx-auto leading-relaxed">
                          Continuous deployment webhook registered. Updates pushed to git main will trigger
                          regenerations.
                        </p>
                      </div>

                      {/* Clipboard copy container */}
                      <div
                        className={cn(
                          'max-w-md mx-auto p-4 border rounded-none-none flex items-center justify-between gap-4 bg-black/40',
                          theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Globe size={16} className="text-gray-600 dark:text-z-muted shrink-0" />
                          <span className="text-sm font-semibold text-white truncate font-mono">
                            {liveUrl}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(liveUrl)}
                          className={cn(
                            'p-2.5 rounded-none-none border transition-all flex items-center justify-center shrink-0',
                            copied
                              ? 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-z-muted'
                              : 'bg-z-hover border-z-border text-z-muted hover:text-white'
                          )}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div className="pt-4 border-t border-z-border flex items-center justify-between gap-4 max-w-md mx-auto">
                        <button
                          onClick={() => setIsDeployModalOpen(false)}
                          className={cn(
                            'w-full py-3.5 border rounded-none-none text-sm font-semibold   transition-all leading-none',
                            theme === 'dark'
                              ? 'border-z-border bg-white/[0.01] text-z-muted hover:text-white hover:border-z-border'
                              : 'border-z-border bg-white text-gray-600 hover:text-black hover:border-z-border-strong'
                          )}
                        >
                          Dismiss Console
                        </button>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'w-full py-3.5 rounded-none-none text-sm font-semibold   transition-all leading-none flex items-center justify-center gap-2 text-white',
                            selectedTemplate.primaryColor
                          )}
                        >
                          Launch Storefront
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default TemplatesPage
