import { logger } from '../../services/logger'
import { eventHub } from '../../services/event-hub'

/**
 * Strapi Global Polyfill & Adapter Proxies
 * ───────────────────────────────────────
 * Injects a global proxy-based `strapi` variable into the global namespace.
 * Intercepts Strapi-style schema queries (e.g. strapi.entityService) and redirects
 * them on-the-fly to Zenith's super-optimized Local API bypass.
 */

// Helper to extract clean slug from Strapi UID format (e.g., "api::article.article" -> "article")
export function parseStrapiUid(uid: string): string {
  if (uid.includes('::')) {
    const parts = uid.split('::')[1]
    if (parts.includes('.')) {
      return parts.split('.')[1]
    }
    return parts
  }
  return uid
}

export function setupStrapiGlobal(zenithEngine: any) {
  const strapiGlobal: any = {
    // ── Entity Service Shims ──────────────────────────────────────────────────
    entityService: {
      findMany: async (uid: string, params: any = {}) => {
        const slug = parseStrapiUid(uid)
        logger.debug({ uid, slug, params }, '[Strapi Bridge] entityService.findMany called')
        
        // Map Strapi options to Zenith options
        const query = params.filters || {}
        const options: any = {
          limit: params.limit || params.pageSize,
          skip: params.start || (params.page ? (params.page - 1) * (params.pageSize || 25) : undefined),
          sort: params.sort,
          populate: params.populate,
        }
        
        return await zenithEngine.local.find(slug, query, options)
      },

      findOne: async (uid: string, id: string | number, params: any = {}) => {
        const slug = parseStrapiUid(uid)
        logger.debug({ uid, slug, id, params }, '[Strapi Bridge] entityService.findOne called')
        return await zenithEngine.local.findById(slug, String(id), { populate: params.populate })
      },

      create: async (uid: string, params: any = {}) => {
        const slug = parseStrapiUid(uid)
        logger.debug({ uid, slug, params }, '[Strapi Bridge] entityService.create called')
        return await zenithEngine.local.create(slug, params.data || params)
      },

      update: async (uid: string, id: string | number, params: any = {}) => {
        const slug = parseStrapiUid(uid)
        logger.debug({ uid, slug, id, params }, '[Strapi Bridge] entityService.update called')
        return await zenithEngine.local.update(slug, String(id), params.data || params)
      },

      delete: async (uid: string, id: string | number) => {
        const slug = parseStrapiUid(uid)
        logger.debug({ uid, slug, id }, '[Strapi Bridge] entityService.delete called')
        return await zenithEngine.local.delete(slug, String(id))
      },
    },

    // ── DB Query Interface Shims ──────────────────────────────────────────────
    db: {
      query: (uid: string) => {
        const slug = parseStrapiUid(uid)
        return {
          findMany: async (params: any = {}) => {
            return await strapiGlobal.entityService.findMany(uid, params)
          },
          findOne: async (params: any = {}) => {
            const results = await strapiGlobal.entityService.findMany(uid, { ...params, limit: 1 })
            return results.length > 0 ? results[0] : null
          },
          create: async (params: any = {}) => {
            return await strapiGlobal.entityService.create(uid, params)
          },
          update: async (params: any = {}) => {
            return await strapiGlobal.entityService.update(uid, params.where?.id, params)
          },
          delete: async (params: any = {}) => {
            return await strapiGlobal.entityService.delete(uid, params.where?.id)
          },
          count: async (params: any = {}) => {
            const query = params.where || {}
            return await zenithEngine.adapter.count(slug, query)
          },
        }
      },
    },

    // ── Logger Shims ──────────────────────────────────────────────────────────
    log: {
      info: (msg: string, ...args: any[]) => logger.info(msg, ...args),
      warn: (msg: string, ...args: any[]) => logger.warn(msg, ...args),
      error: (msg: string, ...args: any[]) => logger.error(msg, ...args),
      debug: (msg: string, ...args: any[]) => logger.debug(msg, ...args),
    },

    // ── Config Shims ──────────────────────────────────────────────────────────
    config: {
      get: (key: string, defaultValue?: any) => {
        // Map common Strapi configs to Zenith equivalent
        if (key.startsWith('server.')) {
          const subKey = key.split('.')[1]
          if (subKey === 'host') return process.env.HOST || '0.0.0.0'
          if (subKey === 'port') return process.env.PORT || 3000
        }
        return defaultValue
      },
    },

    // ── Plugin Registry and Event Hub ─────────────────────────────────────────
    plugins: {},
    plugin: (name: string) => {
      if (!strapiGlobal.plugins[name]) {
        strapiGlobal.plugins[name] = {
          controllers: {},
          services: {},
          routes: [],
          config: {},
        }
      }
      return strapiGlobal.plugins[name]
    },

    // Bind event hub triggers
    emit: (event: string, ...args: any[]) => {
      eventHub.emit(event, ...args)
    },
  }

  // Set the global logger to standard node console fallback if bunyan logger is empty
  strapiGlobal.logger = strapiGlobal.log

  // Polyfill global.strapi dynamically
  ;(global as any).strapi = strapiGlobal
  logger.info('[Strapi Bridge] Global `strapi` environment polyfill successfully registered.')
}
