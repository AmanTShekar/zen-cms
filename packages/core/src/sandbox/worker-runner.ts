import { parentPort } from 'worker_threads'
import * as path from 'path'
import * as fs from 'fs'

if (parentPort) {
  parentPort.on('message', async (message) => {
    if (message.type === 'run') {
      const { task } = message
      try {
        const resultData = await executeIsolatedHook(task)
        parentPort!.postMessage({ error: null, data: resultData })
      } catch (err: any) {
        parentPort!.postMessage({ error: err.message, data: null })
      }
      
      // Auto-recycling check if memory exceeds limits
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024
      if (memUsage > 100) {
        parentPort!.postMessage({ type: 'memory_alert' })
      }
    }
  })
}

async function executeIsolatedHook(task: any): Promise<any> {
  const { hookType, collectionSlug, data } = task
  if (typeof hookType !== 'string' || typeof collectionSlug !== 'string') {
    throw new Error('Invalid hook parameters: hookType and collectionSlug must be strings')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(collectionSlug) || !/^[a-zA-Z0-9_-]+$/.test(hookType)) {
    throw new Error('Invalid hook parameters: potential path traversal detected')
  }
  const hookFile = path.resolve(process.cwd(), 'hooks', `${collectionSlug}-${hookType}`)
  
  // Resolve true file extension types on disk
  let resolvedPath = ''
  if (fs.existsSync(hookFile + '.ts')) {
    resolvedPath = hookFile + '.ts'
  } else if (fs.existsSync(hookFile + '.js')) {
    resolvedPath = hookFile + '.js'
  } else if (fs.existsSync(hookFile)) {
    resolvedPath = hookFile
  }

  if (!resolvedPath) {
    // Fallback: return raw data cleanly if hook is not implemented
    return data
  }

  // Load and execute hook file, propagating compile and syntax errors up to the pool for developer debugging
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const hook = require(resolvedPath).default || require(resolvedPath)
  return await hook(data)
}
