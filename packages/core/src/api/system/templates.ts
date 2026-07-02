import { Router } from 'express'
import { z } from 'zod'

const router: Router = Router()

const TEMPLATES = [
  {
    id: 'storefront-glass',
    name: 'Zenith Glassmorphism Storefront',
    version: '2.4.0',
    description:
      'A luxury, dark-obsidian glassmorphic storefront. Features responsive sliding cards, premium translucent grid elements, dynamic hardware-accelerated Framer Motion overlays, and ultra-fast client-side state caching.',
    gitUrl: 'https://github.com/AmanTShekar/zenith-storefront-glass',
    tags: ['React 19', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Zustand'],
    stars: 382,
    performanceScore: 99,
    primaryColor: 'from-z-accent to-transparent',
    accentColor: 'var(--z-accent)',
    features: [
      'Interactive spatial layout engine',
      'Advanced dark mode glassmorphism styles',
      'Unified search & custom command palette',
      'Pre-configured global cache adapters',
    ],
    category: 'E-Commerce / Portfolio',
    slug: 'storefront-glass',
  },
  {
    id: 'storefront-editorial',
    name: 'Zenith Editorial Storefront',
    version: '1.8.0',
    description:
      'A premium magazine-style, bold typography design featuring asymmetrical grids, elegant content layouts, high-impact readability styles, fluid transitions, and pre-integrated Zenith CMS collection feeds.',
    gitUrl: 'https://github.com/AmanTShekar/zenith-storefront-editorial',
    tags: ['Next.js 15', 'React 19', 'Tailwind CSS', 'Radix UI', 'SWR'],
    stars: 219,
    performanceScore: 98,
    primaryColor: 'from-z-accent to-transparent',
    accentColor: 'var(--z-accent)',
    features: [
      'Stunning asymmetric typography grid',
      'Dynamic SWR-based native API integration',
      'Automated content caching out-of-the-box',
      'Flawless SEO & structured semantic schema',
    ],
    category: 'Editorial / Blog',
    slug: 'storefront-editorial',
  },
  {
    id: 'blog-demo',
    name: 'Zenith Blog Demo',
    version: '1.2.0',
    description:
      'A high-performance developer blog and content hub. Features dynamic SWR-based native API integration, automated content caching, and clean modern layout optimized for text readability and coding snippets.',
    gitUrl: 'https://github.com/AmanTShekar/zenith-blog-demo',
    tags: ['React 19', 'Vite', 'Tailwind CSS', 'SWR'],
    stars: 128,
    performanceScore: 100,
    primaryColor: 'from-z-accent to-transparent',
    accentColor: 'var(--z-accent)',
    features: [
      'Pre-integrated SWR data synchronization',
      'Perfect lighthouse readability & layout scores',
      'Support for syntax highlighting & markdown',
      'Optimized asset loading & lazy fetching',
    ],
    category: 'Editorial / Blog',
    slug: 'blog-demo',
  },
  {
    id: 'demo',
    name: 'Zenith Demo Storefront',
    version: '1.5.0',
    description:
      'A sleek storefront showcasing standard components, product catalogs, and interactive features. Includes cart systems, localized product grids, and instant page builder sync.',
    gitUrl: 'https://github.com/AmanTShekar/zenith-demo',
    tags: ['React 19', 'Vite', 'Tailwind CSS', 'Axios'],
    stars: 145,
    performanceScore: 97,
    primaryColor: 'from-z-accent to-transparent',
    accentColor: 'var(--z-accent)',
    features: [
      'Real-time product cart integration',
      'Fully responsive mobile layouts',
      'Built-in analytics event hooks',
      'Zero-config deployment support',
    ],
    category: 'E-Commerce / Portfolio',
    slug: 'demo',
  }
]

router.get('/', (req, res) => {
  res.json({ templates: TEMPLATES })
})

export { router as templatesRouter }
