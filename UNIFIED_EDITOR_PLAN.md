# Unified Editor & API Productivity Plan

## The Problem

Zenith CMS currently has **two separate editors** for creating content:

1. **SpatialEditor** (`/collections/pages/:id`) — visual drag-and-drop page builder with blocks/sections
2. **CollectionDetail** (`/collections/:slug/:id`) — standard form-based editor for all other collections

This split creates real friction:
- Users must learn **two different workflows** for what is the same task (creating content)
- A "page" and a "blog post" are stored in completely different data shapes
- Developers consuming the API get inconsistent response formats
- You can't mix visual blocks with standard fields on the same content type

## How Payload CMS Does It (The Gold Standard)

Payload has **one editor for everything**. The magic is the `"blocks"` field type:

```js
// Collection config
{
  slug: 'pages',
  fields: [
    { name: 'title', type: 'text' },
    {
      name: 'layout',        // ← "blocks" field = visual builder
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          fields: [
            { name: 'headline', type: 'text' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ]
        },
        {
          slug: 'features',
          fields: [
            { name: 'heading', type: 'text' },
            { name: 'items', type: 'array', fields: [...] },
          ]
        }
      ]
    }
  ]
}
```

**What the user sees:** One form. Title field at top. Then a "Layout" section with:
- "+ Add Block" button
- Each block is a **collapsible card** with its fields inside
- Drag-and-drop reorderable
- Duplicate and delete actions per block

**The API response** is clean and flat:
```json
{
  "id": "123",
  "title": "My Page",
  "layout": [
    { "blockType": "hero", "headline": "...", "image": "..." },
    { "blockType": "features", "heading": "...", "items": [...] }
  ]
}
```

**Key insight:** The blocks field is just another field type. It renders differently in the admin, but the data is stored as a plain JSON array. No special routes, no separate editor, no separate data model.

## How Strapi Does It (Dynamic Zones)

Strapi calls them **"Dynamic Zones"** — same concept:
1. Create reusable "components" (Hero, Features, etc.)
2. Add a "Dynamic Zone" field to your content type
3. In the Content Manager (the only editor), that field shows "+ Add component"
4. Each component instance is collapsible with its fields inside

