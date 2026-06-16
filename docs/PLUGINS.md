# Zenith CMS — Plugin Architecture

Zenith CMS features a powerful, lifecycle-based Plugin API. Plugins allow developers to modify schemas, register custom endpoints, inject React components into the Admin UI, and hook into database operations—all without modifying the core codebase.

---

## 1. The Anatomy of a Plugin

A plugin is a TypeScript object that implements the `ZenithPlugin` interface defined in `@zenith-open/zenithcms-types`.

```typescript
import type { ZenithPlugin, CMSConfig, PluginContext } from '@zenith-open/zenithcms-types'

export const myCustomPlugin: ZenithPlugin = {
  id: 'acme-custom-plugin',
  name: 'Acme Enhancements',
  version: '1.0.0',
  
  // 1. Schema Mutation Phase
  apply: (config: CMSConfig) => {
    // Modify and return the CMS config (add collections, globals, fields)
    return {
      ...config,
      collections: [
        ...config.collections,
        {
          name: 'Acme Logs',
          slug: 'acme-logs',
          fields: [{ name: 'message', type: 'text' }]
        }
      ]
    }
  },

  // 2. Lifecycle Phase: Initialization
  onInit: async (ctx: PluginContext) => {
    ctx.logger.info('Acme Plugin initializing...')
    
    // Register custom Express routes
    const app = ctx.app as any; 
    app.get('/api/acme/status', (req, res) => res.json({ ok: true }))
  },

  // 3. Lifecycle Phase: Ready
  onReady: async (ctx: PluginContext) => {
    ctx.logger.info('Engine is listening. Acme plugin active.')
  }
}
```

---

## 2. Registering Plugins

Plugins are registered in your root `cms.config.ts` file.

```typescript
import { CMSConfig } from '@zenith-open/zenithcms-types'
import { myCustomPlugin } from './plugins/acme-custom-plugin'

const config: CMSConfig = {
  collections: [],
  plugins: [
    myCustomPlugin
  ]
}

export default config
```

---

## 3. The `PluginContext`

During the `onInit`, `onReady`, and `onDestroy` lifecycle methods, your plugin is provided with a `PluginContext` object.

| Property | Type | Description |
|---|---|---|
| `app` | `Express` | The underlying Express.js application. Use this to mount custom REST endpoints or middleware. |
| `adapter` | `DatabaseAdapter` | The active database adapter (Mongoose or Drizzle). Allows direct database queries circumventing the standard API. |
| `config` | `CMSConfig` | The finalized CMS configuration after all plugins have run their `apply` methods. |
| `logger` | `Logger` | Zenith's internal Pino logger. Use this instead of `console.log` for consistent formatting. |

---

## 4. Admin UI Injection (Advanced)

While the Core API handles data, Plugins often need to inject UI into the React Admin application.

Because Zenith is a headless system where the Core and Admin run as separate Vite/Express processes, UI injection is handled via **Component Overrides** in the Admin package's entry point, rather than the backend Plugin API.

If you are developing a plugin that requires UI changes (e.g., adding a custom field type):
1. Build your backend logic using the `ZenithPlugin` interface.
2. Provide instructions for developers to register your React components in their Admin UI's `main.tsx` or field registry.

*(Note: Dynamic remote module federation for Admin UI plugins is on the roadmap for a future release).*
