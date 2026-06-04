import { useState, useEffect } from 'react'
import api from '../lib/api'
import type { FieldDefinition } from '../pages/editor/constants'

export interface CustomComponent {
 id: string
 slug: string
 displayName: string
 category: string
 icon: string
 description: string
 fields: FieldDefinition[]
}

let cachedComponents: CustomComponent[] | null = null
let fetchPromise: Promise<CustomComponent[]> | null = null

export async function fetchCustomComponents(): Promise<CustomComponent[]> {
 if (cachedComponents) return cachedComponents
 if (fetchPromise) return fetchPromise

 fetchPromise = (async () => {
 try {
 const res = await api.get('/system/components')
 if (res.data?.data && Array.isArray(res.data.data)) {
 cachedComponents = res.data.data as CustomComponent[]
 return cachedComponents
 }
 return []
 } catch {
 return []
 }
 })()

 return fetchPromise
}

export function invalidateCustomComponentsCache() {
 cachedComponents = null
 fetchPromise = null
}

export function useCustomComponents(): CustomComponent[] {
 const [components, setComponents] = useState<CustomComponent[]>(() => cachedComponents || [])

 useEffect(() => {
 if (!cachedComponents) {
 fetchCustomComponents().then(setComponents)
 }
 }, [])

 return components
}
