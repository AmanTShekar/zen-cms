import { describe, it, expect } from 'vitest'
import { AIService } from './ai'

describe('AIService — content quality scoring', () => {
  it('scores short content low', () => {
    const result = AIService.analyzeContentQuality('This is short.')
    expect(result.score).toBeLessThan(50)
  })

  it('scores well-structured long content higher', () => {
    const long = 'This is a well-written sentence. Here is another one. And a third for good measure. '.repeat(20)
    const result = AIService.analyzeContentQuality(long)
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('returns correct grade thresholds', () => {
    expect(AIService.analyzeContentQuality(''.padStart(600, 'word ')).grade).toMatch(/^[A-F]$/)
  })

  it('flags long sentences in issues', () => {
    const longSentence = 'This is a very long sentence that goes on and on and on and on and on and on and on and on and on and on without proper punctuation to break it up and make it readable'.repeat(3)
    const result = AIService.analyzeContentQuality(longSentence)
    expect(result.issues.some((i: string) => i.toLowerCase().includes('sentence') || i.toLowerCase().includes('read'))).toBeTruthy()
  })
})

describe('AIService — SEO analysis', () => {
  it('scores content with ideal title length', () => {
    const result = AIService.analyzeSeo({ title: 'This is a great article about CMS systems', description: 'A comprehensive look at content management systems.', content: 'Word '.repeat(300) })
    expect(result.titleLength).toBeGreaterThan(30)
    expect(result.score).toBeGreaterThan(0)
  })

  it('flags missing meta description', () => {
    const result = AIService.analyzeSeo({ title: 'Test', content: 'Word '.repeat(400) })
    expect(result.issues.some((i: string) => i.toLowerCase().includes('description'))).toBeTruthy()
  })

  it('flags title that is too long', () => {
    const result = AIService.analyzeSeo({ title: 'A'.repeat(80), content: 'Word '.repeat(400) })
    expect(result.issues.some((i: string) => i.includes('60'))).toBeTruthy()
  })

  it('passes slug with hyphens', () => {
    const result = AIService.analyzeSeo({ title: 'Test', slug: 'my-best-post', content: 'Word '.repeat(400) })
    expect(result.passed.some((p: string) => p.toLowerCase().includes('slug'))).toBeTruthy()
  })
})