import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
 ArrowRight,
 ArrowLeft,
 CheckCircle2,
 Loader2,
 Copy,
 Globe,
 Database,
 Key,
 Zap,
 Layers,
 Check,
 X,
 Server,
 Cpu,
 Info,
 HelpCircle,
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import ConnectSnippet from '../components/ConnectSnippet'

const TOTAL_STEPS = 7

const PROJECT_TYPES = [
 {
 id: 'blog',
 label: 'Blog / Media',
 icon: '📝',
 collections: ['posts', 'categories', 'authors'],
 },
 {
 id: 'ecommerce',
 label: 'E-Commerce',
 icon: '🛒',
 collections: ['products', 'categories', 'orders'],
 },
 {
 id: 'portfolio',
 label: 'Portfolio',
 icon: '🎨',
 collections: ['projects', 'skills', 'testimonials'],
 },
 { id: 'saas', label: 'SaaS / App', icon: '⚡', collections: ['pages', 'team', 'faqs'] },
 { id: 'custom', label: 'Custom', icon: '⚙️', collections: [] },
]

const STARTER_COLLECTIONS = [
 { id: 'posts', label: 'Blog Posts', icon: '📝' },
 { id: 'pages', label: 'Pages', icon: '📄' },
 { id: 'products', label: 'Products', icon: '📦' },
 { id: 'categories', label: 'Categories', icon: '🏷️' },
 { id: 'team', label: 'Team Members', icon: '👥' },
 { id: 'faqs', label: 'FAQs', icon: '❓' },
 { id: 'testimonials', label: 'Testimonials', icon: '💬' },
 { id: 'projects', label: 'Projects', icon: '🎨' },
]

interface WizardState {
 projectName: string
 projectType: string
 publicUrl: string
 selectedCollections: string[]
 keyName: string
 generatedKey: string
 keyCopied: boolean

 // Database
 dbDialect: 'mongodb' | 'postgres'
 dbUri: string
 dbTestStatus: 'idle' | 'testing' | 'success' | 'failed'
 dbTestMessage: string
 dbSaved: boolean

 // AI keys
 openRouterApiKey: string
 openaiApiKey: string
 anthropicApiKey: string
 xaiApiKey: string
}

