import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'
import { CMSConfig } from '@zenithcms/types'

// Helper to map Zenith field types to OpenAPI schemas
function mapFieldToSwagger(field: any): any {
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
      const enumValues = field.options?.map((o: any) => typeof o === 'string' ? o : o.value)
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
          properties: field.fields?.reduce((acc: any, f: any) => {
            acc[f.name] = mapFieldToSwagger(f)
            return acc
          }, {})
        }
      }
    case 'group':
      return {
        type: 'object',
        properties: field.fields?.reduce((acc: any, f: any) => {
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
    const properties: any = {}
    col.fields.forEach((field: any) => {
      properties[field.name] = mapFieldToSwagger(field)
    })
    const collectionSchema = { type: 'object', properties }

    if (!(specs as any).paths) (specs as any).paths = {}
    
    ;(specs as any).paths[`/${slug}`] = {
      get: {
        tags: [name],
        summary: `List all ${slug}`,
        responses: { 
          200: { 
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: collectionSchema } } }
          } 
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      post: {
        tags: [name],
        summary: `Create a new ${name}`,
        requestBody: { 
          content: { 'application/json': { schema: collectionSchema } } 
        },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: collectionSchema } } } },
        security: [{ bearerAuth: [] }],
      },
    }
    
    ;(specs as any).paths[`/${slug}/{id}`] = {
      get: {
        tags: [name],
        summary: `Get a single ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 
          200: { 
            description: 'Success',
            content: { 'application/json': { schema: collectionSchema } }
          } 
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
          } 
        },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        tags: [name],
        summary: `Delete ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'No Content' } },
        security: [{ bearerAuth: [] }],
      },
    }
  })

  // Export JSON spec for openapi-typescript client generation
  app.get('/api-docs/json', (req, res) => {
    res.json(specs)
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))
}
