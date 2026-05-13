import { CollectionConfig } from '@zenith/types';

/**
 * Zenith Database Adapter Contract
 * ────────────────────────────────
 * Hardened interface for database agnostic operations.
 * Use generics <T> to ensure type safety in higher level services.
 */
export interface DatabaseAdapter {
  name: string;
  
  // ── Initialization ────────────────────────────────────────────────────────
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getHealth(): 'ok' | 'connecting' | 'disconnected' | 'error';
  
  // ── Schema Management ─────────────────────────────────────────────────────
  /** Syncs the provided collection config with the physical DB schema */
  registerCollection(config: CollectionConfig): Promise<void>;
  
  // ── CRUD Operations ───────────────────────────────────────────────────────
  find<T = any>(collection: string, query: Record<string, any>, options?: FindOptions): Promise<T[]>;
  findOne<T = any>(collection: string, query: Record<string, any>, options?: BaseOptions): Promise<T | null>;
  create<T = any>(collection: string, data: Partial<T>, options?: BaseOptions): Promise<T>;
  update<T = any>(collection: string, id: string, data: Partial<T>, options?: BaseOptions): Promise<T | null>;
  updateMany(collection: string, query: Record<string, any>, data: any, options?: BaseOptions): Promise<number>;
  delete(collection: string, id: string, options?: BaseOptions): Promise<boolean>;
  deleteMany(collection: string, query: Record<string, any>, options?: BaseOptions): Promise<number>;
  
  // ── Advanced Operations ───────────────────────────────────────────────────
  count(collection: string, query: Record<string, any>): Promise<number>;
  aggregate<T = any>(collection: string, pipeline: any[]): Promise<T[]>;
  
  /** 
   * Executes multiple operations in a transaction.
   * If the adapter does not support transactions (e.g. standalone Mongo), 
   * this will execute the function without a transaction context.
   */
  transaction<T>(fn: (session: any) => Promise<T>): Promise<T>;
  
  // ── Zenith Engine Features ────────────────────────────────────────────────
  createAuditLog(data: AuditLogData): Promise<void>;
  createVersion(data: VersionData): Promise<void>;
  getVersions(collection: string, documentId: string): Promise<VersionData[]>;
}

export interface BaseOptions {
  session?: any;
}

export interface FindOptions extends BaseOptions {
  sort?: string | Record<string, any>;
  skip?: number;
  limit?: number;
  select?: string | string[];
  populate?: string | string[];
}

export interface AuditLogData {
  userId: string;
  userEmail: string;
  action: string;
  collectionName: string;
  documentId?: string;
  changes?: any;
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface VersionData {
  collectionName: string;
  collectionSlug: string;
  documentId: string;
  snapshot: any;
  delta?: any;
  createdBy: string;
  timestamp: Date;
}
