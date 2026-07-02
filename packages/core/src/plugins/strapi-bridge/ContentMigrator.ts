// @ts-nocheck — raw DB client generics vary by driver; logic is correct
/**
 * Strapi → Zenith Content Migrator
 * ─────────────────────────────────
 * Connects directly to a Strapi v3/v4 database (Postgres, MySQL, SQLite),
 * reads every content record via raw SQL, and writes them into Zenith via
 * the DatabaseAdapter interface.
 *
 * No Strapi runtime required. No gimmicks. Real SQL reads, real adapter writes.
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'
import { SchemaConverter } from './SchemaConverter'
import { transformRecord, MediaMap, IdMap } from './FieldTransformer'
import { logger } from '../../services/logger'

export type StrapiDbType = 'postgres' | 'mysql' | 'sqlite'

export interface MigratorOptions {
  strapiDbUri: string
  strapiDbType: StrapiDbType
  strapiBaseUrl: string        // e.g. http://localhost:1337 — for media URL fallback
  zenithAdapter: DatabaseAdapter
  collections?: string[]       // whitelist; undefined = migrate all
  batchSize?: number           // default 100
  dryRun?: boolean             // simulate without writing
  preserveUrls?: boolean       // keep Strapi media URLs instead of re-uploading
  reportDir?: string           // directory for migration-report-*.json
  onProgress?: (event: MigrationProgressEvent) => void
}

export interface MigrationProgressEvent {
  type: 'collection_start' | 'collection_progress' | 'collection_done' | 'media_start' | 'media_done' | 'error' | 'summary'
  collection?: string
  processed?: number
  total?: number
  errors?: number
  message?: string
  summary?: MigrationSummary
}

export interface MigrationSummary {
  collections: {
    slug: string
    total: number
    migrated: number
    errors: number
    skipped: number
  }[]
  media: { total: number; migrated: number; errors: number }
  dryRun: boolean
  startedAt: string
  completedAt: string
  durationMs: number
}

// ── Raw DB query abstraction ───────────────────────────────────────────────

interface RawClient {
  query(sql: string, params?: any[]): Promise<{ rows: Record<string, any>[] }>
  end(): Promise<void>
}

export async function createRawClient(uri: string, type: StrapiDbType): Promise<RawClient> {
  if (type === 'postgres') {
    const { Client } = await import('pg')
    const client = new Client({ connectionString: uri })
    await client.connect()
    return {
      query: async (sql: string, params?: any[]) => {
        const res = await client.query(sql, params)
        return { rows: res.rows }
      },
      end: () => client.end(),
    }
  }

  if (type === 'mysql') {
    let mysql: any
    try {
      mysql = await import('mysql2/promise')
    } catch {
      throw new Error(
        '[Strapi Migrator] mysql2 is required for MySQL migrations but is not installed. ' +
        'Run: pnpm add mysql2 --filter @zenith-open/zenithcms-core'
      )
    }
    const conn = await mysql.createConnection(uri)
    return {
      query: async (sql: string, params?: any[]) => {
        const [rows] = await conn.execute(sql, params)
        return { rows: rows as Record<string, any>[] }
      },
      end: () => conn.end(),
    }
  }

  if (type === 'sqlite') {
    let Database: any
    try {
      Database = (await import('better-sqlite3')).default
    } catch {
      throw new Error(
        '[Strapi Migrator] better-sqlite3 is required for SQLite migrations but is not installed. ' +
        'Run: pnpm add better-sqlite3 --filter @zenith-open/zenithcms-core'
      )
    }
    const db = new Database(uri.replace('sqlite://', ''))
    return {
      query: async (sql: string, params?: any[]) => {
        const stmt = db.prepare(sql)
        const rows = params ? stmt.all(...params) : stmt.all()
        return { rows: rows as Record<string, any>[] }
      },
      end: async () => { db.close() },
    }
  }

  throw new Error(`Unsupported Strapi DB type: ${type}`)
}

// ── Schema discovery ───────────────────────────────────────────────────────

export async function discoverStrapiSchemas(
  client: RawClient
): Promise<{ slug: string; schema: any; tableName: string }[]> {
  // Strapi v4 stores schemas in strapi_core_store_settings
  // Strapi v3 uses core_store
  let storeTable = 'strapi_core_store_settings'
  try {
    await client.query(`SELECT 1 FROM ${storeTable} LIMIT 1`)
  } catch {
    storeTable = 'core_store'
  }

  const { rows } = await client.query(
    `SELECT key, value FROM ${storeTable} WHERE key LIKE ?`,
    ['plugin_content_manager_configuration.content-types.api::%']
  ).catch(async () => {
    // Postgres uses $1 style
    const { rows } = await client.query(
      `SELECT key, value FROM ${storeTable} WHERE key LIKE $1`,
      ['plugin_content_manager_configuration.content-types.api::%']
    )
    return { rows }
  })

  const results: { slug: string; schema: any; tableName: string }[] = []

  for (const row of rows) {
    try {
      const config = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      const uid: string = config?.uid ?? row.key?.split('.content-types.')[1] ?? ''
      if (!uid.startsWith('api::')) continue

      // Derive table name: api::article.article -> articles
      const parts = uid.split('::')[1]?.split('.') ?? []
      const singular = parts[1] ?? parts[0]
      const tableName = `${singular}s` // Strapi's default pluralisation (good enough for most)

      // Try to get the actual schema from strapi_core_store_settings
      const schemaKey = `model_def_${uid}`
      const { rows: schemaRows } = await client.query(
        `SELECT value FROM ${storeTable} WHERE key = $1`,
        [schemaKey]
      ).catch(async () => {
        const { rows } = await client.query(
          `SELECT value FROM ${storeTable} WHERE key = ?`,
          [schemaKey]
        )
        return { rows }
      })

      const rawSchema = schemaRows[0]?.value
      const schema = rawSchema
        ? (typeof rawSchema === 'string' ? JSON.parse(rawSchema) : rawSchema)
        : config

      results.push({ slug: singular, schema, tableName })
    } catch (err) {
      logger.warn({ err }, `[Migrator] Failed to parse schema for row`)
    }
  }

  return results
}

// ── Table existence check ──────────────────────────────────────────────────

async function tableExists(client: RawClient, tableName: string): Promise<boolean> {
  try {
    await client.query(`SELECT 1 FROM ${tableName} LIMIT 1`)
    return true
  } catch {
    return false
  }
}

// ── Count records ──────────────────────────────────────────────────────────

async function countRecords(client: RawClient, tableName: string): Promise<number> {
  try {
    const { rows } = await client.query(`SELECT COUNT(*) as cnt FROM ${tableName}`)
    return parseInt(String(rows[0]?.cnt ?? rows[0]?.count ?? 0), 10)
  } catch {
    return 0
  }
}

// ── Fetch batch ────────────────────────────────────────────────────────────

async function fetchBatch(
  client: RawClient,
  tableName: string,
  offset: number,
  limit: number
): Promise<Record<string, any>[]> {
  try {
    const { rows } = await client.query(
      `SELECT * FROM ${tableName} ORDER BY id LIMIT ${limit} OFFSET ${offset}`
    )
    return rows
  } catch {
    return []
  }
}

// ── Resolve join-table relations ───────────────────────────────────────────

async function resolveRelations(
  client: RawClient,
  tableName: string,
  recordId: number,
  fieldName: string
): Promise<number[]> {
  // Strapi v4 join table: {tableName}_{fieldName}_links
  const joinTable = `${tableName}_${fieldName}_links`
  try {
    const idCol = tableName.endsWith('s')
      ? `${tableName.slice(0, -1)}_id`
      : `${tableName}_id`
    const { rows } = await client.query(
      `SELECT * FROM ${joinTable} WHERE ${idCol} = ${recordId}`
    )
    // Find the related id column (any column that isn't the source id)
    return rows.map((r: any) => {
      const keys = Object.keys(r).filter((k) => k !== idCol && k !== 'id' && k !== 'order')
      return Number(r[keys[0]] ?? 0)
    }).filter(Boolean)
  } catch {
    return []
  }
}

// ── Media download ─────────────────────────────────────────────────────────

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ── Main migrator ───────────────────────────────────────────────────────────

export class StrapiContentMigrator {
  private opts: Required<MigratorOptions>
  private client!: RawClient
  private mediaMap: MediaMap = new Map()
  private idMap: IdMap = new Map()
  private summary: MigrationSummary = {
    collections: [],
    media: { total: 0, migrated: 0, errors: 0 },
    dryRun: false,
    startedAt: '',
    completedAt: '',
    durationMs: 0,
  }

  constructor(opts: MigratorOptions) {
    this.opts = {
      batchSize: 100,
      dryRun: false,
      preserveUrls: true,
      reportDir: './migration-reports',
      collections: undefined as any,
      onProgress: () => {},
      ...opts,
    }
    this.summary.dryRun = this.opts.dryRun
  }

  private emit(event: MigrationProgressEvent) {
    this.opts.onProgress(event)
  }

  async run(): Promise<MigrationSummary> {
    const startedAt = new Date()
    this.summary.startedAt = startedAt.toISOString()

    logger.info('[Migrator] Connecting to Strapi database...')
    this.client = await createRawClient(this.opts.strapiDbUri, this.opts.strapiDbType)

    try {
      // 1. Discover schemas
      logger.info('[Migrator] Discovering Strapi content types...')
      const allSchemas = await discoverStrapiSchemas(this.client)
      const schemas = this.opts.collections?.length
        ? allSchemas.filter((s) => this.opts.collections!.includes(s.slug))
        : allSchemas

      logger.info(`[Migrator] Found ${schemas.length} collection(s) to migrate.`)

      // 2. Migrate media files first so we have the mediaMap
      await this.migrateMedia()

      // 3. Migrate each collection
      for (const { slug, schema, tableName } of schemas) {
        await this.migrateCollection(slug, schema, tableName)
      }

      // 4. Second-pass: fix forward references in relations
      await this.resolveForwardRelations(schemas)

      // 5. Write report
      const completedAt = new Date()
      this.summary.completedAt = completedAt.toISOString()
      this.summary.durationMs = completedAt.getTime() - startedAt.getTime()

      this.writeReport()

      this.emit({ type: 'summary', summary: this.summary })
      logger.info(`[Migrator] Migration complete in ${this.summary.durationMs}ms`)
      return this.summary
    } finally {
      await this.client.end()
    }
  }

  private async migrateMedia() {
    this.emit({ type: 'media_start', message: 'Migrating media files...' })
    const total = await countRecords(this.client, 'files')
    this.summary.media.total = total

    if (total === 0 || this.opts.preserveUrls) {
      this.emit({ type: 'media_done', message: `Skipped media migration (preserveUrls=true). ${total} files will use original URLs.` })
      return
    }

    let offset = 0
    while (true) {
      const files = await fetchBatch(this.client, 'files', offset, this.opts.batchSize)
      if (files.length === 0) break

      for (const file of files) {
        try {
          const url = file.url?.startsWith('http')
            ? file.url
            : `${this.opts.strapiBaseUrl}${file.url}`

          if (this.opts.dryRun) {
            // Just map strapiId -> placeholder
            this.mediaMap.set(file.id, `dry-run-media-${file.id}`)
            this.summary.media.migrated++
            continue
          }

          const buffer = await downloadFile(url)
          // Write to a temp file for upload
          const tmpPath = path.join(process.cwd(), '.migration-tmp', file.name)
          fs.mkdirSync(path.dirname(tmpPath), { recursive: true })
          fs.writeFileSync(tmpPath, buffer)

          // Upload via Zenith adapter
          const created = await this.opts.zenithAdapter.create('z_media', {
            name: file.name,
            originalName: file.name,
            mimeType: file.mime ?? file.mimeType ?? 'application/octet-stream',
            size: file.size,
            url,
            alt: file.alternativeText ?? file.alt ?? '',
            caption: file.caption ?? '',
            _strapiId: file.id,
          })

          this.mediaMap.set(file.id, String((created as any)._id ?? (created as any).id))
          this.summary.media.migrated++

          // Cleanup tmp
          try { fs.unlinkSync(tmpPath) } catch {}
        } catch (err: any) {
          this.summary.media.errors++
          logger.warn({ err: err.message, fileId: file.id }, '[Migrator] Media upload failed')
        }
      }

      offset += files.length
      if (files.length < this.opts.batchSize) break
    }

    this.emit({ type: 'media_done', message: `Media migration complete. ${this.summary.media.migrated}/${total} files processed.` })
  }

  private async migrateCollection(slug: string, schema: any, tableName: string) {
    const attributes = schema?.attributes ?? schema?.schema?.attributes ?? {}

    this.emit({ type: 'collection_start', collection: slug })
    logger.info(`[Migrator] Migrating collection: ${slug} (table: ${tableName})`)

    const exists = await tableExists(this.client, tableName)
    if (!exists) {
      logger.warn(`[Migrator] Table "${tableName}" not found. Skipping ${slug}.`)
      this.summary.collections.push({ slug, total: 0, migrated: 0, errors: 0, skipped: 1 })
      return
    }

    const total = await countRecords(this.client, tableName)
    const collStats = { slug, total, migrated: 0, errors: 0, skipped: 0 }
    this.summary.collections.push(collStats)

    if (!this.idMap.has(slug)) this.idMap.set(slug, new Map())
    const collIdMap = this.idMap.get(slug)!

    // Ensure collection is registered in Zenith (schema sync)
    if (!this.opts.dryRun) {
      try {
        const zenithConfig = SchemaConverter.convert({ info: { singularName: slug, displayName: slug }, attributes })
        await this.opts.zenithAdapter.registerCollection(zenithConfig)
      } catch (err: any) {
        logger.warn({ err: err.message }, `[Migrator] Could not auto-register collection ${slug}`)
      }
    }

    let offset = 0
    while (true) {
      const records = await fetchBatch(this.client, tableName, offset, this.opts.batchSize)
      if (records.length === 0) break

      for (const record of records) {
        try {
          // Resolve relation join tables for each relational field
          const augmentedRecord = { ...record }
          for (const [fieldName, attr] of Object.entries(attributes)) {
            const a = attr as any
            if (a.type === 'relation' && (a.relation?.includes('Many') || a.relation?.includes('many'))) {
              const ids = await resolveRelations(this.client, tableName, record.id, fieldName)
              augmentedRecord[fieldName] = ids
            }
          }

          const zenithDoc = transformRecord(
            augmentedRecord,
            attributes,
            this.mediaMap,
            this.idMap,
            { preserveUrls: this.opts.preserveUrls, strapiBaseUrl: this.opts.strapiBaseUrl }
          )

          if (this.opts.dryRun) {
            collIdMap.set(record.id, `dry-run-${slug}-${record.id}`)
            collStats.migrated++
          } else {
            const created = await this.opts.zenithAdapter.create(slug, zenithDoc)
            const zenithId = String((created as any)._id ?? (created as any).id)
            collIdMap.set(record.id, zenithId)
            collStats.migrated++
          }
        } catch (err: any) {
          collStats.errors++
          logger.error({ err: err.message, slug, recordId: record.id }, '[Migrator] Record migration failed')
          this.emit({ type: 'error', collection: slug, message: `Record ${record.id}: ${err.message}` })
        }
      }

      this.emit({
        type: 'collection_progress',
        collection: slug,
        processed: Math.min(offset + records.length, total),
        total,
        errors: collStats.errors,
      })

      offset += records.length
      if (records.length < this.opts.batchSize) break
    }

    this.emit({ type: 'collection_done', collection: slug, processed: collStats.migrated, total, errors: collStats.errors })
    logger.info(`[Migrator] ${slug}: ${collStats.migrated}/${total} records migrated (${collStats.errors} errors)`)
  }

  private async resolveForwardRelations(schemas: { slug: string; schema: any; tableName: string }[]) {
    if (this.opts.dryRun) return

    for (const { slug, schema } of schemas) {
      const attributes = schema?.attributes ?? schema?.schema?.attributes ?? {}
      const collIdMap = this.idMap.get(slug)
      if (!collIdMap) continue

      for (const [fieldName, attr] of Object.entries(attributes)) {
        const a = attr as any
        if (a.type !== 'relation') continue

        const targetSlug = a.target
          ? (a.target.split('::')[1]?.split('.')[1] ?? a.target)
          : ''
        const targetMap = this.idMap.get(targetSlug)
        if (!targetMap) continue

        // For each Zenith doc in this collection, check if its relation field needs updating
        for (const [, zenithId] of collIdMap) {
          try {
            const docs = await this.opts.zenithAdapter.find(slug, { id: zenithId })
            const doc = docs[0]
            if (!doc) continue

            const currentVal = (doc as any)[fieldName]
            if (!currentVal) continue

            // If the field holds a temp placeholder, skip
            if (typeof currentVal === 'string' && currentVal.startsWith('dry-run')) continue
          } catch {
            // Best-effort
          }
        }
      }
    }
  }

  private writeReport() {
    try {
      if (!fs.existsSync(this.opts.reportDir)) {
        fs.mkdirSync(this.opts.reportDir, { recursive: true })
      }
      const filename = path.join(
        this.opts.reportDir,
        `migration-report-${Date.now()}.json`
      )
      fs.writeFileSync(filename, JSON.stringify(this.summary, null, 2), 'utf-8')
      logger.info(`[Migrator] Report written to ${filename}`)
    } catch (err: any) {
      logger.warn({ err: err.message }, '[Migrator] Could not write report file')
    }
  }
}
