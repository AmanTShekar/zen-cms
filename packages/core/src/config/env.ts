import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  JWT_SECRET: z.string().default('dev_fallback_secret_change_in_prod'),
  JWT_REFRESH_SECRET: z.string().default('dev_fallback_refresh_change_in_prod'),
  ADMIN_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  DATABASE_TYPE: z.enum(['postgres', 'mongodb']).optional(),
  
  // Tracing / Telemetry
  OTLP_TRACE_URL: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  ENABLE_TRACING: z.enum(['true', 'false']).default('false'),

  // Storage (S3 / Cloudinary)
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Zenith CMS <noreply@zenith.local>'),
  RESEND_API_KEY: z.string().optional(),

  // AI & External
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ZENITH_LICENSE_KEY: z.string().optional(),
  IS_EE: z.enum(['true', 'false']).default('false'),
  
  // Security / Limits
  PREVIEW_SECRET: z.string().default('zenith_preview_secret_v1'),
  AUDIT_RETENTION_DAYS: z.string().transform(Number).default('90'),
  WEBHOOK_MAX_RETRIES: z.string().transform(Number).default('4'),
  WEBHOOK_RETRY_DELAYS: z.string().optional(),
  WEBHOOK_TIMEOUT_MS: z.string().transform(Number).default('5000')
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
  
  if (parsedEnv.NODE_ENV === 'production') {
    if (parsedEnv.JWT_SECRET === 'dev_fallback_secret_change_in_prod') {
      console.error('FATAL: JWT_SECRET must be set in production!');
      process.exit(1);
    }
    if (parsedEnv.JWT_REFRESH_SECRET === 'dev_fallback_refresh_change_in_prod') {
      console.error('FATAL: JWT_REFRESH_SECRET must be set in production!');
      process.exit(1);
    }
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach(e => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  } else {
    console.error('❌ Error parsing environment variables', error);
  }
  process.exit(1);
}

export const env = parsedEnv;
