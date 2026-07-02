/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Router, Request, Response } from 'express'
import { Client } from 'pg'
import { requireAuth, requireRole } from '../middleware/auth'
import { CollectionConfig, FieldConfig } from '@zenith-open/zenithcms-types'

const router: import('express').Router = Router()

/**
 * Maps Postgres data types to Zenith CMS field types.
 */
function mapPgTypeToZenithType(pgType: string): string {
  switch (pgType.toLowerCase()) {
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'numeric':
    case 'decimal':
    case 'real':
    case 'double precision':
      return 'number'
    case 'boolean':
      return 'checkbox'
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'date':
    case 'time without time zone':
      return 'date'
    case 'json':
    case 'jsonb':
      return 'json'
    case 'text':
    case 'character varying':
    case 'character':
    case 'uuid':
    default:
      return 'text'
  }
}

/**
 * Validates the connection string to prevent SSRF against internal networks.
 */
function isSafeConnectionString(connString: string): boolean {
  try {
    const parsed = new URL(connString)
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      return false
    }
    const host = parsed.hostname.toLowerCase()
    
    // Block common internal/private network patterns
    if (
      host === 'localhost' ||
      host.match(/^127\.\d+\.\d+\.\d+$/) ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.match(/^192\.168\.\d+\.\d+$/) ||
      host.match(/^169\.254\.\d+\.\d+$/) ||
      host.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/) ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { connectionString } = req.body
  if (!connectionString || typeof connectionString !== 'string') {
    return res.status(400).json({ error: 'PostgreSQL connection string is required.' })
  }

  if (!isSafeConnectionString(connectionString)) {
    return res.status(403).json({ error: 'Invalid or forbidden connection string host.' })
  }

  const client = new Client({ connectionString })
  
  try {
    await client.connect()

    // Query all tables in public schema
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `
    const { rows: tables } = await client.query(tablesQuery)

    const collections: CollectionConfig[] = []

    for (const table of tables) {
      const tableName = table.table_name

      // Query columns for the table
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `
      const { rows: columns } = await client.query(columnsQuery, [tableName])

      const fields: FieldConfig[] = []

      for (const col of columns) {
        // Skip default fields that Zenith auto-generates
        if (col.column_name === 'id' || col.column_name === 'created_at' || col.column_name === 'updated_at') {
          continue
        }

        fields.push({
          name: col.column_name,
          // @ts-ignore: TS2322 - unresolved type from removing @ts-nocheck
          type: mapPgTypeToZenithType(col.data_type) as Record<string, any>,
          label: col.column_name.charAt(0).toUpperCase() + col.column_name.slice(1).replace(/_/g, ' '),
          required: col.is_nullable === 'NO',
        })
      }

      collections.push({
        name: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' '),
        slug: tableName,
        fields,
      })
    }

    res.json({ data: collections })
  } catch (error: any) {
    res.status(500).json({ error: 'Introspection failed: ' + error.message })
  } finally {
    await client.end().catch(() => {})
  }
})

export default router
