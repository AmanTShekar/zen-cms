import Anthropic from '@anthropic-ai/sdk'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

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
 * ─────────────────────────────────────────────────
 * Features content managers love:
 * 1. AI content generation (Multi-provider: OpenRouter, Grok, OpenAI, Anthropic)
 * 2. Alt-text generation for images
 * 3. SEO score analysis — real-time feedback
 * 4. Content quality scoring — readability, word count, structure
 * 5. Auto meta description generation
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

  private static async callAI(prompt: string, maxTokens: number = 1024): Promise<string> {
    let openRouterKey = process.env.OPENROUTER_API_KEY
    let xaiKey = process.env.XAI_API_KEY
    let openaiKey = process.env.OPENAI_API_KEY
    let anthropicKey = process.env.ANTHROPIC_API_KEY

    try {
      const adapter = AdapterFactory.getActiveAdapter()
      if (adapter) {
        const settings = await adapter.findOne<any>('z_settings', {})
        if (settings) {
          if (!openRouterKey && settings.openRouterApiKey) openRouterKey = settings.openRouterApiKey
          if (!xaiKey && settings.xaiApiKey) xaiKey = settings.xaiApiKey
          if (!openaiKey && settings.openaiApiKey) openaiKey = settings.openaiApiKey
          if (!anthropicKey && settings.anthropicApiKey) anthropicKey = settings.anthropicApiKey
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to fetch AI keys from settings fallback')
    }

    // 1. Try OpenRouter (Most flexible)
    if (openRouterKey) {
      const res = await this.fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.ADMIN_URL || 'http://localhost:3000',
          'X-Title': 'Zenith CMS',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet', // Default OpenRouter model
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      })
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }

    // 2. Try xAI (Grok)
    if (xaiKey) {
      const res = await this.fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${xaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      })
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }

    // 3. Try OpenAI
    if (openaiKey) {
      const res = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      })
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }

    // 4. Try Anthropic (Legacy behavior)
    if (anthropicKey) {
      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      return (msg.content[0] as any).text || ''
    }

    throw new Error(
      'No AI provider configured. Set OPENROUTER_API_KEY, XAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in settings or env'
    )
  }

  // ── Content Generation ────────────────────────────────────────────────────

  static async generateContent(prompt: string): Promise<string> {
    return this.callAI(prompt, 1024)
  }

  static async improveText(text: string, instruction: string): Promise<string> {
    const prompt = `${instruction}\n\nText to improve:\n\n${text}\n\nReturn only the improved text, no commentary.`
    const res = await this.callAI(prompt, 2048)
    return res || text
  }

  static async generateMetaDescription(title: string, content: string): Promise<string> {
    const truncated = content.replace(/<[^>]+>/g, '').substring(0, 500)
    const prompt = `Write a compelling SEO meta description (max 160 characters) for this content.\nTitle: ${title}\nContent excerpt: ${truncated}\nReturn only the description, nothing else.`
    const res = await this.callAI(prompt, 200)
    return res.substring(0, 160)
  }

  static async generateAltText(imageUrl: string, context?: string): Promise<string> {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image'
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')

    try {
      const prompt = `Write a concise alt text (max 10 words) for an image named "${cleanName}" used in the context of: "${context || 'general content'}". Return only the alt text.`
      const res = await this.callAI(prompt, 100)
      return res || cleanName
    } catch (err) {
      logger.warn({ err }, 'Alt text generation failed, using filename')
      return cleanName
    }
  }

  // ── Smart Image Tagging ────────────────────────────────────────────────────

  /**
   * Analyze an image and return smart tags, categories, dominant colors, and mood.
   * Works from URL only (AI vision models can analyze from filename/context).
   * For base64 image analysis, the ANTHROPIC_API_KEY provider supports vision input.
   */
  static async generateImageTags(imageUrl: string): Promise<SmartTagResult> {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image'
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '')

    // Try Anthropic vision API first (supports image input directly)
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        // Fetch the image and convert to base64
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
}`
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

    // Fallback: text-based AI analysis using filename
    try {
      const prompt = `Analyze an image with filename "${cleanName}" found at URL "${imageUrl}". Return ONLY valid JSON (no markdown):
{
  "tags": ["5 descriptive tags"],
  "categories": ["primary category"],
  "colors": ["2 dominant colors"],
  "mood": "one word mood",
  "description": "1 sentence description"
}`
      const res = await this.callAI(prompt, 300)
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

    // Ultimate fallback: derive tags from filename
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
    const plain = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const words = plain.split(/\s+/).filter(Boolean)
    const sentences = plain.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    const wordCount = words.length
    const sentenceCount = sentences.length
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0

    // Flesch Reading Ease (simplified — without syllable count)
    const avgSentenceLength = avgWordsPerSentence
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - 1.015 * avgSentenceLength))

    const issues: string[] = []
    const suggestions: string[] = []

    if (wordCount < 100) issues.push('Content is very short (under 100 words)')
    if (wordCount < 300) suggestions.push('Consider expanding content to 300+ words for better SEO')
    if (avgWordsPerSentence > 25)
      issues.push('Sentences are too long — aim for under 20 words per sentence')
    if (avgWordsPerSentence > 20) suggestions.push('Break up long sentences for better readability')
    if (readabilityScore < 40) issues.push('Content is difficult to read')
    if (readabilityScore < 60) suggestions.push('Simplify language for a broader audience')

    // Score out of 100
    let score = 50
    if (wordCount < 100) score -= 30
    if (wordCount >= 300) score += 15
    if (wordCount >= 600) score += 10
    if (avgWordsPerSentence <= 20) score += 15
    if (readabilityScore >= 60) score += 10
    if (issues.length === 0) score += 10
    score = Math.max(0, Math.min(100, score))

    const grade =
      score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'

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

  static analyzeSeo(data: {
    title?: string
    description?: string
    content?: string
    slug?: string
  }): SeoAnalysis {
    const issues: string[] = []
    const suggestions: string[] = []
    const passed: string[] = []
    let score = 0

    const titleLength = (data.title || '').length
    const descriptionLength = (data.description || '').length
    const wordCount = (data.content || '')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length

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
      issues.push(
        `Meta description too long (${descriptionLength} chars) — Google truncates after 160`
      )
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

    return {
      score: Math.min(100, score),
      titleLength,
      descriptionLength,
      issues,
      suggestions,
      passed,
    }
  }
}
