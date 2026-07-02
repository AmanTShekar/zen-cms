import useSWR from 'swr'
import api from '../lib/api'
import { useTenantStore } from '../lib/tenantStore'

/**
 * Hook to fetch the health/metadata for the current site.
 */
export function useSystemMetadata() {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)
 
 return useSWR(activeSiteId ? ['systemMetadata', activeSiteId] : null, async () => {
 const [healthRes, schemasRes] = await Promise.all([
 api.get('/system/health').catch(() => ({ data: { data: {} } })),
 api.get('/schemas').catch(() => ({ data: { data: [] } }))
 ])
 const health = healthRes.data?.data || {}
 
 const schemas = Array.isArray(schemasRes.data?.data) ? schemasRes.data.data : []
 
 return {
 ...health,
 collections: schemas.filter((s: any) => !s.isGlobal),
 globals: schemas.filter((s: any) => s.isGlobal)
 }
 }, {
 dedupingInterval: 5 * 60 * 1000,
 })
}

/**
 * Hook to fetch a paginated list of items for a collection
 */
export function useCollectionItems(slug: string, page: number, viewMode: 'active' | 'trash' = 'active') {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)

 return useSWR(
 slug ? ['collectionItems', activeSiteId, slug, viewMode, page] : null,
 async () => {
 const endpoint = viewMode === 'trash' ? `/${slug}/trash?page=${page}` : `/${slug}?page=${page}`
 const response = await api.get(endpoint)
 return {
 items: response.data?.data || [],
 total: response.data?.meta?.pagination?.total || response.data?.data?.length || 0
 }
 }
 )
}

/**
 * Hook to fetch a single document and its versions
 */
export function useDocumentData(collectionSlug: string, id: string, isGlobal: boolean) {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)
 const isNew = id === 'new'

 return useSWR(
 (collectionSlug && id && !isNew) ? ['documentData', activeSiteId, collectionSlug, id] : null,
 async () => {
 const endpoint = isGlobal ? `/globals/${id}` : `/${collectionSlug}/${id}`
 const response = await api.get(endpoint)
 return response.data?.data || null
 }
 )
}

export function useDocumentHistory(collectionSlug: string, id: string, isGlobal: boolean) {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)
 const isNew = id === 'new'

 return useSWR(
 (collectionSlug && id && !isNew) ? ['documentHistory', activeSiteId, collectionSlug, id] : null,
 async () => {
 const collType = isGlobal ? 'globals' : collectionSlug
 const response = await api.get(`/versions/${collType}/${id}`)
 return response.data?.data || []
 }
 )
}

export function useReleases() {
 const activeSiteId = useTenantStore((s) => s.activeSiteId)

 return useSWR(
 activeSiteId ? ['releases', activeSiteId] : null,
 async () => {
 const response = await api.get('/releases')
 return response.data?.data || []
 }
 )
}
