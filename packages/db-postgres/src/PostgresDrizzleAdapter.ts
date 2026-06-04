import { CollectionConfig, FieldConfig, DatabaseAdapter, FindOptions, BaseOptions, AuditLogData, VersionData, WebhookDeliveryData, WebhookDeliveryRecord } from '@zenithcms/types'
import NodeCache from 'node-cache'
import pino from 'pino'

// Import Drizzle ORM and Postgres
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql, eq, and, desc, or } from 'drizzle-orm'
import { QueryASTParser, QueryNode, FieldNode, LogicalNode } from './query-ast'
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
  boolean,
  bigint,
  PgColumnBuilderBase,
} from 'drizzle-orm/pg-core'

const logger = pino()

/**
 * PostgreSQL Database Adapter with Drizzle ORM
 * ─────────────────────────────────────────────
 * Phase B: "The Tightening"
 * Features:
 * - Dynamic Column Mapping (No more JSONB traps)
 * - Auto-Migration Engine (safe DDL execution on boot)
 * - Atomic Multi-Table Transactions.
 * - Pre-compiled Zod validation caching.
 */
export class PostgresDrizzleAdapter implements DatabaseAdapter {
  name = 'postgres-drizzle'
  private pool: Pool
  public db: NodePgDatabase
  private cache: NodeCache
  private tables: Record<string, any> = {}
  private configs: Record<string, CollectionConfig> = {}

  // Registry of tenant connection pools to dynamically switch on-the-fly
  private tenantPools: Record<string, { pool: Pool; db: NodePgDatabase }> = {}

