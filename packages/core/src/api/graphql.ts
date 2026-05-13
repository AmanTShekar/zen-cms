import { _createServer } from 'http';
import { Express } from 'express';
import { CMSConfig, CMSField } from '@zenith/types';
import { logger } from '../services/logger';

/**
 * Zenith GraphQL — Neural Schema Orchestrator
 * ──────────────────────────────────────────
 * Dynamically synthesizes recursive GraphQL types from Zenith collection definitions.
 * Supports deep nested blocks, arrays, and relational entanglement.
 */

// Map Zenith field types → GraphQL types
function fieldTypeToGraphQL(field: CMSField, parentName: string): string {
  const typeName = `${parentName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
  
  switch (field.type) {
    case 'number': return 'Float';
    case 'checkbox':
    case 'boolean': return 'Boolean';
    case 'date': return 'String';
    case 'json': return 'JSON';
    case 'media': return 'MediaObject';
    case 'relation': return 'ID';
    case 'group': return typeName;
    case 'array': return `[${typeName}]`;
    case 'blocks': return `[${typeName}_Block]`;
    default: return 'String';
  }
}

export async function setupGraphQL(app: Express, config: CMSConfig) {
  try {
    const { createHandler } = await import('graphql-http/lib/use/express');
    const { buildSchema } = await import('graphql');
    const mongoose = await import('mongoose');

    let schemaSdl = `
      scalar JSON

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

    const resolvers: Record<string, (...args: unknown[]) => unknown> = {};
    const processedTypes = new Set<string>();

    const buildRecursiveTypes = (fields: CMSField[], parentName: string) => {
      fields.forEach(field => {
        const typeName = `${parentName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
        
        if (field.type === 'group' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName);
          const subFields = (field as unknown).fields?.map((f: CMSField) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName)}`).join('\n');
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`;
          buildRecursiveTypes((field as unknown).fields || [], typeName);
        }

        if (field.type === 'array' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName);
          const subFields = (field as unknown).fields?.map((f: CMSField) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName)}`).join('\n');
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`;
          buildRecursiveTypes((field as unknown).fields || [], typeName);
        }

        if (field.type === 'blocks' && !processedTypes.has(`${typeName}_Block`)) {
          processedTypes.add(`${typeName}_Block`);
          const unionTypes: string[] = [];
          
          (field as unknown).blocks?.forEach((block: unknown) => {
            const blockTypeName = `${typeName}_${block.slug.charAt(0).toUpperCase() + block.slug.slice(1)}`;
            unionTypes.push(blockTypeName);
            const blockFields = block.fields?.map((f: CMSField) => `  ${f.name}: ${fieldTypeToGraphQL(f, blockTypeName)}`).join('\n');
            schemaSdl += `\ntype ${blockTypeName} {\n  blockType: String\n${blockFields}\n}\n`;
            buildRecursiveTypes(block.fields || [], blockTypeName);
          });

          // GraphQL unions aren't ideal here for dynamic blocks, using a unified object instead for simplicity in this loop
          schemaSdl += `\ntype ${typeName}_Block {\n  blockType: String\n  data: JSON\n}\n`;
        }
      });
    };

    config.collections.forEach(col => {
      const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '');
      const slug = col.slug;

      buildRecursiveTypes(col.fields, typeName);

      const typeFields = col.fields
        .map(f => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName)}`)
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

      resolvers[`get${typeName}`] = async (_: unknown, { id }: unknown) => {
        const doc = await mongoose.default.model(slug).findById(id).lean();
        return doc ? { ...doc, id: (doc as unknown)._id?.toString() } : null;
      };

      resolvers[`list${typeName}`] = async (_: unknown, { page = 1, pageSize = 25, status }: unknown) => {
        const filter: unknown = {};
        if (col.drafts && status) filter._status = status;
        const skip = (page - 1) * Math.min(pageSize, 100);
        const [docs, total] = await Promise.all([
          mongoose.default.model(slug).find(filter).skip(skip).limit(Math.min(pageSize, 100)).lean(),
          mongoose.default.model(slug).countDocuments(filter),
        ]);
        return {
          data: docs.map((d: unknown) => ({ ...d, id: d._id?.toString() })),
          pageInfo: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
      };
    });

    (config.globals || []).forEach(global => {
      const typeName = global.name.replace(/[^a-zA-Z0-9]/g, '');
      buildRecursiveTypes(global.fields, typeName);
      const typeFields = global.fields.map(f => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName)}`).join('\n');

      schemaSdl += `\ntype ${typeName} {\n  id: ID!\n${typeFields}\n  updatedAt: String\n}\n`;
      resolvers[`get${typeName}`] = async () => {
        const doc = await mongoose.default.model(global.slug).findOne().lean();
        return doc ? { ...doc, id: (doc as unknown)._id?.toString() } : null;
      };
    });

    const queryFields = [
      ...config.collections.map(c => {
        const n = c.name.replace(/[^a-zA-Z0-9]/g, '');
        return `  get${n}(id: ID!): ${n}\n  list${n}(page: Int, pageSize: Int, status: String): ${n}List`;
      }),
      ...(config.globals || []).map(g => `  get${g.name.replace(/[^a-zA-Z0-9]/g, '')}: ${g.name.replace(/[^a-zA-Z0-9]/g, '')}`)
    ].join('\n');

    schemaSdl += `\ntype Query {\n${queryFields}\n}\n`;

    app.use('/graphql', createHandler({ 
      schema: buildSchema(schemaSdl), 
      rootValue: resolvers 
    }));
    logger.info('Zenith_GraphQL_Ready');
  } catch (err) {
    logger.warn({ err }, 'GraphQL_Setup_Failed');
  }
}
