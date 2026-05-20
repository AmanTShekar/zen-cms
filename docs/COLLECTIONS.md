# 🏛️ Zenith Schema & Collections Blueprint (`COLLECTIONS.md`)

Zenith's dynamic collection schema engine lies at the heart of its headless CMS capabilities. It provides developers and AI assistants with a unified, strongly-typed system for modeling metadata, structured fields, validation constraints, and database relationships.

---

## 🏛️ 1. Core Schema Topology

Zenith configurations map directly to database collections and automatically synthesize:

1. **TypeScript Interfaces** for end-to-end type safety.
2. **Zod Validation Schemas** for real-time API request gating.
3. **Admin Form Layouts** inside the Vite dynamic React dashboard.
4. **REST API endpoints** for immediate CRUD operations.

```
┌────────────────────────────────────────────────────────┐
│                   cms.config.ts                        │ (Pro-code definition)
└──────────────────────────┬─────────────────────────────┘
                           │
                 [ Schema Synthesizer ]
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Database Table│  │  Zod Schema   │  │   Admin UI    │
│  & Collection │  │  Validation   │  │ Form Layouts  │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 📝 2. Collection Configuration Standard

Every collection is declared as a `CollectionConfig` object. Below is a high-fidelity reference implementation for a `products` collection featuring nested properties, dynamic validation hooks, and localized layouts:

```typescript
import { CollectionConfig } from '@zenithcms/types'

export const ProductsCollection: CollectionConfig = {
  slug: 'products',
  name: 'Products & SKUs',
  description: 'Manage store catalog items, prices, and stock indicators.',
  admin: {
    useAsTitle: 'title',
    defaultSort: '-createdAt',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Product Title',
      required: true,
      placeholder: 'e.g., Zenith Mechanical Keyboard',
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      unique: true,
      lowercase: true,
    },
    {
      name: 'price',
      type: 'number',
      label: 'Retail Price (USD)',
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'category',
      type: 'relationship',
      label: 'Product Category',
      relationTo: 'categories', // Dynamic picker binding
      required: true,
    },
    {
      name: 'description',
      type: 'rich-text',
      label: 'Product Specification',
      required: false,
    },
    {
      name: 'images',
      type: 'relationship',
      label: 'Product Gallery',
      relationTo: 'media',
      hasMany: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }) => {
        // Enforce URL slugs if missing
        if (!data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
        }
        return data
      },
    ],
  },
}
```

---

## 🛠️ 3. Supported Field Schema Matrix

Zenith features robust built-in field types, each compiled dynamically into responsive Tailwind/Lucide-powered admin inputs:

| Field Type     | Database Representation       | Core Admin Input Component                       | Validation Parameters                      |
| :------------- | :---------------------------- | :----------------------------------------------- | :----------------------------------------- |
| `text`         | `String` / `VARCHAR`          | `TextInput.tsx` with character counting          | `required`, `charLimit`, `unique`, `regex` |
| `number`       | `Double` / `DECIMAL`          | `NumberInput.tsx` with boundary controls         | `required`, `min`, `max`                   |
| `relationship` | `ObjectId` / `FOREIGN KEY`    | `RelationPicker.tsx` (real-time dropdown Search) | `required`, `hasMany`, `relationTo`        |
| `rich-text`    | `JSON` / `TEXT` (Block-based) | `RichTextEditor.tsx` (Tip-tap inline commands)   | `required`                                 |

---

## ⚡ 4. Real-time Zod & Database Synthesis

When a content update request reaches the core server, Zenith's **Type Synthesizer** compiles the config schema into a strict Zod rule structure at runtime:

```typescript
import { z } from 'zod'
import { FieldSchema } from '@zenithcms/types'

export function compileFieldValidation(field: FieldSchema) {
  let schema: z.ZodTypeAny = z.any()

  if (field.type === 'text') {
    schema = z.string()
    if (field.required)
      schema = (schema as z.ZodString).min(1, `${field.label || field.name} is required.`)
  } else if (field.type === 'number') {
    schema = z.number()
    if (field.min !== undefined) schema = (schema as z.ZodNumber).min(field.min)
  } else if (field.type === 'relationship') {
    schema = field.hasMany ? z.array(z.string()) : z.string()
  }

  return schema
}
```

This dynamic compilation ensures that **invalid data payloads (422) never infect database tables**, yielding robust air-tight protocol guarantees.

---

## 🧠 5. AI Guidance for Custom Schema Expansions

When creating a new collection schema via prompt requests:

1. **Never hardcode dynamic relational strings**: Re-use imported constants and check relationTo configurations against the global registry layout.
2. **Define Default Fallbacks**: Always provide clean default values (`defaultValue: false` or `defaultValue: 0`) to prevent frontend React hook rendering crashes.
3. **Leverage Hook Middleware**: Execute text transformations (e.g. autolinking slugs or content sanitization) inside `beforeChange` or `beforeValidate` hooks on the server.
