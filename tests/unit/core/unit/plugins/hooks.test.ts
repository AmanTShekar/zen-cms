import { describe, it, expect } from 'vitest'
import { hookRegistry, adminComponentRegistry } from '../../../../../packages/core/src/plugins/hooks'

describe('hookRegistry', () => {
  it('executes handlers in priority order', async () => {
    const calls: string[] = []

    hookRegistry.on('test:a', 'plugin-a', () => { calls.push('a') })
    hookRegistry.on('test:a', 'plugin-b', () => { calls.push('b') }, 1) // runs first

    await hookRegistry.emit('test:a', null)

    expect(calls).toEqual(['b', 'a'])
  })

  it('supports pipeline pattern via apply()', async () => {
    hookRegistry.on<number>('test:b', 'plugin-1', (n) => n * 2)
    hookRegistry.on<number>('test:b', 'plugin-2', (n) => n + 3)

    const result = await hookRegistry.apply('test:b', 5)
    expect(result).toBe(13) // (5*2)+3
  })

  it('returns unsubscribe function', async () => {
    const calls: string[] = []
    const off = hookRegistry.on('test:c', 'plugin-x', () => { calls.push('x') })

    await hookRegistry.emit('test:c', null)
    expect(calls).toContain('x')

    off()
    await hookRegistry.emit('test:c', null)
    expect(calls.length).toBe(1) // only called once
  })

  it('inspect() returns registered hooks', () => {
    hookRegistry.on('test:d', 'plugin-y', () => {})
    const info = hookRegistry.inspect()
    expect(info['test:d']).toContain('plugin-y (p10)')
  })
})

describe('adminComponentRegistry', () => {
  it('registers components by slot', () => {
    adminComponentRegistry.register({
      pluginName: 'test-plugin',
      slot: 'navbar:end',
      component: 'AnalyticsWidget',
      label: 'Analytics',
    })

    const navComponents = adminComponentRegistry.getForSlot('navbar:end')
    expect(navComponents.length).toBeGreaterThan(0)
    expect(navComponents[0].component).toBe('AnalyticsWidget')
  })

  it('getForSlot returns empty array for any slot', () => {
    const items = adminComponentRegistry.getForSlot('dashboard:after')
    expect(Array.isArray(items)).toBe(true)
  })

  it('getAll returns all registered components', () => {
    adminComponentRegistry.register({
      pluginName: 'test-plugin-2',
      slot: 'collection:list',
      component: 'QuickFilters',
      label: 'Quick Filters',
    })
    const all = adminComponentRegistry.getAll()
    expect(all.length).toBeGreaterThanOrEqual(2)
  })
})
