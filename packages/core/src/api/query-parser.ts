import { CollectionConfig } from '@zenith/types';

interface ParsedQuery {
  filter: Record<string, any>;
  sort: string;
  pagination: {
    page: number;
    pageSize: number;
  };
  select: string;
  populate: string[];
}

/**
 * Zenith Advanced Query Parser
 * ───────────────────────────
 * Converts URL query parameters into MongoDB-compatible filters and options.
 * Supports:
 * - ?filter[name][eq]=Zenith
 * - ?sort=-createdAt
 * - ?page=1&pageSize=10
 * - ?fields=title,slug
 */
export function parseQueryParams(query: any, config: CollectionConfig): ParsedQuery {
  const parsed: ParsedQuery = {
    filter: {},
    sort: '-createdAt',
    pagination: {
      page: parseInt(query.page) || 1,
      pageSize: Math.min(parseInt(query.pageSize) || 25, 100),
    },
    select: '',
    populate: []
  };

  // 1. Sorting
  if (query.sort) {
    parsed.sort = query.sort;
  }

  // 2. Select Fields
  if (query.fields) {
    parsed.select = query.fields.split(',').join(' ');
  }

  // 3. Populate (Relations)
  if (query.populate) {
    parsed.populate = query.populate.split(',');
  }

  // 4. Advanced Filtering
  // Example: filter[status][eq]=draft
  if (query.filter && typeof query.filter === 'object') {
    Object.entries(query.filter).forEach(([field, ops]) => {
      if (typeof ops === 'object' && ops !== null) {
        Object.entries(ops).forEach(([op, value]) => {
          switch (op) {
            case 'eq': parsed.filter[field] = value; break;
            case 'ne': parsed.filter[field] = { $ne: value }; break;
            case 'gt': parsed.filter[field] = { $gt: value }; break;
            case 'lt': parsed.filter[field] = { $lt: value }; break;
            case 'gte': parsed.filter[field] = { $gte: value }; break;
            case 'lte': parsed.filter[field] = { $lte: value }; break;
            case 'in': parsed.filter[field] = { $in: Array.isArray(value) ? value : [value] }; break;
            case 'like': parsed.filter[field] = { $regex: value, $options: 'i' }; break;
          }
        });
      } else {
        // Simple equality shorthand: ?filter[name]=Zenith
        parsed.filter[field] = ops;
      }
    });
  }

  // Handle Search Q shorthand
  if (query.q) {
    const titleField = config.admin?.useAsTitle || 'title';
    parsed.filter[titleField] = { $regex: query.q, $options: 'i' };
  }

  return parsed;
}
