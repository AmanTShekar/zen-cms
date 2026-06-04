import { useState } from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Zap,
  Terminal,
  Cpu,
  MessageSquare,
  PenTool,
  Type,
  Globe,
  ShieldCheck,
  Search,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

type AIMode = 'content' | 'structure' | 'tools'
type ToolType = 'seo' | 'quality' | 'improve' | 'meta' | 'alt'

const AIWriterPage = () => {
  const { theme } = useTheme()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [mode, setMode] = useState<AIMode>('content')
  const [isInputVisible, setIsInputVisible] = useState(true)
  const [activeTool, setActiveTool] = useState<ToolType>('seo')

  const tools = [
    { id: 'seo', name: 'SEO Scan', icon: Search, endpoint: '/content-tools/seo-analysis' },
    { id: 'quality', name: 'Quality Audit', icon: ShieldCheck, endpoint: '/content-tools/quality' },
    { id: 'improve', name: 'Refine Text', icon: Sparkles, endpoint: '/content-tools/ai/improve' },
    { id: 'meta', name: 'Meta Gen', icon: Globe, endpoint: '/content-tools/ai/meta-description' },
    { id: 'alt', name: 'Alt Text Gen', icon: ImageIcon, endpoint: '/content-tools/ai/alt-text' },
  ]

  const handleExecute = async () => {
    if (!prompt.trim() && activeTool !== 'alt') return
    setLoading(true)
    setResult(null)
    try {
      let res
      if (mode === 'structure') {
        res = await api.post('/system/ai-architect', { prompt })
        setResult(JSON.stringify(res.data.data.schema, null, 2))
      } else if (mode === 'content') {
        res = await api.post('/content-tools/ai/generate', { prompt })
        setResult(res.data.data.text)
      } else {
        // Tools mode
        const tool = tools.find((t) => t.id === activeTool)
        const payload: any = { content: prompt }

        if (activeTool === 'improve') {
          payload.text = prompt
          payload.instruction = 'Make it more professional and concise.'
        } else if (activeTool === 'meta' || activeTool === 'seo') {
          payload.title = 'Zenith CMS Content'
          payload.description = prompt.substring(0, 160)
          payload.content = prompt
        } else if (activeTool === 'alt') {
          payload.imageUrl =
            prompt || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'
        }

        res = await api.post(tool!.endpoint, payload)
        const data = res.data.data

        if (activeTool === 'seo' || activeTool === 'quality') {
          setResult(data)
        } else if (activeTool === 'improve') {
          setResult(data.text)
        } else if (activeTool === 'meta') {
          setResult(data.description)
        } else if (activeTool === 'alt') {
          setResult(data.altText)
        }
      }
      toast.success('Generation complete')
    } catch {
      toast.error('Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const renderToolResult = (): React.ReactNode => {
    if (!result) return null

    if (activeTool === 'seo' && mode === 'tools') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-gray-500">
              SEO Results
            </span>
            <span
              className={cn(
                'text-3xl font-black italic',
                result.score >= 80
                  ? 'text-emerald-500'
                  : result.score >= 50
                    ? 'text-amber-500'
                    : 'text-red-500'
              )}
            >
              {result.score}%
            </span>
          </div>
          <div className="space-y-3">
            {result.issues?.map((issue: string, i: number) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 bg-white/5 border border-white/[0.08] rounded-none"
              >
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-relaxed italic">
                  {issue}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeTool === 'quality' && mode === 'tools') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/[0.08] rounded-none">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                Readability
              </span>
              <span className="text-xl font-black text-emerald-500 italic uppercase tracking-tighter">
                {result.readability}
              </span>
            </div>
            <div className="p-4 bg-white/5 border border-white/[0.08] rounded-none">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                Complexity
              </span>
              <span className="text-xl font-black text-emerald-500 italic uppercase tracking-tighter">
                {result.complexity}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic block">
              Suggestions
            </span>
            {result.suggestions?.map((s: string, i: number) => (
              <div key={i} className="flex gap-3 items-center p-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight italic">
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </motion.div>
    )
  }

  return (
    <div
      className={cn(
        'p-12 min-h-screen flex flex-col transition-colors duration-500 gap-10',
        theme === 'dark' ? 'bg-[#0B0F19] text-white' : 'bg-[#fafafa] text-gray-900'
      )}
    >
      {/* 🚀 Header Orchestration */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-6">
          <div
            className={cn(
              'w-14 h-14 rounded-none flex items-center justify-center shadow-2xl transition-all',
              theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
            )}
          >
            <Cpu size={28} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
              AI Content Architect
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="px-3 py-1 rounded-none bg-white/5 border border-white/[0.08] text-[8px] font-black text-emerald-400 uppercase italic">
                Zenith Pro
              </div>
              <div className="w-2 h-2 rounded-none bg-emerald-500 shadow-[0_0_12px_#10b981]" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center p-1.5 rounded-none border transition-colors',
            theme === 'dark'
              ? 'bg-white/[0.05] border-white/[0.08]'
              : 'bg-white border-gray-100 shadow-sm'
          )}
        >
          {[
            { id: 'content', label: 'Content Writer', icon: PenTool },
            { id: 'structure', label: 'Zenith Pro', icon: Cpu },
            { id: 'tools', label: 'Content Tools', icon: Zap },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as AIMode)}
              className={cn(
                'px-8 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-none transition-all italic leading-none flex items-center gap-3',
                mode === m.id
                  ? theme === 'dark'
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-gray-900 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex gap-6 min-h-0 flex-1 relative">
        {/* 🛠️ Collapsible Operational Sidebar */}
        <AnimatePresence mode="wait">
          {isInputVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '38.2%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-6 overflow-hidden shrink-0"
            >
              {/* 🧠 Intelligence Stress Test Guide */}
              <div
                className={cn(
                  'p-8 border rounded-none space-y-6 shadow-sm transition-all relative overflow-hidden',
                  theme === 'dark'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-emerald-50 border-emerald-100'
                )}
              >
                <div className="flex items-center gap-4">
                  <Cpu size={20} className="text-emerald-500" />
                  <span className="text-[12px] font-black uppercase tracking-widest italic">
                    Prompt Examples
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight leading-relaxed italic">
                  Try complex scenarios like: <br />
                  <span className="text-emerald-400">
                    "Generate a 5-step workflow for a multi-tenant SaaS media pipeline"
                  </span>
                </p>
              </div>

              {mode === 'tools' && (
                <div
                  className={cn(
                    'p-4 border rounded-none space-y-2 shadow-sm transition-all',
                    theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-white border-gray-100'
                  )}
                >
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 italic">
                    Select Tool
                  </span>
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as ToolType)}
                        className={cn(
                          'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-none text-[10px] font-black uppercase tracking-widest italic transition-all group border border-transparent',
                          activeTool === tool.id
                            ? theme === 'dark'
                              ? 'bg-white border-white text-black'
                              : 'bg-gray-900 text-white shadow-lg'
                            : 'text-gray-500 hover:bg-white/5'
                        )}
                      >
                        <tool.icon size={14} />
                        {tool.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'border rounded-none p-8 shadow-sm relative overflow-hidden transition-all',
                  theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-white border-gray-100'
                )}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-none flex items-center justify-center border shadow-inner',
                      theme === 'dark'
                        ? 'bg-white/5 border-white/[0.08] text-emerald-500'
                        : 'bg-gray-50 border-gray-100 text-emerald-600'
                    )}
                  >
                    <Terminal size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase italic tracking-tight">
                      Input
                    </span>
                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                      Ready for data
                    </span>
                  </div>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'tools'
                      ? activeTool === 'alt'
                        ? 'Insert image URL...'
                        : 'Paste text to analyze...'
                      : mode === 'content'
                        ? 'Describe content to synthesize...'
                        : 'Define schema structure...'
                  }
                  className={cn(
                    'w-full h-48 bg-transparent border rounded-none p-6 text-[11px] font-black italic outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all resize-none placeholder:text-gray-700 mb-6',
                    theme === 'dark'
                      ? 'border-white/[0.08] text-white focus:border-emerald-500/30'
                      : 'border-gray-100 text-gray-900 focus:border-emerald-500/20'
                  )}
                />

                <button
                  onClick={handleExecute}
                  disabled={loading || (!prompt.trim() && activeTool !== 'alt')}
                  className={cn(
                    'w-full py-4 rounded-none font-black text-[11px] uppercase tracking-[0.4em] transition-all italic leading-none flex items-center justify-center gap-4 shadow-xl active:scale-95',
                    loading
                      ? 'opacity-50 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-white text-black hover:bg-gray-200'
                        : 'bg-gray-900 text-white hover:bg-[#0B0F19]'
                  )}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  Generate Content
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Operational Output Buffer */}
        <div className="flex-1 relative">
          <button
            onClick={() => setIsInputVisible(!isInputVisible)}
            className={cn(
              'absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-none border z-50 flex items-center justify-center transition-all hover:scale-110',
              theme === 'dark'
                ? 'bg-[#0B0F19] border-white/[0.08] text-gray-500 hover:text-white'
                : 'bg-white border-gray-100 text-gray-400 hover:text-emerald-600 shadow-md'
            )}
          >
            <div
              className={cn(
                'w-1 h-4 rounded-none bg-current transition-transform',
                isInputVisible ? '' : 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'border rounded-none h-full min-h-[500px] shadow-sm relative overflow-hidden transition-all flex flex-col',
              theme === 'dark' ? 'bg-[#0B0F19]/80 border-white/[0.08]' : 'bg-white border-gray-100'
            )}
          >
            <div
              className={cn(
                'px-8 py-5 border-b flex items-center justify-between transition-colors',
                theme === 'dark'
                  ? 'bg-white/[0.02] border-white/[0.08]'
                  : 'bg-gray-50/30 border-gray-100'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-8 h-8 rounded-none border flex items-center justify-center',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/[0.08] text-emerald-500'
                      : 'bg-white border-gray-100 text-emerald-600'
                  )}
                >
                  <Type size={14} />
                </div>
                <span className="text-[10px] font-black uppercase italic tracking-widest">
                  Output
                </span>
              </div>
              {result && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                    )
                    toast.success('Content Copied')
                  }}
                  className={cn(
                    'p-2 rounded-none transition-all',
                    theme === 'dark'
                      ? 'hover:bg-white/5 text-gray-500 hover:text-white'
                      : 'hover:bg-gray-50 text-gray-400 hover:text-emerald-600'
                  )}
                >
                  <Copy size={16} />
                </button>
              )}
            </div>

            <div className="flex-1 p-8 overflow-auto font-mono text-[11px] font-black italic text-gray-500 leading-relaxed selection:bg-emerald-500 selection:text-white custom-scrollbar relative">
              {mode === 'structure' && !result && !loading && (
                <div className="h-full flex flex-col p-10 space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-emerald-500">
                        Persist_Canvas
                      </span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                        Active_Spatial_Registry
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black uppercase tracking-widest text-gray-600">
                          Node_Density
                        </span>
                        <span className="text-[14px] font-black italic">0%</span>
                      </div>
                      <div className="w-32 h-1 bg-white/5 rounded-none overflow-hidden">
                        <div className="w-0 h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 border border-white/[0.03] rounded-none bg-white/[0.01] relative overflow-hidden flex items-center justify-center group">
                    <div
                      className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                        backgroundSize: '24px 24px',
                      }}
                    />
                    <div className="flex flex-col items-center gap-6 group-hover:scale-110 transition-transform duration-700 opacity-20">
                      <Globe size={64} strokeWidth={1} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.6em] italic">
                        Sections_Map_Standby
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {mode !== 'structure' && !result && !loading && (
                <div className="h-full flex flex-col items-center justify-center gap-6 opacity-10">
                  <MessageSquare size={48} strokeWidth={1} />
                  <span className="text-[10px] uppercase tracking-[0.5em]">
                    Waiting for input...
                  </span>
                </div>
              )}
              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-8">
                  <div className="relative">
                    <Loader2 size={40} className="animate-spin text-emerald-500 opacity-40" />
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-none animate-pulse" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.5em] animate-pulse">
                    Thinking...
                  </span>
                </div>
              )}
              {result && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {renderToolResult()}
                </motion.div>
              )}
            </div>

            {result && mode === 'structure' && (
              <div className="p-8 border-t border-white/[0.08] bg-white/[0.01] space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Node_ID', value: 'GLOBAL' },
                    { label: 'Latency', value: '42ms' },
                    { label: 'Kernel', value: 'V6.0_STABLE' },
                    { label: 'Engine', value: 'Refinement' },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-none bg-white/5 border border-white/[0.08]">
                      <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 block mb-1">
                        {stat.label}
                      </span>
                      <span className="text-[10px] font-black uppercase italic text-emerald-400">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className={cn(
                    'w-full py-5 rounded-none text-[12px] font-black uppercase italic tracking-[0.4em] transition-all flex items-center justify-center gap-4',
                    theme === 'dark'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/10'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                  onClick={() => toast.success('Collection Saved')}
                >
                  <span>Save Collection</span>
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIWriterPage
