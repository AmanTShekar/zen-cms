import * as path from 'path'
import * as fs from 'fs'
import { pathToFileURL } from 'url'
import { logger } from '../../services/logger'

/**
 * Ahead-of-Time (AOT) Query Execution Bridge
 * ──────────────────────────────────────────
 * Dynamically resolves pre-compiled query adapters from '.zenith/adapter'.
 * Bypasses dynamic schema/query construction in Mongo/Postgres drivers
 * for optimized direct executions.
 */
export class AotBridge {
  private static compiledModule: Record<string, ((...args: unknown[]) => unknown)> | null = null
  private static loaded = false

  /**
   * Attempts to load the pre-compiled AOT query adapter module at runtime.
   */
  public static async load(): Promise<void> {
    if (this.loaded) return
    this.loaded = true

    const tsPath = path.resolve(process.cwd(), '.zenith/adapter.ts')
    const jsPath = path.resolve(process.cwd(), '.zenith/adapter.js')

    const fileToLoad = fs.existsSync(tsPath) ? tsPath : (fs.existsSync(jsPath) ? jsPath : null)

    if (!fileToLoad) {
      logger.info('AotBridge: No pre-compiled AOT query adapter found. Running in dynamic mode.')
      return
    }

    try {
      // Convert absolute Windows paths to file:// URLs for ESM import() compatibility
      const fileUrl = pathToFileURL(fileToLoad).href
      this.compiledModule = await import(fileUrl)
      ;(globalThis as Record<string, unknown>).zenithAotBridge = AotBridge
      logger.info({ path: fileToLoad }, 'AotBridge: Loaded compiled AOT query adapter successfully.')
    } catch (err: unknown) {
      logger.warn(
        { err: err.message },
        'AotBridge: Failed to load pre-compiled AOT query adapter. Falling back to dynamic execution.'
      )
    }
  }

  /**
   * Checks if an AOT-compiled query execution handler exists for a collection and operation.
   */
  public static hasQuery(collection: string, operation: 'find' | 'create'): boolean {
    if (!this.compiledModule) return false
    const capitalized = collection.charAt(0).toUpperCase() + collection.slice(1)
    const fnName = `${operation}${capitalized}Compiled`
    return typeof this.compiledModule[fnName] === 'function'
  }

  /**
   * Dynamically executes the target AOT query handler.
   */
  public static async executeQuery(
    collection: string,
    operation: 'find' | 'create',
    db: unknown,
    tableOrModel: unknown,
    arg1: unknown, // filters or data
    arg2: Record<string, unknown> = {} // options
  ): Promise<Record<string, unknown>> {
    const capitalized = collection.charAt(0).toUpperCase() + collection.slice(1)
    const fnName = `${operation}${capitalized}Compiled`
    const fn = this.compiledModule[fnName]
    if (!fn) {
      throw new Error(`[AotBridge] Compiled query handler ${fnName} not found`)
    }
    return await fn(db, tableOrModel, arg1, arg2)
  }
}
