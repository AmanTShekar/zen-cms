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
 Users,
 Terminal,
 Layers,
 ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { cn } from '../lib/utils'

const DemoFeatures = () => {
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
 setAiResult(
 `Zenith_AI: I've analyzed your prompt "${prompt}" and synthesized a high-fidelity architectural schema for your landing page module.`
 )
 setLoading(false)
 }, 1500)
 }

 return (
 <div className="space-y-12 animate-fade-in pb-20 px-4 text-[14px]">
 {/* 👑 System Header - Ergonomic Scale */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 px-6">
 <div className="space-y-5">
 <div className="flex items-center gap-8">
 <div className="w-16 h-16 rounded-none bg-primary text-app flex items-center justify-center shadow-premium shadow-xl">
 <Sparkles size={32} />
 </div>
 <div>
 <div className="flex items-center gap-4 mb-2.5">
 <div className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-none text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] leading-none shadow-inner">
 EXPERIMENTAL_PROTOCOLS
 </div>
 <span className="text-[11px] font-black text-primary/40 uppercase tracking-[0.3em] leading-none">
 ZENITH_LABS_V2.4
 </span>
 </div>
 <h1 className="text-6xl font-black text-primary tracking-tighter uppercase leading-none">
 Playground
 </h1>
 </div>
 </div>
 </div>
 </div>

 {/* 📊 Intelligence Matrix */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-6">
 {[
 {
 label: 'System_Uptime',
 value: stats
 ? `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`
 : '...',
 icon: Activity,
 color: 'text-status-green',
 },
 {
 label: 'Neural_Assets',
 value: stats?.collectionsCount || '14',
 icon: Layers,
 color: 'text-status-blue',
 },
 {
 label: 'Memory_Flux',
 value: stats ? `${Math.round(stats.memory.rss / 1024 / 1024)}MB` : '256MB',
 icon: Cpu,
 color: 'text-status-orange',
 },
 {
 label: 'Kernel_Ver',
 value: stats?.nodeVersion || 'v20.12',
 icon: Command,
 color: 'text-primary',
 },
 ].map((stat, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className="bg-surface border border-border rounded-none p-10 shadow-premium group hover:border-primary/20 transition-all duration-500 shadow-xl relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 p-10 text-primary/[0.01] group-hover:text-primary/[0.05] transition-colors pointer-events-none">
 <stat.icon size={140} strokeWidth={0.5} />
 </div>
 <div className="flex items-center gap-4 mb-4 relative z-10">
 <stat.icon className={cn('w-5 h-5', stat.color)} />
 <span className="text-[11px] font-black text-primary/40 uppercase tracking-[0.3em] leading-none">
 {stat.label}
 </span>
 </div>
 <div className="text-4xl font-black text-primary tracking-tighter uppercase leading-none relative z-10">
 {stat.value}
 </div>
 </motion.div>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-6">
 {/* AI Content Engine */}
 <div className="bg-surface border border-border rounded-none p-12 shadow-premium relative group overflow-hidden shadow-2xl">
 <div className="absolute top-0 right-0 p-16 text-primary/[0.01] pointer-events-none group-hover:text-primary/[0.05] transition-colors">
 <Terminal size={250} strokeWidth={0.5} />
 </div>

 <div className="flex items-center gap-8 mb-12 relative z-10">
 <div className="w-16 h-16 rounded-none bg-primary/[0.02] border border-border flex items-center justify-center text-status-orange shadow-inner group-hover:bg-primary group-hover:text-app transition-all duration-500">
 <Sparkles size={32} />
 </div>
 <div>
 <h3 className="text-4xl font-black text-primary tracking-tighter uppercase leading-none">
 Neural_Engine
 </h3>
 <p className="text-[12px] font-black text-primary/40 uppercase tracking-[0.4em] mt-3 leading-none">
 Autonomous content synthesis & optimization
 </p>
 </div>
 </div>

 <div className="space-y-8 relative z-10">
 <div className="space-y-4 group/field">
 <div className="flex items-center justify-between px-1">
 <label className="text-[11px] font-black text-primary/40 uppercase tracking-[0.3em] flex items-center gap-3 leading-none group-focus-within/field:text-primary transition-colors">
 <Command size={14} className="opacity-60" />
 PROMPT_INPUT
 </label>
 </div>
 <textarea
 value={prompt}
 onChange={(e) => setPrompt(e.target.value)}
 placeholder="COMMAND_ZENITH_AI_TO_SYNTHESIZE..."
 className="w-full bg-app border border-border rounded-none p-8 text-[16px] font-black tracking-tight text-primary outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all focus:border-primary/20 placeholder:text-primary/10 uppercase h-40 shadow-inner resize-none"
 />
 </div>

 <button
 onClick={testAI}
 disabled={loading}
 className="w-full h-18 bg-primary text-app rounded-none flex items-center justify-center gap-5 font-black text-[14px] uppercase tracking-[0.3em] shadow-premium hover:brightness-110 active:scale-95 transition-all leading-none shadow-2xl disabled:opacity-40"
 >
 {loading ? (
 <>
 <Activity size={24} className="animate-pulse" />
 <span>Synthesizing...</span>
 </>
 ) : (
 <>
 <Zap size={24} />
 <span>Generate_Architecture</span>
 </>
 )}
 </button>

 <AnimatePresence>
 {aiResult && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-8 bg-primary/[0.03] border border-primary/20 rounded-none text-[15px] text-primary/80 leading-relaxed shadow-inner"
 >
 <p className="text-[11px] font-black text-primary/40 uppercase tracking-widest mb-4 leading-none">
 AI_RESULT_BUFFER
 </p>
 {aiResult}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Real-time Collaboration */}
 <div className="bg-surface border border-border rounded-none p-12 shadow-premium relative group overflow-hidden shadow-2xl">
 <div className="absolute top-0 right-0 p-16 text-primary/[0.01] pointer-events-none group-hover:text-primary/[0.05] transition-colors">
 <Users size={250} strokeWidth={0.5} />
 </div>

 <div className="flex items-center gap-8 mb-12 relative z-10">
 <div className="w-16 h-16 rounded-none bg-primary/[0.02] border border-border flex items-center justify-center text-status-blue shadow-inner group-hover:bg-primary group-hover:text-app transition-all duration-500">
 <Users size={32} />
 </div>
 <div>
 <h3 className="text-4xl font-black text-primary tracking-tighter uppercase leading-none">
 Pulse_Presence
 </h3>
 <p className="text-[12px] font-black text-primary/40 uppercase tracking-[0.4em] mt-3 leading-none">
 Collaborative multi-node awareness protocol
 </p>
 </div>
 </div>

 <div className="space-y-12 relative z-10">
 <div className="space-y-6">
 <p className="text-[12px] font-black text-primary/40 uppercase tracking-widest leading-none ">
 ACTIVE_OPERATORS
 </p>
 <div className="flex -space-x-4">
 {[1, 2, 3, 4, 5].map((i) => (
 <div
 key={i}
 className="w-16 h-16 rounded-none border-4 border-app bg-primary text-app flex items-center justify-center font-black text-[14px] shadow-premium shadow-xl"
 >
 OP_{i}
 </div>
 ))}
 <div className="w-16 h-16 rounded-none border-4 border-app bg-surface border border-border flex items-center justify-center text-primary/40 text-[14px] font-black shadow-inner">
 +12
 </div>
 </div>
 </div>

 <div className="space-y-4">
 {[
 {
 label: 'Omni_Search',
 icon: Search,
 color: 'text-status-orange',
 detail: 'CMD + K Protocol',
 },
 {
 label: 'Security_Hardening',
 icon: Shield,
 color: 'text-status-green',
 detail: 'L4_Encrypted',
 },
 {
 label: 'Infrastructure_Pulse',
 icon: Globe,
 color: 'text-status-blue',
 detail: 'Multi-Region',
 },
 ].map((feature, idx) => (
 <div
 key={idx}
 className="flex items-center justify-between p-8 bg-app border border-border rounded-none group/item hover:border-primary/20 transition-all shadow-inner h-24"
 >
 <div className="flex items-center gap-8">
 <div className="w-14 h-14 rounded-none bg-primary/5 flex items-center justify-center text-primary/40 group-hover/item:text-primary transition-all">
 <feature.icon size={26} strokeWidth={1.5} />
 </div>
 <div className="space-y-2">
 <p className="text-[18px] font-black text-primary/80 uppercase tracking-tight leading-none group-hover/item:text-primary transition-colors">
 {feature.label}
 </p>
 <p className="text-[11px] font-black text-primary/40 uppercase tracking-widest leading-none">
 {feature.detail}
 </p>
 </div>
 </div>
 <ChevronRight
 size={24}
 className="text-primary/10 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all"
 />
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}

export default DemoFeatures
