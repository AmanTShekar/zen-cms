/**
 * Zenith Auto-Generated TypeScript Definitions
 * This file is automatically re-compiled on database register & boot.
 * DO NOT MODIFY MANUALLY.
 */

export interface ZenithDocument {
  _id: string;
  createdAt: string;
  updatedAt: string;
  status?: 'draft' | 'published';
}

export interface E2eContent1780661410877 extends ZenithDocument {
  title: string;
}

export interface E2eComplex1780661405903 extends ZenithDocument {
  body: string;
  status?: ('draft' | 'published' | 'archived');
}

export interface AuditTarget1780661366286 extends ZenithDocument {
  title: string;
}

export interface Media extends ZenithDocument {
  name?: string;
  url?: string;
  alt?: string;
  folder?: string;
  mimetype?: string;
  size?: number;
}

export interface ZenithCollections {
  'e2e-content-1780661410877': E2eContent1780661410877;
  'e2e-complex-1780661405903': E2eComplex1780661405903;
  'audit-target-1780661366286': AuditTarget1780661366286;
  'media': Media;
}

/**
 * Fully Typed React SDK Data Hook Mappings
 */
export type ZenithQuery<T> = {
  where?: Record<string, any>;
  sort?: string | Record<string, any>;
  limit?: number;
  skip?: number;
  select?: string[];
  populate?: string[];
  locale?: string;
};

