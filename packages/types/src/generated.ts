/**
 * Zenith Auto-Generated TypeScript Definitions
 * This file is automatically re-compiled on database register & boot.
 * DO NOT MODIFY MANUALLY.
 */

export interface ZenithDocument {
  _id: string
  createdAt: string
  updatedAt: string
  status?: 'draft' | 'published'
}

export interface Posts extends ZenithDocument {
  title: string
  slug: string
  content?: any
  coverImage?: any
  tags?: any
  publishedAt?: string | Date
  sections?: (
    | {
        blockType: 'hero'
        headline?: string
        subheadline?: string
        callToAction?: string
        backgroundImage?: any
      }
    | {
        blockType: 'features'
        heading?: string
        featureList?: {
          title?: string
          description?: string
          icon?: any
        }[]
      }
    | {
        blockType: 'testimonials'
        heading?: string
        items?: {
          quote?: string
          author?: string
          role?: string
          avatar?: any
        }[]
      }
    | {
        blockType: 'pricing'
        heading?: string
        plans?: {
          name?: string
          price?: string
          features?: string
          buttonText?: string
          isPopular?: boolean
        }[]
      }
    | {
        blockType: 'faq'
        heading?: string
        questions?: {
          question?: string
          answer?: string
        }[]
      }
    | {
        blockType: 'cta'
        title?: string
        description?: string
        buttonText?: string
        link?: string
      }
    | {
        blockType: 'stats'
        items?: {
          value?: string
          label?: string
        }[]
      }
    | {
        blockType: 'richTextSection'
        content?: any
      }
  )[]
  seoTitle?: string
  seoDescription?: string
  ogImage?: any
}

export interface Authors extends ZenithDocument {
  name: string
  email: string
  bio?: string
  avatar?: any
}

export interface Products extends ZenithDocument {
  title: string
  price: number
  description?: any
  gallery?: any
  inStock?: boolean
  specs?: {
    weight?: number
    color?: string
    sku?: string
  }
  category: any
  layout?: (
    | {
        blockType: 'hero'
        headline?: string
      }
    | {
        blockType: 'features'
        items?: {
          title?: string
        }[]
      }
    | {
        blockType: 'stats'
        items?: {
          value?: string
        }[]
      }
  )[]
  slug?: string
}

export interface Pages extends ZenithDocument {
  meta?: any
  title: string
  slug: string
  sections?: (
    | {
        blockType: 'hero'
        headline?: string
        subheadline?: string
        callToAction?: string
        backgroundImage?: any
      }
    | {
        blockType: 'features'
        heading?: string
        featureList?: {
          title?: string
          description?: string
          icon?: any
        }[]
      }
    | {
        blockType: 'testimonials'
        heading?: string
        items?: {
          quote?: string
          author?: string
          role?: string
          avatar?: any
        }[]
      }
    | {
        blockType: 'pricing'
        heading?: string
        plans?: {
          name?: string
          price?: string
          features?: string
          buttonText?: string
          isPopular?: boolean
        }[]
      }
    | {
        blockType: 'faq'
        heading?: string
        questions?: {
          question?: string
          answer?: string
        }[]
      }
    | {
        blockType: 'cta'
        title?: string
        description?: string
        buttonText?: string
        link?: string
      }
    | {
        blockType: 'stats'
        items?: {
          value?: string
          label?: string
        }[]
      }
    | {
        blockType: 'richTextSection'
        content?: any
      }
  )[]
  seoTitle?: string
  seoDescription?: string
  ogImage?: any
}

export interface Members extends ZenithDocument {
  email: string
  name?: string
  subscriptionStatus?: any
  isSubscribed?: boolean
  activity?: any
  avatar?: any
  bio?: string
}

export interface Media extends ZenithDocument {
  name?: string
  url?: string
  alt?: string
  folder?: string
  mimetype?: string
  size?: number
}

export interface LandingPage extends ZenithDocument {
  title: string
  heroDescription?: any
  sections?: (
    | {
        blockType: 'hero'
        headline?: string
        subheadline?: string
        callToAction?: string
        backgroundImage?: any
      }
    | {
        blockType: 'features'
        heading?: string
        featureList?: {
          title?: string
          description?: string
          icon?: any
        }[]
      }
    | {
        blockType: 'testimonials'
        heading?: string
        items?: {
          quote?: string
          author?: string
          role?: string
          avatar?: any
        }[]
      }
    | {
        blockType: 'pricing'
        heading?: string
        plans?: {
          name?: string
          price?: string
          features?: string
          buttonText?: string
          isPopular?: boolean
        }[]
      }
    | {
        blockType: 'faq'
        heading?: string
        questions?: {
          question?: string
          answer?: string
        }[]
      }
    | {
        blockType: 'cta'
        title?: string
        description?: string
        buttonText?: string
        link?: string
      }
    | {
        blockType: 'stats'
        items?: {
          value?: string
          label?: string
        }[]
      }
    | {
        blockType: 'richTextSection'
        content?: any
      }
  )[]
}

export interface ZenithCollections {
  posts: Posts
  authors: Authors
  products: Products
  pages: Pages
  members: Members
  media: Media
  'landing-page': LandingPage
}

/**
 * Fully Typed React SDK Data Hook Mappings
 */
export type ZenithQuery<T> = {
  where?: Record<string, any>
  sort?: string | Record<string, any>
  limit?: number
  skip?: number
  select?: string[]
  populate?: string[]
  locale?: string
}