**Strapi's REST API response:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "title": "My Page",
      "slug": "my-page",
      "sections": [           // ← Dynamic Zone = array of components
        {
          "__component": "sections.hero",
          "headline": "...",
          "image": { "data": { "id": 5, "attributes": { "url": "..." } } }
        }
      ]
    }
  },
  "meta": { "pagination": { "page": 1, "total": 42 } }
}
```

**Strapi's API query parameters:**
```
GET /api/pages?populate=sections.image&filters[slug][$eq]=my-page&locale=en&status=published
```

## How Zenith's API Currently Works

**Zenith REST response format:**
```json
{
  "data": { "title": "...", "sections": [...] },
  "meta": { "pagination": { "page": 1, "pageSize": 10, "totalPages": 5, "total": 42 } },
  "error": null
}
```

**Zenith query parameters:**
```
GET /api/v1/posts?where[status][$eq]=published&sort=-createdAt&limit=10&page=2&locale=en
```

**What Zenith does well:**
- Clean `data` / `meta` / `error` envelope
- MongoDB-style `where` filters (familiar to Payload users)
- Built-in SWR cache in the SDK
- Zero-dependency SDK (no axios needed)
- Batch operations support
- File upload with focal point

**What Zenith does worse than Payload/Strapi:**
- No `populate` parameter for relations (you get IDs, not the full objects)
- No field selection (`?select=title,slug` to reduce payload)
- No GraphQL by default (Payload has it built-in)
- No webhook event filtering in the REST API
- Swagger docs are auto-generated but don't show real response shapes
- No content-type discovery endpoint (Payload's `/api/health` returns collection schemas)

---

## The Plan: What We Build

### Phase 1: Unify the Editor (SpatialEditor → FormBuilder field type)

**Goal:** One editor for all collections. Visual blocks are a field type, not a separate page.

#### 1.1 Add `"blocks"` field type to FormBuilder

When FormBuilder encounters `type: "blocks"`, it renders a `BlocksField` component instead of a text input.

**Collection config becomes:**
```js
{
  slug: 'pages',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text' },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          title: 'Hero Section',
          icon: 'Star',
          fields: [
            { name: 'headline', type: 'text' },
            { name: 'subheadline', type: 'textarea' },
            { name: 'backgroundImage', type: 'media' },
            { name: 'ctaText', type: 'text' },
          ]
        },
        {
          slug: 'features',
          title: 'Features Grid',
          icon: 'Grid',
          fields: [
            { name: 'heading', type: 'text' },
            { name: 'items', type: 'array', fields: [
              { name: 'title', type: 'text' },
              { name: 'description', type: 'textarea' },
            ]},
          ]
        }
      ]
    },
    { name: 'seoTitle', type: 'text' },
  ]
}
```

#### 1.2 Create `BlocksField` component

New file: `packages/admin/src/components/fields/BlocksField.tsx`

This is the visual builder embedded inside a form:
- Renders existing blocks as collapsapsible cards (like SpatialEditor's SectionBlock)
- Each card shows the block's fields using the existing field renderers
- "+ Add Block" button opens a block picker modal
- Drag-and-drop reorder via `@dnd-kit`
- Duplicate and delete per block
- Uses the same `renderField` function from FormBuilder for consistency

**Data shape (stored in DB):**
```json
{
  "layout": [
    {
      "id": "block_abc123",
      "blockType": "hero",
      "headline": "Welcome",
      "subheadline": "...",
      "backgroundImage": "media_id_456",
      "ctaText": "Get Started"
    },
    {
      "id": "block_def456",
      "blockType": "features",
      "heading": "Why Zenith",
      "items": [
        { "title": "Fast", "description": "..." },
        { "title": "Secure", "description": "..." }
      ]
    }
  ]
}
```

#### 1.3 What happens to SpatialEditor.tsx

**Option C (recommended):** SpatialEditor becomes a "Visual Mode" toggle inside CollectionDetail.

- CollectionDetail has a "Switch to Visual Editor" button in the toolbar
- This opens SpatialEditor as a **full-screen overlay/modal** (not a separate route)
- The data is the same — SpatialEditor reads/writes the same `layout` field
- The auto-save and workflow features still work
- Route `/collections/pages/:id` still works but just renders CollectionDetail with the visual mode pre-enabled

#### 1.4 What happens to BLOCK_LIBRARY

Currently hardcoded in `constants.ts`. After the merge:
- `BLOCK_LIBRARY` becomes the **default block set** that all collections inherit
- Collections can override via field config: `blocks: [...]` on the field itself
- A "blog posts" collection might only have `[richText, image, callout]` blocks
- A "landing pages" collection might have all 12+ blocks

#### 1.5 Files that change

| File | Change |
|---|---|
| `FormBuilder.tsx` | Add `case 'blocks'` → renders `BlocksField` |
| `fields/BlocksField.tsx` (NEW) | Visual block builder: cards, picker, DnD |
| `fields/BlockPickerModal.tsx` (NEW) | Modal to pick which block type to add |
| `constants.ts` | `BLOCK_LIBRARY` becomes exportable defaults |
| `CollectionDetail.tsx` | Add "Visual Mode" toggle button |
| `SpatialEditor.tsx` | Becomes a modal/overlay, not a standalone page |
| `App.tsx` | Remove dedicated SpatialEditor routes |
| `types/index.ts` | Add `'blocks'` to field type union |
| **Database** | **No changes** — `layout`/`sections` already stored as JSON |
| **API endpoints** | **No changes** — `/api/v1/pages/:id` already accepts blocks data |
| **SDK** | **No changes** — already generic |

---

### Phase 2: Make the API More Productive (What Payload/Strapi Do Better)

#### 2.1 Add `populate` for Relations (like Strapi)

**Problem:** When you fetch a post with `featuredImage: "media_id_123"`, you only get the ID. You need a second request to get the image URL.

**Solution:** Add `?populate=` parameter:

```
GET /api/v1/posts/123?populate=featuredImage
```

Response:
```json
{
  "data": {
    "id": "123",
    "title": "My Post",
    "featuredImage": {
      "id": "media_456",
      "url": "/media/photo.jpg",
      "alt": "A photo",
      "width": 1200,
      "height": 800
    }
  }
}
```

Deep populate: `?populate=featuredImage&populate=author.avatar&populate=tags`

**Implementation:** In `factory.ts`, when `populate` is present, resolve relation IDs to full documents after the initial query.

#### 2.2 Add `select` for Field Selection (like Payload)

**Problem:** You only need `title` and `slug` for a listing page, but the API returns all fields.

**Solution:** Add `?select=` parameter:

```
GET /api/v1/posts?select=title,slug,createdAt
```

Response:
```json
{
  "data": [
    { "id": "1", "title": "Post 1", "slug": "post-1", "createdAt": "..." },
    { "id": "2", "title": "Post 2", "slug": "post-2", "createdAt": "..." }
  ]
}
```

**Implementation:** In `factory.ts`, after fetching, strip non-selected fields from the response.

#### 2.3 Add `depth` Parameter (like Strapi)

**Problem:** Relations inside blocks/arrays don't get populated even with `populate`.

**Solution:** `?depth=2` auto-populates relations up to N levels deep.

```
GET /api/v1/pages/123?depth=2
```

This auto-populates: `layout[].backgroundImage`, `layout[].items[].icon`, etc.

#### 2.4 Improve the SDK for Developer Experience

**Current SDK usage:**
```js
const client = createClient({ url: 'http://localhost:3000/api/v1' })
const { docs } = await client.find('posts', { where: { status: 'published' } })
```

**Improved SDK with populate/select/depth:**
```js
const client = createClient({ url: 'http://localhost:3000/api/v1' })

// Populate relations
const post = await client.findById('posts', '123', {
  populate: ['featuredImage', 'author.avatar', 'tags']
})