export default function SetupWizard() {
 const { theme } = useTheme()
 const navigate = useNavigate()
 const [step, setStep] = useState(0)
 const [loading, setLoading] = useState(false)
 const [state, setState] = useState<WizardState>({
 projectName: '',
 projectType: '',
 publicUrl: '',
 selectedCollections: [],
 keyName: 'My Website',
 generatedKey: '',
 keyCopied: false,

 dbDialect: 'mongodb',
 dbUri: 'mongodb://localhost:27017/zenith',
 dbTestStatus: 'idle',
 dbTestMessage: '',
 dbSaved: false,

 openRouterApiKey: '',
 openaiApiKey: '',
 anthropicApiKey: '',
 xaiApiKey: '',
 })

 const patch = (updates: Partial<WizardState>) => setState((s) => ({ ...s, ...updates }))

 // Persist step to backend
 const persistStep = async (currentStep: number, answers: Partial<WizardState>) => {
 await api.post('/system/onboarding', { currentStep, answers }).catch(() => {})
 }

 const next = async () => {
 await persistStep(step + 1, state)
 setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
 }
 const back = () => setStep((s) => Math.max(s - 1, 0))

 const skip = async () => {
 await api.post('/system/onboarding', { skipped: true }).catch(() => {})
 navigate('/')
 }

 const testDbConnection = async () => {
 patch({ dbTestStatus: 'testing', dbTestMessage: '' })
 try {
 const res = await api.post('/system/db/test-connection', {
 uri: state.dbUri,
 dialect: state.dbDialect,
 })
 if (res.data?.success) {
 patch({ dbTestStatus: 'success', dbTestMessage: 'Connection successful!' })
 toast.success('Database connection verified!')
 } else {
 throw new Error(res.data?.error?.message || 'Verification failed')
 }
 } catch (e: any) {
 const msg = e.response?.data?.error?.message || (e instanceof Error ? e.message : String(e)) || 'Database verification failed'
 patch({ dbTestStatus: 'failed', dbTestMessage: msg })
 toast.error(msg)
 }
 }

 const saveDbConnection = async () => {
 try {
 const res = await api.post('/system/db/save-connection', {
 uri: state.dbUri,
 dialect: state.dbDialect,
 })
 if (res.data?.success) {
 patch({ dbSaved: true })
 toast.success('Database configuration saved to .env!')
 } else {
 throw new Error(res.data?.error?.message || 'Save failed')
 }
 } catch (e: any) {
 const msg = e.response?.data?.error?.message || (e instanceof Error ? e.message : String(e)) || 'Database save failed'
 toast.error(msg)
 }
 }

 const handleComplete = async () => {
 setLoading(true)
 try {
 // First save onboarding answers so the complete endpoint gets all state answers (including DB and AI keys)
 await api.post('/system/onboarding', { currentStep: step, answers: state }).catch(() => {})

 const r = await api.post('/system/onboarding/complete', { keyName: state.keyName })
 patch({ generatedKey: r.data?.data?.apiKey || '' })
 await next()
 } catch {
 toast.error('Failed to generate API key. Please try again.')
 } finally {
 setLoading(false)
 }
 }

 const copyKey = () => {
 navigator.clipboard.writeText(state.generatedKey)
 patch({ keyCopied: true })
 toast.success('API key copied!')
 setTimeout(() => patch({ keyCopied: false }), 3000)
 }

 const isDark = theme === 'dark'
 const bg = isDark ? 'bg-black text-white' : 'bg-gray-50 text-z-primary'
 const card = isDark ? 'bg-[#0a0a0a] border-z-border' : 'bg-z-panel border-z-border shadow-sm shadow-sm'
 const input = isDark
 ? 'bg-z-hover border-z-border text-white placeholder-gray-600 focus:border-gray-500'
 : 'bg-z-panel border-z-border text-z-primary placeholder-gray-400 focus:border-gray-400'

 const STEPS = [
 {
 title: 'Welcome to Zenith',
 subtitle: "Let's get your CMS set up in under 2 minutes.",
 icon: <Zap size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="space-y-6">
 <div className="space-y-3">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Your Project Name
 </label>
 <input
 value={state.projectName}
 onChange={(e) => patch({ projectName: e.target.value })}
 placeholder="e.g. Acme Corp CMS"
 className={cn(
 'w-full px-4 py-3 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[13px] font-medium transition-colors',
 input
 )}
 />
 <p className="text-[8px] text-z-secondary">This will appear in your admin panel header.</p>
 </div>
 <div className="space-y-3">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Your Website URL
 </label>
 <input
 value={state.publicUrl}
 onChange={(e) => patch({ publicUrl: e.target.value })}
 placeholder="https://mywebsite.com"
 className={cn(
 'w-full px-4 py-3 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[13px] font-medium transition-colors',
 input
 )}
 />
 <p className="text-[8px] text-z-secondary">
 Where your website or app is hosted. Used to configure CORS.
 </p>
 </div>
 </div>
 ),
 canNext: state.projectName.trim().length >= 2,
 },
 {
 title: 'What are you building?',
 subtitle: "We'll pre-select relevant content types for you.",
 icon: <Globe size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 gap-3">
 {PROJECT_TYPES.map((pt) => (
 <button
 key={pt.id}
 onClick={() => {
 patch({ projectType: pt.id, selectedCollections: pt.collections })
 }}
 className={cn(
 'flex flex-col items-center gap-3 p-5 border rounded-none-none transition-all text-center',
 state.projectType === pt.id
 ? 'border-gray-500 bg-gray-500/10'
 : isDark
 ? 'border-z-border hover:border-z-border'
 : 'border-z-border shadow-sm hover:border-z-border'
 )}
 >
 <span className="text-2xl">{pt.icon}</span>
 <span className="text-[10px] font-black uppercase ">{pt.label}</span>
 </button>
 ))}
 </div>
 ),
 canNext: !!state.projectType,
 },
 {
 title: 'Choose your content types',
 subtitle: 'Select the collections you want to start with.',
 icon: <Layers size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="space-y-3">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
 {STARTER_COLLECTIONS.map((col) => {
 const selected = state.selectedCollections.includes(col.id)
 return (
 <button
 key={col.id}
 onClick={() => {
 patch({
 selectedCollections: selected
 ? state.selectedCollections.filter((c) => c !== col.id)
 : [...state.selectedCollections, col.id],
 })
 }}
 className={cn(
 'flex items-center gap-3 px-4 py-3 border rounded-none-none text-left transition-all',
 selected
 ? 'border-gray-500 bg-gray-500/10'
 : isDark
 ? 'border-z-border hover:border-z-border'
 : 'border-z-border shadow-sm hover:border-z-border'
 )}
 >
 <span>{col.icon}</span>
 <span className="text-[11px] font-black uppercase ">{col.label}</span>
 {selected && <Check size={12} className="text-gray-600 dark:text-z-muted ml-auto shrink-0" />}
 </button>
 )
 })}
 </div>
 {state.selectedCollections.length === 0 && (
 <p className="text-[9px] text-amber-500 font-black uppercase text-center py-2">
 No collections selected — you can add them later from the Collections menu.
 </p>
 )}
 </div>
 ),
 canNext: true,
 },
 {
 title: 'Database Setup',
 subtitle: 'Configure your database connection and write it to .env.',
 icon: <Database size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Database Dialect
 </label>
 <div className="flex gap-2">
 {['mongodb', 'postgres'].map((dialect) => (
 <button
 key={dialect}
 type="button"
 onClick={() => {
 const defaultUri =
 dialect === 'mongodb'
 ? 'mongodb://localhost:27017/zenith'
 : 'postgres://postgres:postgres@localhost:5432/zenith'
 patch({
 dbDialect: dialect as any,
 dbUri: defaultUri,
 dbTestStatus: 'idle',
 dbTestMessage: '',
 dbSaved: false,
 })
 }}
 className={cn(
 'flex-1 py-3 border text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all',
 state.dbDialect === dialect
 ? 'border-gray-500 bg-gray-500/10 text-white'
 : 'border-z-border hover:border-z-border text-z-muted'
 )}
 >
 {dialect === 'mongodb' ? 'MongoDB / Mongoose' : 'PostgreSQL / Drizzle'}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Connection URL
 </label>
 <input
 value={state.dbUri}
 onChange={(e) => patch({ dbUri: e.target.value, dbTestStatus: 'idle', dbSaved: false })}
 placeholder={
 state.dbDialect === 'mongodb'
 ? 'mongodb://localhost:27017/zenith'
 : 'postgresql://postgres:postgres@localhost:5432/zenith'
 }
 className={cn(
 'w-full px-4 py-3 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[12px] font-mono transition-colors',
 input
 )}
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={testDbConnection}
 disabled={state.dbTestStatus === 'testing'}
 className="flex-1 py-3 border border-z-border hover:border-white/30 text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all flex items-center justify-center gap-2"
 >
 {state.dbTestStatus === 'testing' ? (
 <Loader2 size={12} className="animate-spin" />
 ) : (
 <Check size={12} />
 )}
 Test Connection
 </button>
 <button
 type="button"
 onClick={saveDbConnection}
 disabled={state.dbTestStatus !== 'success' || state.dbSaved}
 className={cn(
 'flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all flex items-center justify-center gap-2',
 state.dbTestStatus === 'success' && !state.dbSaved
 ? 'bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white shadow-lg shadow-gray-600/20'
 : 'bg-z-hover border border-z-border text-z-secondary cursor-not-allowed'
 )}
 >
 Save Configuration
 </button>
 </div>

 {state.dbTestStatus !== 'idle' && (
 <div
 className={cn(
 'p-4 border rounded-none-none text-[10px] font-bold uppercase tracking-wide ',
 state.dbTestStatus === 'success'
 ? 'bg-gray-500/5 border-gray-500/20 text-gray-600 dark:text-z-muted'
 : state.dbTestStatus === 'testing'
 ? 'bg-gray-500/5 border-gray-500/10 text-gray-600 dark:text-z-muted'
 : 'bg-red-500/5 border-red-500/20 text-red-400'
 )}
 >
 {state.dbTestStatus === 'testing' && 'Testing database connectivity...'}
 {state.dbTestStatus === 'success' && '✓ Connection verified! Click Save to apply to .env.'}
 {state.dbTestStatus === 'failed' && `✗ ${state.dbTestMessage}`}
 </div>
 )}
 </div>
 ),
 canNext: true,
 },
 {
 title: 'AI Integration Engine',
 subtitle: 'Integrate state-of-the-art AI features natively into your CMS.',
 icon: <Cpu size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 OpenRouter API Key
 </label>
 <a
 href="https://openrouter.ai/keys"
 target="_blank"
 rel="noreferrer"
 className="text-[8px] font-bold text-gray-600 dark:text-z-muted hover:underline flex items-center gap-0.5"
 >
 Get Key <HelpCircle size={8} />
 </a>
 </div>
 <input
 type="password"
 value={state.openRouterApiKey}
 onChange={(e) => patch({ openRouterApiKey: e.target.value })}
 placeholder="sk-or-..."
 className={cn(
 'w-full px-3 py-2.5 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[11px] font-mono transition-colors',
 input
 )}
 />
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 OpenAI API Key
 </label>
 <a
 href="https://platform.openai.com/api-keys"
 target="_blank"
 rel="noreferrer"
 className="text-[8px] font-bold text-gray-600 dark:text-z-muted hover:underline flex items-center gap-0.5"
 >
 Get Key <HelpCircle size={8} />
 </a>
 </div>
 <input
 type="password"
 value={state.openaiApiKey}
 onChange={(e) => patch({ openaiApiKey: e.target.value })}
 placeholder="sk-proj-..."
 className={cn(
 'w-full px-3 py-2.5 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[11px] font-mono transition-colors',
 input
 )}
 />
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Anthropic API Key
 </label>
 <a
 href="https://console.anthropic.com/settings/keys"
 target="_blank"
 rel="noreferrer"
 className="text-[8px] font-bold text-gray-600 dark:text-z-muted hover:underline flex items-center gap-0.5"
 >
 Get Key <HelpCircle size={8} />
 </a>
 </div>
 <input
 type="password"
 value={state.anthropicApiKey}
 onChange={(e) => patch({ anthropicApiKey: e.target.value })}
 placeholder="sk-ant-..."
 className={cn(
 'w-full px-3 py-2.5 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[11px] font-mono transition-colors',
 input
 )}
 />
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 xAI (Grok) API Key
 </label>
 <a
 href="https://console.x.ai"
 target="_blank"
 rel="noreferrer"
 className="text-[8px] font-bold text-gray-600 dark:text-z-muted hover:underline flex items-center gap-0.5"
 >
 Get Key <HelpCircle size={8} />
 </a>
 </div>
 <input
 type="password"
 value={state.xaiApiKey}
 onChange={(e) => patch({ xaiApiKey: e.target.value })}
 placeholder="xai-..."
 className={cn(
 'w-full px-3 py-2.5 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[11px] font-mono transition-colors',
 input
 )}
 />
 </div>
 </div>

 <div className="p-3 border border-gray-500/20 bg-gray-500/[0.03] rounded-none-none flex items-start gap-2.5">
 <Info size={14} className="text-gray-600 dark:text-z-muted shrink-0 mt-0.5" />
 <div>
 <p className="text-[9px] font-black uppercase text-gray-600 dark:text-z-muted ">
 Free AI Keys Available
 </p>
 <p className="text-[8px] text-z-muted leading-normal mt-1">
 Need keys? Get a key from{' '}
 <a
 href="https://openrouter.ai"
 target="_blank"
 rel="noreferrer"
 className="underline hover:text-white"
 >
 OpenRouter
 </a>
 . They offer free models (like Llama 3 and Gemma 2) that can power all of Zenith's features
 completely free of charge.
 </p>
 </div>
 </div>

 <div className="pt-2">
 <p className="text-[9px] font-black uppercase tracking-widest text-z-secondary mb-2">
 NATIVE AI CAPABILITIES INTEGRATED
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {[
 {
 title: 'Schema Architect',
 desc: 'Autogenerate rich collection structures via prompts',
 icon: '🏗️',
 },
 {
 title: 'SEO Analyzer',
 desc: 'Real-time keyword density & readability auditing',
 icon: '🔍',
 },
 {
 title: 'Alt-Text Generator',
 desc: 'Auto semantic accessibility description for media uploads',
 icon: '🖼️',
 },
 {
 title: 'Metadata Optimizer',
 desc: 'Auto CTR optimized SEO title and description generator',
 icon: '📝',
 },
 ].map((feat, i) => (
 <div key={i} className="p-2.5 border border-z-border bg-white/[0.01] rounded-none-none flex gap-2">
 <span className="text-base">{feat.icon}</span>
 <div>
 <p className="text-[9px] font-black uppercase leading-none">{feat.title}</p>
 <p className="text-[7.5px] text-z-secondary leading-tight mt-1">{feat.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 ),
 canNext: true,
 },
 {
 title: 'Generate your API key',
 subtitle: 'This key lets your website fetch content from Zenith.',
 icon: <Key size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <div className="space-y-5">
 {!state.generatedKey ? (
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-widest text-z-muted">
 Key Name
 </label>
 <input
 value={state.keyName}
 onChange={(e) => patch({ keyName: e.target.value })}
 placeholder="My Website"
 className={cn(
 'w-full px-4 py-3 border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-[13px] font-medium transition-colors',
 input
 )}
 />
 <p className="text-[8px] text-z-secondary">
 Give it a name so you can identify it later (e.g. "Production Site").
 </p>
 </div>
 <button
 onClick={handleComplete}
 disabled={loading}
 className="w-full flex items-center justify-center gap-3 py-4 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white text-[11px] font-black uppercase rounded-none-none transition-all shadow-lg shadow-gray-600/20"
 >
 {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
 {loading ? 'Generating...' : 'Generate API Key'}
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 <div
 className={cn(
 'p-4 border rounded-none-none space-y-3',
 isDark
 ? 'bg-gray-500/5 border-gray-500/20'
 : 'bg-gray-50 border-z-border'
 )}
 >
 <p className="text-[9px] font-black uppercase text-gray-600 dark:text-z-secondary ">
 ✓ Key generated — copy it now. It will not be shown again.
 </p>
 <div
 className={cn(
 'flex items-center gap-3 p-3 border rounded-none-none font-mono text-[11px] break-all',
 isDark ? 'bg-black border-z-border' : 'bg-gray-100 border-z-border'
 )}
 >
 <span className="flex-1">{state.generatedKey}</span>
 <button
 onClick={copyKey}
 className={cn(
 'shrink-0 px-3 py-1.5 border rounded-none-none text-[9px] font-black uppercase transition-all',
 state.keyCopied
 ? 'border-gray-50 text-gray-600 dark:text-z-secondary'
 : isDark
 ? 'border-z-border hover:border-white/40'
 : 'border-z-border-strong hover:border-gray-500'
 )}
 >
 {state.keyCopied ? <Check size={13} /> : <Copy size={13} />}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 ),
 canNext: !!state.generatedKey,
 },
 {
 title: 'Connect your app',
 subtitle: 'Use these snippets to start pulling content from Zenith.',
 icon: <Server size={28} className="text-gray-600 dark:text-z-muted" />,
 content: (
 <ConnectSnippet
 apiKey={state.generatedKey}
 publicUrl={(import.meta.env.VITE_API_URL || '').replace(
 /\/api\/v1\/?$/,
 ''
 )}
 theme={theme}
 />
 ),
 canNext: true,
 },
 ]

 const current = STEPS[step]

 return (
 <div className={cn('min-h-screen flex flex-col items-center justify-center p-4', bg)}>
 {/* Skip */}
 <div className="w-full max-w-2xl flex justify-end mb-4">
 <button
 onClick={skip}
 className="flex items-center gap-1 text-[9px] font-black uppercase text-z-secondary hover:text-gray-300 transition-colors "
 >
 Skip setup <X size={11} />
 </button>
 </div>

 {/* Card */}
 <div className={cn('w-full max-w-2xl border rounded-none-none overflow-hidden', card)}>
 {/* Progress bar */}
 <div
 className={cn('h-1 transition-all duration-500 bg-gray-600 dark:bg-gray-600')}
 style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
 />

 {/* Step indicator */}
 <div
 className={cn(
 'flex items-center gap-2 px-8 pt-6',
 isDark ? 'text-z-secondary' : 'text-z-muted'
 )}
 >
 <span className="text-[8px] font-black uppercase tracking-widest">
 Step {step + 1} of {TOTAL_STEPS}
 </span>
 <div className="flex gap-1 ml-auto">
 {STEPS.map((_, i) => (
 <div
 key={i}
 className={cn(
 'w-6 h-1 rounded-none-none transition-all',
 i <= step ? 'bg-gray-500' : isDark ? 'bg-white/10' : 'bg-gray-200'
 )}
 />
 ))}
 </div>
 </div>

 {/* Content */}
 <AnimatePresence mode="wait">
 <motion.div
 key={step}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.2 }}
 className="p-8 space-y-6"
 >
 <div className="flex items-center gap-4">
 <div
 className={cn(
 'w-14 h-14 rounded-none-none flex items-center justify-center shrink-0',
 isDark ? 'bg-gray-500/10' : 'bg-gray-50'
 )}
 >
 {current.icon}
 </div>
 <div>
 <h2 className="text-[22px] font-black uppercase leading-tight">
 {current.title}
 </h2>
 <p className="text-[10px] text-z-muted mt-1">{current.subtitle}</p>
 </div>
 </div>
 <div>{current.content}</div>
 </motion.div>
 </AnimatePresence>

 {/* Footer */}
 <div
 className={cn(
 'flex items-center justify-between px-8 py-5 border-t',
 isDark ? 'border-z-border' : 'border-z-border shadow-sm'
 )}
 >
 <button
 onClick={back}
 disabled={step === 0}
 className={cn(
 'flex items-center gap-2 px-5 py-2.5 border text-[10px] font-black uppercase rounded-none-none transition-all',
 step === 0
 ? 'opacity-30 cursor-not-allowed'
 : isDark
 ? 'border-z-border hover:border-white/30'
 : 'border-z-border hover:border-gray-400'
 )}
 >
 <ArrowLeft size={14} /> Back
 </button>
 {step === TOTAL_STEPS - 1 ? (
 <button
 onClick={() => navigate('/')}
 className="flex items-center gap-2 px-8 py-2.5 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-black uppercase rounded-none-none transition-all shadow-lg shadow-gray-600/20"
 >
 <CheckCircle2 size={14} /> Go to Dashboard
 </button>
 ) : (
 <button
 onClick={next}
 disabled={!current.canNext}
 className={cn(
 'flex items-center gap-2 px-8 py-2.5 text-[10px] font-black uppercase rounded-none-none transition-all',
 current.canNext
 ? 'bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white shadow-lg shadow-gray-600/20'
 : 'opacity-30 cursor-not-allowed bg-gray-600 text-gray-300'
 )}
 >
 Continue <ArrowRight size={14} />
 </button>
 )}
 </div>
 </div>
 </div>
 )
}
