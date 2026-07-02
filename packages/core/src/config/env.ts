import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
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
  GCS_PROJECT_ID: z.string().optional(),
  GCS_CLIENT_EMAIL: z.string().optional(),
  GCS_PRIVATE_KEY: z.string().optional(),
  GCS_BUCKET: z.string().optional(),
  AZURE_ACCOUNT_NAME: z.string().optional(),
  AZURE_ACCOUNT_KEY: z.string().optional(),
  AZURE_CONTAINER_NAME: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
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
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(' Invalid environment variables:');
    error.errors.forEach(e => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  } else {
    console.error(' Error parsing environment variables', error);
  }
  process.exit(1);
}

export const env = parsedEnv;
