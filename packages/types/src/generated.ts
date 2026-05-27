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

export interface Posts extends ZenithDocument {
  siteId: string;
  title: string;
  slug: string;
  content?: string;
  coverImage?: { url: string; alt?: string };
  tags?: ('tech' | 'design' | 'business' | 'lifestyle')[];
  publishedAt?: string | Date;
  sections?: ({
    blockType: 'hero';
    headline?: string;
    subheadline?: string;
    callToAction?: string;
    backgroundImage?: { url: string; alt?: string };
  } | {
    blockType: 'features';
    heading?: string;
    featureList?: {
    title?: string;
    description?: string;
    icon?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'testimonials';
    heading?: string;
    items?: {
    quote?: string;
    author?: string;
    role?: string;
    avatar?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'pricing';
    heading?: string;
    plans?: {
    name?: string;
    price?: string;
    features?: string;
    buttonText?: string;
    isPopular?: boolean;
  }[];
  } | {
    blockType: 'faq';
    heading?: string;
    questions?: {
    question?: string;
    answer?: string;
  }[];
  } | {
    blockType: 'cta';
    title?: string;
    description?: string;
    buttonText?: string;
    link?: string;
  } | {
    blockType: 'stats';
    items?: {
    value?: string;
    label?: string;
  }[];
  } | {
    blockType: 'richTextSection';
    content?: string;
  })[];
}

export interface Authors extends ZenithDocument {
  siteId: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: { url: string; alt?: string };
}

export interface Products extends ZenithDocument {
  siteId: string;
  title: string;
  price: number;
  description?: string;
  gallery?: { url: string; alt?: string }[];
  inStock?: boolean;
  specs?: {
    weight?: number;
    color?: string;
    sku?: string;
  };
  category: ('electronics' | 'clothing' | 'home' | 'sports');
  layout?: ({
    blockType: 'hero';
    headline?: string;
  } | {
    blockType: 'features';
    items?: {
    title?: string;
  }[];
  } | {
    blockType: 'stats';
    items?: {
    value?: string;
  }[];
  })[];
}

export interface Pages extends ZenithDocument {
  siteId: string;
  meta?: Record<string, unknown>;
  title: string;
  slug: string;
  sections?: ({
    blockType: 'hero';
    headline?: string;
    subheadline?: string;
    callToAction?: string;
    backgroundImage?: { url: string; alt?: string };
  } | {
    blockType: 'features';
    heading?: string;
    featureList?: {
    title?: string;
    description?: string;
    icon?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'testimonials';
    heading?: string;
    items?: {
    quote?: string;
    author?: string;
    role?: string;
    avatar?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'pricing';
    heading?: string;
    plans?: {
    name?: string;
    price?: string;
    features?: string;
    buttonText?: string;
    isPopular?: boolean;
  }[];
  } | {
    blockType: 'faq';
    heading?: string;
    questions?: {
    question?: string;
    answer?: string;
  }[];
  } | {
    blockType: 'cta';
    title?: string;
    description?: string;
    buttonText?: string;
    link?: string;
  } | {
    blockType: 'stats';
    items?: {
    value?: string;
    label?: string;
  }[];
  } | {
    blockType: 'richTextSection';
    content?: string;
  })[];
}

export interface Members extends ZenithDocument {
  siteId: string;
  email: string;
  name?: string;
  subscriptionStatus?: ('standard' | 'architect' | 'nexus' | 'none');
  isSubscribed?: boolean;
  activity?: ('Low' | 'Medium' | 'High' | 'Critical');
  avatar?: { url: string; alt?: string };
  bio?: string;
}

export interface Media extends ZenithDocument {
  name?: string;
  url?: string;
  alt?: string;
  folder?: string;
  mimetype?: string;
  size?: number;
}

export interface LandingPage extends ZenithDocument {
  siteId: string;
  title: string;
  heroDescription?: string;
  sections?: ({
    blockType: 'hero';
    headline?: string;
    subheadline?: string;
    callToAction?: string;
    backgroundImage?: { url: string; alt?: string };
  } | {
    blockType: 'features';
    heading?: string;
    featureList?: {
    title?: string;
    description?: string;
    icon?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'testimonials';
    heading?: string;
    items?: {
    quote?: string;
    author?: string;
    role?: string;
    avatar?: { url: string; alt?: string };
  }[];
  } | {
    blockType: 'pricing';
    heading?: string;
    plans?: {
    name?: string;
    price?: string;
    features?: string;
    buttonText?: string;
    isPopular?: boolean;
  }[];
  } | {
    blockType: 'faq';
    heading?: string;
    questions?: {
    question?: string;
    answer?: string;
  }[];
  } | {
    blockType: 'cta';
    title?: string;
    description?: string;
    buttonText?: string;
    link?: string;
  } | {
    blockType: 'stats';
    items?: {
    value?: string;
    label?: string;
  }[];
  } | {
    blockType: 'richTextSection';
    content?: string;
  })[];
}

export interface ZenithCollections {
  'posts': Posts;
  'authors': Authors;
  'products': Products;
  'pages': Pages;
  'members': Members;
  'media': Media;
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

