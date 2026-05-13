# Zenith Plugin Development: Extending the Nucleus

Zenith is designed with a "Plugin-First" philosophy. The Plugin Nucleus allows you to inject custom logic, UI components, and API endpoints into the platform without modifying the core kernel.

---

## Plugin Architecture

A Zenith plugin is a self-contained module that exports a configuration function. This function receives the current Zenith config and returns a modified version.

```typescript
import { Plugin } from '@zenith/types';

export const myPlugin: Plugin = (config) => {
  return {
    ...config,
    collections: [
      ...(config.collections || []),
      {
        slug: 'custom-collection',
        fields: [{ name: 'title', type: 'text' }],
      },
    ],
  };
};
```

---

## Capabilities

Plugins can extend almost every aspect of the platform:

1.  **Collection Injection**: Add new collections or modify existing ones.
2.  **Global Injection**: Add new global settings.
3.  **Hook Registration**: Attach global `beforeChange` or `afterRead` hooks.
4.  **UI Component Overrides**: Replace default Admin dashboard components (e.g., custom Sidebar or Logo).
5.  **Express Middleware**: Inject custom middleware into the API lifecycle.

---

## Official Plugins

We maintain several official plugins to extend the Nucleus:

*   **@zenith/plugin-seo**: Comprehensive SEO auditing and meta-tag management.
*   **@zenith/plugin-cloud-storage**: Seamless integration with AWS S3, Google Cloud Storage, and Azure.
*   **@zenith/plugin-search-algolia**: High-speed search orchestration via Algolia.
*   **@zenith/plugin-sitemap**: Automatic sitemap generation for headless storefronts.

---

## Best Practices

*   **Isolation**: Ensure your plugin does not depend on internal core modules.
*   **Type Safety**: Always use the Zenith SDK types for your configurations.
*   **Performance**: Use the Lazy-Loading pattern for any heavy dependencies within your plugin.