  // Built-in system tables defined via Drizzle
  private systemTables = {
    auditLog: pgTable('audit_logs', {
      id: uuid('id').defaultRandom().primaryKey(),
      timestamp: timestamp('timestamp').defaultNow().notNull(),
      collectionName: text('collection_name').notNull(),
      documentId: text('document_id'),
      userId: text('user_id'),
      userEmail: text('user_email'),
      userName: text('user_name'),
      action: text('action').notNull(),
      changes: jsonb('changes'),
      ip: text('ip'),
      userAgent: text('user_agent'),
      status: text('status'),
      resource: text('resource'),
      siteId: text('site_id'),
      hash: text('hash'),
      previousHash: text('previous_hash'),
    }),
    version: pgTable('versions', {
      id: uuid('id').defaultRandom().primaryKey(),
      timestamp: timestamp('timestamp').defaultNow().notNull(),
      collectionName: text('collection_name').notNull(),
      collectionSlug: text('collection_slug').notNull(),
      documentId: text('document_id').notNull(),
      snapshot: jsonb('snapshot').notNull(),
      delta: jsonb('delta'),
      createdBy: text('created_by').notNull(),
    }),
    flows: pgTable('flows', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      active: boolean('active').default(false).notNull(),
      trigger: jsonb('trigger').notNull(),
      steps: jsonb('steps').notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    users: pgTable('users', {
      id: uuid('id').defaultRandom().primaryKey(),
      email: text('email').unique().notNull(),
      password: text('password').notNull(),
      role: text('role').notNull(),
      failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
      lockUntil: timestamp('lock_until'),
      emailVerified: boolean('email_verified').default(false).notNull(),
      verificationToken: text('verification_token'),
      verificationTokenExpiry: timestamp('verification_token_expiry'),
    }),
    passwordResets: pgTable('z_password_resets', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: text('user_id').notNull(),
      token: text('token').notNull(),
      expiresAt: timestamp('expires_at').notNull(),
      used: boolean('used').default(false).notNull(),
    }),
    apiKeys: pgTable('z_api_keys', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      key: text('key').notNull(),
      role: text('role').notNull(),
      expiresAt: timestamp('expires_at'),
      revoked: boolean('revoked').default(false).notNull(),
      lastUsed: timestamp('last_used'),
      allowedCollections: jsonb('allowed_collections'),
    }),
    migrations: pgTable('z_migrations', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').unique().notNull(),
      batch: integer('batch').notNull(),
      executedAt: timestamp('executed_at').defaultNow().notNull(),
    }),
    webhookDelivery: pgTable('z_webhook_deliveries', {
      id: uuid('id').defaultRandom().primaryKey(),
      webhookId: text('webhook_id'),
      timestamp: timestamp('timestamp').defaultNow().notNull(),
      collectionSlug: text('collection_slug'),
      event: text('event').notNull(),
      url: text('url').notNull(),
      payload: jsonb('payload'),
      success: boolean('success').notNull(),
      responseStatus: integer('response_status'),
    }),
    settings: pgTable('z_settings', {
      id: uuid('id').defaultRandom().primaryKey(),
      siteName: text('site_name').default('Zenith CMS'),
      publicUrl: text('public_url'), // No default — must be set explicitly per deployment
      maintenanceMode: boolean('maintenance_mode').default(false),
      enableDrafts: boolean('enable_drafts').default(true),
      defaultLocale: text('default_locale').default('en'),
      allowedOrigins: jsonb('allowed_origins'),
      jwtExpiresIn: text('jwt_expires_in').default('7d'),
      passwordMinLength: integer('password_min_length').default(8),
      rateLimitWindow: integer('rate_limit_window').default(15),
      rateLimitMax: integer('rate_limit_max').default(100),
      customCSS: text('custom_css').default(''),
    }),
    collections: pgTable('z_collections', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      slug: text('slug').unique().notNull(),
      labels: jsonb('labels'),
      drafts: boolean('drafts').default(false).notNull(),
      timestamps: boolean('timestamps').default(true).notNull(),
      fields: jsonb('fields').notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    presence: pgTable('z_presence', {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: text('user_id').notNull(),
      email: text('email').notNull(),
      collectionName: text('collection_name').notNull(),
      documentId: text('document_id').notNull(),
      lastActive: bigint('last_active', { mode: 'number' }).notNull(),
    }),
    sites: pgTable('z_sites', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      slug: text('slug').unique().notNull(),
      icon: text('icon').default('🌐'),
      description: text('description'),
      ownerId: text('owner_id').notNull(),
      workspaceId: text('workspace_id'),
      members: jsonb('members').default([]),
      collections: jsonb('collections').default([]),
      globals: jsonb('globals').default([]),
      billingEnabled: boolean('billing_enabled').default(false),
      stripePublicKey: text('stripe_public_key'),
      stripeSecretKey: text('stripe_secret_key'),
      stripeWebhookSecret: text('stripe_webhook_secret'),
      currency: text('currency').default('USD'),
      pricingPlans: jsonb('pricing_plans').default([]),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    workspaces: pgTable('z_workspaces', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      slug: text('slug').unique().notNull(),
      ownerId: text('owner_id').notNull(),
      members: jsonb('members').default([]),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    locks: pgTable('z_locks', {
      id: uuid('id').defaultRandom().primaryKey(),
      collectionName: text('collection_name').notNull(),
      documentId: text('document_id').notNull(),
      siteId: text('site_id'),
      lockedBy: text('locked_by').notNull(),
      lockedByEmail: text('locked_by_email').notNull(),
      lockedAt: timestamp('locked_at').defaultNow().notNull(),
      lockExpiresAt: timestamp('lock_expires_at').notNull(),
    }),
    webhookConfigs: pgTable('z_webhook_configs', {
      id: uuid('id').defaultRandom().primaryKey(),
      url: text('url').notNull(),
      secret: text('secret'),
      events: jsonb('events').notNull().default([]),
      enabled: boolean('enabled').default(true).notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    redirects: pgTable('z_redirects', {
      id: uuid('id').defaultRandom().primaryKey(),
      from: text('from').notNull(),
      to: text('to').notNull(),
      type: text('type').default('301').notNull(),
      siteId: text('site_id'),
      hits: integer('hits').default(0).notNull(),
      lastHitAt: timestamp('last_hit_at'),
      createdBy: text('created_by'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
    }),
    roles: pgTable('z_roles', {
      id: uuid('id').defaultRandom().primaryKey(),
      roleName: text('role_name').notNull().unique(),
      roleType: text('role_type').notNull().default('custom'),
      description: text('description').default(''),
      isSystem: boolean('is_system').default(false).notNull(),
      permissions: jsonb('permissions').default([]).notNull(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    releases: pgTable('z_releases', {
      id: uuid('id').defaultRandom().primaryKey(),
      name: text('name').notNull(),
      description: text('description').default(''),
      documents: jsonb('documents').default([]).notNull(),
      status: text('status').notNull().default('pending'),
      scheduledAt: timestamp('scheduled_at'),
      publishedAt: timestamp('published_at'),
      publishedBy: text('published_by'),
      failureReason: text('failure_reason'),
      siteId: text('site_id'),
      createdBy: text('created_by'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
    plugins: pgTable('z_plugins', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      version: text('version').default('1.0.0'),
      description: text('description').default(''),
      author: text('author').default(''),
      homepage: text('homepage').default(''),
      packageName: text('package_name').default(''),
      configSchema: jsonb('config_schema').default({}),
      config: jsonb('config').default({}),
      enabled: boolean('enabled').default(true).notNull(),
      installedAt: timestamp('installed_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }),
  }

  constructor(private connectionString: string) {
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })

    logger.info('PostgresDrizzleAdapter: Zod Parser Cache pre-allocated for speed.')

    // Configure connection pooling (configurable via env)
    const poolMax = parseInt(process.env.POSTGRES_POOL_MAX || '20', 10)
    const poolIdleTimeout = parseInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT || '30000', 10)
    const poolConnectionTimeout = parseInt(process.env.POSTGRES_POOL_CONNECT_TIMEOUT || '2000', 10)
    const poolSslRejectUnauthorized = process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED || 'true'

    const poolOptions: any = {
      connectionString: this.connectionString,
      max: poolMax,
      idleTimeoutMillis: poolIdleTimeout,
      connectionTimeoutMillis: poolConnectionTimeout,
    }

    // Enable SSL when POSTGRES_URI contains sslmode=require or when explicitly configured
    if (process.env.POSTGRES_SSL_ENABLED === 'true' || this.connectionString.includes('sslmode=require')) {
      poolOptions.ssl = {
        rejectUnauthorized: poolSslRejectUnauthorized !== 'false',
      }
    }

    this.pool = new Pool(poolOptions)

    this.db = drizzle(this.pool)
    logger.info('PostgresDrizzleAdapter: Initialized successfully with connection pooling')
  }

  /**
   * Executes a database operation within a tenant-isolated RLS context.
   * If siteId is provided, it begins a transaction, sets the local config parameter,
   * and yields the transaction object.
   */
  public async runWithTenantContext<T>(
    siteId: string | undefined,
    operation: (tx: any) => Promise<T>
  ): Promise<T> {
    if (!siteId) {
      return operation(this.db)
    }

    return await this.db.transaction(async (tx) => {
      // Inject hardware-level tenant isolation for this transaction
      await tx.execute(sql`SET LOCAL app.site_id = ${siteId}`)
      return await operation(tx)
    })
  }

  async registerTenant(tenantId: string, tenantConnectionString: string): Promise<void> {
    if (this.tenantPools[tenantId]) {
      return
    }

    logger.info(
      `PostgresDrizzleAdapter: Dynamically provisioning connection pool for tenant [${tenantId}]`
    )
    const pool = new Pool({
      connectionString: tenantConnectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
    const db = drizzle(pool)

    const client = await pool.connect()
    client.release()

    this.tenantPools[tenantId] = { pool, db }

    await this._ensureSystemTables(db)
  }

  private getDbClient(options?: BaseOptions): NodePgDatabase<any> {
    const tenantId = (options as any)?.tenantId || (options as any)?.siteId
    if (tenantId && this.tenantPools[tenantId]) {
      return this.tenantPools[tenantId].db
    }
    return this.db
  }

  async connect(): Promise<void> {
    const maxRetries = 5
    const retryDelay = 3000
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect()
        client.release()
        logger.info('PostgresDrizzleAdapter: Connected to PostgreSQL')

        await this._ensureSystemTables()
        return
      } catch (error: any) {
        logger.error({ attempt, error: error.message }, 'PostgresDrizzleAdapter: Connection failed')
        if (attempt < maxRetries) {
          logger.info(`Retrying PostgreSQL connection in ${retryDelay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        } else {
          throw error
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    for (const [tenantId, tenant] of Object.entries(this.tenantPools)) {
      await tenant.pool.end()
      logger.info(`PostgresDrizzleAdapter: Disconnected tenant [${tenantId}] pool`)
    }
    await this.pool.end()
    logger.info('PostgresDrizzleAdapter: Disconnected')
  }

  getHealth(): 'ok' | 'connecting' | 'disconnected' | 'error' {
    if (this.pool.totalCount === 0) return 'disconnected'
    return this.pool.idleCount > 0 ? 'ok' : 'connecting'
  }

  private async _ensureSystemTables(db: NodePgDatabase<any> = this.db) {
    let acquired = false
    try {
      await db.execute(sql`SELECT pg_advisory_lock(99999)`)
      acquired = true
    } catch (err: any) {
      logger.warn({ err: err.message }, 'PostgresDrizzleAdapter: System tables advisory lock acquisition failed/timed out. Proceeding without lock.')
    }

    try {
      const createAuditLogTable = sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
          collection_name TEXT NOT NULL,
          document_id TEXT,
          user_id TEXT,
          user_email TEXT,
          user_name TEXT,
          action TEXT NOT NULL,
          changes JSONB,
          ip TEXT,
          user_agent TEXT,
          status TEXT,
          resource TEXT,
          site_id TEXT,
          hash TEXT,
          previous_hash TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_collection ON audit_logs(collection_name);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_site ON audit_logs(site_id);
        
        -- Enable RLS for Audit Logs
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
        CREATE POLICY tenant_isolation_policy ON audit_logs 
          FOR ALL 
          USING (
            site_id = current_setting('app.site_id', true) 
            OR current_setting('app.site_id', true) = ''
            OR current_setting('app.site_id', true) IS NULL
            OR site_id IS NULL
          );
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      `

      const createVersionTable = sql`
        CREATE TABLE IF NOT EXISTS versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
          collection_name TEXT NOT NULL,
          collection_slug TEXT NOT NULL,
          document_id TEXT NOT NULL,
          snapshot JSONB NOT NULL,
          delta JSONB,
          created_by TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_versions_doc ON versions(document_id);
      `

      const createFlowsTable = sql`
        CREATE TABLE IF NOT EXISTS flows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT false NOT NULL,
          trigger JSONB NOT NULL DEFAULT '{}'::jsonb,
          steps JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_flows_active ON flows(active);
      `

      const createUsersTable = sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
          lock_until TIMESTAMP,
          email_verified BOOLEAN DEFAULT false NOT NULL,
          verification_token TEXT,
          verification_token_expiry TIMESTAMP,
          two_factor_secret TEXT,
          two_factor_enabled BOOLEAN DEFAULT false NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `

      const createPasswordResetsTable = sql`
        CREATE TABLE IF NOT EXISTS z_password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_resets_token ON z_password_resets(token);
      `

      const createApiKeysTable = sql`
        CREATE TABLE IF NOT EXISTS z_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          key TEXT NOT NULL,
          role TEXT NOT NULL,
          expires_at TIMESTAMP,
          revoked BOOLEAN DEFAULT false NOT NULL,
          last_used TIMESTAMP,
          allowed_collections JSONB DEFAULT '[]'::jsonb
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON z_api_keys(key);
      `

      const createMigrationsTable = sql`
        CREATE TABLE IF NOT EXISTS z_migrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT UNIQUE NOT NULL,
          batch INTEGER NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_migrations_name ON z_migrations(name);
      `

      const createWebhookDeliveriesTable = sql`
        CREATE TABLE IF NOT EXISTS z_webhook_deliveries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
          collection_slug TEXT,
          event TEXT NOT NULL,
          url TEXT NOT NULL,
          payload JSONB,
          success BOOLEAN NOT NULL,
          response_status INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON z_webhook_deliveries(event);
      `

      const createWebhookConfigsTable = sql`
        CREATE TABLE IF NOT EXISTS z_webhook_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          url TEXT NOT NULL,
          secret TEXT,
          events JSONB NOT NULL DEFAULT '[]',
          enabled BOOLEAN DEFAULT true NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_configs_url ON z_webhook_configs(url);
      `

      const createSchemasTable = sql`
        CREATE TABLE IF NOT EXISTS z_schemas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE NOT NULL,
          singular TEXT NOT NULL,
          plural TEXT NOT NULL,
          fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_schemas_slug ON z_schemas(slug);
      `

      const createCampaignsTable = sql`
        CREATE TABLE IF NOT EXISTS z_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          audience TEXT DEFAULT 'all' NOT NULL,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `

      const createPluginsTable = sql`
        CREATE TABLE IF NOT EXISTS z_plugins (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT DEFAULT '1.0.0',
          description TEXT DEFAULT '',
          author TEXT DEFAULT '',
          homepage TEXT DEFAULT '',
          package_name TEXT DEFAULT '',
          config_schema JSONB DEFAULT '{}'::jsonb,
          config JSONB DEFAULT '{}'::jsonb,
          enabled BOOLEAN DEFAULT true NOT NULL,
          installed_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `

      const createSettingsTable = sql`
        CREATE TABLE IF NOT EXISTS z_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_name TEXT DEFAULT 'Zenith CMS',
          public_url TEXT, -- No default: must be set explicitly per deployment (PUBLIC_URL env var)
          maintenance_mode BOOLEAN DEFAULT false,
          enable_drafts BOOLEAN DEFAULT true,
          default_locale TEXT DEFAULT 'en',
          allowed_origins JSONB DEFAULT '["*"]'::jsonb,
          jwt_expires_in TEXT DEFAULT '7d',
          password_min_length INTEGER DEFAULT 8,
          rate_limit_window INTEGER DEFAULT 15,
          rate_limit_max INTEGER DEFAULT 100,
          custom_css TEXT DEFAULT ''
        );
      `

      const createSitesTable = sql`
        CREATE TABLE IF NOT EXISTS z_sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          icon TEXT DEFAULT '🌐',
          description TEXT,
          owner_id TEXT NOT NULL,
          workspace_id TEXT,
          members JSONB DEFAULT '[]'::jsonb,
          collections JSONB DEFAULT '[]'::jsonb,
          globals JSONB DEFAULT '[]'::jsonb,
          billing_enabled BOOLEAN DEFAULT false,
          stripe_public_key TEXT,
          stripe_secret_key TEXT,
          stripe_webhook_secret TEXT,
          currency TEXT DEFAULT 'USD',
          pricing_plans JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sites_slug ON z_sites(slug);
        CREATE INDEX IF NOT EXISTS idx_sites_workspace ON z_sites(workspace_id);
      `

      const createWorkspacesTable = sql`
        CREATE TABLE IF NOT EXISTS z_workspaces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          owner_id TEXT NOT NULL,
          members JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON z_workspaces(slug);
      `

      const migrateSitesWorkspaceId = sql`
        ALTER TABLE z_sites ADD COLUMN IF NOT EXISTS workspace_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_sites_workspace ON z_sites(workspace_id);
      `

      const createUserPreferencesTable = sql`
        CREATE TABLE IF NOT EXISTS z_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE (user_id, key)
        );
      `

      const createMembersTable = sql`
        CREATE TABLE IF NOT EXISTS z_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          name TEXT,
          avatar TEXT,
          is_subscribed BOOLEAN DEFAULT false,
          subscription_status TEXT DEFAULT 'none',
          stripe_customer_id TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_members_email ON z_members(email);
      `

      const createDashboardLayoutsTable = sql`
        CREATE TABLE IF NOT EXISTS z_dashboard_layouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          site_id TEXT,
          widgets JSONB DEFAULT '[]'::jsonb,
          columns INTEGER DEFAULT 12,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          UNIQUE (user_id, site_id)
        );
      `

      const createOnboardingStateTable = sql`
        CREATE TABLE IF NOT EXISTS z_onboarding (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          current_step INTEGER DEFAULT 0,
          total_steps INTEGER DEFAULT 7,
          completed_at TIMESTAMP,
          skipped BOOLEAN DEFAULT false,
          answers JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `

      const createCollectionsTable = sql`
        CREATE TABLE IF NOT EXISTS z_collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          labels JSONB,
          drafts BOOLEAN DEFAULT false NOT NULL,
          timestamps BOOLEAN DEFAULT true NOT NULL,
          fields JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_collections_slug ON z_collections(slug);
      `

      const createRedirectsTable = sql`
        CREATE TABLE IF NOT EXISTS z_redirects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          from_path TEXT NOT NULL,
          to_path TEXT NOT NULL,
          redirect_type TEXT DEFAULT '301' NOT NULL,
          site_id TEXT,
          hits INTEGER DEFAULT 0 NOT NULL,
          last_hit_at TIMESTAMP,
          created_by TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_redirects_from ON z_redirects(from_path);
      `

      const createRolesTable = sql`
        CREATE TABLE IF NOT EXISTS z_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          role_name TEXT NOT NULL UNIQUE,
          role_type TEXT NOT NULL DEFAULT 'custom',
          description TEXT DEFAULT '',
          is_system BOOLEAN DEFAULT false NOT NULL,
          permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_roles_type ON z_roles(role_type);
      `

      const createReleasesTable = sql`
        CREATE TABLE IF NOT EXISTS z_releases (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          documents JSONB DEFAULT '[]'::jsonb NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          scheduled_at TIMESTAMP,
          published_at TIMESTAMP,
          published_by TEXT,
          failure_reason TEXT,
          site_id TEXT,
          created_by TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_releases_status ON z_releases(status);
        CREATE INDEX IF NOT EXISTS idx_releases_scheduled ON z_releases(scheduled_at);
        CREATE INDEX IF NOT EXISTS idx_releases_site ON z_releases(site_id);
      `

      const createPresenceTable = sql`
        CREATE TABLE IF NOT EXISTS z_presence (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          collection_name TEXT NOT NULL,
          document_id TEXT NOT NULL,
          last_active BIGINT NOT NULL
        );
      `

      const createLocksTable = sql`
        CREATE TABLE IF NOT EXISTS z_locks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          collection_name TEXT NOT NULL,
          document_id TEXT NOT NULL,
          site_id TEXT,
          locked_by TEXT NOT NULL,
          locked_by_email TEXT NOT NULL,
          locked_at TIMESTAMP DEFAULT NOW() NOT NULL,
          lock_expires_at TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_locks_doc ON z_locks(collection_name, document_id);
      `

      await db.execute(createAuditLogTable)
      await db.execute(createVersionTable)
      await db.execute(createFlowsTable)
      await db.execute(createUsersTable)
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`)
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL`)
      } catch (err) {
        logger.warn({ err }, 'Failed to add 2FA columns to users table')
      }
      await db.execute(createPasswordResetsTable)
      await db.execute(createApiKeysTable)
      await db.execute(createMigrationsTable)
      await db.execute(createWebhookDeliveriesTable)
      await db.execute(createWebhookConfigsTable)
      await db.execute(createSchemasTable)
      await db.execute(createCampaignsTable)
      await db.execute(createPluginsTable)
      await db.execute(createSettingsTable)
      await db.execute(createSitesTable)
      await db.execute(createWorkspacesTable)
      await db.execute(migrateSitesWorkspaceId)
      await db.execute(createUserPreferencesTable)
      await db.execute(createMembersTable)
      await db.execute(createDashboardLayoutsTable)
      await db.execute(createOnboardingStateTable)
      await db.execute(createCollectionsTable)
      await db.execute(createRedirectsTable)
      await db.execute(createRolesTable)
      await db.execute(createReleasesTable)
      await db.execute(createPresenceTable)
      await db.execute(createLocksTable)
    } finally {
      if (acquired) {
        try {
          await db.execute(sql`SELECT pg_advisory_unlock(99999)`)
        } catch (err: any) {
          logger.error({ err: err.message }, 'PostgresDrizzleAdapter: Failed to release advisory lock')
        }
      }
    }
  }

  private mapFieldToDrizzleColumn(field: any): PgColumnBuilderBase<any> {
    if (field.localized) {
      return jsonb(field.name)
    }

    let col: any
    switch (field.type) {
      case 'number':
        col = integer(field.name)
        break
      case 'checkbox':
      case 'boolean':
        col = boolean(field.name)
        break
      case 'date':
        col = timestamp(field.name)
        break
      case 'richtext':
        col = (field as any).format === 'json' ? jsonb(field.name) : text(field.name)
        break
      case 'json':
      case 'array':
      case 'group':
      case 'blocks':
        col = jsonb(field.name)
        break
      case 'relation':
        if ((field as any).hasMany) {
          col = jsonb(field.name)
        } else {
          col = text(field.name)
        }
        break
      case 'media':
        col = jsonb(field.name)
        break
      case 'code':
      case 'radio':
        col = text(field.name)
        break
      case 'collapsible':
      case 'join':
      case 'point':
        col = jsonb(field.name)
        break
      case 'row':
      case 'ui':
        // Layout/presentational fields — no DB column
        return undefined as any
      default:
        col = text(field.name)
    }

    if (field.unique) col = col.unique()
    if (field.required && !field.localized) col = col.notNull()
    return col
  }

  private mapFieldToSqlType(field: any): string {
    if (field.localized) return 'JSONB'

    switch (field.type) {
      case 'number':
        return 'INTEGER'
      case 'checkbox':
      case 'boolean':
        return 'BOOLEAN'
      case 'date':
        return 'TIMESTAMP'
      case 'richtext':
        return (field as any).format === 'json' ? 'JSONB' : 'TEXT'
      case 'json':
      case 'array':
      case 'group':
      case 'blocks':
        return 'JSONB'
      case 'relation':
        return (field as any).hasMany ? 'JSONB' : 'TEXT'
      case 'media':
        return 'JSONB'
      case 'code':
      case 'radio':
        return 'TEXT'
      case 'collapsible':
      case 'join':
      case 'point':
        return 'JSONB'
      case 'row':
      case 'ui':
        return 'SKIP'
      default:
        return 'TEXT'
    }
  }

  async registerCollection(
    config: CollectionConfig,
    db: NodePgDatabase<any> = this.db
  ): Promise<void> {
    logger.info(`PostgresDrizzleAdapter: Dynamic Column Mapping for ${config.slug}`)
    this.configs[config.slug] = config

    const columns: Record<string, any> = {
      id: text('id').primaryKey(),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    }

    if (config.drafts) {
      columns['status'] = text('status').default('published')
    }

    if (config.softDelete) {
      columns['deletedAt'] = timestamp('deleted_at')
    }

    for (const field of config.fields) {
      if (field.type === 'relation' && (field as any).junctionTable) {
        continue
      }
      // Layout/presentational fields (row, ui) and virtual fields have no DB column
      if (field.type === 'row' || field.type === 'ui' || (field as any).virtual) {
        continue
      }
      columns[field.name] = this.mapFieldToDrizzleColumn(field)
    }

    this.tables[config.slug] = pgTable(config.slug, columns)

    if (process.env.DISABLE_AUTO_MIGRATIONS !== 'true') {
      await this._runAutoMigrations(config, db)

      for (const tenant of Object.values(this.tenantPools)) {
        try {
          await this._runAutoMigrations(config, tenant.db)
        } catch (err: any) {
          logger.error(
            { err: err.message },
            `PostgresDrizzleAdapter: Tenant migration failed for ${config.slug}`
          )
        }
      }
    }
  }

  async getExistingCollections(): Promise<string[]> {
    const result = await this.db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    return (result.rows || []).map((r: any) => r.table_name)
  }

  private async _runAutoMigrations(config: CollectionConfig, db: NodePgDatabase<any> = this.db) {
    const isValidIdentifier = (id: string) => /^[a-zA-Z0-9_]+$/.test(id)
    
    if (!isValidIdentifier(config.slug)) {
      throw new Error(`Invalid table name identifier: ${config.slug}`)
    }

    for (const field of config.fields) {
      if (!isValidIdentifier(field.name)) {
        throw new Error(`Invalid column name identifier: ${field.name} on collection ${config.slug}`)
      }
    }

    let acquired = false
    try {
      await db.execute(sql`SELECT pg_advisory_lock(99999)`)
      acquired = true
    } catch (err: any) {
      logger.warn({ err: err.message }, 'PostgresDrizzleAdapter: Auto-migration advisory lock acquisition failed/timed out. Proceeding without lock.')
    }

    try {
      let createSql = `CREATE TABLE IF NOT EXISTS "${config.slug}" (\n  "id" TEXT PRIMARY KEY`
      createSql += `,\n  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL`
      createSql += `,\n  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL`

      if (config.drafts) {
        createSql += `,\n  "status" TEXT DEFAULT 'published'`
      }

      if (config.softDelete) {
        createSql += `,\n  "deleted_at" TIMESTAMP`
      }

      for (const field of config.fields) {
        if (field.type === 'relation' && (field as any).junctionTable) {
          continue
        }
        // Layout/presentational and virtual fields have no DB column
        if (field.type === 'row' || field.type === 'ui' || (field as any).virtual) {
          continue
        }
        const sqlType = this.mapFieldToSqlType(field)
        createSql += `,\n  "${field.name}" ${sqlType}`
        if ((field as any).unique) createSql += ' UNIQUE'
        if ((field as any).required) createSql += ' NOT NULL'
      }
      createSql += `\n);`

      await db.execute(sql.raw(createSql))

      const result = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = ${config.slug};
      `)

      const existingCols = (result.rows || []).map((r: any) => r.column_name)

      if (config.softDelete && !existingCols.includes('deleted_at')) {
        logger.info(`PostgresDrizzleAdapter: Auto-migrating ADD COLUMN "deleted_at" to "${config.slug}"`)
        await db.execute(sql.raw(`ALTER TABLE "${config.slug}" ADD COLUMN "deleted_at" TIMESTAMP`))
      }

      for (const field of config.fields) {
        if (field.type === 'relation' && (field as any).junctionTable) {
          continue
        }
        if (field.type === 'row' || field.type === 'ui' || (field as any).virtual) {
          continue
        }
        if (!existingCols.includes(field.name)) {
          logger.info(
            `PostgresDrizzleAdapter: Auto-migrating ADD COLUMN "${field.name}" to "${config.slug}"`
          )
          const sqlType = this.mapFieldToSqlType(field)
          let alterSql = `ALTER TABLE "${config.slug}" ADD COLUMN "${field.name}" ${sqlType}`
          if ((field as any).unique) alterSql += ' UNIQUE'
          await db.execute(sql.raw(alterSql))
        }
      }

      for (const field of config.fields) {
        if (field.type === 'relation' && (field as any).junctionTable) {
          continue
        }
        if (field.type === 'row' || field.type === 'ui' || (field as any).virtual) {
          continue
        }
        if (
          (field as any).unique ||
          (field as any).index ||
          (field as any).searchable ||
          (field as any).indexed
        ) {
          logger.info(
            `PostgresDrizzleAdapter: Auto-creating index for "${field.name}" on "${config.slug}"`
          )
          const indexName = `idx_${config.slug}_${field.name}`

          let indexSql: string
          if (
            (field as any).localized ||
            field.type === 'json' ||
            field.type === 'array' ||
            field.type === 'group' ||
            field.type === 'blocks'
          ) {
            indexSql = `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${config.slug}" USING gin ("${field.name}");`
          } else {
            indexSql = `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${config.slug}" ("${field.name}");`
          }

          try {
            await db.execute(sql.raw(indexSql))
          } catch (err: any) {
            logger.warn(
              { error: err.message },
              `PostgresDrizzleAdapter: Index creation skipped or failed for "${indexName}"`
            )
          }
        }
      }

      // Process junction tables for relation fields
      for (const field of config.fields) {
        if (field.type === 'relation' && (field as any).junctionTable) {
          const junctionTable = (field as any).junctionTable
          if (!isValidIdentifier(junctionTable)) {
            throw new Error(`Invalid junction table name identifier: ${junctionTable}`)
          }
          
          let createJunctionSql = `CREATE TABLE IF NOT EXISTS "${junctionTable}" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "source_id" TEXT NOT NULL,
            "target_id" TEXT NOT NULL,
            "position" INTEGER NOT NULL DEFAULT 0,
            "relation_to" TEXT`

          const pivotFields = (field as any).pivotFields || []
          for (const pf of pivotFields) {
            if (!isValidIdentifier(pf.name)) {
              throw new Error(`Invalid pivot column name identifier: ${pf.name} on junction table ${junctionTable}`)
            }
            const sqlType = this.mapFieldToSqlType(pf)
            createJunctionSql += `,\n  "${pf.name}" ${sqlType}`
            if (pf.unique) createJunctionSql += ' UNIQUE'
            if (pf.required) createJunctionSql += ' NOT NULL'
          }
          createJunctionSql += `\n);`
          
          await db.execute(sql.raw(createJunctionSql))
          
          const sourceIdxName = `idx_${junctionTable}_source_id`
          const targetIdxName = `idx_${junctionTable}_target_id`
          const posIdxName = `idx_${junctionTable}_position`
          await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${sourceIdxName}" ON "${junctionTable}" ("source_id");`))
          await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${targetIdxName}" ON "${junctionTable}" ("target_id");`))
          await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${posIdxName}" ON "${junctionTable}" ("source_id", "position");`))
          
          const jResult = await db.execute(sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = ${junctionTable};
          `)
          const existingJCols = (jResult.rows || []).map((r: any) => r.column_name)

          // Always ensure position + relation_to columns exist
          for (const [col, type] of [['position', 'INTEGER NOT NULL DEFAULT 0'], ['relation_to', 'TEXT']] as const) {
            if (!existingJCols.includes(col)) {
              logger.info(`PostgresDrizzleAdapter: Auto-migrating ADD COLUMN "${col}" to junction table "${junctionTable}"`)
              await db.execute(sql.raw(`ALTER TABLE "${junctionTable}" ADD COLUMN "${col}" ${type}`))
            }
          }

          for (const pf of pivotFields) {
            if (!existingJCols.includes(pf.name)) {
              logger.info(`PostgresDrizzleAdapter: Auto-migrating ADD COLUMN "${pf.name}" to junction table "${junctionTable}"`)
              const sqlType = this.mapFieldToSqlType(pf)
              let alterSql = `ALTER TABLE "${junctionTable}" ADD COLUMN "${pf.name}" ${sqlType}`
              if (pf.unique) alterSql += ' UNIQUE'
              await db.execute(sql.raw(alterSql))
            }
          }
        }
      }
    } finally {
      if (acquired) {
        try {
          await db.execute(sql`SELECT pg_advisory_unlock(99999)`)
        } catch (err: any) {
          logger.error({ err: err.message }, 'PostgresDrizzleAdapter: Failed to release advisory lock')
        }
      }
    }
  }

  private getTable(collection: string) {
    if (collection === 'flows') return this.systemTables.flows
    if (collection === 'users') return this.systemTables.users
    if (collection === 'z_password_resets') return this.systemTables.passwordResets
    if (collection === 'z_api_keys') return this.systemTables.apiKeys
    if (collection === 'z_migrations') return this.systemTables.migrations
    if (collection === 'z_settings') return this.systemTables.settings
    if (collection === 'z_collections') return this.systemTables.collections
    if (collection === 'z_presence') return this.systemTables.presence
    if (collection === 'audit_logs' || collection === 'z_audit_logs') return this.systemTables.auditLog
    if (collection === 'versions' || collection === 'z_versions') return this.systemTables.version
    if (collection === 'z_sites' || collection === 'sites') return this.systemTables.sites
    if (collection === 'z_workspaces' || collection === 'workspaces') return this.systemTables.workspaces
    if (collection === 'z_locks') return this.systemTables.locks
    if (collection === 'z_webhook_configs') return this.systemTables.webhookConfigs
    if (collection === 'z_plugins') return this.systemTables.plugins
    if (collection === 'z_redirects') return this.systemTables.redirects
    if (collection === 'z_roles' || collection === 'roles') return this.systemTables.roles
    if (collection === 'z_releases' || collection === 'releases') return this.systemTables.releases
    const table = this.tables[collection]
    if (!table) throw new Error(`Collection "${collection}" not registered in PostgreSQL`)
    return table
  }

  private _getCacheKey(collection: string, query: unknown, options: unknown): string {
    return `${collection}:${JSON.stringify(query)}:${JSON.stringify(options)}`
  }

  private _invalidateCache(collection: string) {
    const keys = this.cache.keys()
    const targets = keys.filter((k) => k.startsWith(`${collection}:`))
    this.cache.del(targets)
  }

  private buildWhereClause(table: any, query: Record<string, any>) {
    const ast = QueryASTParser.parse(query)
    return this.mapAstToDrizzle(table, ast)
  }

  /** Inject tenant scoping into the WHERE clause to prevent cross-tenant data access */
  private tenantScope(table: any, where: any, options?: BaseOptions): any {
    const siteId = options?.siteId || options?.tenantId
    if (siteId && table.siteId) {
      const siteClause = eq(table.siteId, siteId)
      return where ? and(siteClause, where) : siteClause
    }
    return where
  }

  private mapAstToDrizzle(table: any, node: QueryNode): any {
    if (node.type === 'field') {
      const fieldNode = node as FieldNode
      let fieldKey = fieldNode.field
      if (fieldKey === '_id') fieldKey = 'id'
      else if (fieldKey === '_status') fieldKey = 'status'

      const column = table[fieldKey]
      if (!column) return undefined

      switch (fieldNode.operator) {
        case 'equals':
          return eq(column, fieldNode.value)
        case 'not_equals':
          return sql`${column} <> ${fieldNode.value}`
        case 'contains':
          return sql`${column} ILIKE ${'%' + fieldNode.value + '%'}`
        case 'in':
          return sql`${column} = ANY(${fieldNode.value})`
        case 'not_in':
          return sql`${column} <> ALL(${fieldNode.value})`
        case 'gt':
          return sql`${column} > ${fieldNode.value}`
        case 'gte':
          return sql`${column} >= ${fieldNode.value}`
        case 'lt':
          return sql`${column} < ${fieldNode.value}`
        case 'lte':
          return sql`${column} <= ${fieldNode.value}`
        default:
          return eq(column, fieldNode.value)
      }
    } else if (node.type === 'logical') {
      const logicalNode = node as LogicalNode
      const conditions = logicalNode.children
        .map((child) => this.mapAstToDrizzle(table, child))
        .filter(Boolean)

      if (conditions.length === 0) return undefined

      if (logicalNode.operator === 'and') {
        return and(...conditions)
      } else if (logicalNode.operator === 'or') {
        return or(...conditions)
      }
    }
    return undefined
  }

  async find<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T[]> {
    const cacheKey = this._getCacheKey(collection, query, options)
    const cached = this.cache.get<T[]>(cacheKey)
    if (cached) return cached

    const globalAot = (globalThis as any).zenithAotBridge
    const queryKeys = Object.keys(query)
    const canUseAot = queryKeys.every(k => k === 'id' || k === '_id' || k === 'siteId')
    if (globalAot && canUseAot && globalAot.hasQuery(collection, 'find')) {
      const table = this.getTable(collection)
      const client = this.getDbClient(options)
      const aotFilters: any = {}
      if (query.id) aotFilters.id = query.id
      if (query._id) aotFilters.id = query._id
      if (query.siteId) aotFilters.siteId = query.siteId

      const result = await globalAot.executeQuery(collection, 'find', client, table, aotFilters, options)
      const mapped = result.map((r: any) => {
        const mappedRecord = { ...r, _id: r.id }
        if ('status' in mappedRecord) {
          mappedRecord._status = mappedRecord.status
        }
        return mappedRecord
      })
      const loaded = await this._loadJunctionIds(collection, mapped)
      const populated = await this._populateRelations(collection, loaded, options, [collection])
      this.cache.set(cacheKey, populated)
      return populated as T[]
    }

    const table = this.getTable(collection)
    const client = this.getDbClient(options)

    let dbQuery = client.select().from(table).$dynamic()

    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options)
    if (where) {
      dbQuery = dbQuery.where(where)
    }

    if (options.limit) {
      dbQuery = dbQuery.limit(options.limit)
    } else {
      dbQuery = dbQuery.limit(100)
    }

    if (options.skip) {
      dbQuery = dbQuery.offset(options.skip)
    }

    const result = await dbQuery

    const mapped = result.map((r: any) => {
      const mappedRecord = { ...r, _id: r.id }
      if ('status' in mappedRecord) {
        mappedRecord._status = mappedRecord.status
      }
      return mappedRecord
    })

    const loaded = await this._loadJunctionIds(collection, mapped)
    const populated = await this._populateRelations(collection, loaded, options, [collection])
    this.cache.set(cacheKey, populated)
    return populated as T[]
  }

  async findOne<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T | null> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const dbQuery = this._selectWithColumns(client, table, collection, options)

    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options)

    const result = await dbQuery.where(where ?? sql`1=1`).limit(1)
    if (result.length === 0) return null

    const r = result[0] as any
    const mappedRecord = { ...r, _id: r.id }
    if ('status' in mappedRecord) {
      mappedRecord._status = mappedRecord.status
    }
    const loaded = await this._loadJunctionIds(collection, [mappedRecord])
    const populated = await this._populateRelations(collection, loaded, options, [collection])
    return populated[0] as T
  }

  /**
   * Builds a Drizzle select query, optionally scoped to a subset of columns.
   * When options.select is populated, only those columns are fetched (plus
   * always-loaded metadata: id, createdAt, updatedAt, status).
   */
  private _selectWithColumns(
    client: NodePgDatabase,
    table: any,
    collection: string,
    options: FindOptions
  ): any {
    // When populate is enabled, we need all columns to resolve relation lookups
    const needsAll =
      !options.select ||
      (options.populate &&
        (Array.isArray(options.populate) ? options.populate.length > 0 : !!options.populate))

    if (needsAll) {
      return client.select().from(table).$dynamic()
    }

    // Column selection: extract safe column names from config
    const config = this.configs[collection]
    const safeCols = new Set(['id', 'created_at', 'updated_at', 'status'])
    if (config?.fields) {
      for (const f of config.fields) {
        safeCols.add(f.name)
      }
    }

    // Always include meta columns for the result mapper
    const requested: string[] = Array.isArray(options.select) ? options.select : []
    const toSelect = requested
      .filter((col: string) => safeCols.has(col))
      .map((col: string) => {
        const mapped = col === 'id' ? (table as any).id
          : col === 'created_at' ? (table as any).createdAt
          : col === 'updated_at' ? (table as any).updatedAt
          : col === 'status' ? (table as any).status
          : (table as any)[col]
        return mapped
      })
      .filter(Boolean)

    if (toSelect.length === 0) {
      return client.select().from(table).$dynamic()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).select(...toSelect).from(table).$dynamic()
  }

  /** Maximum depth for nested relation population to prevent query explosion */
  private static readonly MAX_POPULATE_DEPTH = 5

  private async _populateRelations(
    collection: string,
    records: any[],
    options: FindOptions,
    populationPath: string[] = [collection],
    _depth: number = PostgresDrizzleAdapter.MAX_POPULATE_DEPTH
  ): Promise<any[]> {
    if (!records || records.length === 0 || !options.populate) {
      return records
    }
    // Task 07: Depth guard — stop recursing beyond MAX_POPULATE_DEPTH
    if (_depth <= 0) {
      logger.debug({ collection, depth: _depth }, 'PostgresDrizzleAdapter: _populateRelations depth limit reached, skipping')
      return records
    }

    const config = this.configs[collection]
    if (!config) {
      return records
    }

    const populateFields = (Array.isArray(options.populate) ? options.populate : [options.populate]).filter(Boolean)

    // --- Deep nested field walker: find relation fields inside group/array/blocks containers ---
    const allRelationFields: Array<{ containerPath: string; field: any }> = []

    const walkFields = (fields: any[], path = ''): void => {
      if (!fields) return
      for (const f of fields) {
        if (f.type === 'relation') {
          const fullPath = path ? `${path}.${f.name}` : f.name
          // Check top-level population whitelist; if empty (fetch-all), include all
          const inWhitelist = populateFields.length === 0 || populateFields.some(p => p === fullPath || p === f.name || (path && p.startsWith(`${path}.`)))
          if (inWhitelist) allRelationFields.push({ containerPath: path, field: f })
        } else if ((f.type === 'group' || f.type === 'array' || f.type === 'blocks') && f.fields) {
          const blocks = f.type === 'blocks' && f.blocks ? f.blocks : [f]
          for (const block of blocks) {
            walkFields(block.fields, path ? `${path}.${f.name}` : f.name)
          }
        }
      }
    }
    walkFields(config.fields)

    // Process each discovered relation field
    for (const { containerPath, field: relField } of allRelationFields) {
      const relationTo = relField.relationTo
      const hasMany = relField.hasMany ?? true

      // Polymorphic relationTo[] — flatten all IDs from { relationTo, value } pairs or bare IDs
      const resolveIds = (val: any): Set<string> => {
        const ids = new Set<string>()
        if (!val) return ids
        if (Array.isArray(val)) {
          for (const item of val) {
            // Polymorphic format: { relationTo: "posts", value: "abc123" }
            if (item && typeof item === 'object' && 'value' in item && 'relationTo' in item) {
              if (item.value) ids.add(String(item.value))
            } else if (item) {
              ids.add(String(item))
            }
          }
        } else if (val && typeof val === 'object' && 'value' in val && 'relationTo' in val) {
          // Single polymorphic
          if (val.value) ids.add(String(val.value))
        } else if (typeof val === 'string') {
          const trimmed = val.trim()
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try { resolveIds(JSON.parse(trimmed)).forEach(id => ids.add(id)) } catch { /* ignore */ }
          } else {
            ids.add(val)
          }
        }
        return ids
      }

      const idsToFetch = new Set<string>()
      for (const record of records) {
        if (containerPath) {
          // Navigate into nested container
          const parts = containerPath.split('.')
          let current: any = record
          for (const p of parts) { current = current?.[p]; }
          const nestedVal = current?.[relField.name]
          resolveIds(nestedVal).forEach(id => idsToFetch.add(id))
        } else {
          resolveIds(record[relField.name]).forEach(id => idsToFetch.add(id))
        }
      }

      // Initialize default values when no IDs present
      if (idsToFetch.size === 0) {
        for (const record of records) {
          const setter = (obj: any) => {
            if (obj[relField.name] === undefined || obj[relField.name] === null) {
              obj[relField.name] = hasMany ? [] : null
            }
          }
          if (containerPath) {
            const parts = containerPath.split('.')
            let current: any = record
            for (const p of parts.slice(0, -1)) { current = current?.[p]; }
            setter(current)
          } else {
            setter(record)
          }
        }
        continue
      }

      // --- Circular reference protection ---
      const targetCollections = Array.isArray(relationTo) ? relationTo : [relationTo]
      for (const target of targetCollections) {
        if (populationPath.includes(target)) {
          logger.debug(`[Population] Circular protection: skipping ${collection} → ${target}`)
          continue
        }
        if (!this.configs[target]) {
          logger.debug(`[Population] Unknown collection "${target}" — skipping`)
          continue
        }

        // Recursively populate nested relations (passes path for depth tracking)
        const nestedPath = [...populationPath, target]
        const relatedDocs = await this.find<any>(
          target,
          { id: { $in: Array.from(idsToFetch) } },
          { session: options.session, siteId: options.siteId }
        )
        // Recurse into the related docs to populate their own nested relations
        await this._populateRelations(target, relatedDocs, options, nestedPath, _depth - 1)

        const docMap = new Map<string, any>()
        for (const doc of relatedDocs) { docMap.set(doc.id, doc) }

        const linkMap = new Map<string, any>()
        if (relField.junctionTable) {
          const sourceIds = records.map(r => r.id)
          const pivotFields = relField.pivotFields || []
          const selectCols = ['source_id', 'target_id', 'position', ...pivotFields.map((f: any) => `"${f.name}"`)]
          try {
            const linksResult = await this.db.execute(
              sql`SELECT ${sql.raw(selectCols.join(', '))} FROM ${sql.raw(`"${relField.junctionTable}"`)} WHERE source_id = ANY(${sourceIds}) ORDER BY "position" ASC NULLS LAST`
            )
            for (const link of linksResult.rows || [] as any[]) {
              linkMap.set(`${link.source_id}_${link.target_id}`, link)
            }
          } catch (err: any) {
            logger.warn({ err: err.message }, 'Failed to fetch pivot fields for populated relation')
          }
        }

        for (const record of records) {
          let rec = record
          if (containerPath) {
            const parts = containerPath.split('.')
            for (const p of parts.slice(0, -1)) { rec = rec?.[p]; }
          }

          let val = containerPath ? rec?.[relField.name] : record[relField.name]
          const isPolymorphic = Array.isArray(relationTo)

          if (!val) val = hasMany ? [] : null

          if (hasMany && Array.isArray(val)) {
            rec[relField.name] = val
              .map((idOrObj: any) => {
                // Extract ID from polymorphic or bare
                const id = isPolymorphic && idOrObj && typeof idOrObj === 'object' ? idOrObj.value : String(idOrObj)
                const doc = docMap.get(id)
                if (!doc) return null
                if (relField.junctionTable) {
                  const cloned = { ...doc }
                  const link = linkMap.get(`${record.id}_${id}`)
                  if (link) {
                    cloned._pivot = { ...link }
                    delete cloned._pivot.source_id; delete cloned._pivot.target_id; delete cloned._pivot.id
                  }
                  return cloned
                }
                if (isPolymorphic) {
                  const rt = idOrObj?.relationTo || relationTo
                  return { relationTo: rt, value: doc }
                }
                return doc
              })
              .filter(Boolean)
          } else if (!hasMany) {
            const id = isPolymorphic && val && typeof val === 'object' ? val.value : String(val)
            const doc = docMap.get(id)
            rec[relField.name] = doc ? (isPolymorphic ? { relationTo: relationTo, value: doc } : doc) : null
          }
        }
      }
    }

    return records
  }

  private async _loadJunctionIds(collection: string, records: any[]): Promise<any[]> {
    if (!records || records.length === 0) return records
    const config = this.configs[collection]
    if (!config) return records

    const recordIds = records.map(r => r.id)
    if (recordIds.length === 0) return records

    for (const field of config.fields) {
      if (field.type === 'relation' && (field as any).junctionTable) {
        const jTable = (field as any).junctionTable
        const relationTo = (field as any).relationTo
        const isPolymorphic = Array.isArray(relationTo)
        try {
          // Load junction rows ordered by position (for M2M ordering)
          const rowsResult = await this.db.execute(sql`
            SELECT source_id, target_id, relation_to, "position"
            FROM ${sql.raw(`"${jTable}"`)}
            WHERE source_id = ANY(${recordIds})
            ORDER BY "position" ASC NULLS LAST
          `)
          const rows = rowsResult.rows || []

          // Build source → sorted entries map (preserving position order)
          const sourceToTargets: Record<string, any[]> = {}
          for (const row of rows as any[]) {
            if (!sourceToTargets[row.source_id]) sourceToTargets[row.source_id] = []
            // Polymorphic format: store { value, relationTo } or bare ID
            const entry = isPolymorphic
              ? { value: row.target_id, relationTo: row.relation_to || relationTo[0] }
              : row.target_id
            sourceToTargets[row.source_id].push(entry)
          }

          for (const r of records) {
            r[field.name] = sourceToTargets[r.id] || []
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, `Failed to load junction IDs for ${field.name}`)
        }
      }
    }
    return records
  }

  private async _writeJunctionRelations(
    collection: string,
    id: string,
    data: Record<string, any>,
    executor: any
  ): Promise<Record<string, any>> {
    const config = this.configs[collection]
    if (!config) return data

    const updatedData = { ...data }

    for (const field of config.fields) {
      if (field.type === 'relation' && (field as any).junctionTable) {
        const jTable = (field as any).junctionTable
        const relationVal = data[field.name]
        const relationTo = (field as any).relationTo
        const isPolymorphic = Array.isArray(relationTo)

        await executor.execute(sql`DELETE FROM ${sql.raw(`"${jTable}"`)} WHERE source_id = ${id}`)

        if (Array.isArray(relationVal)) {
          const pivotFields = (field as any).pivotFields || []
          let positionCounter = 0

          for (const item of relationVal) {
            let targetId: string
            let pivotData: Record<string, any> = {}

            if (typeof item === 'string') {
              targetId = item
            } else if (item && typeof item === 'object') {
              // Polymorphic: { value, relationTo } or { id, ...pivot }
              if ('value' in item && 'relationTo' in item) {
                targetId = item.value
              } else {
                targetId = item.id || item.target_id || ''
              }
              pivotData = { ...item }
              delete pivotData.id; delete pivotData.target_id; delete pivotData.value; delete pivotData.relationTo
            } else {
              continue
            }

            if (!targetId) continue

            const cols = ['source_id', 'target_id', '"position"']
            const vals: any[] = [id, targetId, positionCounter++]

            if (isPolymorphic && relationTo.length > 0) {
              const rt = typeof item === 'object' && 'relationTo' in item
                ? item.relationTo
                : (Array.isArray(relationTo) ? relationTo[0] : relationTo)
              cols.push('"relation_to"')
              vals.push(rt)
            }

            for (const pf of pivotFields) {
              const val = pivotData[pf.name]
              if (val !== undefined) {
                cols.push(`"${pf.name}"`)
                vals.push(val)
              }
            }

            const fragments: any[] = [sql`INSERT INTO ${sql.raw(`"${jTable}"`)} (${sql.raw(cols.join(', '))}) VALUES (`]
            vals.forEach((val, i) => {
              if (i > 0) fragments.push(sql`, `)
              fragments.push(sql`${val}`)
            })
            fragments.push(sql`)`)
            await executor.execute(sql`${fragments}`)
          }
        }
      }
    }

    return updatedData
  }

  async create<T = unknown>(
    collection: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T> {
    const globalAot = (globalThis as any).zenithAotBridge
    if (globalAot && globalAot.hasQuery(collection, 'create')) {
      const table = this.getTable(collection)
      const client = this.getDbClient(options)
      const executor = options.session ? (options.session as typeof client) : client

      const id = (data as any).id || (data as any)._id || crypto.randomUUID()
      const valuesToInsert: Record<string, any> = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      for (const [key, val] of Object.entries(data)) {
        let fieldKey = key
        if (key === '_status') fieldKey = 'status'
        else if (key === '_id') fieldKey = 'id'

        if (fieldKey !== 'id' && fieldKey !== '_id' && table[fieldKey] !== undefined && val !== undefined) {
          valuesToInsert[fieldKey] = val
        }
      }

      const doc = await globalAot.executeQuery(collection, 'create', executor, table, valuesToInsert)
      await this._writeJunctionRelations(collection, id, data as any, executor)
      this._invalidateCache(collection)
      const mappedRecord = { ...doc, ...data, id, _id: id }
      if ('status' in mappedRecord) {
        mappedRecord._status = mappedRecord.status
      }
      return mappedRecord as T
    }

    const table = this.getTable(collection)
    const id = (data as any).id || (data as any)._id || crypto.randomUUID()

    const client = this.getDbClient(options)
    const executor = options.session ? (options.session as typeof client) : client

    const valuesToInsert: Record<string, any> = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    for (const [key, val] of Object.entries(data)) {
      let fieldKey = key
      if (key === '_status') fieldKey = 'status'
      else if (key === '_id') fieldKey = 'id'

      if (fieldKey !== 'id' && fieldKey !== '_id' && table[fieldKey] !== undefined && val !== undefined) {
        valuesToInsert[fieldKey] = val
      }
    }

    await executor.insert(table).values(valuesToInsert)
    await this._writeJunctionRelations(collection, id, data as any, executor)

    this._invalidateCache(collection)

    const output: Record<string, any> = { ...valuesToInsert, ...data, _id: id }
    if ('status' in output) {
      output._status = output.status
    }
    return output as unknown as T
  }

  async update<T = unknown>(
    collection: string,
    id: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T | null> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const executor = options.session ? (options.session as typeof client) : client

    const existing = await this.findOne(collection, { id }, options)
    if (!existing) return null

    const mergedData = { ...existing, ...data }
    delete (mergedData as any).id
    delete (mergedData as any)._id
    delete (mergedData as any).createdAt
    delete (mergedData as any).updatedAt

    const valuesToUpdate: Record<string, any> = {
      updatedAt: new Date(),
    }

    for (const [key, val] of Object.entries(mergedData)) {
      let fieldKey = key
      if (key === '_status') fieldKey = 'status'
      else if (key === '_id') fieldKey = 'id'

      if (table[fieldKey] !== undefined && val !== undefined) {
        valuesToUpdate[fieldKey] = val
      }
    }

    await executor.update(table).set(valuesToUpdate).where(eq(table.id, id))
    await this._writeJunctionRelations(collection, id, mergedData, executor)

    this._invalidateCache(collection)
    
    const output: Record<string, any> = { id, ...valuesToUpdate, ...mergedData, _id: id }
    if ('status' in output) {
      output._status = output.status
    }
    return output as unknown as T
  }

  async findOneAndUpdate<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: BaseOptions & { returnDocument?: 'before' | 'after' }
  ): Promise<T | null> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options as FindOptions)
    const executor = options?.session ? (options.session as typeof client) : client

    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options as FindOptions)

    if (options?.returnDocument === 'after') {
      const setData = { ...update, updatedAt: new Date() }
      const result = await executor
        .update(table)
        .set(setData)
        .where(where ?? sql`1=1`)
        .returning()
      const rows = result as any[]
      if (!rows.length) return null
      const r = rows[0]
      const mapped = { ...r, _id: r.id }
      if ('status' in mapped) mapped._status = mapped.status
      return mapped as T
    }

    // returnDocument: 'before' or omitted — fetch before updating
    const before = await this.findOne<T>(collection, query, options as FindOptions)
    if (!before) return null
    await executor.update(table).set({ ...update, updatedAt: new Date() }).where(where ?? sql`1=1`)
    return before
  }

  async updateMany(
    collection: string,
    query: Record<string, unknown>,
    data: unknown,
    options: BaseOptions = {}
  ): Promise<number> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const executor = options.session ? (options.session as typeof client) : client

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    }

    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      let fieldKey = key
      if (key === '_status') fieldKey = 'status'
      else if (key === '_id') fieldKey = 'id'

      if (table[fieldKey] !== undefined && val !== undefined) {
        updatePayload[fieldKey] = val
      }
    }

    let dbQuery = executor.update(table).set(updatePayload).$dynamic()
    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options)
    if (where) {
      dbQuery = dbQuery.where(where)
    }

    const result = await dbQuery.returning({ id: table.id })
    this._invalidateCache(collection)
    return result.length
  }

  async delete(collection: string, id: string, options: BaseOptions = {}): Promise<boolean> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const executor = options.session ? (options.session as typeof client) : client

    const config = this.configs[collection]
    if (config) {
      for (const field of config.fields) {
        if (field.type === 'relation' && (field as any).junctionTable) {
          await executor.execute(sql`DELETE FROM ${sql.raw(`"${(field as any).junctionTable}"`)} WHERE source_id = ${id}`)
        }
      }
    }

    const result = await executor.delete(table).where(eq(table.id, id)).returning({ id: table.id })

    this._invalidateCache(collection)
    return result.length > 0
  }

  async deleteMany(
    collection: string,
    query: Record<string, unknown>,
    options: BaseOptions = {}
  ): Promise<number> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const executor = options.session ? (options.session as typeof client) : client

    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options)
    let dbQuery = executor.delete(table).$dynamic()
    if (where) {
      dbQuery = dbQuery.where(where)
    }

    let ids: string[] = []
    try {
      const selectQuery = executor.select({ id: table.id }).from(table).$dynamic()
      const selectWhere = where ? selectQuery.where(where) : selectQuery
      const rows = await selectWhere
      ids = rows.map((r: any) => r.id)
    } catch (err) {
      // Ignore select failure
    }

    if (ids.length > 0) {
      const config = this.configs[collection]
      if (config) {
        for (const field of config.fields) {
          if (field.type === 'relation' && (field as any).junctionTable) {
            await executor.execute(sql`DELETE FROM ${sql.raw(`"${(field as any).junctionTable}"`)} WHERE source_id = ANY(${ids})`)
          }
        }
      }
    }

    const result = await dbQuery.returning({ id: table.id })
    this._invalidateCache(collection)
    return result.length
  }

  async count(
    collection: string,
    query: Record<string, unknown>,
    options?: BaseOptions
  ): Promise<number> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    let dbQuery = client
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .$dynamic()

    let where = this.buildWhereClause(table, query)
    where = this.tenantScope(table, where, options)
    if (where) {
      dbQuery = dbQuery.where(where)
    }

    const result = await dbQuery
    return Number(result[0]?.count || 0)
  }

  async aggregate<T = unknown>(collection: string, pipeline: unknown[], options?: BaseOptions): Promise<T[]> {
    throw new Error('Aggregation pipelines not natively supported in Postgres. Use native SQL.')
  }

  async transaction<T>(fn: (session: unknown) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      return await fn(tx)
    })
  }

  async createAuditLog(data: AuditLogData, options?: BaseOptions): Promise<void> {
    const client = this.getDbClient(options)
    await client.insert(this.systemTables.auditLog).values({
      collectionName: data.collectionName,
      documentId: data.documentId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      action: data.action,
      changes: data.changes,
      ip: data.ip,
      userAgent: data.userAgent,
      status: data.status,
      resource: data.resource,
      siteId: data.siteId,
      hash: data.hash,
      previousHash: data.previousHash,
    })
  }

  async createVersion(data: VersionData, options?: BaseOptions): Promise<void> {
    const client = this.getDbClient(options)
    await client.insert(this.systemTables.version).values({
      collectionName: data.collectionName,
      collectionSlug: data.collectionSlug,
      documentId: data.documentId,
      snapshot: data.snapshot,
      delta: data.delta,
      createdBy: data.createdBy,
    })
  }

  async getVersions(
    collection: string,
    documentId: string,
    options?: BaseOptions
  ): Promise<VersionData[]> {
    const table = this.systemTables.version
    const client = this.getDbClient(options)
    const result = await client
      .select()
      .from(table)
      .where(and(eq(table.collectionName, collection), eq(table.documentId, documentId)))
      .orderBy(desc(table.timestamp))

    return result.map((r) => ({
      ...r,
    })) as VersionData[]
  }

  async createWebhookDelivery(data: WebhookDeliveryData, options?: BaseOptions): Promise<void> {
    const client = this.getDbClient(options)
    await client.insert(this.systemTables.webhookDelivery).values({
      webhookId: data.webhookId,
      collectionSlug: data.collectionSlug,
      event: data.event,
      url: data.url,
      payload: data.payload,
      success: data.success,
      responseStatus: data.responseStatus,
    })
  }

  async getWebhookDeliveries(webhookId: string, limit = 50): Promise<WebhookDeliveryRecord[]> {
    const client = this.getDbClient()
    const table = this.systemTables.webhookDelivery
    const docs = await client
      .select()
      .from(table)
      .where(eq(table.webhookId, webhookId))
      .orderBy(desc(table.timestamp))
      .limit(limit)
    return docs.map((d: any) => ({
      id: d.id,
      webhookId: d.webhookId,
      collectionSlug: d.collectionSlug,
      event: d.event,
      url: d.url,
      payload: d.payload,
      success: d.success,
      responseStatus: d.responseStatus,
      timestamp: d.timestamp,
    }))
  }

  async search<T = unknown>(
    collection: string,
    query: string,
    fields: string[],
    limit = 10,
    options?: BaseOptions
  ): Promise<T[]> {
    const table = this.getTable(collection)
    const client = this.getDbClient(options)
    const conditions = fields
      .filter((f) => table[f] !== undefined)
      .map((f) => sql`${table[f]} ILIKE ${'%' + query + '%'}`)

    if (conditions.length === 0) return []

    const orWhere = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} OR ${cond}`
    )

    let whereClause = sql`(${orWhere})`
    const siteId = (options as any)?.siteId
    if (siteId && table.siteId !== undefined) {
      whereClause = sql`${whereClause} AND ${table.siteId} = ${siteId}`
    }

    const result = await client
      .select()
      .from(table)
      .where(whereClause)
      .limit(Math.min(limit, 50))

    const mapped = result.map((r: any) => {
      const mappedRecord = { ...r, _id: r.id }
      if ('status' in mappedRecord) {
        mappedRecord._status = mappedRecord.status
      }
      return mappedRecord
    })

    return mapped as T[]
  }
}