// Select specific fields (smaller payload)
const { docs } = await client.find('posts', {
  select: ['title', 'slug', 'createdAt'],
  where: { status: 'published' },
  limit: 10
})

// Deep populate everything up to 2 levels
const page = await client.findById('pages', '456', { depth: 2 })

// Populate inside blocks (layout is a blocks field)
const page = await client.findById('pages', '456', {
  populate: ['layout.backgroundImage', 'layout.items.icon']
})
```

#### 2.5 Add GraphQL (Optional but Powerful)

Payload has built-in GraphQL. Strapi has a plugin. Zenith has a `graphql.ts` but it's not fully wired.

**Goal:** Auto-generate GraphQL schema from collection definitions. One query to get exactly the data you need:

```graphql
query {
  pages(where: { slug: { equals: "home" } }) {
    docs {
      title
      layout {
        ... on HeroBlock {
          headline
          backgroundImage {
            url
            alt
          }
        }
        ... on FeaturesBlock {
          heading
          items {
            title
            description
          }
        }
      }
    }
  }
}
```

This is the **most efficient** API pattern — the client specifies exactly what it needs, no over-fetching, no under-fetching, no multiple round-trips.

#### 2.6 Add Content-Type Discovery Endpoint

**Problem:** A developer using the SDK doesn't know what collections exist or what fields they have.

**Solution:** Enhance the health endpoint:

```
GET /api/v1/health
```

Response:
```json
{
  "data": {
    "collections": [
      {
        "slug": "posts",
        "name": "Posts",
        "fields": [
          { "name": "title", "type": "text", "required": true },
          { "name": "slug", "type": "text" },
          { "name": "featuredImage", "type": "media", "relationTo": "media" },
          { "name": "layout", "type": "blocks", "blocks": ["hero", "features", "cta"] }
        ]
      }
    ]
  }
}
```

This enables:
- Auto-generated TypeScript types on the client
- SDK introspection (the SDK can tell you what fields exist)
- Self-documenting API

---

### Phase 3: API Response Format Comparison

#### Current Zenith
```json
{
  "data": { "id": "1", "title": "Hello" },
  "meta": { "pagination": { "page": 1, "total": 42 } },
  "error": null
}
```

#### Strapi V5
```json
{
  "data": { "id": 1, "attributes": { "title": "Hello" } },
  "meta": { "pagination": { "page": 1, "total": 42 } }
}
```

#### Payload
```json
{
  "docs": [{ "id": "1", "title": "Hello" }],
  "totalDocs": 42,
  "limit": 10,
  "totalPages": 5,
  "page": 1,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": true,
  "prevPage": null,
  "nextPage": 2
}
```

#### Proposed Zenith (keep current, add populate/select/depth)
```json
{
  "data": {
    "id": "1",
    "title": "Hello",
    "featuredImage": {
      "id": "5",
      "url": "/media/photo.jpg",
      "alt": "Photo"
    }
  },
  "meta": { "pagination": { "page": 1, "total": 42 } },
  "error": null
}
```

**Why keep Zenith's format?** It's already clean. The `data`/`meta`/`error` envelope is good. We just need to add the query capabilities (populate/select/depth) on top.

---

## Summary: What Makes Zenith's API Better Than Strapi/Payload

| Feature | Strapi | Payload | Zenith (Current) | Zenith (After Plan) |
|---------|--------|---------|-------------------|---------------------|
| Response envelope | `data`/`meta` | `docs`/`totalDocs` | `data`/`meta`/`error` | Same (already good) |
| Relation population | `?populate=*` | Automatic | ❌ Manual | ✅ `?populate=` |
| Field selection | ❌ | `?select=` | ❌ | ✅ `?select=` |
| Deep populate | `?populate=deep` | Automatic | ❌ | ✅ `?depth=N` |
| GraphQL | Plugin | Built-in | Partial | ✅ Full auto-generated |
| SDK | `@strapi/sdk` | Built-in | `@zenithcms/sdk` (zero-dep) | Same + populate/select |
| Batch requests | ❌ | ❌ | ✅ `client.batch()` | Same |
| File upload | Separate endpoint | Separate endpoint | ✅ With focal point | Same |
| SWR cache | ❌ | ❌ | ✅ Built-in | Same |
| Content discovery | ❌ | `/api/health` | Partial | ✅ Full schema |
| Webhook filtering | ✅ | ✅ | ❌ | ✅ |

---

## Execution Order

1. **Phase 1.1-1.2:** Build `BlocksField` component + add to FormBuilder
2. **Phase 1.3:** Convert SpatialEditor to modal mode inside CollectionDetail
3. **Phase 1.4-1.5:** Clean up routes, types, BLOCK_LIBRARY
4. **Phase 2.1:** Add `populate` to API factory
5. **Phase 2.2:** Add `select` to API factory
6. **Phase 2.3:** Add `depth` to API factory
7. **Phase 2.4:** Update SDK with populate/select/depth support
8. **Phase 2.5:** Complete GraphQL setup
9. **Phase 2.6:** Enhance health endpoint with full schema

Each phase is independently shippable. Phase 1 can be done in a single session.
