import Anthropic from '@anthropic-ai/sdk'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { env } from '../config/env';


export interface ContentQualityResult {
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  readabilityScore: number
  wordCount: number
  sentenceCount: number
  avgWordsPerSentence: number
  issues: string[]
  suggestions: string[]
}

export interface SeoAnalysis {
  score: number // 0-100
  titleLength: number
  descriptionLength: number
  issues: string[]
  suggestions: string[]
  passed: string[]
}

export interface SmartTagResult {
  tags: string[]
  categories: string[]
  colors: string[]
  mood: string
  description: string
}

/**
 * Zenith AI Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise multi-provider AI engine with automatic fallback chain.
 *
 * Supported providers (in priority order):
 *   1. OpenRouter   — 200+ models via unified gateway         (OPENROUTER_API_KEY)
 *   2. xAI / Grok   — Grok models from xAI                   (XAI_API_KEY)
 *   3. NVIDIA NIM   — GPU-accelerated open models             (NVIDIA_API_KEY)
 *   4. Groq         — Ultra-fast LPU inference                (GROQ_API_KEY)
 *   5. Together AI  — Open-source models at scale             (TOGETHER_API_KEY)
 *   6. Mistral AI   — Mistral & Codestral models              (MISTRAL_API_KEY)
 *   7. Cohere       — Enterprise RAG-optimized models         (COHERE_API_KEY)
 *   8. OpenAI       — GPT-4o, o1, o3 family                  (OPENAI_API_KEY)
 *   9. Anthropic    — Claude 3.5 Sonnet/Haiku/Opus           (ANTHROPIC_API_KEY)
 *  10. Google Gemini— Gemini Pro/Flash                        (GOOGLE_API_KEY)
 *
 * Keys can be set via environment variables OR via the z_settings database
 * record (configured through the Admin UI — takes precedence over env).
 */
