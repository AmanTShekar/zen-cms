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
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

type AIMode = 'content' | 'structure' | 'tools'
type ToolType = 'seo' | 'quality' | 'improve' | 'meta' | 'alt'

const AIWriterPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
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
          payload.imageUrl = prompt || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'
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
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              SEO Score
            </span>
            <span className={cn('text-3xl font-black', result.score >= 80 ? 'text-emerald-500' : result.score >= 50 ? 'text-amber-500' : 'text-red-500')}>
              {result.score}%
            </span>
          </div>
          <div className="space-y-3">
            {result.issues?.map((issue: string, i: number) => (
              <div key={i} className={cn('flex gap-3 items-start p-4 border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200')}>
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{issue}</span>
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
            <div className={cn('p-4 border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200')}>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Readability</span>
              <span className="text-xl font-black uppercase tracking-tight">{result.readability}</span>
            </div>
            <div className={cn('p-4 border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200')}>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Complexity</span>
              <span className="text-xl font-black uppercase tracking-tight">{result.complexity}</span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Suggestions</span>
            {result.suggestions?.map((s: string, i: number) => (
              <div key={i} className="flex gap-3 items-center p-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="AI Content Architect"
        actions={
          <div className="flex gap-2">
            <div className={cn('flex p-1 border', dark ? 'bg-black border-white/[0.05]' : 'bg-white border-gray-200')}>
              {[
                { id: 'content', label: 'Writer', icon: PenTool },
                { id: 'structure', label: 'Architect', icon: Cpu },
                { id: 'tools', label: 'Tools', icon: Zap },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id as AIMode); setResult(null) }}
                  className={cn('flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors', mode === m.id ? (dark ? 'bg-white text-black' : 'bg-gray-900 text-white') : 'text-gray-500')}
                >
                  <m.icon size={10} />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 flex gap-6">
        {/* Left Side: Input */}
        <AnimatePresence mode="wait">
          {isInputVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '40%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="shrink-0 flex flex-col gap-6"
            >
              {mode === 'tools' && (
                <Card>
                  <CardContent className="p-4 grid grid-cols-2 gap-2">
                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => { setActiveTool(tool.id as ToolType); setResult(null) }}
                        className={cn(
                          'flex items-center justify-center gap-2 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border',
                          activeTool === tool.id ? (dark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900') : (dark ? 'border-white/[0.05] text-gray-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-black')
                        )}
                      >
                        <tool.icon size={12} />
                        <span className="truncate">{tool.name}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="flex-1 flex flex-col">
                <div className={cn('p-4 border-b flex justify-between items-center', dark ? 'border-white/[0.08]' : 'border-gray-200')}>
                  <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Input Source</span>
                  </div>
                </div>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'tools' ? (activeTool === 'alt' ? 'Insert image URL...' : 'Paste text to analyze...') : mode === 'content' ? 'Describe content to synthesize...' : 'Define schema structure...'}
                    className={cn(
                      'flex-1 w-full bg-transparent p-6 text-xs font-mono font-bold outline-none resize-none',
                      dark ? 'text-white placeholder:text-gray-700' : 'text-gray-900 placeholder:text-gray-400'
                    )}
                  />
                  <div className={cn('p-4 border-t', dark ? 'border-white/[0.08]' : 'border-gray-200')}>
                    <button
                      onClick={handleExecute}
                      disabled={loading || (!prompt.trim() && activeTool !== 'alt')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {loading ? 'Processing...' : 'Execute'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side: Output */}
        <Card className="flex-1 flex flex-col relative overflow-hidden">
          <button
            onClick={() => setIsInputVisible(!isInputVisible)}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-5 h-10 border-y border-r z-50 flex items-center justify-center transition-all',
              dark ? 'bg-black border-white/[0.08] text-gray-500 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
            )}
          >
            <div className={cn('w-0.5 h-3 bg-current transition-transform', !isInputVisible && 'rotate-180')} />
          </button>

          <div className={cn('p-4 border-b flex justify-between items-center pl-8', dark ? 'border-white/[0.08]' : 'border-gray-200')}>
            <div className="flex items-center gap-3">
              <MessageSquare size={14} className="text-gray-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Output Buffer</span>
            </div>
            {result && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
                  toast.success('Copied')
                }}
                className={cn('text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors', dark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black')}
              >
                <Copy size={12} /> Copy
              </button>
            )}
          </div>
          
          <CardContent className="flex-1 overflow-auto p-8 pl-12 bg-transparent">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Synthesizing...</span>
              </div>
            ) : !result ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                <Cpu size={48} className="text-gray-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Awaiting Input...</span>
              </div>
            ) : (
              renderToolResult()
            )}
          </CardContent>

          {result && mode === 'structure' && (
            <div className={cn('p-4 border-t flex justify-end gap-3', dark ? 'border-white/[0.08]' : 'border-gray-200')}>
              <button
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2"
                onClick={() => toast.success('Collection Saved')}
              >
                Save Schema <Send size={12} />
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default AIWriterPage
