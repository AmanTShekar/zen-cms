import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
 Plus, Search, ChevronLeft, ChevronRight, Loader2, Edit, Trash2, Send, Archive,
 Database, Download, Layers, Activity as ActivityIcon, KeyRound,
 ShieldCheck, CheckSquare, Square, Upload, LayoutList, LayoutGrid, Kanban
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { confirm } from '../store/confirmStore'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import CollectionListBulkToolbar from './CollectionListBulkToolbar'
import CollectionListImportModal from './CollectionListImportModal'
import { useSystemMetadata, useCollectionItems } from '../hooks/useQueries'
import { useTenantStore } from '../lib/tenantStore'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const EmptyCollectionState = ({ slug, theme }: { slug: string, theme: string }) => {
 return (
 <div className={cn("py-24 px-6 text-center border-dashed border-2 rounded-none-none flex flex-col items-center justify-center gap-6 my-10 mx-auto max-w-2xl", theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-gray-500/20 bg-gray-50/50')}>
 <div className={cn("w-16 h-16 rounded-none-none flex items-center justify-center", theme === 'dark' ? 'bg-z-hover text-gray-600 dark:text-z-muted' : 'bg-gray-100 text-gray-600')}>
 <Database size={28} />
 </div>
 <div>
 <h3 className="text-lg font-semibold mb-2">Collection is Empty</h3>
 <p className={cn("text-sm max-w-sm mx-auto font-medium", theme === 'dark' ? 'text-z-muted' : 'text-gray-600')}>
 This collection doesn't have any records yet. Initialize the first record to launch the page builder.
 </p>
 </div>
 <Link 
 to={`/collections/${slug}/new`}
 className={cn("px-8 py-4 rounded-none-none font-semibold text-sm   shadow-xl transition-all leading-none flex items-center gap-3", theme === 'dark' ? 'bg-gray-500 text-white hover:bg-gray-400 hover:shadow-sm/20' : 'bg-gray-600 dark:bg-gray-600 text-white hover:bg-gray-700 hover:shadow-gray-600/20')}
 >
 <Plus size={16} strokeWidth={3} /> Launch Page Builder
 </Link>
 </div>
 )
}

const CollectionList: React.FC = () => {
 const { slug } = useParams<{ slug: string }>()
 const navigate = useNavigate()
 const { theme } = useTheme()
 const queryClient = useQueryClient()
 const activeSiteId = useTenantStore((s) => s.activeSiteId)
 
 const [data, setData] = useState<any[]>([])
 const [page, setPage] = useState(1)
 const [total, setTotal] = useState(0)
 const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
 
 const { data: health, isLoading: isHealthLoading } = useSystemMetadata()
 const { data: collectionData, isLoading: isItemsLoading } = useCollectionItems(slug || '', page, viewMode)
 const loading = isHealthLoading || isItemsLoading
 const [searchQuery, setSearchQuery] = useState('')
 const [layout, setLayout] = useState<'table' | 'cards' | 'kanban'>('table')
 const [config, setConfig] = useState<any>(null)
 const filteredData = data.filter((item) => {
 const searchStr = searchQuery.toLowerCase()
 return Object.values(item).some((val) => String(val).toLowerCase().includes(searchStr))
 })
 const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'title', 'price', 'category', '_status', 'updatedAt'])
 const [availableColumns, setAvailableColumns] = useState<string[]>([])
 const [columnMenuOpen, setColumnMenuOpen] = useState(false)
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
 const [bulkProcessing, setBulkProcessing] = useState(false)
 const [importModalOpen, setImportModalOpen] = useState(false)

 useEffect(() => {
 if (!health || !slug) return
 const globals = health.globals || []
 const collections = health.collections || []
 const isGlobal = globals.some((g: any) => g.slug === slug)
 const colConfig = collections.find((c: any) => c.slug === slug)
 setConfig(colConfig)
 const isSingleton = colConfig?.singleton || isGlobal
 if (isSingleton) {
 navigate(isGlobal ? `/globals/${slug}` : `/collections/${slug}/singleton`)
 }
 }, [health, slug, navigate])

 useEffect(() => {
 if (collectionData) {
 setData(collectionData.items)
 setTotal(collectionData.total)
 if (collectionData.items.length > 0) {
 const keys = Array.from(new Set(collectionData.items.flatMap((item: any) => Object.keys(item)))).filter(
 (k) => typeof k === 'string' && !k.startsWith('_') && k !== 'id' && k !== '__v'
 ) as string[]
 setAvailableColumns(keys)
 }
 }
 }, [collectionData])

 const handleDelete = async (id: string, hard = false) => {
 if (!await confirm({ message: hard ? 'Permanently delete this record? This cannot be undone.' : 'Confirm deletion?' })) return
 try {
 if (hard) {
 await api.delete(`/${slug}/${id}/hard`)
 toast.success('Record permanently purged')
 } else {
 await api.delete(`/${slug}/${id}`)
 toast.success('Record purged')
 }
 setData(data.filter((item) => (item._id || item.id) !== id))
 setTotal((prev) => prev - 1)
 queryClient.invalidateQueries({ queryKey: ['collectionItems', activeSiteId, slug] })
 } catch { toast.error('Purge failure') }
 }

 const handleRestore = async (id: string) => {
 if (!await confirm({ message: 'Restore this record?' })) return
 try {
 await api.post(`/${slug}/${id}/restore`)
 toast.success('Record restored')
 setData(data.filter((item) => (item._id || item.id) !== id))
 setTotal((prev) => prev - 1)
 queryClient.invalidateQueries({ queryKey: ['collectionItems', activeSiteId, slug] })
 } catch { toast.error('Restore failure') }
 }

 const toggleSelect = useCallback((id: string) => {
 setSelectedIds((prev) => {
 const next = new Set(prev)
 if (next.has(id)) next.delete(id); else next.add(id)
 return next
 })
 }, [])

 const toggleSelectAll = useCallback(() => {
 setSelectedIds((prev) => {
 if (prev.size === filteredData.length) return new Set()
 return new Set(filteredData.map((item: any) => item._id || item.id))
 })
 }, [filteredData])

 const clearSelection = useCallback(() => { setSelectedIds(new Set()) }, [])

 const hasSpatialEditor = slug === 'pages' || (config?.fields?.some((f: any) => f.type === 'blocks' || f.type === 'dynamicZone' || f.name === 'sections') || false);

 const handleBulkAction = async (action: 'delete' | 'publish' | 'unpublish') => {
 const ids = Array.from(selectedIds)
 if (ids.length === 0) return
 const confirmMsg: Record<string, string> = {
 delete: `Delete ${ids.length} selected record(s)? This cannot be undone.`,
 publish: `Publish ${ids.length} selected record(s)?`,
 unpublish: `Unpublish ${ids.length} selected record(s)?`,
 }
 if (!await confirm({ message: confirmMsg[action] })) return
 setBulkProcessing(true)
 try {
 if (action === 'delete') {
 await api.post(`/${slug}/bulk/delete`, { ids })
 toast.success(`${ids.length} records deleted`)
 setData((prev) => prev.filter((item) => !selectedIds.has(item._id || item.id)))
 setTotal((prev) => prev - ids.length)
 } else if (action === 'publish') {
 await api.post(`/${slug}/bulk/publish`, { ids })
 toast.success(`${ids.length} records published`)
 setData((prev) => prev.map((item) => selectedIds.has(item._id || item.id) ? { ...item, _status: 'published' } : item))
 } else if (action === 'unpublish') {
 await api.post(`/${slug}/bulk/unpublish`, { ids })
 toast.success(`${ids.length} records unpublished`)
 setData((prev) => prev.map((item) => selectedIds.has(item._id || item.id) ? { ...item, _status: 'draft' } : item))
 }
 setSelectedIds(new Set())
 queryClient.invalidateQueries({ queryKey: ['collectionItems', activeSiteId, slug] })
 } catch { toast.error(`Bulk ${action} failed`) }
 finally { setBulkProcessing(false) }
 }

 const handleQuickStatusToggle = async (itemId: string, currentStatus: string) => {
 const action = currentStatus === 'draft' ? 'publish' : 'unpublish'
 const originalItem = data.find((item) => (item._id || item.id) === itemId)
 if (!originalItem) return

 // Optimistic UI update
 setData((prev) => prev.map((item) => (item._id || item.id) === itemId ? { ...item, _status: action === 'publish' ? 'published' : 'draft' } : item))

 try {
 await api.post(`/${slug}/bulk/${action}`, { ids: [itemId] })
 toast.success(`Record ${action}ed`)
 } catch {
 toast.error(`Failed to ${action} record`)
 // Revert optimistic update
 setData((prev) => prev.map((item) => (item._id || item.id) === itemId ? { ...item, _status: currentStatus } : item))
 }
 }

 const exportCSV = () => {
 if (data.length === 0) return
 const headers = Object.keys(data[0]).filter((k) => !k.startsWith('_')).join(',')
 const rows = data.map((item) =>
 Object.entries(item)
 .filter(([k]) => !k.startsWith('_'))
 .map(([, v]) => `"${String(v).replace(/"/g, '""')}"`)
 .join(',')
 )
 const csv = [headers, ...rows].join('\n')
 const blob = new Blob([csv], { type: 'text/csv' })
 const url = window.URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.setAttribute('hidden', '')
 a.setAttribute('href', url)
 a.setAttribute('download', `${slug}_export_${Date.now()}.csv`)
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 toast.success('CSV_EXPORT_COMPLETE')
 }

 const handleImportRefreshed = async () => {
 queryClient.invalidateQueries({ queryKey: ['collectionItems', activeSiteId, slug] })
 }

 return (
 <div className={cn('pb-10 min-h-screen transition-colors duration-500', theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-z-primary')}>
 {/* Header */}
 <PageHeader 
   title={slug?.replace(/-/g, '_')}
   description={`Manage ${slug} • ${total} Total Records`}
   icon={<Layers size={24} />}
   actions={
     <div className="flex items-center gap-6">
       <Link to={`/collections/${slug}/new`} className={cn('px-8 py-4 rounded-none-none font-semibold text-sm   shadow-xl transition-all leading-none flex items-center gap-3', theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-600 dark:bg-gray-600 text-white shadow-gray-600/10')}>
         <Plus size={16} strokeWidth={3} /> {hasSpatialEditor ? 'Launch Page Builder' : 'New Record'}
       </Link>
     </div>
   }
 />

 <div className="p-10 space-y-10">

 {/* Dashboard-Style Stats Bar */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
   <div className="flex flex-col justify-between gap-2 p-5 border transition-colors z-panel backdrop-blur-md shadow-sm">
     <div className="flex items-center justify-between">
       <span className="text-sm font-semibold text-z-secondary">Total Records</span>
       <Database size={13} className="text-gray-600" />
     </div>
     <span className="text-2xl font-semibold leading-none tabular-nums text-z-primary dark:text-white">
       {total}
     </span>
   </div>

   <div className="flex flex-col justify-between gap-2 p-5 border transition-colors z-panel backdrop-blur-md shadow-sm">
     <div className="flex items-center justify-between">
       <span className="text-sm font-semibold text-z-secondary">Collection ID</span>
       <KeyRound size={13} className="text-gray-600" />
     </div>
     <span className="text-2xl font-semibold leading-none tabular-nums text-z-primary dark:text-white uppercase">
       {slug?.substring(0, 8)}
     </span>
   </div>

   <div className="flex flex-col justify-between gap-2 p-5 border transition-colors z-panel backdrop-blur-md shadow-sm">
     <div className="flex items-center justify-between">
       <span className="text-sm font-semibold text-z-secondary">Search Filter</span>
       <Search size={13} className="text-gray-600" />
     </div>
     <span className="text-2xl font-semibold leading-none tabular-nums text-z-primary dark:text-white">
       {searchQuery ? 'Active' : 'None'}
     </span>
   </div>

   <div className="flex flex-col justify-between gap-2 p-5 border transition-colors z-panel backdrop-blur-md shadow-sm">
     <div className="flex items-center justify-between">
       <span className="text-sm font-semibold text-z-secondary">View Mode</span>
       <Layers size={13} className="text-gray-600" />
     </div>
     <span className="text-2xl font-semibold leading-none tabular-nums text-z-primary dark:text-white capitalize">
       {viewMode}
     </span>
   </div>
 </div>

 {/* Bulk Toolbar */}
 <AnimatePresence>
 {selectedIds.size > 0 && (
 <CollectionListBulkToolbar
 selectedIds={selectedIds}
 bulkProcessing={bulkProcessing}
 theme={theme}
 onClearSelection={clearSelection}
 onBulkAction={handleBulkAction}
 />
 )}
 </AnimatePresence>

 {/* View Mode Tabs */}
 {config?.softDelete && (
 <div className="flex items-center gap-4 border-b border-z-border dark:border-z-border mb-4 pb-2">
 <button
 onClick={() => { setViewMode('active'); setPage(1); }}
 className={cn("px-4 py-2 text-sm font-semibold   transition-colors", viewMode === 'active' ? 'text-gray-600 dark:text-z-secondary border-b-2 border-gray-500' : 'text-z-secondary hover:text-z-primary dark:hover:text-white')}
 >
 Active Records
 </button>
 <button
 onClick={() => { setViewMode('trash'); setPage(1); }}
 className={cn("px-4 py-2 text-sm font-semibold   transition-colors flex items-center gap-2", viewMode === 'trash' ? 'text-red-500 border-b-2 border-red-500' : 'text-z-secondary hover:text-red-400')}
 >
 <Trash2 size={12} /> Recycle Bin
 </button>
 </div>
 )}

 {/* Data Registry */}
 <Card padding="none">
 <div className={cn('px-6 py-4 border-b flex items-center justify-between', theme === 'dark' ? 'bg-z-panel border-z-border' : 'bg-gray-50/20')}>
 <div className="relative w-full max-w-sm">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-z-secondary" size={14} />
 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search records..."
 className={cn('w-full border rounded-none-none py-2.5 pl-10 pr-4 text-sm font-semibold focus:ring-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black  ', theme === 'dark' ? 'bg-black border-z-border text-white focus:ring-gray-500/20' : 'bg-z-panel border-z-border shadow-sm focus:ring-gray-500/10')}
 />
 </div>
 <div className="flex items-center gap-2 relative">
 <div className="flex items-center gap-2 mr-4">
 <span className="text-sm font-semibold text-z-secondary">{filteredData.length} Matches</span>
 </div>
 <div className="relative">
 <button onClick={() => setColumnMenuOpen(!columnMenuOpen)} className="p-2.5 border rounded-none-none text-z-secondary hover:text-gray-600 dark:text-z-secondary transition-colors">
 <Layers size={14} />
 </button>
 <AnimatePresence>
 {columnMenuOpen && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
 className={cn('absolute right-0 top-full mt-2 w-64 border rounded-none-none shadow-2xl z-50 p-4 backdrop-blur-3xl', 'bg-z-popover border-z-border shadow-sm')}
 >
 <h4 className="text-sm font-semibold mb-4 text-gray-600 dark:text-z-secondary">Visible Columns</h4>
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {availableColumns.map((col) => (
 <button key={col} onClick={() => setVisibleColumns((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])}
 className="w-full flex items-center justify-between p-2 rounded-none-none hover:bg-z-hover transition-all group"
 >
 <span className="text-sm font-bold text-z-secondary group-hover:text-white">{col.replace(/_/g, ' ')}</span>
 <div className={cn('w-3 h-3 rounded-none-none border transition-all', visibleColumns.includes(col) ? 'bg-gray-500 border-gray-500' : 'border-z-border')} />
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <button onClick={exportCSV} className="p-2.5 border rounded-none-none text-z-secondary hover:text-gray-600 dark:text-z-secondary transition-colors" title="Export"><Download size={14} /></button>
 <button onClick={() => setImportModalOpen(true)} className="p-2.5 border rounded-none-none text-z-secondary hover:text-gray-600 dark:text-z-secondary transition-colors" title="Import"><Upload size={14} /></button>
 <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-2" />
 <div className="flex bg-gray-100 dark:bg-z-hover border border-z-border dark:border-z-border rounded-none-none p-0.5">
 <button onClick={() => setLayout('table')} className={cn('p-2 transition-all', layout === 'table' ? 'bg-white dark:bg-black shadow-sm text-gray-600 dark:text-z-secondary' : 'text-z-secondary hover:text-z-primary dark:hover:text-white')} title="Table View"><LayoutList size={14} /></button>
 <button onClick={() => setLayout('cards')} className={cn('p-2 transition-all', layout === 'cards' ? 'bg-white dark:bg-black shadow-sm text-gray-600 dark:text-z-secondary' : 'text-z-secondary hover:text-z-primary dark:hover:text-white')} title="Cards View"><LayoutGrid size={14} /></button>
 <button onClick={() => setLayout('kanban')} className={cn('p-2 transition-all', layout === 'kanban' ? 'bg-white dark:bg-black shadow-sm text-gray-600 dark:text-z-secondary' : 'text-z-secondary hover:text-z-primary dark:hover:text-white')} title="Kanban View"><Kanban size={14} /></button>
 </div>
 </div>
 </div>

 {layout === 'table' && (
 <div className="overflow-x-auto">
 <div className="overflow-x-auto min-w-full pb-4"><table className="w-full">
 <thead>
 <tr className={cn('border-b text-left text-sm font-semibold text-z-secondary   ', 'border-z-border')}>
 <th className="px-4 py-4 w-10">
 <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} className="flex items-center justify-center" title={selectedIds.size === filteredData.length && filteredData.length > 0 ? 'Deselect all' : 'Select all'}>
 {selectedIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={14} className="text-gray-600 dark:text-z-secondary" /> : <Square size={14} className={cn('text-z-secondary', selectedIds.size > 0 && 'text-gray-600 dark:text-z-muted')} />}
 </button>
 </th>
 <th className="px-6 py-4">ID</th>
 {availableColumns.filter((c) => visibleColumns.includes(c)).map((col) => (<th key={col} className="px-6 py-4">{col.toUpperCase()}</th>))}
 <th className="px-6 py-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className={cn('divide-y', theme === 'dark' ? 'divide-white/5' : 'divide-gray-50')}>
 {loading ? (
 <tr><td colSpan={visibleColumns.length + 3} className="py-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-600 dark:text-z-secondary opacity-20" /></td></tr>
 ) : filteredData.length === 0 ? (
 <tr><td colSpan={visibleColumns.length + 3} className="py-10"><EmptyCollectionState slug={slug || ''} theme={theme} /></td></tr>
 ) : filteredData.map((item: any) => {
 const itemId = item._id || item.id
 const isSelected = selectedIds.has(itemId)
 return (
 <tr key={itemId} className={cn("hover:bg-gray-500/[0.02] transition-colors group cursor-pointer border-b border-white/[0.02]", isSelected && 'bg-gray-500/[0.06]')}
 onClick={() => navigate(`/collections/${slug}/${itemId}`)}
 >
 <td className="px-4 py-4">
 <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }} className="flex items-center justify-center">
 {isSelected ? <CheckSquare size={14} className="text-gray-600 dark:text-z-secondary" /> : <Square size={14} className="text-gray-600 group-hover:text-z-muted" />}
 </button>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <div className={cn("w-1.5 h-1.5 rounded-none-none", isSelected ? 'bg-gray-400' : 'bg-gray-500')} />
 <span className="text-sm font-semibold text-gray-600 dark:text-z-secondary">#{String(itemId).slice(-6)}</span>
 </div>
 </td>
 {availableColumns.filter((c) => visibleColumns.includes(c)).map((col) => (
 <td key={col} className="px-6 py-4">
 <span className={cn('text-sm font-semibold  ', col === '_status' && item[col] === 'published' ? 'text-gray-600 dark:text-z-muted' : col === '_status' && item[col] === 'draft' ? 'text-amber-400' : '')}>
 {typeof item[col] === 'object' ? '[Complex_Object]' : String(item[col] || '—')}
 </span>
 </td>
 ))}
 <td className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
 {viewMode === 'active' ? (
 <>
 {item._status && (
 <button
 onClick={(e) => { e.stopPropagation(); handleQuickStatusToggle(itemId, item._status); }}
 className={cn('p-2 rounded-none-none border', item._status === 'draft' ? 'hover:text-gray-600 dark:text-z-secondary hover:border-gray-500' : 'hover:text-amber-500 hover:border-amber-500')}
 title={item._status === 'draft' ? 'Publish' : 'Unpublish'}
 >
 {item._status === 'draft' ? <Send size={12} /> : <Archive size={12} />}
 </button>
 )}
 <button onClick={(e) => { e.stopPropagation(); navigate(`/collections/${slug}/${itemId}`) }} className="p-2 rounded-none-none border hover:text-gray-600 dark:text-z-secondary"><Edit size={12} /></button>
 <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId); }} className="p-2 rounded-none-none border hover:text-red-500"><Trash2 size={12} /></button>
 </>
 ) : (
 <>
 <button onClick={(e) => { e.stopPropagation(); handleRestore(itemId); }} className="px-3 py-1 rounded-none-none border hover:bg-gray-500 hover:text-white hover:border-gray-500 text-sm font-bold transition-all">Restore</button>
 <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId, true); }} className="px-3 py-1 rounded-none-none border hover:bg-red-500 hover:text-white hover:border-red-500 text-sm font-bold transition-all">Delete Forever</button>
 </>
 )}
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table></div>
 </div>
 )}

 {layout === 'cards' && (
 <div className="p-6">
 {loading ? (
 <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-gray-600 dark:text-z-secondary opacity-20" /></div>
 ) : filteredData.length === 0 ? (
 <div className="py-20 text-center opacity-20 text-sm font-semibold">No_Records_Found</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredData.map((item: any) => {
 const itemId = item._id || item.id
 const isSelected = selectedIds.has(itemId)
 return (
 <div key={itemId} onClick={() => navigate(`/collections/${slug}/${itemId}`)} className={cn("border rounded-none-none p-5 flex flex-col gap-4 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl", theme === 'dark' ? 'bg-z-panel border-z-border hover:border-z-border' : 'bg-z-panel border-z-border shadow-sm hover:border-gray-500/20', isSelected && (theme === 'dark' ? 'border-gray-500/50 bg-gray-500/5' : 'border-gray-500/50 bg-gray-50'))}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }}>
 {isSelected ? <CheckSquare size={14} className="text-gray-600 dark:text-z-secondary" /> : <Square size={14} className="text-z-muted" />}
 </button>
 <span className="text-sm font-semibold text-gray-600 dark:text-z-secondary">#{String(itemId).slice(-8)}</span>
 </div>
 <div className="flex gap-2">
 {viewMode === 'active' ? (
 <>
 {item._status && (
 <button
 onClick={(e) => { e.stopPropagation(); handleQuickStatusToggle(itemId, item._status); }}
 className={item._status === 'draft' ? 'text-z-muted hover:text-gray-600 dark:text-z-secondary' : 'text-z-muted hover:text-amber-500'}
 title={item._status === 'draft' ? 'Publish' : 'Unpublish'}
 >
 {item._status === 'draft' ? <Send size={12} /> : <Archive size={12} />}
 </button>
 )}
 <button onClick={(e) => { e.stopPropagation(); navigate(`/collections/${slug}/${itemId}`) }} className="text-z-muted hover:text-gray-600 dark:text-z-secondary"><Edit size={12} /></button>
 <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId); }} className="text-z-muted hover:text-red-500"><Trash2 size={12} /></button>
 </>
 ) : (
 <button onClick={(e) => { e.stopPropagation(); handleRestore(itemId); }} className="text-sm font-bold text-gray-600 dark:text-z-secondary">Restore</button>
 )}
 </div>
 </div>
 <div className="space-y-3">
 {availableColumns.filter((c) => visibleColumns.includes(c)).slice(0, 4).map((col) => (
 <div key={col} className="flex flex-col">
 <span className="text-sm font-semibold text-z-secondary">{col.replace(/_/g, ' ')}</span>
 <span className={cn('text-xs font-medium truncate', col === '_status' && item[col] === 'published' ? 'text-gray-600 dark:text-z-secondary' : '')}>
 {typeof item[col] === 'object' ? '[Object]' : String(item[col] || '—')}
 </span>
 </div>
 ))}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 )}

 {layout === 'kanban' && (
 <div className="p-6 overflow-x-auto">
 {loading ? (
 <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-gray-600 dark:text-z-secondary opacity-20" /></div>
 ) : filteredData.length === 0 ? (
 <div className="py-20 text-center opacity-20 text-sm font-semibold">No_Records_Found</div>
 ) : (
 <div className="flex gap-6 min-w-max pb-4">
 {(() => {
 const hasStatus = availableColumns.includes('_status') || availableColumns.includes('status')
 const statusField = hasStatus ? (availableColumns.includes('_status') ? '_status' : 'status') : null
 
  const groups: Record<string, any[]> = {}
 if (statusField) {
 filteredData.forEach(item => {
 const st = String(item[statusField] || 'Draft').toLowerCase()
 if (!groups[st]) groups[st] = []
 groups[st].push(item)
 })
 } else {
 groups['Uncategorized'] = filteredData
 }

 return Object.entries(groups).map(([status, items]) => (
 <div key={status} className={cn("w-80 flex flex-col border rounded-none-none", theme === 'dark' ? 'bg-black/50 border-z-border' : 'bg-z-input border-z-border shadow-sm')}>
 <div className="p-4 flex items-center justify-between border-b border-inherit">
 <span className="text-sm font-semibold flex items-center gap-2">
 <div className={cn("w-2 h-2 rounded-none-none shadow-[0_0_8px_currentColor]", status === 'published' ? 'bg-gray-500 text-gray-600 dark:text-z-secondary' : status === 'draft' ? 'bg-amber-500 text-amber-500' : 'bg-gray-500 text-z-secondary')} />
 {status}
 </span>
 <span className="text-sm font-bold text-z-secondary bg-z-hover px-2 py-0.5 rounded-none-none">{items.length}</span>
 </div>
 <div className="p-4 flex flex-col gap-3 h-full max-h-[60vh] overflow-y-auto">
 {items.map(item => {
 const itemId = item._id || item.id
 const isSelected = selectedIds.has(itemId)
 return (
 <div key={itemId} onClick={() => navigate(`/collections/${slug}/${itemId}`)} className={cn("p-4 border rounded-none-none cursor-pointer transition-all hover:shadow-lg", theme === 'dark' ? 'bg-[#0a0a0a] border-z-border hover:border-z-border' : 'bg-z-panel border-z-border hover:border-gray-500/30', isSelected && 'ring-1 ring-gray-500')}>
 <div className="flex items-center justify-between mb-3">
 <span className="text-sm font-semibold text-z-secondary">#{String(itemId).slice(-6)}</span>
 <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }}>
 {isSelected ? <CheckSquare size={12} className="text-gray-600 dark:text-z-secondary" /> : <Square size={12} className="text-z-muted" />}
 </button>
 </div>
 {availableColumns.filter((c) => visibleColumns.includes(c) && c !== statusField).slice(0, 2).map((col) => (
 <div key={col} className="mb-1">
 <div className="text-sm font-bold text-z-secondary">{col}</div>
 <div className="text-xs truncate text-ellipsis">{String(item[col] || '—')}</div>
 </div>
 ))}
 </div>
 )
 })}
 </div>
 </div>
 ))
 })()}
 </div>
 )}
 </div>
 )}

 <div className={cn('p-4 border-t flex items-center justify-between text-sm font-semibold text-z-secondary  ', 'border-z-border')}>
 <div className="flex items-center gap-2"><KeyRound size={10} /><span>{slug?.toUpperCase()}</span></div>
 <div className="flex items-center gap-3">
 <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 border rounded-none-none disabled:opacity-20"><ChevronLeft size={14} /></button>
 <span className={cn('px-3 py-1 rounded-none-none text-white', theme === 'dark' ? 'bg-white/10' : 'bg-gray-900')}>{page}</span>
 <button disabled={data.length < 10} onClick={() => setPage(page + 1)} className="p-1.5 border rounded-none-none disabled:opacity-20"><ChevronRight size={14} /></button>
 </div>
 </div>
 </Card>
 </div>

 {/* Import Modal */}
 <AnimatePresence>
 {importModalOpen && (
 <CollectionListImportModal
 slug={slug!}
 theme={theme}
 onClose={() => setImportModalOpen(false)}
 onImported={handleImportRefreshed}
 />
 )}
 </AnimatePresence>
 </div>
 )
}

export default CollectionList
