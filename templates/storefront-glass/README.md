# Zenith Storefront — Glass Theme

> **Premium glassmorphism storefront template for Zenith CMS.** Dark glassmorphism aesthetic, zero-config deploy, live CMS connection. Ships with Vercel & Netlify configs ready.

**[Live Demo](https://storefront.zenith.dev)** ·
**[Zenith CMS](https://github.com/zenith-cms/zenith)** ·
**[Admin Dashboard](https://github.com/zenith-cms/zenith/admin)**

---

## Features

- **Glassmorphism dark theme** — Premium dark glass aesthetics matching the Zenith Admin Dashboard
- **Zero-config CMS connection** — 3 env vars and it's live
- **SSR-ready** — Vite build target `esnext`, compatible with Vercel Edge / Netlify
- **PWA built-in** — Auto-update service worker via `vite-plugin-pwa`
- **Reading progress bar** — Animated top-of-page progress on post pages
- **Fully type-safe** — TypeScript throughout, SDK integration typed
- **Framer Motion animations** — Page transitions, card hover effects, skeleton loaders
- **Multi-tenant** — `X-Zenith-Site-Id` header wired through the SDK automatically

---

## Quick Start

### 1. Clone this template

```bash
# Option A: Use as a standalone project (recommended)
git clone https://github.com/zenith-cms/storefront-glass.git my-storefront
cd my-storefront
npm install

# Option B: Inside the Zenith monorepo
# It's already at packages/storefront-glass/
```

### 2. Configure your CMS connection

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VITE_CMS_URL=http://localhost:3000
VITE_CMS_API_KEY=your-api-key-here
VITE_CMS_SITE_ID=your-site-id-here
```

> **Get credentials** from your Zenith Admin Dashboard → Settings → API Keys & Sites.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see live content from your CMS.

---

## CMS Setup Checklist

Before the storefront shows content, make sure your CMS has:

- [ ] **A collection named `posts`** (or edit `src/lib/cms.ts` → `COLLECTION.POSTS`)
- [ ] **A published post** with title, content, status = published
- [ ] **An API key** with read permissions (Dashboard → Settings → API Keys)
- [ ] **A site** created and active (Dashboard → Settings → Sites)

### Expected `posts` collection schema

The SDK fetches these fields. Configure them in Zenith Admin → Collections → Posts → Fields:

| Field | Slug | Type | Notes |
|-------|------|------|-------|
| Title | `title` | Text | Required |
| Content | `content` | Rich Text | Required |
| Slug | `slug` | UID/Text | Used for post URLs |
| Excerpt | `excerpt` | Text | Used for card descriptions (optional) |
| Cover Image | `coverImage` | Media | Hero image (optional) |
| Tags | `tags` | JSON/Array | Tag names (optional) |
| Status | `status` | Select | `published` / `draft` |

> **Important:** The SDK uses `status: published` filter by default. Only published posts appear on the storefront.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_CMS_URL` | Yes | `http://localhost:3000` | Your Zenith engine URL |
| `VITE_CMS_API_KEY` | Yes | — | Read-only API key |
| `VITE_CMS_SITE_ID` | No | — | Multi-tenant site ID |

### Changing Collection Slugs

Edit `src/lib/cms.ts`:

```ts
export const COLLECTION = {
  POSTS: 'my-custom-posts-slug',  // ← change this
  PAGES: 'pages',
  AUTHORS: 'authors',
} as const
```

### Adding More Collections

In `src/lib/cms.ts`, add new fetcher functions:

```ts
export async function getProducts(options: FindOptions = {}) {
  const result = await cms.find<Product>('products', {
    where: { status: { equals: 'published' } },
    ...options,
  })
  return result.docs
}
```

---

## Deploy

### Vercel

```bash
npm i -g vercel
vercel
```

Set the env vars in Vercel Dashboard → Settings → Environment Variables.

Or via CLI:

```bash
vercel env add VITE_CMS_URL production
vercel env add VITE_CMS_API_KEY production
vercel env add VITE_CMS_SITE_ID production
vercel --prod
```

### Netlify

Drop the repo into Netlify — it auto-detects the `netlify.toml`.

Set env vars in Site Settings → Environment Variables.

### Cloudflare Pages

```bash
npx wrangler pages deploy dist
```

Set env vars in Cloudflare Dashboard → Pages → Your Site → Settings → Environment Variables.

---

## Project Structure

```
storefront-glass/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── PostDetail.tsx
│   │   ├── Skeleton.tsx
│   │   └── NotFound.tsx
│   ├── lib/
│   │   └── cms.ts      # Zenith SDK client & typed fetchers
│   ├── App.tsx         # Router + all pages
│   ├── main.tsx
│   └── index.css        # Tailwind + custom styles
├── public/
│   └── favicon.svg
├── index.html
├── .env.example        # ← Copy to .env
├── vite.config.ts
├── tailwind.config.js
├── vercel.json         # One-click Vercel deploy
├── netlify.toml        # One-click Netlify deploy
└── README.md           # You are here
```

---

## Customization

### Fonts

Change in `tailwind.config.js` → `theme.extend.fontFamily`, and update `index.html` Google Fonts link.

### Colors

Edit `tailwind.config.js` → `theme.extend.colors.zenith`. The glassmorphism palette uses:

```js
zenith: {
  base: '#0B0F19',       // Main background
  surface: '#111827',    // Card backgrounds
  surface2: '#1a1f2e',   // Elevated surfaces
  accent: '#6366f1',     // Primary accent (indigo)
  accentBright: '#818cf8', // Hover accent
  text: '#e2e8f0',       // Body text
  textMuted: 'rgba(226,232,240,0.5)', // Muted text
}
```

### Adding New Pages

```tsx
// In App.tsx, add a new route:
<Route path="/newsletter" element={<NewsletterPage />} />

// Create the page component anywhere under src/
function NewsletterPage() { ... }
```

---

## Known Limitations

- **Rich text rendering** — The `content` field is rendered as raw HTML via `dangerouslySetInnerHTML`. Use a sanitization library (e.g. ` DOMPurify`) in production if you accept user-generated content.
- **Preview mode** — Draft posts aren't shown by default. To preview drafts, pass `drafts: true` in the SDK fetch options.
- **Search** — Not included by default. Use Zenith CMS's built-in search API via `cms.find({ where: { title: { contains: '...' } } })`.

---

## License

MIT — use it however you want. Attribution appreciated but not required.