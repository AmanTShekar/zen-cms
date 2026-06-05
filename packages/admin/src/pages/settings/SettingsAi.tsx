import React, { useState } from 'react'
import { Lock, ChevronDown, Terminal, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface SettingsAiProps {
 settings: {
 aiModel: string
 aiApiKey: string
 }
 setSettings: (s: any) => void
 theme: 'light' | 'dark'
}

const AI_MODELS = [
 { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (OpenRouter)' },
 { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
 { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (OpenRouter)' },
 { value: 'claude-3-haiku-20241022', label: 'Claude 3 Haiku (Anthropic)' },
]

const SettingsAi: React.FC<SettingsAiProps> = ({ settings, setSettings, theme }) => {
 const [validating, setValidating] = useState(false)
 const [aiStatus, setAiStatus] = useState<{ configured: boolean; latencyMs?: number } | null>(null)

 const handleValidate = async () => {
 setValidating(true)
 try {
 const res = await api.get<any>('/system/health')
 const health = res.data.data
 const aiConfigured = health?.services?.ai === 'configured'
 setAiStatus({ configured: aiConfigured, latencyMs: health?.cpu ? undefined : undefined })
 if (aiConfigured) {
 toast.success('AI Engine: ACTIVE')
 } else {
 toast.error('AI Engine: No API key configured')
 }
 } catch {
 toast.error('AI Engine: Connection failed')
 } finally {
 setValidating(false)
 }
 }

 const isConfigured = settings.aiApiKey?.trim() || aiStatus?.configured

 return (
 <>
 <div
 className={cn(
 'p-5 rounded-none border transition-all space-y-3 col-span-1 md:col-span-2',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-emerald-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 AI Model Context
 </label>
 <div className="relative group">
 <select
 value={settings.aiModel}
 onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
 className={cn(
 'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black appearance-none cursor-pointer',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 )}
 >
 {AI_MODELS.map((m) => (
 <option key={m.value} value={m.value}>{m.label}</option>
 ))}
 </select>
 <ChevronDown
 size={18}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-600 dark:text-emerald-500 transition-colors"
 />
 </div>
 </div>
 <div
 className={cn(
 'p-5 rounded-none border transition-all space-y-3 col-span-1 md:col-span-2',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-emerald-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 AI Key (Encrypted)
 </label>
 <div className="relative">
 <input
 type="password"
 value={settings.aiApiKey}
 onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
 className={cn(
 'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black pr-12',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
 )}
 placeholder="sk-..."
 />
 <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
 </div>
 </div>
 
 <div
 className={cn(
 'col-span-1 md:col-span-2 p-6 rounded-none border flex items-center justify-between transition-all',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50/50 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4">
 <div className={cn(
 'w-12 h-12 rounded-none flex items-center justify-center transition-colors',
 isConfigured
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
 : 'bg-white/5 text-gray-500'
 )}>
 <Terminal size={24} />
 </div>
 <div className="flex flex-col">
 <span className={cn(
 'text-sm font-bold',
 isConfigured ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-500'
 )}>
 Neural Bridge: {isConfigured ? 'ACTIVE' : 'INACTIVE'}
 </span>
 <span className="text-xs text-gray-500 mt-1">
 {isConfigured ? `${settings.aiModel} · Mode: Production` : 'Configure API key to enable'}
 </span>
 </div>
 </div>
 <button
 onClick={handleValidate}
 disabled={validating}
 className={cn(
 'px-6 py-2.5 rounded-none text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 border',
 isConfigured
 ? 'bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-500 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.2)]'
 : theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10'
 : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
 )}
 >
 {validating ? <Loader2 size={14} className="animate-spin" /> : null}
 {validating ? 'Validating...' : 'Validate Pulse'}
 </button>
 </div>
 </>
 )
}

export default SettingsAi
