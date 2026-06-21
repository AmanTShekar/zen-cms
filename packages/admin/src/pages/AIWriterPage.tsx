import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Send, Loader2, Copy, Zap, Terminal, Cpu, PenTool,
  Globe, ShieldCheck, Search, Image as ImageIcon, CheckCircle2,
  AlertCircle, ChevronRight, RotateCcw, Save, Download, Code2,
  FileText, Wand2, Hash, ArrowUpRight, Layers
} from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { PageHeader } from '../components/ui/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = 'writer' | 'architect' | 'tools'
type ToolId = 'seo' | 'quality' | 'improve' | 'meta' | 'alt'

interface HistoryEntry {
  id: string
  mode: Mode
  prompt: string
  result: any
  timestamp: Date
}

interface SeoResult { score: number; issues: string[]; suggestions: string[]; passed: string[] }
interface QualityResult { score: number; grade: string; readabilityScore: number; wordCount: number; sentenceCount: number; avgWordsPerSentence: number; issues: string[]; suggestions: string[] }

// ── Tool Definitions ───────────────────────────────────────────────────────────

const TOOLS: Array<{ id: ToolId; name: string; icon: any; endpoint: string; desc: string; color: string }> = [
  { id: 'seo',     name: 'SEO Analysis',    icon: Search,     endpoint: '/content-tools/seo-analysis',       desc: 'Score title, meta, content',   color: 'text-amber-400' },
  { id: 'quality', name: 'Quality Audit',   icon: ShieldCheck, endpoint: '/content-tools/quality',            desc: 'Readability + word structure',  color: 'text-z-active-text' },
  { id: 'improve', name: 'Refine Text',     icon: Wand2,      endpoint: '/content-tools/ai/improve',          desc: 'AI-powered rewrite',            color: 'text-purple-400' },
  { id: 'meta',    name: 'Meta Generator',  icon: Hash,       endpoint: '/content-tools/ai/meta-description', desc: 'Auto SEO meta description',     color: 'text-z-active-text' },
  { id: 'alt',     name: 'Alt Text',        icon: ImageIcon,  endpoint: '/content-tools/ai/alt-text',         desc: 'Generate image alt text',       color: 'text-pink-400' },
]

const MODES: Array<{ id: Mode; label: string; icon: any; desc: string }> = [
  { id: 'writer',    label: 'Writer',    icon: PenTool, desc: 'Generate content from a prompt' },
  { id: 'architect', label: 'Architect', icon: Cpu,     desc: 'Design a collection schema with AI' },
  { id: 'tools',     label: 'Tools',     icon: Zap,     desc: 'SEO, quality, meta & more' },
]

// ── Result Renderers ──────────────────────────────────────────────────────────

