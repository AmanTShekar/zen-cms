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

export interface Authors extends ZenithDocument {
  name: string;
  avatar?: { url: string; alt?: string };
  bio?: string;
}

export interface Posts extends ZenithDocument {
  title: string;
  coverImage?: { url: string; alt?: string };
  content?: string;
  publishedAt?: string | Date;
  author?: Record<string, unknown>;
}

export interface Categories extends ZenithDocument {
  title: string;
  slug: string;
}

export interface Pages extends ZenithDocument {
  title: string;
  slug: string;
  layout?: ({
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  })[];
}

export interface Products extends ZenithDocument {
  name: string;
  slug: string;
  price: number;
  description?: string;
  gallery?: {
    image?: { url: string; alt?: string };
  }[];
  inStock?: boolean;
}

export interface Media extends ZenithDocument {
  name?: string;
  url?: string;
  alt?: string;
  folder?: string;
  mimetype?: string;
  size?: number;
}

export interface SiteSettings extends ZenithDocument {
  siteName: string;
  supportEmail?: string;
  logo?: { url: string; alt?: string };
  favicon?: { url: string; alt?: string };
  primaryColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: { url: string; alt?: string };
  socialLinks?: {
    platform?: ('Twitter' | 'Instagram' | 'Facebook' | 'LinkedIn' | 'GitHub' | 'YouTube');
    url?: string;
  }[];
  copyrightText?: string;
  headerLinks?: {
    label: string;
    url: string;
  }[];
  footerLinks?: {
    label: string;
    url: string;
  }[];
}

export interface LandingPage extends ZenithDocument {
  title?: string;
  sections?: ({
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  } | {
    blockType: 'undefined';

  })[];
}

export interface ZenithCollections {
  'authors': Authors;
  'posts': Posts;
  'categories': Categories;
  'pages': Pages;
  'products': Products;
  'media': Media;
  'site-settings': SiteSettings;
  'landing-page': LandingPage;
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

