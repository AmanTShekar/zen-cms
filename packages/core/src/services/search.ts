import mongoose from 'mongoose';
import { CollectionConfig } from '@zenith/types';

export interface SearchResult {
  collection: string;
  collectionLabel: string;
  id: string;
  field: string;
  snippet: string;
  score: number;
}

/**
 * Zenith Global Search Service
 * ─────────────────────────────
 * Searches across all text fields in all collections.
 * Returns ranked results with field-level context snippets.
 * No Elasticsearch required — uses MongoDB regex for MVP.
 */
export class SearchService {
  static async globalSearch(
    query: string,
    collections: CollectionConfig[],
    limit = 20
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    await Promise.all(
      collections
        .filter(col => !col.admin?.hidden)
        .map(async col => {
          try {
            const textFields = col.fields
              .filter(f => ['text', 'textarea', 'richtext', 'email'].includes(f.type))
              .map(f => f.name);

            if (textFields.length === 0) return;

            const orQuery = textFields.map(field => ({ [field]: regex }));
            const Model = mongoose.model(col.slug);
            const docs = await Model.find({ $or: orQuery }).limit(10).lean().exec();

            for (const doc of docs) {
              for (const field of textFields) {
                const value = (doc as any)[field];
                if (typeof value === 'string' && regex.test(value)) {
                  const matchIndex = value.toLowerCase().indexOf(query.toLowerCase());
                  const start = Math.max(0, matchIndex - 40);
                  const end = Math.min(value.length, matchIndex + query.length + 40);
                  const snippet = (start > 0 ? '…' : '') + value.slice(start, end) + (end < value.length ? '…' : '');

                  results.push({
                    collection: col.slug,
                    collectionLabel: col.labels?.plural || col.name,
                    id: (doc as any)._id?.toString(),
                    field,
                    snippet,
                    score: field === (col.admin?.useAsTitle || 'title') ? 2 : 1,
                  });
                  break;
                }
              }
            }
          } catch {
            // Model may not exist yet — skip
          }
        })
    );

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
