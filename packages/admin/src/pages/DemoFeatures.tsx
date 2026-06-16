import { useState, useEffect } from 'react'
import {
  Zap,
  Shield,
  Sparkles,
  Activity,
  Search,
  Command,
  Cpu,
  Globe,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { useTheme } from '../context/ThemeContext'

const DemoFeatures = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [prompt, setPrompt] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .get('/system/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => console.error('Stats failed', err))
  }, [])

  const testAI = async () => {
    if (!prompt) return
    setLoading(true)
    setTimeout(() => {
      setAiResult(`Zenith_AI: I've analyzed your prompt "${prompt}" and synthesized a high-fidelity architectural schema for your landing page module.`)
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Playground"
        actions={
          <div className="px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} className="animate-pulse" />
            Labs V2.4
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-6">
        {/* Intelligence Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Uptime', value: stats ? `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m` : '...', icon: Activity },
            { label: 'Collections', value: stats?.collectionsCount || '14', icon: Layers },
            { label: 'Memory', value: stats ? `${Math.round(stats.memory.rss / 1024 / 1024)}MB` : '256MB', icon: Cpu },
            { label: 'Kernel', value: stats?.nodeVersion || 'v20.12', icon: Command },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <stat.icon className={cn('w-4 h-4', dark ? 'text-gray-500' : 'text-gray-400')} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{stat.label}</span>
                </div>
                <div className="text-2xl font-black uppercase tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Content Engine */}
          <Card>
            <CardContent className="p-8 space-y-8 flex flex-col h-full">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 flex items-center justify-center border', dark ? 'bg-white/5 border-white/[0.08] text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600')}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black uppercase tracking-widest">Neural Engine</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Content Synthesis</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="COMMAND ZENITH AI..."
                  className={cn(
                    'w-full h-32 border p-5 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-colors resize-none uppercase tracking-widest',
                    dark ? 'bg-black border-white/[0.08] text-white focus:border-emerald-500/40' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500'
                  )}
                />

                <button
                  onClick={testAI}
                  disabled={loading || !prompt}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Activity size={16} className="animate-pulse" /> : <Zap size={16} />}
                  {loading ? 'Synthesizing...' : 'Generate Architecture'}
                </button>

                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('p-5 border text-xs font-mono leading-relaxed', dark ? 'bg-white/5 border-white/[0.08] text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')}
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-2">AI RESULT BUFFER</p>
                      {aiResult}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure */}
          <Card>
            <CardContent className="p-8 space-y-8 flex flex-col h-full">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 flex items-center justify-center border', dark ? 'bg-white/5 border-white/[0.08] text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600')}>
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black uppercase tracking-widest">Global Edge</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Multi-Region Distribution</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {[
                  { label: 'Omni Search', detail: 'CMD+K Ready', icon: Search },
                  { label: 'Encrypted', detail: 'L4 Hardening', icon: Shield },
                  { label: 'Low Latency', detail: 'Edge Network', icon: Zap }
                ].map((feature, idx) => (
                  <div key={idx} className={cn('flex items-center justify-between p-5 border group', dark ? 'bg-black border-white/[0.08] hover:border-white/[0.2]' : 'bg-white border-gray-200 hover:border-gray-400')}>
                    <div className="flex items-center gap-4">
                      <feature.icon size={16} className={dark ? 'text-gray-500' : 'text-gray-400'} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">{feature.label}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{feature.detail}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DemoFeatures