export class AIService {
  private static async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(id)
    }
  }

  /**
   * Resolve all AI credentials — DB settings take precedence over env vars.
   * This allows keys configured via the Admin UI to override local .env values.
   */
  private static async resolveKeys(siteId?: string): Promise<{
    openRouterKey?: string
    xaiKey?: string
    nvidiaKey?: string
    groqKey?: string
    togetherKey?: string
    mistralKey?: string
    cohereKey?: string
    openaiKey?: string
    anthropicKey?: string
    googleKey?: string
    aiModel: string
    aiProvider: string
  }> {
    // Start from env vars
    const keys = {
      openRouterKey: env.OPENROUTER_API_KEY,
      xaiKey:        process.env.XAI_API_KEY,
      nvidiaKey:     process.env.NVIDIA_API_KEY,
      groqKey:       process.env.GROQ_API_KEY,
      togetherKey:   process.env.TOGETHER_API_KEY,
      mistralKey:    process.env.MISTRAL_API_KEY,
      cohereKey:     process.env.COHERE_API_KEY,
      openaiKey:     env.OPENAI_API_KEY,
      anthropicKey:  process.env.ANTHROPIC_API_KEY,
      googleKey:     process.env.GOOGLE_API_KEY,
      aiModel:       'anthropic/claude-3.5-sonnet',
      aiProvider:    'openrouter',
    }

    try {
      const adapter = AdapterFactory.getActiveAdapter()
      if (!adapter) return keys

      const query = siteId ? { siteId } : {}
      const settings = await adapter.findOne<Record<string, any>>('z_settings', query)
      if (!settings) return keys

      // DB settings override env (skip masked placeholder values)
      const notMasked = (v?: string) => v && v !== '[MASKED_CREDENTIAL]' && v.trim() !== ''

      if (notMasked(settings.openRouterApiKey)) keys.openRouterKey = settings.openRouterApiKey
      if (notMasked(settings.xaiApiKey))        keys.xaiKey        = settings.xaiApiKey
      if (notMasked(settings.nvidiaApiKey))     keys.nvidiaKey     = settings.nvidiaApiKey
      if (notMasked(settings.groqApiKey))       keys.groqKey       = settings.groqApiKey
      if (notMasked(settings.togetherApiKey))   keys.togetherKey   = settings.togetherApiKey
      if (notMasked(settings.mistralApiKey))    keys.mistralKey    = settings.mistralApiKey
      if (notMasked(settings.cohereApiKey))     keys.cohereKey     = settings.cohereApiKey
      if (notMasked(settings.openaiApiKey))     keys.openaiKey     = settings.openaiApiKey
      if (notMasked(settings.anthropicApiKey))  keys.anthropicKey  = settings.anthropicApiKey
      if (notMasked(settings.googleApiKey))     keys.googleKey     = settings.googleApiKey

      if (settings.aiModel)    keys.aiModel    = settings.aiModel
      if (settings.aiProvider) keys.aiProvider = settings.aiProvider

      // Legacy: generic aiApiKey field — infer provider from model name
      if (notMasked(settings.aiApiKey)) {
        const model = keys.aiModel
        if (model.includes('claude') && !model.startsWith('anthropic/')) keys.anthropicKey = settings.aiApiKey
        else if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) keys.openaiKey = settings.aiApiKey
        else keys.openRouterKey = settings.aiApiKey
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to fetch AI keys from settings, using env fallback')
    }

    return keys
  }

  /**
   * Core dispatch — calls the preferred provider based on aiProvider setting,
   * then falls back through the full chain if that fails.
   */
  private static async callAI(prompt: string, maxTokens: number = 1024, overrideKeys?: any, strictProvider?: boolean, siteId?: string): Promise<string> {
    const k = overrideKeys || await this.resolveKeys(siteId)

    // Build ordered provider chain — preferred provider first, then fallback chain
    type ProviderFn = () => Promise<string | null>

    const tryOpenRouter = async (): Promise<string | null> => {
      if (!k.openRouterKey) return null
      const model = k.aiModel.includes('/') ? k.aiModel : `anthropic/${k.aiModel}`
      const res = await this.fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${k.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.ADMIN_URL || 'http://localhost:3000',
          'X-Title': 'Zenith CMS',
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `OpenRouter error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryXai = async (): Promise<string | null> => {
      if (!k.xaiKey) return null
      const model = k.aiProvider === 'xai' ? (k.aiModel || 'grok-beta') : 'grok-beta'
      const res = await this.fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `xAI error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryNvidia = async (): Promise<string | null> => {
      if (!k.nvidiaKey) return null
      const model = k.aiProvider === 'nvidia' ? (k.aiModel || 'meta/llama-3.1-70b-instruct') : 'meta/llama-3.1-70b-instruct'
      const res = await this.fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.nvidiaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || `NVIDIA NIM error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryGroq = async (): Promise<string | null> => {
      if (!k.groqKey) return null
      const model = k.aiProvider === 'groq' ? (k.aiModel || 'llama-3.3-70b-versatile') : 'llama-3.3-70b-versatile'
      const res = await this.fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `Groq error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryTogether = async (): Promise<string | null> => {
      if (!k.togetherKey) return null
      const model = k.aiProvider === 'together' ? (k.aiModel || 'meta-llama/Llama-3.3-70B-Instruct-Turbo') : 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
      const res = await this.fetchWithTimeout('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.togetherKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `Together AI error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryMistral = async (): Promise<string | null> => {
      if (!k.mistralKey) return null
      const model = k.aiProvider === 'mistral' ? (k.aiModel || 'mistral-large-latest') : 'mistral-large-latest'
      const res = await this.fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.mistralKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || `Mistral error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryCohere = async (): Promise<string | null> => {
      if (!k.cohereKey) return null
      const model = k.aiProvider === 'cohere' ? (k.aiModel || 'command-r-plus') : 'command-r-plus'
      const res = await this.fetchWithTimeout('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.cohereKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || `Cohere error ${res.status}`)
      return data.message?.content?.[0]?.text || null
    }

    const tryOpenAI = async (): Promise<string | null> => {
      if (!k.openaiKey) return null
      const model = k.aiProvider === 'openai' ? (k.aiModel || 'gpt-4o-mini') : 'gpt-4o-mini'
      const res = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${k.openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `OpenAI error ${res.status}`)
      return data.choices?.[0]?.message?.content || null
    }

    const tryAnthropic = async (): Promise<string | null> => {
      if (!k.anthropicKey) return null
      const model = k.aiProvider === 'anthropic' ? (k.aiModel || 'claude-3-5-haiku-20241022') : 'claude-3-5-haiku-20241022'
      const anthropic = new Anthropic({ apiKey: k.anthropicKey })
      const msg = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      return (msg.content[0] as any).text || null
    }

    const tryGoogle = async (): Promise<string | null> => {
      if (!k.googleKey) return null
      const model = k.aiProvider === 'google' ? (k.aiModel || 'gemini-1.5-flash-latest') : 'gemini-1.5-flash-latest'
      const res = await this.fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k.googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `Google Gemini error ${res.status}`)
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null
    }

    // Map provider ID to its primary handler
    const preferredMap: Record<string, ProviderFn> = {
      openrouter: tryOpenRouter,
      xai:        tryXai,
      nvidia:     tryNvidia,
      groq:       tryGroq,
      together:   tryTogether,
      mistral:    tryMistral,
      cohere:     tryCohere,
      openai:     tryOpenAI,
      anthropic:  tryAnthropic,
      google:     tryGoogle,
    }

    // Fallback chain (all providers, preferred moved to front)
    const fallbackChain: ProviderFn[] = [
      tryOpenRouter, tryXai, tryNvidia, tryGroq, tryTogether,
      tryMistral, tryCohere, tryOpenAI, tryAnthropic, tryGoogle,
    ]

    const preferred = preferredMap[k.aiProvider]
    let chain = preferred
      ? [preferred, ...fallbackChain.filter(fn => fn !== preferred)]
      : fallbackChain
      
    if (strictProvider && preferred) {
      chain = [preferred]
    }

    for (const fn of chain) {
      try {
        const result = await fn()
        if (result && result.trim()) return result
      } catch (err: any) {
        logger.warn({ err: err.message }, `AI provider call failed, trying next`)
      }
    }

    throw new Error(
      'No AI provider configured or all providers failed. ' +
      'Configure at least one API key under Settings → AI Engine.'
    )
  }

  // ── Public Methods ─────────────────────────────────────────────────────────

  static async testConnection(provider: string, model: string, apiKey: string): Promise<string> {
    const prompt = 'Reply with only: OK'
    const maxTokens = 10
    const k = {
      openRouterKey: provider === 'openrouter' ? apiKey : undefined,
      xaiKey: provider === 'xai' ? apiKey : undefined,
      nvidiaKey: provider === 'nvidia' ? apiKey : undefined,
      groqKey: provider === 'groq' ? apiKey : undefined,
      togetherKey: provider === 'together' ? apiKey : undefined,
      mistralKey: provider === 'mistral' ? apiKey : undefined,
      cohereKey: provider === 'cohere' ? apiKey : undefined,
      openaiKey: provider === 'openai' ? apiKey : undefined,
      anthropicKey: provider === 'anthropic' ? apiKey : undefined,
      googleKey: provider === 'google' ? apiKey : undefined,
      aiModel: model,
      aiProvider: provider,
    }
    return this.callAI(prompt, maxTokens, k, true)
  }

  static async generateContent(prompt: string, siteId?: string): Promise<string> {
    return this.callAI(prompt, 1024, undefined, false, siteId)
  }

  static async improveText(text: string, instruction: string, siteId?: string): Promise<string> {
    const prompt = `${instruction}\n\nText to improve:\n\n${text}\n\nReturn only the improved text, no commentary.`
    const res = await this.callAI(prompt, 2048, undefined, false, siteId)
    return res || text
  }

  static async generateMetaDescription(title: string, content: string, siteId?: string): Promise<string> {
    const truncated = content.replace(/<[^>]+>/g, '').substring(0, 500)
    const prompt = `Write a compelling SEO meta description (max 160 characters) for this content.\nTitle: ${title}\nContent excerpt: ${truncated}\nReturn only the description, nothing else.`
    const res = await this.callAI(prompt, 200, undefined, false, siteId)
    return res.substring(0, 160)
  }

  static async generateAltText(imageUrl: string, context?: string, siteId?: string): Promise<string> {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image'
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')

    try {
      const prompt = `Write a concise alt text (max 10 words) for an image named "${cleanName}" used in the context of: "${context || 'general content'}". Return only the alt text.`
      const res = await this.callAI(prompt, 100, undefined, false, siteId)
      return res || cleanName
    } catch (err) {
      logger.warn({ err }, 'Alt text generation failed, using filename')
      return cleanName
    }
  }

  // ── Smart Image Tagging ────────────────────────────────────────────────────

  static async generateImageTags(imageUrl: string, siteId?: string): Promise<SmartTagResult> {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image'
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')

    // Try Anthropic vision API first (supports image input directly)
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey })
        const imageRes = await fetch(imageUrl)
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
        const buffer = Buffer.from(await imageRes.arrayBuffer())
        const base64 = buffer.toString('base64')

        const msg = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Analyze this image and return ONLY valid JSON (no markdown, no explanation):
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "categories": ["primary_category"],
  "colors": ["dominant_color1", "dominant_color2"],
  "mood": "one_word_mood",
  "description": "A concise 1-sentence description"
}`,
              },
            ],
          }],
        })

        const text = (msg.content[0] as any)?.text || ''
        const jsonStart = text.indexOf('{')
        const jsonEnd = text.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1))
          return {
            tags: parsed.tags || [],
            categories: parsed.categories || [],
            colors: parsed.colors || [],
            mood: parsed.mood || 'neutral',
            description: parsed.description || '',
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Anthropic vision tagging failed, falling back to text-based')
      }
    }

    // Fallback: text-based AI analysis
    try {
      const prompt = `Analyze an image with filename "${cleanName}" found at URL "${imageUrl}". Return ONLY valid JSON (no markdown):
{
  "tags": ["5 descriptive tags"],
  "categories": ["primary category"],
  "colors": ["2 dominant colors"],
  "mood": "one word mood",
  "description": "1 sentence description"
}`
      const res = await this.callAI(prompt, 300, undefined, false, siteId)
      const jsonStart = res.indexOf('{')
      const jsonEnd = res.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(res.substring(jsonStart, jsonEnd + 1))
        return {
          tags: parsed.tags || [],
          categories: parsed.categories || [],
          colors: parsed.colors || [],
          mood: parsed.mood || 'neutral',
          description: parsed.description || '',
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Text-based image tagging failed')
    }

    return {
      tags: cleanName.split(' ').filter(Boolean).slice(0, 5),
      categories: ['uncategorized'],
      colors: [],
      mood: 'neutral',
      description: cleanName,
    }
  }

  // ── Content Quality Scoring ───────────────────────────────────────────────
  // No AI needed — pure algorithmic. Instant feedback for editors.

  static analyzeContentQuality(text: string): ContentQualityResult {
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = plain.split(/\s+/).filter(Boolean)
    const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 0)

    const wordCount = words.length
    const sentenceCount = sentences.length
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0
    const avgSentenceLength = avgWordsPerSentence
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - 1.015 * avgSentenceLength))

    const issues: string[] = []
    const suggestions: string[] = []

    if (wordCount < 100) issues.push('Content is very short (under 100 words)')
    if (wordCount < 300) suggestions.push('Consider expanding to 300+ words for better SEO')
    if (avgWordsPerSentence > 25) issues.push('Sentences are too long — aim for under 20 words')
    if (avgWordsPerSentence > 20) suggestions.push('Break up long sentences for readability')
    if (readabilityScore < 40) issues.push('Content is difficult to read')
    if (readabilityScore < 60) suggestions.push('Simplify language for a broader audience')

    let score = 50
    if (wordCount < 100) score -= 30
    if (wordCount >= 300) score += 15
    if (wordCount >= 600) score += 10
    if (avgWordsPerSentence <= 20) score += 15
    if (readabilityScore >= 60) score += 10
    if (issues.length === 0) score += 10
    score = Math.max(0, Math.min(100, score))

    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

    return {
      score,
      grade,
      readabilityScore: Math.round(readabilityScore),
      wordCount,
      sentenceCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      issues,
      suggestions,
    }
  }

  // ── SEO Analysis ──────────────────────────────────────────────────────────

  static analyzeSeo(data: { title?: string; description?: string; content?: string; slug?: string }): SeoAnalysis {
    const issues: string[] = []
    const suggestions: string[] = []
    const passed: string[] = []
    let score = 0

    const titleLength = (data.title || '').length
    const descriptionLength = (data.description || '').length
    const wordCount = (data.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length

    // Title checks
    if (!data.title) {
      issues.push('Missing page title')
    } else if (titleLength < 30) {
      suggestions.push(`Title is short (${titleLength} chars) — aim for 50-60 characters`)
      score += 5
    } else if (titleLength > 60) {
      issues.push(`Title too long (${titleLength} chars) — Google truncates after 60`)
      score += 5
    } else {
      passed.push(`Title length is good (${titleLength} chars)`)
      score += 15
    }

    // Meta description checks
    if (!data.description) {
      issues.push('Missing meta description — add one to improve click-through rates')
    } else if (descriptionLength < 70) {
      suggestions.push(`Meta description too short (${descriptionLength} chars) — aim for 120-160`)
      score += 5
    } else if (descriptionLength > 160) {
      issues.push(`Meta description too long (${descriptionLength} chars) — Google truncates after 160`)
      score += 5
    } else {
      passed.push(`Meta description length is good (${descriptionLength} chars)`)
      score += 20
    }

    // Slug checks
    if (!data.slug) {
      suggestions.push('Add a URL slug for better SEO')
    } else if (data.slug.includes(' ') || /[A-Z]/.test(data.slug)) {
      issues.push('Slug should be lowercase with hyphens, no spaces')
    } else {
      passed.push('URL slug is clean')
      score += 10
    }

    // Content length
    if (wordCount < 100) {
      issues.push(`Content very short (${wordCount} words) — thin content can hurt SEO`)
    } else if (wordCount >= 300) {
      passed.push(`Good content length (${wordCount} words)`)
      score += 20
    } else {
      suggestions.push(`Expand content to 300+ words (currently ${wordCount})`)
      score += 10
    }

    if (score >= 55) passed.push('Overall SEO score is good')

    return { score: Math.min(100, score), titleLength, descriptionLength, issues, suggestions, passed }
  }

  // ── Dynamic Model Fetching ────────────────────────────────────────────────

  static async fetchModels(provider: string, apiKey: string): Promise<Array<{ value: string; label: string }>> {
    const timeoutMs = 15000

    const makeOpenAICompatibleRequest = async (url: string) => {
      const res = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      }, timeoutMs)
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data || data.models || [])
      return list.map((m: any) => ({
        value: m.id || m.name,
        label: m.display_name || m.name || m.id,
      }))
    }

    try {
      switch (provider) {
        case 'openrouter':
          return await makeOpenAICompatibleRequest('https://openrouter.ai/api/v1/models')
        case 'openai':
          return await makeOpenAICompatibleRequest('https://api.openai.com/v1/models')
        case 'xai':
          return await makeOpenAICompatibleRequest('https://api.x.ai/v1/models')
        case 'nvidia':
          return await makeOpenAICompatibleRequest('https://integrate.api.nvidia.com/v1/models')
        case 'groq':
          return await makeOpenAICompatibleRequest('https://api.groq.com/openai/v1/models')
        case 'together':
          return await makeOpenAICompatibleRequest('https://api.together.xyz/v1/models')
        case 'mistral':
          return await makeOpenAICompatibleRequest('https://api.mistral.ai/v1/models')
        case 'cohere': {
          const res = await this.fetchWithTimeout('https://api.cohere.com/v1/models', {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          }, timeoutMs)
          if (!res.ok) throw new Error(`Cohere API error ${res.status}`)
          const data = await res.json()
          return (data.models || []).map((m: any) => ({ value: m.name, label: m.name }))
        }
        case 'google': {
          const res = await this.fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }, timeoutMs)
          if (!res.ok) throw new Error(`Google API error ${res.status}`)
          const data = await res.json()
          return (data.models || []).map((m: any) => ({
            value: m.name.replace(/^models\//, ''),
            label: m.displayName || m.name.replace(/^models\//, ''),
          }))
        }
        case 'anthropic': {
          // Anthropic Models API
          const res = await this.fetchWithTimeout('https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
          }, timeoutMs)
          if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)
          const data = await res.json()
          return (data.data || []).map((m: any) => ({
            value: m.id,
            label: m.display_name || m.name || m.id,
          }))
        }
        default:
          throw new Error(`Unsupported provider for model fetching: ${provider}`)
      }
    } catch (err: any) {
      logger.error({ err: err.message, provider }, 'Failed to fetch models dynamically')
      throw new Error(`Failed to fetch models for ${provider}: ${err.message}`)
    }
  }
}
