# Zenith Plugins & Widgets

Zenith has a simple but powerful plugin system. You can extend core features, inject collections, listen to database lifecycles, and even build custom widgets for the admin dashboard.

---

## 🔌 1. Server Plugins

A server plugin is just a function that receives the global configuration and returns a new configuration. You can use this to inject schemas, add express routes, or register hooks.

### Complete Boilerplate Template:

```typescript
import { ZenithPlugin } from '@zenithcms/core'

export const MySmsNotificationPlugin = (options: {
  twilioSid: string
  token: string
}): ZenithPlugin => {
  return {
    name: 'sms-notifications',
    init: (app, config) => {
      // 1. Inject custom REST route handlers
      app.use('/api/v1/notifications', (req, res) => {
        res.json({ ok: true })
      })
    },
    config: (baseConfig) => {
      // 2. Dynamically inject global schemas/collections
      return {
        ...baseConfig,
        collections: [
          ...(baseConfig.collections || []),
          {
            slug: 'notification-logs',
            name: 'Notification Logs',
            fields: [
              { name: 'recipient', type: 'text', required: true },
              { name: 'status', type: 'text', defaultValue: 'sent' },
            ],
          },
        ],
      }
    },
  }
}
```

---

## 🎨 2. Dashboard Widgets

Zenith's admin dashboard is fully customizable. You can register your own React components as drag-and-drop widgets.

### Step 1: Register in the Admin Widget Registry

Add the design metadata to the global registry mapping:
🔗 **Registry Location**: [packages/admin/src/widgets/registry.ts](file:///c:/Users/Asus/Desktop/cms/packages/admin/src/widgets/registry.ts)

```typescript
import { LayoutGrid } from 'lucide-react'
import React from 'react'
import type { WidgetDefinition } from './registry'

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // ...
  telemetry_chart: {
    type: 'telemetry_chart',
    label: 'Database Latency Pulse',
    description: 'Displays a live line graph of SQL execution latency.',
    icon: LayoutGrid,
    component: React.lazy(() => import('./TelemetryChartWidget')), // Dynamic chunking
    defaultSize: { w: 6, h: 4 }, // Standard 12-column grid size
  },
}
```

### Step 2: Implement the Interactive Component

Your custom widget receives full config mappings and state binders. Use semantic Tailwind mappings to maintain absolute styling harmony with Dark Mode glassmorphism:

```tsx
import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import type { WidgetProps } from './registry'
import { cn } from '../lib/utils'

export default function TelemetryChartWidget({ theme, title, config }: WidgetProps) {
  const [latency, setLatency] = useState<string>('0ms')

  useEffect(() => {
    const checkHealth = () => {
      api
        .get('/system/health')
        .then((res) => setLatency(res.data?.data?.database?.latency || '0ms'))
        .catch(() => setLatency('Error'))
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">
          {title || 'SQL Latency Pulse'}
        </p>
        <span className="text-[8px] uppercase tracking-wider text-emerald-500 font-bold">LIVE</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-1">
        <span className="text-3xl font-black tracking-tight text-white font-mono">{latency}</span>
        <p className="text-[8px] text-gray-500 uppercase font-semibold">
          Database Roundtrip latency
        </p>
      </div>
    </div>
  )
}
```

---

## 🚦 3. Custom Field Properties

When defining fields, you can pass custom attributes to control how the admin UI renders them:

```typescript
export interface FieldSchema {
  name: string
  type: 'text' | 'number' | 'relationship' | 'rich-text'
  label?: string
  required?: boolean

  // Advanced UX Attributes:
  placeholder?: string
  charLimit?: number // Enforces frontend character counters
  lowercase?: boolean // Auto transform transformations
  uppercase?: boolean
}
```

When building form schemas, these properties are compiled by the dynamic FormBuilder inside `@zenithcms/admin` to enforce conditional validation and real-time state alerts automatically.
