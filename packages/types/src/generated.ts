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

export interface Media extends ZenithDocument {
  name?: string;
  url?: string;
  alt?: string;
  folder?: string;
  mimetype?: string;
  size?: number;
}

export interface ZenithCollections {
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

