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
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">
          AI Model Context
        </label>
        <div className="relative group">
          <select
            value={settings.aiModel}
            onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
            className={cn(
              'w-full border rounded-none py-5 px-8 text-[12px] font-black italic transition-all outline-none appearance-none cursor-pointer',
              theme === 'dark'
                ? 'bg-white/5 border-white/5 text-white hover:border-emerald-500/20'
                : 'bg-gray-50 border-gray-100 hover:border-emerald-500/20'
            )}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-emerald-500 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">
          AI Key (Encrypted)
        </label>
        <div className="relative">
          <input
            type="password"
            value={settings.aiApiKey}
            onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
            className={cn(
              'w-full border rounded-none py-5 px-8 text-[12px] font-black italic focus:ring-4 transition-all outline-none pr-16',
              theme === 'dark'
                ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/20'
                : 'bg-gray-50 border-gray-100'
            )}
            placeholder="sk-..."
          />
          <Lock size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>
      </div>
      <div className="col-span-full p-6 border rounded-none flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-14 h-14 rounded-none border flex items-center justify-center',
            isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-white/5 border-white/10 text-gray-600'
          )}>
            <Terminal size={24} />
          </div>
          <div className="flex flex-col">
            <span className={cn(
              'text-[10px] font-black uppercase italic leading-none',
              isConfigured ? 'text-emerald-500' : 'text-gray-500'
            )}>
              Neural Bridge: {isConfigured ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-2">
              {isConfigured ? `${settings.aiModel} · Mode: Production` : 'Configure API key to enable'}
            </span>
          </div>
        </div>
        <button
          onClick={handleValidate}
          disabled={validating}
          className={cn(
            'px-8 py-3.5 rounded-none text-[10px] font-black uppercase tracking-widest italic shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50',
            isConfigured
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
              : theme === 'dark'
              ? 'bg-white/10 text-gray-400 hover:bg-white/15'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
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
