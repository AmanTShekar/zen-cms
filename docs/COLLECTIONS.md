# Schemas & Collections

At the core of Zenith CMS is the schema engine. Instead of manually creating database tables or writing boilerplate code, you define collections in your configuration. Zenith then automatically builds your database structures, API endpoints, and admin forms.

---

## 🏛️ Schema Synthesis Flow

When you define a collection in `cms.config.ts`, Zenith handles the heavy lifting:

1.  **Database Sync**: Creates or updates tables (PostgreSQL) or collections (MongoDB).
2.  **API Gating**: Generates Zod validation rules at runtime.
3.  **Admin UI**: Dynamically builds forms and inputs for editors.
4.  **Types**: Generates TypeScript interfaces so your frontend stays type-safe.

```
                      +-----------------------------+
                      |        cms.config.ts        |
                      +--------------+--------------+
                                     |
                                     v
                           [ Schema Synthesizer ]
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
      +-----------------+   +-----------------+   +-----------------+
      | Database Tables |   |  Zod Validation |   | Admin Dashboard |
      |  & Collections  |   |    API Rules    |   |   Form Inputs   |
      +-----------------+   +-----------------+   +-----------------+
```

---

## 📝 Collection Configuration Example

Collections are defined using the `CollectionConfig` type. Here is an example configuration for a `products` collection with validation, relationships, and lifecycle hooks:

```typescript
import { CollectionConfig } from '@zenithcms/types';

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
      placeholder: 'e.g., Mechanical Keyboard',
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
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'description',
      type: 'rich-text',
      label: 'Product Description',
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
        // Automatically generate a slug from the title if missing
        if (!data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        }
        return data;
      },
    ],
  },
};
```

---

## 🛠️ Supported Field Types

Zenith provides a robust set of field types that map to database columns and render as custom React components in the admin panel:

*   **`text`**: Standard text input. Map to strings/VARCHARs. Supports character limits and custom regex.
*   **`number`**: Numeric input for integers or decimals. Supports min/max values.
*   **`relationship`**: Picker component to link documents (one-to-one or one-to-many) across collections. Renders as a searchable dropdown.
*   **`rich-text`**: Custom editor built on Tiptap. Supports inline formatting, lists, and embedded blocks.

---

## ⚡ How Run-Time Validation Works

When a request reaches the API, Zenith parses the field config and compiles it into a Zod schema to validate the payload:

```typescript
import { z } from 'zod';
import { FieldSchema } from '@zenithcms/types';

export function compileFieldValidation(field: FieldSchema) {
  let schema: z.ZodTypeAny = z.any();

  if (field.type === 'text') {
    schema = z.string();
    if (field.required) {
      schema = (schema as z.ZodString).min(1, `${field.label || field.name} is required.`);
    }
  } else if (field.type === 'number') {
    schema = z.number();
    if (field.min !== undefined) {
      schema = (schema as z.ZodNumber).min(field.min);
    }
  } else if (field.type === 'relationship') {
    schema = field.hasMany ? z.array(z.string()) : z.string();
  }

  return schema;
}
```

This validation ensures that only correct data gets written to your database, preventing layout breaks and API issues down the line.

---

## 🧠 Best Practices for Writing Custom Schemas

*   **Set Clear Defaults**: Always provide safe default values (e.g. `defaultValue: 0` or `defaultValue: false`) to avoid null pointer issues on your frontend.
*   **Use Server Hooks for Sanitization**: Don't rely solely on the frontend to format inputs. Clean up data (like trimming whitespace or checking values) inside `beforeChange` hooks.
*   **Define Relational Slugs**: When referencing other collections, make sure the `relationTo` slug matches the destination collection's slug exactly.
