# Zenith CMS — Custom Field Registration

While Zenith comes with a comprehensive suite of built-in field types (`text`, `richtext`, `media`, `relation`, etc.), there may be times when you need a highly specialized input component—for example, a Color Picker, a Map coordinate selector, or a Stripe product ID lookup.

This guide explains how to define a custom field in the backend schema and render it using a custom React component in the Admin UI.

---

## 1. Using the `ui` Field Type

Zenith provides a generic `ui` field type specifically designed for custom visual implementations that don't fit the standard mold. 

In your `cms.config.ts`:

```typescript
import { CollectionConfig } from '@zenith-open/zenithcms-types'

export const Products: CollectionConfig = {
  name: 'Products',
  slug: 'products',
  fields: [
    {
      name: 'title',
      type: 'text'
    },
    {
      // The 'ui' type tells the backend to store this as a JSON/String
      // but tells the frontend to look for a custom registered component.
      name: 'stripeProductId',
      type: 'ui',
      admin: {
        description: 'Select a product directly from Stripe'
      }
    }
  ]
}
```

---

## 2. Creating the React Component

In your Admin UI codebase (usually `packages/admin/src/components/fields/`), create your custom React component. 

Your component will receive props from Zenith's form engine, including `value`, `onChange`, and `path`.

```tsx
// packages/admin/src/components/fields/StripeProductField.tsx
import React, { useState, useEffect } from 'react'

export const StripeProductField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}> = ({ value, onChange, label, description }) => {
  const [products, setProducts] = useState([])

  useEffect(() => {
    // Example: Fetch from a custom API endpoint you registered via a Plugin
    fetch('/api/v1/stripe/products', {
      headers: { Authorization: `Bearer ${localStorage.getItem('zenith_token')}` }
    })
      .then(res => res.json())
      .then(data => setProducts(data.docs))
  }, [])

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label || 'Stripe Product'}
      </label>
      <select 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white"
      >
        <option value="">Select a product...</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  )
}
```

---

## 3. Registering the Component

To tell Zenith to use your `StripeProductField` for the `stripeProductId` field, you must map it in the Admin UI's Field Renderer.

Locate `packages/admin/src/components/FieldRenderer.tsx` and add your mapping to the `ui` switch case or registry.

*(Note: In future versions, Zenith will support dynamic registration via a plugin context object passed to `main.tsx`, eliminating the need to edit `FieldRenderer.tsx` directly).*