import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { CMSConfig } from '@zenith/types';

export function setupSwagger(app: Express, config: CMSConfig) {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Zenith CMS API',
        version: '1.0.0',
        description: 'Automated documentation for your Zenith CMS ecosystem',
      },
      servers: [
        { url: '/api/v1', description: 'Development server' },
      ],
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
    apis: [], // We will generate paths dynamically
  };

  const specs = swaggerJsdoc(options);

  // Dynamically inject paths for each collection
  config.collections.forEach((col) => {
    const slug = col.slug;
    const name = col.name;

    if (!(specs as any).paths) (specs as any).paths = {};
    (specs as any).paths[`/${slug}`] = {
      get: {
        tags: [name],
        summary: `List all ${slug}`,
        responses: { 200: { description: 'Success' } },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      post: {
        tags: [name],
        summary: `Create a new ${name}`,
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' } },
        security: [{ bearerAuth: [] }],
      },
    };

    (specs as any).paths[`/${slug}/{id}`] = {
      get: {
        tags: [name],
        summary: `Get a single ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      put: {
        tags: [name],
        summary: `Update ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Success' } },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        tags: [name],
        summary: `Delete ${name}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'No Content' } },
        security: [{ bearerAuth: [] }],
      },
    };
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
