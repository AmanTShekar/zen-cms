import { CollectionConfig } from './index'

/**
 * Zenith Database Adapter Contract
 * ────────────────────────────────
 * Hardened interface for database agnostic operations.
 * Use generics <T> to ensure type safety in higher level services.
 */
export interface DatabaseAdapter {
  name: string

  // ── Initialization ────────────────────────────────────────────────────────
  connect(): Promise<void>
  disconnect(): Promise<void>
  getHealth(): 'ok' | 'connecting' | 'disconnected' | 'error'

  // ── Schema Management ─────────────────────────────────────────────────────
  /** Syncs the provided collection config with the physical DB schema */
  registerCollection(config: CollectionConfig): Promise<void>
  
  /** Lists all existing collections/tables in the database */
  getExistingCollections(): Promise<string[]>

  /** Escape hatch for bypassing the Adapter AST and executing vendor-specific queries natively */
  getNativeClient<T = any>(): T

  /** Escape hatch for executing raw DDL/SQL queries directly */
  executeRaw(query: string, params?: any[]): Promise<any>

  // ── CRUD Operations ───────────────────────────────────────────────────────
  find<T = any>(
    collection: string,
    query: Record<string, any>,
    options?: FindOptions
  ): Promise<T[]>
  findOne<T = any>(
    collection: string,
    query: Record<string, any>,
    options?: BaseOptions
  ): Promise<T | null>
  findMany<T = any>(
    collection: string,
    ids: string[],
    options?: BaseOptions
  ): Promise<T[]>
  create<T = any>(collection: string, data: Partial<T>, options?: BaseOptions): Promise<T>
  update<T = any>(
    collection: string,
    id: string,
    data: Partial<T>,
    options?: BaseOptions
  ): Promise<T | null>
  updateMany(
    collection: string,
    query: Record<string, any>,
    data: any,
    options?: BaseOptions
  ): Promise<number>
  delete(collection: string, id: string, options?: BaseOptions): Promise<boolean>
  deleteMany(
    collection: string,
    query: Record<string, any>,
    options?: BaseOptions
  ): Promise<number>

  // ── Advanced Operations ───────────────────────────────────────────────────
  count(collection: string, query: Record<string, any>): Promise<number>
  aggregate<T = any>(collection: string, pipeline: any[], options?: BaseOptions): Promise<T[]>

  /**
   * Atomically finds a single document and updates it, returning either
   * the original (returnDocument: 'before') or updated (returnDocument: 'after') document.
   * Returns null if no document matches the query.
   */
  findOneAndUpdate<T = any>(
    collection: string,
    query: Record<string, any>,
    update: Record<string, any>,
    options?: BaseOptions & { returnDocument?: 'before' | 'after' }
  ): Promise<T | null>

  /**
   * Executes multiple operations in a transaction.
   * If the adapter does not support transactions (e.g. standalone Mongo),
   * this will execute the function without a transaction context.
   */
  transaction<T>(fn: (session: any) => Promise<T>): Promise<T>

  // ── Zenith Engine Features ────────────────────────────────────────────────
  createAuditLog(data: AuditLogData, options?: BaseOptions): Promise<void>
  createVersion(data: VersionData, options?: BaseOptions): Promise<void>
  getVersions(collection: string, documentId: string): Promise<VersionData[]>
  createWebhookDelivery(data: WebhookDeliveryData): Promise<void>
  getWebhookDeliveries(webhookId: string, limit?: number): Promise<WebhookDeliveryRecord[]>

  /**
   * Full-text / pattern search across specified fields in a collection.
   * Each adapter translates this into its native search primitive
   * (MongoDB $regex/$text, Postgres ILIKE/pg_trgm).
   */
  search<T = any>(
    collection: string,
    query: string,
    fields: string[],
    limit?: number,
    options?: BaseOptions
  ): Promise<T[]>
}

export interface BaseOptions {
  session?: unknown
  tenantId?: string
  siteId?: string
  expectedVersion?: number
}

export interface FindOptions extends BaseOptions {
  sort?: string | Record<string, unknown>
  skip?: number
  limit?: number
  select?: string | string[]
  populate?: string | string[]
  cursor?: string
}

export interface AuditLogData {
  userId: string
  userEmail: string
  userName?: string
  action: string
  collectionName: string
  documentId?: string
  changes?: unknown
  ip?: string
  userAgent?: string
  timestamp?: Date
  status?: 'success' | 'failed'
  resource?: string
  siteId?: string
  hash?: string
  previousHash?: string
}

export interface VersionData {
  collectionName: string
  collectionSlug: string
  documentId: string
  snapshot: unknown
  delta?: unknown
  createdBy: string
  timestamp: Date
}

export interface WebhookDeliveryData {
  webhookId?: string
  collectionSlug?: string
  event: string
  url: string
  payload?: unknown
  success: boolean
  responseStatus?: number
  timestamp?: Date
}

export interface WebhookDeliveryRecord {
  id: string
  webhookId?: string
  collectionSlug?: string
  event: string
  url: string
  payload?: unknown
  success: boolean
  responseStatus?: number
  timestamp: Date | string
}

