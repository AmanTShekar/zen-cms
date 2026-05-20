import { describe, it, expect, vi } from 'vitest'
import { PostgresDrizzleAdapter } from '@zenithcms/db-postgres'
import { CollectionConfig } from '@zenithcms/types'
import { PgDialect } from 'drizzle-orm/pg-core'

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    })),
  }
})

describe('PostgresDrizzleAdapter - Relational Junction Tables', () => {
  it('should skip junction relationship column on the main table but run auto migrations for it', async () => {
    const config: CollectionConfig = {
      name: 'Articles',
      slug: 'articles',
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'tags',
          type: 'relation',
          relationTo: 'tags',
          hasMany: true,
          junctionTable: 'article_tags_junction',
          pivotFields: [
            { name: 'sortOrder', type: 'number' },
            { name: 'notes', type: 'text' }
          ]
        }
      ]
    }

    const adapter = new PostgresDrizzleAdapter('postgres://localhost:5432/test')
    const pgDialect = new PgDialect()
    
    const executedSqls: string[] = []
    const mockDb = {
      execute: vi.fn().mockImplementation(async (sqlObj: any) => {
        let rawQuery = ''
        try {
          if (sqlObj) {
            rawQuery = pgDialect.sqlToQuery(sqlObj).sql
          }
        } catch {
          rawQuery = String(sqlObj)
        }
        executedSqls.push(rawQuery)
        if (rawQuery.includes('information_schema.columns')) {
          return { rows: [{ column_name: 'id' }, { column_name: 'title' }, { column_name: 'created_at' }, { column_name: 'updated_at' }] }
        }
        return { rows: [] }
      })
    }
    adapter.db = mockDb as any
    ;(adapter as any).configs['articles'] = config

    await (adapter as any)._runAutoMigrations(config, mockDb)

    const junctionCreate = executedSqls.find(s => s.includes('article_tags_junction'))
    expect(junctionCreate).toBeDefined()
    expect(junctionCreate).toContain('CREATE TABLE IF NOT EXISTS "article_tags_junction"')
    expect(junctionCreate).toContain('"source_id" TEXT')
    expect(junctionCreate).toContain('"target_id" TEXT')
    expect(junctionCreate).toContain('"sortOrder" INTEGER')
    expect(junctionCreate).toContain('"notes" TEXT')
  })
})
