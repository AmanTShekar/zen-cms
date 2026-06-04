import { useState, useEffect } from 'react'
import api from '../lib/api'

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

// Helper to humanize names if label is missing
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

let cachedBlocks: BlockDefinition[] | null = null
let fetchPromise: Promise<BlockDefinition[]> | null = null

async function fetchBlocksFromApi(): Promise<BlockDefinition[]> {
 if (cachedBlocks) return cachedBlocks
 if (fetchPromise) return fetchPromise

 fetchPromise = (async () => {
 try {
 const res = await api.get<any>('/blocks')
 if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
 cachedBlocks = res.data.data as BlockDefinition[]
 return cachedBlocks
 }
 return FALLBACK_BLOCKS
 } catch {
 return FALLBACK_BLOCKS
 }
 })()

 return fetchPromise
}

export function useBlockLibrary(): BlockDefinition[] {
 const [blocks, setBlocks] = useState<BlockDefinition[]>(() => cachedBlocks || FALLBACK_BLOCKS)

 useEffect(() => {
 if (!cachedBlocks) {
 fetchBlocksFromApi().then(setBlocks)
 }
 }, [])

 return blocks
}

export function clearBlockCache() {
 cachedBlocks = null
 fetchPromise = null
}

export { fetchBlocksFromApi, FALLBACK_BLOCKS }
