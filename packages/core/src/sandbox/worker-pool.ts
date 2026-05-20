import { Worker } from 'worker_threads'
import * as path from 'path'
import * as fs from 'fs'

export interface SandboxTask {
  hookType: 'beforeChange' | 'afterRead' | 'validate';
  collectionSlug: string;
  data: any;
  user: any;
}

export class WorkerSandboxPool {
  private workers: { worker: Worker; active: boolean }[] = []
  private taskQueue: { task: SandboxTask; resolve: (value: any) => void; reject: (reason?: any) => void }[] = []

  constructor(private poolSize: number = 4) {
    this.initializePool()
  }

  private initializePool() {
    const workerScript = path.resolve(__dirname, 'worker-runner.js')
    
    const fallbackScript = `
      const { parentPort } = require('worker_threads');
      const path = require('path');
      const fs = require('fs');
      const vm = require('vm');
      if (parentPort) {
        parentPort.on('message', async (message) => {
          if (message.type === 'run') {
            const { task } = message;
            try {
              if (typeof task.hookType !== 'string' || typeof task.collectionSlug !== 'string') {
                throw new Error('Invalid hook parameters: hookType and collectionSlug must be strings');
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(task.collectionSlug) || !/^[a-zA-Z0-9_-]+$/.test(task.hookType)) {
                throw new Error('Invalid hook parameters: potential path traversal detected');
              }
              // Execute dynamic fallback/local hook scripts securely via absolute path
              const hookFile = path.resolve(process.cwd(), 'hooks', task.collectionSlug + '-' + task.hookType);
              let resolvedPath = '';
              if (fs.existsSync(hookFile + '.ts')) {
                resolvedPath = hookFile + '.ts';
              } else if (fs.existsSync(hookFile + '.js')) {
                resolvedPath = hookFile + '.js';
              } else if (fs.existsSync(hookFile)) {
                resolvedPath = hookFile;
              }

              let processedData = task.data;
              if (resolvedPath) {
                const hookRaw = require(resolvedPath).default || require(resolvedPath);
                if (typeof hookRaw !== 'function') {
                  throw new Error('Hook must export a function');
                }
                
                // Wrap and execute inside a secure VM context to sever lexical scope and access to process/require
                const fnStr = hookRaw.toString();
                const context = vm.createContext({
                  console,
                  Math,
                  Date,
                  JSON,
                  setTimeout,
                  clearTimeout,
                });
                const sandboxFn = vm.runInContext('(' + fnStr + ')', context);
                processedData = await sandboxFn(task.data);
              }
              parentPort.postMessage({ error: null, data: processedData });
            } catch (err) {
              parentPort.postMessage({ error: err.message, data: null });
            }
          }
        });
      }
    `
    const dir = path.dirname(workerScript)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(workerScript, fallbackScript, 'utf-8')

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(workerScript)
      this.workers.push({ worker, active: false })
      
      worker.on('message', (msg) => {
        if (msg.type === 'memory_alert') {
          this.recycleWorker(i)
        }
      })
    }
  }

  public runTask(task: SandboxTask, timeoutMs: number = 500): Promise<any> {
    return new Promise((resolve, reject) => {
      const idleWorkerIndex = this.workers.findIndex(w => !w.active)
      
      if (idleWorkerIndex === -1) {
        this.taskQueue.push({ task, resolve, reject })
        return
      }

      const workerWrapper = this.workers[idleWorkerIndex]
      workerWrapper.active = true

      const timer = setTimeout(() => {
        cleanup()
        workerWrapper.worker.terminate()
        this.recycleWorker(idleWorkerIndex)
        reject(new Error(`[Zenith Sandbox] Execution timed out after ${timeoutMs}ms (Thread Locked)`))
        processNext()
      }, timeoutMs)

      const onMessage = (result: any) => {
        if (result.type === 'memory_alert') return // Handled by global persistent listener
        cleanup()
        workerWrapper.active = false
        
        if (result.error) {
          reject(new Error(result.error))
        } else {
          resolve(result.data)
        }
        processNext()
      }

      const onError = (err: Error) => {
        cleanup()
        workerWrapper.active = false
        this.recycleWorker(idleWorkerIndex)
        reject(new Error(`[Zenith Sandbox] Worker Thread crashed: ${err.message}`))
        processNext()
      }

      const onExit = (code: number) => {
        cleanup()
        workerWrapper.active = false
        if (code !== 0) {
          this.recycleWorker(idleWorkerIndex)
          reject(new Error(`[Zenith Sandbox] Worker Thread exited abnormally with code ${code}`))
        }
        processNext()
      }

      const cleanup = () => {
        clearTimeout(timer)
        workerWrapper.worker.off('message', onMessage)
        workerWrapper.worker.off('error', onError)
        workerWrapper.worker.off('exit', onExit)
      }

      const processNext = () => {
        if (this.taskQueue.length > 0) {
          const next = this.taskQueue.shift()!
          this.runTask(next.task, timeoutMs).then(next.resolve).catch(next.reject)
        }
      }

      workerWrapper.worker.on('message', onMessage)
      workerWrapper.worker.on('error', onError)
      workerWrapper.worker.on('exit', onExit)

      workerWrapper.worker.postMessage({ type: 'run', task })
    })
  }

  private recycleWorker(index: number) {
    try {
      this.workers[index].worker.terminate()
    } catch {
      // Ignored if thread is already dead
    }
    const workerScript = path.resolve(__dirname, 'worker-runner.js')
    const worker = new Worker(workerScript)
    
    worker.on('message', (msg) => {
      if (msg.type === 'memory_alert') {
        this.recycleWorker(index)
      }
    })

    this.workers[index].worker = worker
    this.workers[index].active = false
  }

  public shutdown() {
    this.workers.forEach(w => {
      try {
        w.worker.terminate()
      } catch {
        // Ignored
      }
    })
  }
}
