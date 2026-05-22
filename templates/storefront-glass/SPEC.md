# Zenith Storefront Glass — SPEC

## 1. Concept & Vision

**Zenith Storefront Glass** is a premium, deploy-ready headless storefront that connects to Zenith CMS in under 5 minutes. It embodies the exact same glassmorphism aesthetic as the Zenith Admin Dashboard — dark base (`#0B0F19`), indigo/purple accent gradients, frosted glass cards with backdrop blurs, and refined micro-animations. The template should feel like it was hand-crafted for a premium brand, not a generic blog starter.

Target audience: developers who want a production-ready storefront with zero design work required.

---

## 2. Design Language

### Aesthetic
- **Type**: Premium glassmorphism — dark + glass + vibrancy
- **Reference**: Same visual language as Zenith Admin Dashboard

### Color Palette
```
zenith.base      #0B0F19  (main background)
zenith.surface   #111827  (card backgrounds)
zenith.surface2   #1a1f2e  (elevated surfaces)
zenith.border    rgba(255,255,255,0.06)
zenith.accent    #6366f1  (indigo — primary)
zenith.accentBright #818cf8 (hover states)
zenith.accentDim rgba(99,102,241,0.15) (tag backgrounds)
zenith.text      #e2e8f0  (body text)
zenith.textMuted rgba(226,232,240,0.5)
zenith.textDim   rgba(226,232,240,0.3)
```

### Typography
- **UI Font**: Outfit (Google Fonts) — weights 300–900
- **Mono**: JetBrains Mono — for code, timestamps, metadata

### Motion & Animation
- **Entrance**: `opacity 0→1, y +20→0, 400–600ms ease-out`
- **Stagger**: 60–80ms between list items on load
- **Hover**: card lifts (`shadow-glass-hover`, subtle border glow)
- **Reading progress**: top bar, 0.05s debounce (PostDetail page)

### Glass Effects
- Cards: `bg-glass-gradient` (subtle diagonal gradient), `backdrop-blur-md`, `border border-white/[0.05–0.08]`, `shadow-glass`
- Header scroll: `backdrop-blur-xl` + border reveal on scroll

---

## 3. Layout & Structure

### Pages
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero + 3 latest posts (1 featured large + 2 compact) |
| `/posts` | Posts | Full paginated grid of all published posts |
| `/post/:slug` | Post | Full article with reading progress bar |
| `/about` | About | Technology info, CMS connection guide |
| `*` | 404 | Not found page |

### Responsive Strategy
- Mobile-first, breakpoints at sm (640), md (768), lg (1024)
- Home grid: 1 col → 2 col → 3 col
- Posts grid: 1 col → 2 col → 3 col

---

## 4. Features & Interactions

### CMS Connection
- Zero hardcoded content — all fetched via `ZenithClient` SDK
- Environment vars: `VITE_CMS_URL`, `VITE_CMS_API_KEY`, `VITE_CMS_SITE_ID`
- SDK client in `src/lib/cms.ts` — typed fetchers per collection
- Automatic `X-Zenith-Site-Id` header on every request

### Home Page
- Featured article = first post, larger card with cover image visible
- Two subsequent posts in compact grid
- Loading skeleton (3 cards with shimmer)
- Empty state: illustrated empty box with CTA to go to posts

### Posts List
- Renders up to 50 posts (configurable via `limit`)
- Shows cover image, title, excerpt, tags, date
- Image fallback: gradient placeholder with document emoji

### Post Detail
- Back link to `/posts`
- Tag pills at top
- Full-width cover image
- Byline: avatar, author name, formatted date
- Rich HTML content rendered with `dangerouslySetInnerHTML`
- Reading progress bar at top of viewport
- Bottom tag list

### Error States
- CMS connection failure: red alert banner with clear message
- 404: centered not-found card with back navigation
- Skeleton loaders for all async data

---

## 5. Component Inventory

| Component | States | Notes |
|-----------|--------|-------|
| `Header` | Default, scrolled (glass blur), mobile menu open | Sticky, shows live CMS indicator dot |
| `Footer` | Static | 3-column: brand, nav, tech credits |
| `ArticleCard` | Default, hover (lift + border glow), loading skeleton | Featured variant + compact variant |
| `PostDetail` | Loading, loaded, error 404 | Reading progress bar, rich prose |
| `Skeleton` | Shimmer animation | Card variant + grid variant + detail variant |
| `NotFound` | Static | Centered 404 display |

---

## 6. Technical Approach

### Stack
- **Vite 5** + React 19 + TypeScript
- **Tailwind CSS 3** — custom theme with glassmorphism tokens
- **React Router 7** — file-based routing via `BrowserRouter`
- **Framer Motion 11** — page transitions, hover effects, skeletons
- **React Hot Toast** — error/success notifications
- **Zenith SDK** (`@zenithcms/sdk`) — API client with multi-tenant headers

### SDK Integration
```ts
// All requests automatically include:
// Authorization: Bearer <VITE_CMS_API_KEY>
// X-Zenith-Site-Id: <VITE_CMS_SITE_ID>

const client = createClient({
  url: VITE_CMS_URL,
  apiKey: VITE_CMS_API_KEY,
  siteId: VITE_CMS_SITE_ID,
})

// Fetchers use .find() and .findById() with typed returns
const posts = (await client.find<Post>('posts', { where: { status: { equals: 'published' } } })).docs
```

### Deployment Targets
- **Vercel** — `vercel.json` for zero-config
- **Netlify** — `netlify.toml` for zero-config
- **Cloudflare Pages** — `wrangler pages deploy dist`
- **GitHub Pages** — needs `base: '/repo-name/'` in `vite.config.ts`

### PWA
- Service worker via `vite-plugin-pwa`
- Auto-update on new deployments
- Offline fallback for cached pages