function SeoResultView({ data }: { data: SeoResult }) {
  return (
    <div className="space-y-5">
      <div className="flex items-end gap-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary mb-1">SEO Score</p>
          <span className={cn('text-5xl font-black tabular-nums', data.score >= 70 ? 'text-z-active-text' : data.score >= 45 ? 'text-amber-400' : 'text-red-400')}>
            {data.score}
          </span>
          <span className="text-lg text-z-secondary font-black">/100</span>
        </div>
        <div className="flex-1 h-2 bg-z-hover rounded-full overflow-hidden mb-3">
          <div className={cn('h-full transition-all duration-700', data.score >= 70 ? 'bg-z-accent' : data.score >= 45 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${data.score}%` }} />
        </div>
      </div>

      {data.passed?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-active-text/70">Passing</p>
          {data.passed.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[10px] text-z-muted">
              <CheckCircle2 size={11} className="text-z-active-text flex-shrink-0" />{p}
            </div>
          ))}
        </div>
      )}
      {data.issues?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-500/70">Issues</p>
          {data.issues.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[10px] text-z-muted">
              <AlertCircle size={11} className="text-red-500 flex-shrink-0" />{p}
            </div>
          ))}
        </div>
      )}
      {data.suggestions?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-500/70">Suggestions</p>
          {data.suggestions.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[10px] text-z-muted">
              <ChevronRight size={11} className="text-amber-500 flex-shrink-0" />{p}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QualityResultView({ data }: { data: QualityResult }) {
  const gradeColor: Record<string, string> = { A: 'text-z-active-text', B: 'text-z-active-text', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400' }
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-6">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary mb-1">Grade</p>
          <span className={cn('text-6xl font-black', gradeColor[data.grade] || 'text-white')}>{data.grade}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 pt-1">
          {[
            { label: 'Words', val: data.wordCount },
            { label: 'Sentences', val: data.sentenceCount },
            { label: 'Avg Words/Sent', val: data.avgWordsPerSentence },
          ].map(m => (
            <div key={m.label} className="bg-z-hover border border-z-border p-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-z-secondary mb-1">{m.label}</p>
              <p className="text-lg font-black text-white tabular-nums">{m.val}</p>
            </div>
          ))}
        </div>
      </div>
      {data.issues?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-500/70">Issues</p>
          {data.issues.map((p, i) => <div key={i} className="flex items-center gap-2.5 text-[10px] text-z-muted"><AlertCircle size={11} className="text-red-500 flex-shrink-0" />{p}</div>)}
        </div>
      )}
      {data.suggestions?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-active-text/70">Suggestions</p>
          {data.suggestions.map((p, i) => <div key={i} className="flex items-center gap-2.5 text-[10px] text-z-muted"><CheckCircle2 size={11} className="text-z-active-text flex-shrink-0" />{p}</div>)}
        </div>
      )}
    </div>
  )
}

function SchemaResultView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">{data.name}</h3>
          <p className="text-[9px] text-z-secondary font-mono mt-0.5">/{data.slug}</p>
        </div>
        <div className="flex gap-2">
          {data.drafts && <span className="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-z-accent/10 border border-z-accent/20 text-z-active-text">Drafts</span>}
          {data.timestamps && <span className="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-gray-500/10 border border-gray-500/20 text-z-muted">Timestamps</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">{data.fields?.length || 0} Fields</p>
        {data.fields?.map((f: any, i: number) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-z-hover border border-z-border hover:border-z-border-strong transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-z-active-text">{f.name}</span>
              {f.required && <span className="text-[6px] font-black text-red-500 uppercase tracking-wider">required</span>}
            </div>
            <span className="text-[8px] text-gray-600 uppercase tracking-widest font-black">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const AIWriterPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [mode, setMode] = useState<Mode>('writer')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [activeTool, setActiveTool] = useState<ToolId>('seo')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [schemaForSave, setSchemaForSave] = useState<any>(null)
  const [savingSchema, setSavingSchema] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`
    }
  }, [prompt])

  const handleExecute = async () => {
    if (!prompt.trim() && activeTool !== 'alt') return
    setLoading(true)
    setResult(null)
    setSchemaForSave(null)

    try {
      let res: any
      let resultData: any

      if (mode === 'architect') {
        res = await api.post('/system/ai-architect', { prompt })
        resultData = res.data.data.schema
        setSchemaForSave(resultData)
      } else if (mode === 'writer') {
        res = await api.post('/content-tools/ai/generate', { prompt })
        resultData = res.data.data.text
      } else {
        const tool = TOOLS.find(t => t.id === activeTool)!
        let payload: any = { content: prompt }

        if (activeTool === 'improve') {
          payload = { text: prompt, instruction: 'Make it more professional, clear, and concise. Improve grammar and flow.' }
        } else if (activeTool === 'meta') {
          payload = { title: 'Content', content: prompt }
        } else if (activeTool === 'seo') {
          payload = { title: prompt.split('\n')[0]?.substring(0, 60), content: prompt, description: prompt.substring(0, 160) }
        } else if (activeTool === 'alt') {
          payload = { imageUrl: prompt }
        }

        res = await api.post(tool.endpoint, payload)
        const d = res.data.data

        if (activeTool === 'seo') resultData = d
        else if (activeTool === 'quality') resultData = d
        else if (activeTool === 'improve') resultData = d.text
        else if (activeTool === 'meta') resultData = d.description
        else if (activeTool === 'alt') resultData = d.altText
      }

      setResult(resultData)
      setHistory(prev => [{
        id: Date.now().toString(),
        mode,
        prompt: prompt.substring(0, 80),
        result: resultData,
        timestamp: new Date()
      }, ...prev.slice(0, 19)])
      toast.success('Generated')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'AI request failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleExecute()
  }

  const saveSchemaToDb = async () => {
    if (!schemaForSave) return
    setSavingSchema(true)
    try {
      await api.post('/schemas', schemaForSave)
      toast.success(`Collection "${schemaForSave.name}" created!`)
      setSchemaForSave(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save schema')
    } finally {
      setSavingSchema(false)
    }
  }

  const copyResult = () => {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const downloadResult = () => {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    const ext = mode === 'architect' ? 'json' : 'txt'
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `zenith-ai-output.${ext}`; a.click()
    URL.revokeObjectURL(url)
  }

  const renderResult = () => {
    if (!result) return null

    if (mode === 'architect') return <SchemaResultView data={result} />
    if (mode === 'tools' && activeTool === 'seo') return <SeoResultView data={result} />
    if (mode === 'tools' && activeTool === 'quality') return <QualityResultView data={result} />

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-300 font-sans"
      >
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </motion.div>
    )
  }

  const activePlaceholder = mode === 'architect'
    ? 'Describe a collection schema... e.g., "An e-commerce product with variants, pricing, and inventory tracking"'
    : mode === 'writer'
    ? 'Describe the content you want to generate... e.g., "Write a compelling blog intro about sustainable fashion"'
    : activeTool === 'alt'
    ? 'Paste an image URL to generate alt text...'
    : activeTool === 'meta'
    ? 'Paste your content to generate a meta description...'
    : 'Paste text to analyze...'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="AI Architect"
        description="Generate content, design schemas, and analyze text quality"
        actions={
          <div className={cn('flex p-0.5 border', dark ? 'bg-black border-z-border' : 'bg-z-panel border-z-border')}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setSchemaForSave(null) }}
                title={m.desc}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all',
                  mode === m.id
                    ? (dark ? 'bg-white text-black' : 'bg-gray-900 text-white')
                    : (dark ? 'text-z-secondary hover:text-white' : 'text-z-secondary hover:text-z-primary')
                )}
              >
                <m.icon size={11} />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel: History ─────────────────────────────────────────────── */}
        <div className={cn('w-56 flex-shrink-0 border-r flex flex-col hidden lg:flex', dark ? 'border-z-border bg-black' : 'border-z-border bg-gray-50')}>
          <div className={cn('px-4 py-3 border-b flex-shrink-0', dark ? 'border-z-border' : 'border-z-border')}>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">History</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.length === 0 && (
              <p className="text-[8px] text-gray-600 uppercase tracking-widest p-2 text-center mt-4">No history yet</p>
            )}
            {history.map(h => (
              <button
                key={h.id}
                onClick={() => { setResult(h.result); setSchemaForSave(h.mode === 'architect' ? h.result : null) }}
                className={cn(
                  'w-full text-left p-2.5 border border-transparent transition-all',
                  dark ? 'hover:bg-z-hover hover:border-z-border' : 'hover:bg-white hover:border-z-border'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn('text-[7px] font-black uppercase tracking-widest',
                    h.mode === 'architect' ? 'text-purple-400' : h.mode === 'tools' ? 'text-amber-400' : 'text-z-active-text'
                  )}>{h.mode}</span>
                </div>
                <p className="text-[9px] text-z-secondary truncate">{h.prompt}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center Panel: Input ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>

          {/* Tool Selector (tools mode) */}
          <AnimatePresence>
            {mode === 'tools' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn('flex-shrink-0 border-b overflow-hidden', dark ? 'border-z-border' : 'border-z-border')}
              >
                <div className="p-3 flex gap-2 flex-wrap">
                  {TOOLS.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => { setActiveTool(tool.id); setResult(null) }}
                      title={tool.desc}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest border transition-all',
                        activeTool === tool.id
                          ? (dark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900')
                          : (dark ? 'border-z-border text-z-secondary hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:border-gray-400 hover:text-z-primary')
                      )}
                    >
                      <tool.icon size={11} className={activeTool === tool.id ? '' : tool.color} />
                      {tool.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt Box */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={cn('flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b', dark ? 'border-z-border' : 'border-z-border')}>
              <Terminal size={12} className="text-z-secondary" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">
                {mode === 'architect' ? 'Schema Prompt' : mode === 'writer' ? 'Content Prompt' : TOOLS.find(t => t.id === activeTool)?.name}
              </span>
              <span className="ml-auto text-[8px] text-gray-600 uppercase tracking-widest hidden sm:block">⌘ + Enter to run</span>
            </div>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activePlaceholder}
              className={cn(
                'flex-1 w-full p-5 text-sm outline-none resize-none font-sans leading-relaxed',
                dark
                  ? 'bg-transparent text-white placeholder:text-gray-700'
                  : 'bg-transparent text-z-primary placeholder:text-z-muted'
              )}
            />

            {/* Execute Button */}
            <div className={cn('flex-shrink-0 p-4 border-t', dark ? 'border-z-border' : 'border-z-border')}>
              <div className="flex items-center gap-3">
                {prompt.trim() && (
                  <button
                    onClick={() => { setPrompt(''); setResult(null) }}
                    className="p-2.5 text-gray-600 hover:text-white transition-colors border border-transparent hover:border-white/10"
                    title="Clear"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  onClick={handleExecute}
                  disabled={loading || (!prompt.trim() && activeTool !== 'alt')}
                  className={cn(
                    'flex-1 py-3 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2.5',
                    'bg-z-accent hover:opacity-90 text-white',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'shadow-sm hover:shadow-sm'
                  )}
                >
                  {loading
                    ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                    : <><Send size={13} /> {mode === 'architect' ? 'Design Schema' : mode === 'writer' ? 'Generate Content' : 'Analyze'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Output ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Output Header */}
          <div className={cn('flex-shrink-0 flex items-center justify-between px-5 py-3 border-b', dark ? 'border-z-border' : 'border-z-border')}>
            <div className="flex items-center gap-2.5">
              <Sparkles size={12} className={result ? 'text-z-active-text' : 'text-z-secondary'} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">Output</span>
              {result && <div className="w-1.5 h-1.5 rounded-full bg-z-accent shadow-sm" />}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button onClick={copyResult} title="Copy" className="p-2 text-z-secondary hover:text-white transition-colors border border-transparent hover:border-white/10">
                  <Copy size={13} />
                </button>
                <button onClick={downloadResult} title="Download" className="p-2 text-z-secondary hover:text-white transition-colors border border-transparent hover:border-white/10">
                  <Download size={13} />
                </button>
                {mode === 'architect' && (
                  <button
                    onClick={() => { setResult(null); setSchemaForSave(null) }}
                    title="Clear"
                    className="p-2 text-z-secondary hover:text-white transition-colors border border-transparent hover:border-white/10"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Output Body */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 size={32} className="animate-spin text-z-active-text" />
                  <div className="absolute inset-0 blur-xl bg-z-accent/20 animate-pulse" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-z-secondary animate-pulse">
                  {mode === 'architect' ? 'Designing Schema…' : mode === 'writer' ? 'Writing Content…' : 'Analyzing…'}
                </p>
              </div>
            ) : !result ? (
              <div className="h-full flex flex-col items-center justify-center gap-5 opacity-30">
                <Cpu size={40} className="text-z-secondary" />
                <div className="text-center space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-z-secondary">Awaiting Input</p>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest">
                    {mode === 'architect' ? 'Describe a collection to generate a schema' : mode === 'writer' ? 'Write a prompt to generate content' : 'Paste content to analyze'}
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={JSON.stringify(result).substring(0, 50)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderResult()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Action Footer for Architect mode */}
          <AnimatePresence>
            {result && mode === 'architect' && schemaForSave && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn('flex-shrink-0 border-t overflow-hidden', dark ? 'border-z-border' : 'border-z-border')}
              >
                <div className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-[8px] text-z-secondary uppercase tracking-widest">
                    Schema looks good? Save it as a live collection.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const text = JSON.stringify(schemaForSave, null, 2)
                        navigator.clipboard.writeText(text)
                        toast.success('Schema copied as JSON')
                      }}
                      className={cn('px-4 py-2 border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all', dark ? 'border-z-border text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:border-gray-400')}
                    >
                      <Code2 size={11} /> Copy JSON
                    </button>
                    <button
                      onClick={saveSchemaToDb}
                      disabled={savingSchema}
                      className="px-5 py-2 bg-z-accent hover:opacity-90 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {savingSchema ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Save Collection
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default AIWriterPage
