import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTenantStore } from '../lib/tenantStore'

interface BlockFieldDefinition {
 name: string
 label?: string
 type: string
 fields?: BlockFieldDefinition[]
 options?: (string | { label: string; value: any })[]
 placeholder?: string
}

export interface BlockDefinition {
 slug: string
 labels?: { singular: string; plural: string }
 fields: BlockFieldDefinition[]
 admin?: {
  description?: string
  icon?: string
  imageURL?: string
  category?: string
 }
}

import { UNIFIED_BLOCK_LIBRARY } from '../pages/editor/unifiedBlocks'

const humanize = (str: string) => {
 return str
  .replace(/^root:/, '')
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (s) => s.toUpperCase())
}

const mapFields = (fields?: any[]): any[] => {
 if (!fields) return []
 return fields.map((f) => ({
  name: f.name,
  label: f.label || humanize(f.name),
  type: f.type,
  required: f.required,
  placeholder: f.placeholder,
  options: f.options,
  fields: mapFields(f.fields),
  hasMany: f.hasMany,
  hasMore: f.hasMore,
  language: f.language,
  layout: f.layout,
  dateFormat: f.dateFormat,
  components: f.components,
  description: f.description,
  admin: f.admin,
 }))
}

const FALLBACK_BLOCKS: BlockDefinition[] = UNIFIED_BLOCK_LIBRARY.map((b) => ({
 slug: b.type,
 labels: { singular: b.title, plural: b.title + 's' },
 fields: mapFields(b.fields),
 admin: {
  description: b.description,
  category: b.category,
  icon: b.iconName,
 }
}))

// CRITICAL FIX: per-site cache to prevent cross-tenant block data leakage and memory leaks
const CACHE_LIMIT = 10
const siteCaches = new Map<string, { blocks: BlockDefinition[] | null; promise: Promise<BlockDefinition[]> | null }>()

function evictCache() {
  if (siteCaches.size > CACHE_LIMIT) {
    const firstKey = siteCaches.keys().next().value
    if (firstKey) siteCaches.delete(firstKey)
  }
}

async function fetchBlocksFromApi(siteId: string): Promise<BlockDefinition[]> {
 const entry = siteCaches.get(siteId)
 if (entry?.blocks) {
  // Move to end (LRU behavior)
  siteCaches.delete(siteId)
  siteCaches.set(siteId, entry)
  return entry.blocks
 }
 if (entry?.promise) return entry.promise

 const promise = (async () => {
  try {
   const res = await api.get<any>('/blocks')
   if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
    siteCaches.set(siteId, { blocks: res.data.data as BlockDefinition[], promise: null })
    evictCache()
    return res.data.data as BlockDefinition[]
   }
   return FALLBACK_BLOCKS
  } catch (err: any) {
   return FALLBACK_BLOCKS
  }
 })()

 siteCaches.set(siteId, { blocks: null, promise })
 evictCache()
 
 try {
  const result = await promise
  if (siteCaches.has(siteId)) {
   siteCaches.set(siteId, { blocks: result, promise: null })
  }
  return result
 } catch (err: any) {
  siteCaches.delete(siteId)
  throw err
 }
}

export function useBlockLibrary(): BlockDefinition[] {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)
 const [blocks, setBlocks] = useState<BlockDefinition[]>(() => FALLBACK_BLOCKS)

 useEffect(() => {
  if (!activeSiteId) return

  const cached = siteCaches.get(activeSiteId)
  if (cached?.blocks) {
   setBlocks(cached.blocks)
   return
  }

  let isMounted = true

  fetchBlocksFromApi(activeSiteId)
   .then(fetchedBlocks => {
     if (isMounted) {
       setBlocks(fetchedBlocks)
     }
   })
   .catch(err => {
     if (isMounted) {
       console.error('Failed to fetch blocks', err)
     }
   })

  return () => {
    isMounted = false
  }
 }, [activeSiteId])

 return blocks
}

export function clearBlockCache(siteId?: string) {
 if (siteId) {
  siteCaches.delete(siteId)
 } else {
  siteCaches.clear()
 }
}

export { fetchBlocksFromApi, FALLBACK_BLOCKS }
