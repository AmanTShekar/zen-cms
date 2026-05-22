import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hookRegistry, adminComponentRegistry } from '../src/plugins/hooks'

describe('Plugin Hooks System', () => {
  beforeEach(() => {
    // Reset registrations between tests by flushing
    hookRegistry.clear()
    adminComponentRegistry.clear()
  })

  describe('hookRegistry', () => {
    it('should register and apply a hook handler', async () => {
      const unsubscribe = hookRegistry.on('content:beforeCreate', 'test-plugin', (payload: any) => {
        return { ...payload, modified: true }
      })

      const result = await hookRegistry.apply('content:beforeCreate', { title: 'Hello' })
      expect(result).toEqual({ title: 'Hello', modified: true })

      unsubscribe()
    })

    it('should run handlers in priority order', async () => {
      const order: number[] = []

      hookRegistry.on('content:beforeCreate', 'plugin-a', () => { order.push(1) }, 10)
      hookRegistry.on('content:beforeCreate', 'plugin-b', () => { order.push(2) }, 5)
      hookRegistry.on('content:beforeCreate', 'plugin-c', () => { order.push(3) }, 1)

      await hookRegistry.apply('content:beforeCreate', {})
      expect(order).toEqual([3, 2, 1]) // lowest priority number runs first
    })

    it('should pass data through the pipeline', async () => {
      hookRegistry.on('content:beforeCreate', 'plugin-a', (data: any) => {
        return { ...data, count: (data.count || 0) + 1 }
      })
      hookRegistry.on('content:beforeCreate', 'plugin-b', (data: any) => {
        return { ...data, count: (data.count || 0) + 10 }
      })

      const result = await hookRegistry.apply('content:beforeCreate', { count: 0 })
      expect(result.count).toBe(11)
    })

    it('should not crash when a handler throws', async () => {
      hookRegistry.on('content:beforeCreate', 'bad-plugin', () => {
        throw new Error('boom')
      })
      hookRegistry.on('content:beforeCreate', 'good-plugin', (data: any) => {
        return { ...data, survived: true }
      })

      const result = await hookRegistry.apply('content:beforeCreate', {})
      expect(result).toEqual({ survived: true })
    })

    it('should support emit (parallel side-effects)', async () => {
      const results: string[] = []

      hookRegistry.on('content:afterCreate', 'plugin-a', async (data: any) => {
        results.push('a')
      })
      hookRegistry.on('content:afterCreate', 'plugin-b', async (data: any) => {
        results.push('b')
      })

      await hookRegistry.emit('content:afterCreate', { id: '1' })
      expect(results.sort()).toEqual(['a', 'b'])
    })

    it('should return registered hook names via inspect()', () => {
      hookRegistry.on('content:beforeCreate', 'test-plugin', (d: any) => d)
      const hooks = hookRegistry.inspect()
      expect(hooks['content:beforeCreate']).toBeDefined()
      expect(hooks['content:beforeCreate'].length).toBeGreaterThan(0)
    })
  })

  describe('adminComponentRegistry', () => {
    it('should register and retrieve admin components by slot', () => {
      adminComponentRegistry.register({
        pluginName: 'analytics-plugin',
        slot: 'dashboard:before',
        component: 'AnalyticsWidget',
        label: 'Analytics Dashboard',
        icon: 'chart',
      })

      adminComponentRegistry.register({
        pluginName: 'seo-plugin',
        slot: 'collection:edit',
        component: 'SeoPanel',
        label: 'SEO Settings',
      })

      const dashboardComponents = adminComponentRegistry.getForSlot('dashboard:before')
      expect(dashboardComponents).toHaveLength(1)
      expect(dashboardComponents[0].pluginName).toBe('analytics-plugin')
      expect(dashboardComponents[0].component).toBe('AnalyticsWidget')

      const editComponents = adminComponentRegistry.getForSlot('collection:edit')
      expect(editComponents).toHaveLength(1)
      expect(editComponents[0].label).toBe('SEO Settings')
    })

    it('should return all registered components', () => {
      adminComponentRegistry.register({
        pluginName: 'test-plugin',
        slot: 'navbar:end',
        component: 'TestButton',
        label: 'Test',
      })

      const all = adminComponentRegistry.getAll()
      expect(all.length).toBeGreaterThanOrEqual(1)
    })
  })
})
