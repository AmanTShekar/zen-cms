import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { env } from '../config/env';


export interface VectorDocument {
  id: string
  collection: string
  field: string
  text: string
  embedding: number[]
  siteId?: string
  createdAt: Date
}

export interface SemanticSearchResult {
  id: string
  collection: string
  field: string
  text: string
  score: number
  siteId?: string
}

/**
 * Zenith Semantic Vector Search Service
 * ──────────────────────────────────────
 * Generates embeddings via OpenAI / OpenRouter and performs
 * cosine similarity search against stored vectors.
 *
 * No external vector database required — embeddings are stored
 * in the same database (MongoDB or Postgres) and similarity
 * is computed in-application. Suitable for small-to-medium
 * datasets (up to ~50k documents). For larger scale, integrate
 * pgvector or Pinecone.
 */
export class VectorSearchService {
  private static cacheKey(embedding: number[]): string {
    // Simple cache key from first 4 dims + length
    return `${embedding.slice(0, 4).join(',')}:${embedding.length}`
  }

  /**
   * Generate an embedding vector for the given text.
   * Tries OpenAI first, then OpenRouter fallback.
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    const trimmed = text.substring(0, 8000) // embedding models have token limits

    // Try OpenAI embeddings
    const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: trimmed,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.data[0].embedding
      }
      logger.warn({ status: res.status }, 'OpenAI embedding failed, trying fallback')
    }

    // Try OpenRouter embeddings
    const orKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY
    if (orKey) {
      const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${orKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.ADMIN_URL || 'http://localhost:3000',
          'X-Title': 'Zenith CMS',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: trimmed,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.data[0].embedding
      }
    }

    throw new Error('No embedding provider configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY.')
  }

  /**
   * Cosine similarity between two vectors. Returns 0..1 (1 = identical).
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  /**
   * Index a text field from a document into the vector store.
   * If the document already has a vector for this field, it's replaced.
   */
  static async indexDocument(
    collection: string,
    documentId: string,
    field: string,
    text: string,
    siteId?: string
  ): Promise<void> {
    if (!text || text.trim().length < 2) return

    try {
      const adapter = AdapterFactory.getActiveAdapter()
      const embedding = await this.generateEmbedding(text)

      // Delete existing vector for this document+field
      await adapter.deleteMany('z_vectors', {
        collection,
        documentId,
        field,
        ...(siteId ? { siteId } : {}),
      })

      // Store new vector
      await adapter.create('z_vectors', {
        collection,
        documentId,
        field,
        text: text.substring(0, 500), // store snippet for display
        embedding,
        siteId: siteId || null,
        createdAt: new Date(),
      })

      logger.debug({ collection, documentId, field }, 'Vector indexed')
    } catch (err: any) {
      logger.warn({ err: err.message, collection, documentId, field }, 'Vector indexing failed')
    }
  }

  /**
   * Remove all vectors for a document (call on delete).
   */
  static async removeDocument(collection: string, documentId: string): Promise<void> {
    try {
      const adapter = AdapterFactory.getActiveAdapter()
      await adapter.deleteMany('z_vectors', { collection, documentId })
    } catch (err: any) {
      logger.warn({ err: err.message, collection, documentId }, 'Vector removal failed')
    }
  }

  /**
   * Search for semantically similar content across indexed collections.
   */
  static async search(
    query: string,
    collections: string[],
    limit = 10,
    siteId?: string,
    minScore = 0.3
  ): Promise<SemanticSearchResult[]> {
    if (!collections || collections.length === 0) return []
    const queryEmbedding = await this.generateEmbedding(query)
    const adapter = AdapterFactory.getActiveAdapter()

    // Build filter for target collections
    const filter: Record<string, unknown> = {
      collection: { $in: collections },
    }
    if (siteId) filter.siteId = siteId

    // Fetch all candidate vectors (for small/medium datasets)
    // For production scale, use pgvector or a dedicated vector DB
    const vectors = await adapter.find<Record<string, any>>('z_vectors', filter, { limit: 5000 })

    const results: SemanticSearchResult[] = []

    for (const vec of vectors) {
      if (!vec.embedding || !Array.isArray(vec.embedding)) continue
      const score = this.cosineSimilarity(queryEmbedding, vec.embedding)
      if (score >= minScore) {
        results.push({
          id: vec.documentId,
          collection: vec.collection,
          field: vec.field,
          text: vec.text || '',
          score: Math.round(score * 1000) / 1000,
          siteId: vec.siteId,
        })
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  /**
   * Check if vector search is available (has an embedding provider configured).
   */
  static isAvailable(): boolean {
    return !!(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY)
  }
}
