import { Express, Router } from 'express'
import { koaToExpress } from './KoaToExpressBridge'
import { setupStrapiGlobal } from './StrapiGlobalBridge'
import { SchemaConverter } from './SchemaConverter'
import { logger } from '../../services/logger'

export * from './KoaToExpressBridge'
export * from './StrapiGlobalBridge'
export * from './SchemaConverter'

export interface StrapiPluginRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  handler: string // e.g. "controllerName.actionName"
  config?: {
    auth?: boolean | { scope: string[] }
    policies?: string[]
    middlewares?: string[]
  }
}

export interface StrapiPluginConfig {
  name: string
  controllers?: Record<string, Record<string, (ctx: any, next: any) => Promise<any>>>
  services?: Record<string, any>
  routes?: StrapiPluginRoute[] | Record<string, { routes: StrapiPluginRoute[] }>
  bootstrap?: (params: { strapi: any }) => Promise<void> | void
  register?: (params: { strapi: any }) => Promise<void> | void
}

/**
 * Loads and registers a Strapi plugin dynamically inside a Zenith CMS instance.
 */
export async function loadStrapiPlugin(app: Express, plugin: StrapiPluginConfig, zenithEngine: any) {
  logger.info({ plugin: plugin.name }, '[Strapi Bridge] Registering plugin...')

  // 1. Setup the global `strapi` namespaces if they do not exist
  if (!(global as any).strapi) {
    setupStrapiGlobal(zenithEngine)
  }

  const strapi = (global as any).strapi
  const pluginRegistry = strapi.plugin(plugin.name)

  // 2. Register backend services
  if (plugin.services) {
    pluginRegistry.services = plugin.services
  }

  // 3. Register backend controllers and wrap them in KoaToExpress bridge on-the-fly
  if (plugin.controllers) {
    pluginRegistry.controllers = {}
    for (const [controllerName, actions] of Object.entries(plugin.controllers)) {
      pluginRegistry.controllers[controllerName] = {}
      for (const [actionName, actionFn] of Object.entries(actions)) {
        // Bridge the action from Koa to Express!
        pluginRegistry.controllers[controllerName][actionName] = koaToExpress(actionFn as any)
      }
    }
  }

  // 4. Run standard hook functions
  if (plugin.register) {
    try {
      await plugin.register({ strapi })
      logger.info({ plugin: plugin.name }, '[Strapi Bridge] Plugin register hook executed.')
    } catch (err: any) {
      logger.error({ plugin: plugin.name, err: err.message }, '[Strapi Bridge] Plugin register hook failed')
    }
  }

  if (plugin.bootstrap) {
    try {
      await plugin.bootstrap({ strapi })
      logger.info({ plugin: plugin.name }, '[Strapi Bridge] Plugin bootstrap hook executed.')
    } catch (err: any) {
      logger.error({ plugin: plugin.name, err: err.message }, '[Strapi Bridge] Plugin bootstrap hook failed')
    }
  }

  // 5. Build and mount routers
  if (plugin.routes) {
    let rawRoutes: StrapiPluginRoute[] = []
    
    if (Array.isArray(plugin.routes)) {
      rawRoutes = plugin.routes
    } else if (typeof plugin.routes === 'object') {
      // Map structures like plugin.routes['admin'].routes
      rawRoutes = Object.values(plugin.routes).flatMap((r: any) => r.routes || [])
    }

    if (rawRoutes.length > 0) {
      const router = Router()

      rawRoutes.forEach((route) => {
        const [ctrlName, actionName] = route.handler.split('.')
        const expressHandler = pluginRegistry.controllers?.[ctrlName]?.[actionName]

        if (expressHandler) {
          const method = route.method.toLowerCase()
          const routePath = route.path.startsWith('/') ? route.path : `/${route.path}`
          const routerAny = router as any

          if (typeof routerAny[method] === 'function') {
            routerAny[method](routePath, expressHandler)
            logger.debug(
              { plugin: plugin.name, method: route.method, path: `/api/v1/plugins/${plugin.name}${routePath}` },
              '[Strapi Bridge] Plugin route registered'
            )
          }
        } else {
          logger.warn(
            { plugin: plugin.name, handler: route.handler },
            '[Strapi Bridge] Route handler not found in controllers'
          )
        }
      })

      // Mount the bridge plugin router onto Express
      app.use(`/api/v1/plugins/${plugin.name}`, router)
      logger.info(
        { plugin: plugin.name },
        `[Strapi Bridge] Mounted plugin routes on: /api/v1/plugins/${plugin.name}`
      )
    }
  }
}
