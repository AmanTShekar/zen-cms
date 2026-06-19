import React, { useState } from 'react'
import {
  Lock, Loader2, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff,
  Cpu, Zap, Brain, Globe, ChevronRight, Info, TestTube2
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

// ── Provider Definitions ──────────────────────────────────────────────────────

interface Provider {
  id: string
  name: string
  color: string
  description: string
  docsUrl: string
  keyPlaceholder: string
  keyField: string
  models: Array<{ value: string; label: string; tier?: 'free' | 'pro' | 'ultra' }>
  badge?: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: 'text-z-active-text',
    description: 'Unified gateway to 200+ models from any provider via one API key',
    docsUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    keyField: 'openRouterApiKey',
    badge: 'Recommended',
    models: [
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tier: 'pro' },
      { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', tier: 'pro' },
      { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus', tier: 'ultra' },
      { value: 'openai/gpt-4o', label: 'GPT-4o', tier: 'pro' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'free' },
      { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo', tier: 'pro' },
      { value: 'google/gemini-pro-1.5', label: 'Gemini 1.5 Pro', tier: 'pro' },
      { value: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash', tier: 'free' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', tier: 'free' },
      { value: 'mistralai/mistral-large', label: 'Mistral Large', tier: 'pro' },
      { value: 'mistralai/mixtral-8x7b-instruct', label: 'Mixtral 8x7B', tier: 'free' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'pro' },
      { value: 'x-ai/grok-beta', label: 'Grok Beta', tier: 'pro' },
      { value: 'cohere/command-r-plus', label: 'Cohere Command R+', tier: 'pro' },
      { value: 'perplexity/llama-3.1-sonar-large-128k-online', label: 'Perplexity Sonar Large', tier: 'pro' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    color: 'text-z-active-text',
    description: 'Direct access to GPT-4o, o1, and all OpenAI models',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    keyField: 'openaiApiKey',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o', tier: 'pro' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'free' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', tier: 'pro' },
      { value: 'o1-preview', label: 'o1 Preview', tier: 'ultra' },
      { value: 'o1-mini', label: 'o1 Mini', tier: 'pro' },
      { value: 'o3-mini', label: 'o3 Mini', tier: 'pro' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: 'text-orange-400',
    description: 'Direct access to Claude models with vision and context support',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
    keyField: 'anthropicApiKey',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tier: 'pro' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', tier: 'free' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', tier: 'ultra' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    color: 'text-z-active-text',
    description: 'Gemini Pro/Flash with long context and multimodal capabilities',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIza...',
    keyField: 'googleApiKey',
    models: [
      { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', tier: 'pro' },
      { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', tier: 'free' },
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', tier: 'pro' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    color: 'text-pink-400',
    description: 'Ultra-fast inference with LPU hardware — 800+ tokens/sec',
    docsUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    keyField: 'groqApiKey',
    badge: 'Fastest',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tier: 'free' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', tier: 'free' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', tier: 'free' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B', tier: 'free' },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    color: 'text-green-400',
    description: 'NVIDIA-hosted models with GPU-accelerated inference',
    docsUrl: 'https://build.nvidia.com/explore/discover',
    keyPlaceholder: 'nvapi-...',
    keyField: 'nvidiaApiKey',
    models: [
      { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', tier: 'ultra' },
      { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', tier: 'pro' },
      { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', tier: 'free' },
      { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2', tier: 'pro' },
      { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B', tier: 'pro' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    color: 'text-yellow-400',
    description: 'Open-source models on fast distributed inference infrastructure',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    keyPlaceholder: 'together-...',
    keyField: 'togetherApiKey',
    models: [
      { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', tier: 'pro' },
      { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B', tier: 'free' },
      { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', tier: 'pro' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    color: 'text-amber-400',
    description: 'Direct access to Mistral, Codestral, and Pixtral models',
    docsUrl: 'https://console.mistral.ai/api-keys',
    keyPlaceholder: 'mistral-...',
    keyField: 'mistralApiKey',
    models: [
      { value: 'mistral-large-latest', label: 'Mistral Large', tier: 'pro' },
      { value: 'mistral-small-latest', label: 'Mistral Small', tier: 'free' },
      { value: 'codestral-latest', label: 'Codestral', tier: 'pro' },
      { value: 'pixtral-large-latest', label: 'Pixtral Large', tier: 'ultra' },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    color: 'text-teal-400',
    description: 'Enterprise-grade models optimized for search and RAG workflows',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    keyPlaceholder: 'co_...',
    keyField: 'cohereApiKey',
    models: [
      { value: 'command-r-plus', label: 'Command R+', tier: 'ultra' },
      { value: 'command-r', label: 'Command R', tier: 'pro' },
      { value: 'command-light', label: 'Command Light', tier: 'free' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI / Grok',
    color: 'text-gray-300',
    description: "Elon Musk's xAI Grok model with real-time X/Twitter integration",
    docsUrl: 'https://console.x.ai/',
    keyPlaceholder: 'xai-...',
    keyField: 'xaiApiKey',
    models: [
      { value: 'grok-beta', label: 'Grok Beta', tier: 'pro' },
      { value: 'grok-vision-beta', label: 'Grok Vision Beta', tier: 'pro' },
    ],
  },
]

const TIER_BADGE: Record<string, string> = {
  free: 'bg-z-active-bg text-z-active-text border-z-accent/20',
  pro: 'bg-z-accent/10 text-z-active-text border-z-accent/20',
  ultra: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SettingsAiProps {
  settings: Record<string, any>
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsAi: React.FC<SettingsAiProps> = ({ settings, setSettings, theme }) => {
  const dark = theme === 'dark'
  const [validating, setValidating] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [expandedProvider, setExpandedProvider] = useState<string>('openrouter')
  const [dynamicModels, setDynamicModels] = useState<Record<string, {value: string, label: string, tier?: string}[]>>({})
  const [fetchingModels, setFetchingModels] = useState<string | null>(null)

  const activeProvider = PROVIDERS.find(p => {
    const key = settings[p.keyField]?.trim()
    return key && key !== '[MASKED_CREDENTIAL]'
  }) || PROVIDERS.find(p => p.id === 'openrouter')!

  const handleValidate = async () => {
    setValidating(true)
    setTestResult(null)
    try {
      const providerId = settings.aiProvider || 'openrouter'
      const providerConfig = PROVIDERS.find(p => p.id === providerId)
      const apiKeyField = providerConfig ? providerConfig.keyField : 'openRouterApiKey'
      const apiKey = settings[apiKeyField]

      const res = await api.post('/system/settings/ai/validate', {
        provider: providerId,
        model: settings.aiModel,
        apiKey: apiKey
      })
      setTestResult({ ok: true, msg: res.data.message || 'API Key is valid' })
      toast.success('AI connection verified')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Connection failed'
      setTestResult({ ok: false, msg })
      toast.error('AI connection failed')
    } finally {
      setValidating(false)
    }
  }

  const handleFetchModels = async (providerId: string, apiKeyField: string) => {
    setFetchingModels(providerId)
    try {
      const apiKey = settings[apiKeyField]
      const res = await api.post('/system/settings/ai/models', {
        provider: providerId,
        apiKey: apiKey
      })
      const models = res.data?.data || []
      setDynamicModels(prev => ({ ...prev, [providerId]: models }))
      toast.success(`Fetched ${models.length} models for ${providerId}`)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to fetch models'
      toast.error(msg)
    } finally {
      setFetchingModels(null)
    }
  }

  const toggleKey = (id: string) => setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))

    const inp = (dark: boolean) => cn(
      'w-full border px-3 py-2.5 text-[12px] font-black outline-none transition-colors rounded-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
      dark
        ? 'bg-black border-z-border text-white placeholder:text-gray-700 focus:border-z-accent'
        : 'bg-z-panel border-z-border text-z-primary placeholder:text-z-muted focus:border-z-accent'
    )

  return (
    <div className="space-y-6">
      {/* Active Model Picker */}
      <div className={cn('p-5 border space-y-4 shadow-[var(--z-active-glow)]', dark ? 'bg-z-panel backdrop-blur-md border-z-border' : 'bg-z-input border-z-border')}>
        <div className="flex items-center gap-2.5">
          <Cpu size={14} className="text-z-active-text" />
          <span className={cn('text-[10px] font-black uppercase tracking-[0.3em]', dark ? 'text-white' : 'text-z-primary')}>Active Model</span>
          <span className="ml-auto text-[8px] text-z-secondary uppercase tracking-widest">Used by all AI features</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">AI Provider</label>
            <select
              value={settings.aiProvider || 'openrouter'}
              onChange={e => setSettings({ ...settings, aiProvider: e.target.value, aiModel: PROVIDERS.find(p => p.id === e.target.value)?.models[0]?.value || '' })}
              className={inp(dark)}
            >
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Model</label>
            <select
              value={settings.aiModel || ''}
              onChange={e => setSettings({ ...settings, aiModel: e.target.value })}
              className={inp(dark)}
            >
              {(dynamicModels[settings.aiProvider || 'openrouter'] || PROVIDERS.find(p => p.id === (settings.aiProvider || 'openrouter'))?.models || []).map(m => (
                <option key={m.value} value={m.value}>{m.label} {m.tier ? `(${m.tier})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-4 py-2 bg-z-accent hover:opacity-90 shadow-[var(--z-active-glow)] text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            {validating ? <Loader2 size={11} className="animate-spin" /> : <TestTube2 size={11} />}
            Test Connection
          </button>
          {testResult && (
            <div className={cn('flex items-center gap-2 text-[9px] font-black uppercase tracking-widest', testResult.ok ? 'text-z-active-text' : 'text-red-400')}>
              {testResult.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* Provider API Keys */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={12} className="text-z-secondary" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">Provider API Keys</span>
          <span className="ml-auto text-[8px] text-gray-600 uppercase tracking-widest">All keys encrypted at rest</span>
        </div>

        {PROVIDERS.map(provider => {
          const isExpanded = expandedProvider === provider.id
          const keyValue = settings[provider.keyField] || ''
          const hasKey = keyValue.trim() && keyValue !== '[MASKED_CREDENTIAL]'
          const isMasked = keyValue === '[MASKED_CREDENTIAL]'

          return (
            <div
              key={provider.id}
              className={cn(
                'border transition-all shadow-[var(--z-active-glow)]',
                isExpanded
                  ? (dark ? 'border-white/15 bg-black/80 backdrop-blur-md shadow-[var(--z-active-glow)]' : 'border-z-border-strong bg-white')
                  : ('z-card-interactive')
              )}
            >
              {/* Provider Header */}
              <button
                onClick={() => setExpandedProvider(isExpanded ? '' : provider.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', hasKey || isMasked ? 'bg-z-accent shadow-[var(--z-active-glow)]' : 'bg-gray-700')} />
                  <div className={cn('text-[10px] font-black', provider.color)}>{provider.name}</div>
                  {provider.badge && (
                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-z-active-bg border border-z-active-border text-z-active-text">
                      {provider.badge}
                    </span>
                  )}
                  <span className="text-[8px] text-gray-600 truncate hidden sm:block">{provider.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isMasked && <span className="text-[7px] text-z-active-text uppercase tracking-widest font-black">Configured</span>}
                  {hasKey && !isMasked && <span className="text-[7px] text-z-active-text uppercase tracking-widest font-black">Active</span>}
                  <ChevronRight size={12} className={cn('text-z-secondary transition-transform', isExpanded && 'rotate-90')} />
                </div>
              </button>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <p className="text-[8px] text-z-secondary uppercase tracking-widest pt-3">{provider.description}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">API Key</label>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] text-z-active-text hover:text-z-active-text flex items-center gap-1 transition-colors"
                      >
                        Get Key <ExternalLink size={9} />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={keyValue}
                        onChange={e => setSettings({ ...settings, [provider.keyField]: e.target.value })}
                        placeholder={isMasked ? '••••••••••••••••' : provider.keyPlaceholder}
                        className={cn(inp(dark), 'pr-10 font-mono')}
                      />
                      <button
                        type="button"
                        onClick={() => toggleKey(provider.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-z-secondary hover:text-white transition-colors"
                      >
                        {showKeys[provider.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {isMasked && (
                      <p className="text-[8px] text-amber-500/70 uppercase tracking-widest flex items-center gap-1">
                        <Lock size={9} /> Key is stored — enter a new value to replace it
                      </p>
                    )}
                  </div>

                  {/* Models preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
                        Available Models {dynamicModels[provider.id] ? `(${dynamicModels[provider.id].length})` : ''}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFetchModels(provider.id, provider.keyField)}
                        disabled={fetchingModels === provider.id || (!hasKey && !isMasked)}
                        className="text-[8px] text-z-active-text hover:text-z-active-text flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        {fetchingModels === provider.id ? <Loader2 size={9} className="animate-spin" /> : <Zap size={9} />}
                        Fetch Models
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                      {(dynamicModels[provider.id] || provider.models).map(m => (
                        <span
                          key={m.value}
                          title={m.value}
                          className={cn('text-[7px] font-black uppercase tracking-widest px-2 py-1 border', m.tier ? TIER_BADGE[m.tier] : 'bg-z-hover border-white/10 text-z-muted')}
                        >
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Banner */}
      <div className={cn('flex gap-3 p-4 border', dark ? 'bg-z-accent/5 border-z-accent/15' : 'bg-z-active-bg border-z-active-border')}>
        <Info size={12} className="text-z-active-text flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-z-active-text">Provider Priority</p>
          <p className="text-[8px] text-z-secondary leading-relaxed">
            The AI engine auto-selects providers in this order: OpenRouter → xAI → NVIDIA NIM → Groq → Together AI → Mistral → Cohere → OpenAI → Anthropic → Google Gemini.
            Set the "Active Model" above to override. Keys are never sent to the client.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsAi
