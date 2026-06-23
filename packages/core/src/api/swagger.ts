import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'
import { CMSConfig } from '@zenith-open/zenithcms-types'

// Helper to map Zenith field types to OpenAPI schemas
function mapFieldToSwagger(field: Record<string, unknown>): unknown {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'textarea':
    case 'richtext':
      return { type: 'string' }
    case 'number':
      return { type: 'number' }
    case 'checkbox':
      return { type: 'boolean' }
    case 'date':
      return { type: 'string', format: 'date-time' }
    case 'select': {
      const enumValues = field.options?.map((o: Record<string, unknown>) => typeof o === 'string' ? o : o.value)
      const baseSchema = enumValues ? { type: 'string', enum: enumValues } : { type: 'string' }
      return field.hasMany ? { type: 'array', items: baseSchema } : baseSchema
    }
    case 'media':
    case 'relation':
      return field.hasMany ? { type: 'array', items: { type: 'string' } } : { type: 'string' }
    case 'array':
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: field.fields?.reduce((acc: Record<string, unknown>, f: Record<string, unknown>) => {
            acc[f.name] = mapFieldToSwagger(f)
            return acc
          }, {})
        }
      }
    case 'group':
      return {
        type: 'object',
        properties: field.fields?.reduce((acc: Record<string, unknown>, f: Record<string, unknown>) => {
          acc[f.name] = mapFieldToSwagger(f)
          return acc
        }, {})
      }
    case 'json':
      return { type: 'object' }
    default:
      return { type: 'string' }
  }
}

export function setupSwagger(app: Express, config: CMSConfig) {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Zenith CMS API',
        version: '1.0.0',
        description: 'Automated documentation for your Zenith CMS ecosystem',
      },
      servers: [{ url: '/api/v1', description: 'Development server' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
    apis: [], // We generate paths dynamically
  }

  const specs = swaggerJsdoc(options)

  // Dynamically inject paths for each collection
  config.collections.forEach((col) => {
    const slug = col.slug
    const name = col.name

    // Build the specific schema for this collection
    const properties: Record<string, unknown> = {}
    col.fields.forEach((field: Record<string, unknown>) => {
      properties[field.name] = mapFieldToSwagger(field)
    })
    const collectionSchema = { type: 'object', properties }

    const errorSchema = {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }

    const errorResponses = {
      400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } },
      404: { description: 'Not Found', content: { 'application/json': { schema: errorSchema } } },
      422: { description: 'Unprocessable Entity', content: { 'application/json': { schema: errorSchema } } },
      500: { description: 'Internal Server Error', content: { 'application/json': { schema: errorSchema } } },
    }

    if (!(specs as Record<string, unknown>).paths) (specs as Record<string, unknown>).paths = {}
    
    ;(specs as Record<string, unknown>).paths[`/${slug}`] = {
      get: {
        tags: [name],
        summary: `List all ${slug}`,
        responses: { 
          200: { 
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: collectionSchema } } }
          },
          ...errorResponses
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      post: {
        tags: [name],
        summary: `Create a new ${name}`,
        requestBody: { 
          content: { 'application/json': { schema: collectionSchema } } 
        },
        responses: { 
          201: { description: 'Created', content: { 'application/json': { schema: collectionSchema } } },
          ...errorResponses
        },
        security: [{ bearerAuth: [] }],
      },
    }
    
    ;(specs as Record<string, unknown>).paths[`/${slug}/{id}`] = {
      get: {
        tags: [name],
        summary: `Get a single ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 
          200: { 
            description: 'Success',
            content: { 'application/json': { schema: collectionSchema } }
          },
          ...errorResponses
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      put: {
        tags: [name],
        summary: `Update ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { 
          content: { 'application/json': { schema: collectionSchema } } 
        },
        responses: { 
          200: { 
            description: 'Success',
            content: { 'application/json': { schema: collectionSchema } }
          },
          ...errorResponses
        },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        tags: [name],
        summary: `Delete ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 
          204: { description: 'No Content' },
          ...errorResponses
        },
        security: [{ bearerAuth: [] }],
      },
    }
  })

  // Export JSON spec for openapi-typescript client generation
  app.get('/api/docs/json', (req, res) => {
    res.json(specs)
  })

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs))
}
