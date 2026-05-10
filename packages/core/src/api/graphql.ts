import { createServer } from 'http';
import { Express } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { CMSConfig } from '@zenith/types';
import { logger } from '../services/logger';

/**
 * Zenith GraphQL — Schema-per-Collection Auto-Generator
 * ───────────────────────────────────────────────────────
 * Uses graphql-http (modern, no deprecated apollo-server-express v3).
 * Generates typed queries for every collection defined in cms.config.ts.
 */

// Map Zenith field types → GraphQL scalar types
function fieldTypeToGraphQL(type: string): string {
  switch (type) {
    case 'number': return 'Float';
    case 'checkbox':
    case 'boolean': return 'Boolean';
    case 'date': return 'String'; // ISO string
    case 'json': return 'String'; // serialized
    case 'media': return 'MediaObject';
    case 'relation': return 'ID';
    default: return 'String';
  }
}

export async function setupGraphQL(app: Express, config: CMSConfig) {
  try {
    // Dynamically import graphql-http to avoid bundling issues
    const { createHandler } = await import('graphql-http/lib/use/express');
    const { buildSchema } = await import('graphql');
    const mongoose = await import('mongoose');

    let schemaSdl = `
      type MediaObject {
        url: String
        alt: String
        width: Float
        height: Float
      }

      type PageInfo {
        page: Int
        pageSize: Int
        total: Int
        totalPages: Int
      }
    `;

    const resolvers: Record<string, Function> = {};

    config.collections.forEach(col => {
      const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '');
      const slug = col.slug;

      // Build type fields
      const typeFields = col.fields
        .filter(f => !['group', 'array', 'blocks', 'tabs'].includes(f.type))
        .map(f => `  ${f.name}: ${fieldTypeToGraphQL(f.type)}`)
        .join('\n');

      schemaSdl += `
        type ${typeName} {
          id: ID!
${typeFields}
          createdAt: String
          updatedAt: String
          ${col.drafts ? '_status: String' : ''}
        }

        type ${typeName}List {
          data: [${typeName}]
          pageInfo: PageInfo
        }
      `;

      // Query resolvers
      resolvers[`get${typeName}`] = async (_: any, { id }: any) => {
        try {
          const doc = await mongoose.default.model(slug).findById(id).lean();
          if (!doc) return null;
          return { ...doc, id: (doc as any)._id?.toString() };
        } catch {
          return null;
        }
      };

      resolvers[`list${typeName}`] = async (_: any, { page = 1, pageSize = 25, status }: any) => {
        try {
          const filter: any = {};
          if (col.drafts && status) filter._status = status;

          const skip = (page - 1) * Math.min(pageSize, 100);
          const [docs, total] = await Promise.all([
            mongoose.default.model(slug).find(filter).skip(skip).limit(Math.min(pageSize, 100)).lean(),
            mongoose.default.model(slug).countDocuments(filter),
          ]);
          return {
            data: docs.map((d: any) => ({ ...d, id: d._id?.toString() })),
            pageInfo: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
          };
        } catch {
          return { data: [], pageInfo: { page, pageSize, total: 0, totalPages: 0 } };
        }
      };
    });

    // Add Globals
    (config.globals || []).forEach(global => {
      const typeName = global.name.replace(/[^a-zA-Z0-9]/g, '');
      const slug = global.slug;

      const typeFields = global.fields
        .filter(f => !['group', 'array', 'blocks', 'tabs'].includes(f.type))
        .map(f => `  ${f.name}: ${fieldTypeToGraphQL(f.type)}`)
        .join('\n');

      schemaSdl += `
        type ${typeName} {
          id: ID!
${typeFields}
          createdAt: String
          updatedAt: String
        }
      `;

      resolvers[`get${typeName}`] = async () => {
        try {
          const doc = await mongoose.default.model(slug).findOne().lean();
          if (!doc) return null;
          return { ...doc, id: (doc as any)._id?.toString() };
        } catch { return null; }
      };
    });

    // Build query type
    const collectionQueryFields = config.collections
      .map(col => {
        const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '');
        return `  get${typeName}(id: ID!): ${typeName}\n  list${typeName}(page: Int, pageSize: Int, status: String): ${typeName}List`;
      })
      .join('\n');
    
    const globalQueryFields = (config.globals || [])
      .map(g => {
        const typeName = g.name.replace(/[^a-zA-Z0-9]/g, '');
        return `  get${typeName}: ${typeName}`;
      })
      .join('\n');

    schemaSdl += `\n  type Query {\n${collectionQueryFields}\n${globalQueryFields}\n  }\n`;

    const schema = buildSchema(schemaSdl);

    // Attach all resolvers to the root
    const rootValue = resolvers;

    app.use('/graphql', createHandler({ schema, rootValue }));
    logger.info('GraphQL ready at /graphql');
  } catch (err) {
    // GraphQL is optional — engine still starts without it
    logger.warn({ err }, 'GraphQL setup skipped — install graphql-http to enable');
  }
}
