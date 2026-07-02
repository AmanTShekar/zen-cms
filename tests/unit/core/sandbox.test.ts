import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WorkerSandboxPool } from '../../../packages/core/src/sandbox/worker-pool'
import path from 'path'
import fs from 'fs/promises'

describe('WorkerSandboxPool VM isolation', () => {
  let pool: WorkerSandboxPool
  const hooksDir = path.resolve(process.cwd(), 'hooks')

  beforeAll(async () => {
    await fs.mkdir(hooksDir, { recursive: true })
    pool = new WorkerSandboxPool(2)
  })

  afterAll(async () => {
    pool.shutdown()
    await fs.rm(path.resolve(process.cwd(), 'packages/core/src/sandbox/worker-runner.js'), { force: true })
  })

  const writeHook = async (name: string, jsContent: string) => {
    const filePath = path.join(hooksDir, name + '.js')
    await fs.writeFile(filePath, jsContent, 'utf-8')
    return filePath
  }

  const deleteHook = async (name: string) => {
    const filePath = path.join(hooksDir, name + '.js')
    await fs.unlink(filePath).catch(() => {})
  }

  it('should run a valid hook and mutate data', async () => {
    await writeHook('posts-beforeChange', `
      module.exports = function(data) {
        data.title = data.title.toUpperCase();
        return data;
      };
    `)

    const result = await pool.runTask({
      hookType: 'beforeChange',
      collectionSlug: 'posts',
      data: { title: 'hello' },
      user: null
    })

    expect(result.title).toBe('HELLO')
    await deleteHook('posts-beforeChange')
  })

  it('should block hook trying to access process.env', async () => {
    await writeHook('unsafe-beforeChange', `
      module.exports = function(data) {
        // Attempt to access process.env should throw ReferenceError in VM context
        data.env = typeof process !== 'undefined' ? process.env : null;
        return data;
      };
    `)

    const result = await pool.runTask({
      hookType: 'beforeChange',
      collectionSlug: 'unsafe',
      data: { env: 'check' },
      user: null
    })

    // Expect env to be null because process is undefined in VM
    expect(result.env).toBeNull()
    await deleteHook('unsafe-beforeChange')
  })

  it('should prevent hook from accessing require', async () => {
    await writeHook('unsafe2-beforeChange', `
      module.exports = function(data) {
        try {
          const fs = require('fs');
          data.requireAccess = true;
        } catch (e) {
          data.requireAccess = false;
        }
        return data;
      };
    `)

    const result = await pool.runTask({
      hookType: 'beforeChange',
      collectionSlug: 'unsafe2',
      data: {},
      user: null
    })

    expect(result.requireAccess).toBe(false)
    await deleteHook('unsafe2-beforeChange')
  })
})
