import client from 'prom-client';

// Enable default Node.js metrics (memory, event loop, GC, etc)
client.collectDefaultMetrics({ prefix: 'zenith_' });

export const metricsRegistry = client.register;

export const httpRequestsTotal = new client.Counter({
  name: 'zenith_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status', 'siteId']
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'zenith_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status', 'siteId'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

export const dbQueryDurationSeconds = new client.Histogram({
  name: 'zenith_db_query_duration_seconds',
  help: 'Duration of Database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5]
});

export const blockGenerationDurationSeconds = new client.Histogram({
  name: 'zenith_block_generation_duration_seconds',
  help: 'Duration of AI Block Generation in seconds',
  buckets: [1, 2.5, 5, 10, 20, 30]
});

export const webhookDeliveryAttempts = new client.Counter({
  name: 'zenith_webhook_delivery_attempts_total',
  help: 'Total webhook delivery attempts',
  labelNames: ['status']
});

export const perTenantRequestCount = new client.Counter({
  name: 'zenith_per_tenant_request_count',
  help: 'Total requests per tenant',
  labelNames: ['siteId']
});
