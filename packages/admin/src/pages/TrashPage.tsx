import { useState, useEffect, useCallback } from 'react'
import {
 Trash2,
 RotateCcw,
 Search,
 Loader2,
 AlertTriangle,
 Database,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import api from '../lib/api'

interface TrashItem {
 _id: string
 collectionSlug: string
 collectionName: string
 title: string
 deletedAt: string
 siteId?: string
}

interface CollectionMeta {
 slug: string
 name: string
}

const TrashPage = () => {
 const { theme } = useTheme()
 const dark = theme === 'dark'

 const [items, setItems] = useState<TrashItem[]>([])
 const [collections, setCollections] = useState<CollectionMeta[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [page, setPage] = useState(1)
 const [totalPages, setTotalPages] = useState(1)
 const [total, setTotal] = useState(0)

 const [restoreConfirm, setRestoreConfirm] = useState<TrashItem | null>(null)
 const [purgeConfirm, setPurgeConfirm] = useState<TrashItem | null>(null)
 const [emptyConfirm, setEmptyConfirm] = useState(false)
 const [restoreLoading, setRestoreLoading] = useState(false)
 const [purgeLoading, setPurgeLoading] = useState(false)
 const [emptyLoading, setEmptyLoading] = useState(false)

 const fetchTrash = useCallback(async () => {
 setLoading(true)
 try {
 const res = await api.get('/trash', {
 params: { page, limit: 20, search: search || undefined },
 })
 const data = res.data
 setItems(data.data || [])
 setTotalPages(data.meta?.pagination?.totalPages || 1)
 setTotal(data.meta?.pagination?.total || 0)
 setCollections(data.meta?.collections || [])
 } catch {
 toast.error('Failed to load trash')
 } finally {
 setLoading(false)
 }
 }, [page, search])

 useEffect(() => {
 fetchTrash()
 }, [fetchTrash])

 const handleRestore = async () => {
 if (!restoreConfirm) return
 setRestoreLoading(true)
 try {
 await api.post('/trash/restore', {
 collection: restoreConfirm.collectionSlug,
 id: restoreConfirm._id,
 })
 toast.success('Document restored')
 setRestoreConfirm(null)
 fetchTrash()
 } catch (err: any) {
 const msg =
 err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to restore'
 toast.error(msg)
 } finally {
 setRestoreLoading(false)
 }
 }

 const handlePurge = async () => {
 if (!purgeConfirm) return
 setPurgeLoading(true)
 try {
 await api.post('/trash/purge', {
 collection: purgeConfirm.collectionSlug,
 id: purgeConfirm._id,
 })
 toast.success('Document permanently deleted')
 setPurgeConfirm(null)
 fetchTrash()
 } catch (err: any) {
 const msg =
 err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to purge'
 toast.error(msg)
 } finally {
 setPurgeLoading(false)
 }
 }

 const handleEmptyTrash = async () => {
 setEmptyLoading(true)
 try {
 await api.delete('/trash?confirm=true')
 toast.success('Trash emptied')
 setEmptyConfirm(false)
 fetchTrash()
 } catch (err: any) {
 const msg =
 err.response?.data?.error?.message ||
 (err instanceof Error ? err.message : String(err)) ||
 'Failed to empty trash'
 toast.error(msg)
 } finally {
 setEmptyLoading(false)
 }
 }

 const formatDate = (dateStr: string) => {
 try {
 return new Date(dateStr).toLocaleString()
 } catch {
 return dateStr
 }
 }

 return (
 <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-4">
 <div
 className={cn(
 'w-10 h-10 flex items-center justify-center border',
 dark ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
 )}
 >
 <Trash2 size={20} className="text-red-500" />
 </div>
 <div>
 <h1
 className={cn(
 'text-[22px] font-black uppercase tracking-tight leading-none',
 dark ? 'text-white' : 'text-gray-900'
 )}
 >
 Trash
 </h1>
 <p
 className={cn(
 'text-xs font-bold mt-1',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 {total} trashed item{total !== 1 ? 's' : ''}
 </p>
 </div>
 </div>
 {total > 0 && (
 <button
 onClick={() => setEmptyConfirm(true)}
 className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest transition-all border-0"
 >
 <Trash2 size={14} />
 Empty Trash
 </button>
 )}
 </div>

 {/* Search */}
 <div className="relative mb-6">
 <Search
 size={14}
 className={cn(
 'absolute left-4 top-1/2 -translate-y-1/2',
 dark ? 'text-gray-600' : 'text-gray-400'
 )}
 />
 <input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value)
 setPage(1)
 }}
 placeholder="Search trashed items..."
 className={cn(
 'w-full pl-10 pr-4 py-3 text-xs font-bold tracking-wider border outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
 dark
 ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 focus:border-red-500/30'
 : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500'
 )}
 />
 </div>

 {/* Table */}
 <div
 className={cn('border', dark ? 'border-white/[0.08]' : 'border-gray-200')}
 >
 {loading ? (
 <div className="flex items-center justify-center py-20 gap-3">
 <Loader2 size={20} className="animate-spin text-red-500" />
 <span
 className={cn(
 'text-xs font-black uppercase tracking-widest',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 Loading...
 </span>
 </div>
 ) : items.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 gap-4">
 <Trash2
 size={40}
 className={dark ? 'text-gray-700' : 'text-gray-300'}
 />
 <div className="text-center">
 <p
 className={cn(
 'text-xs font-black uppercase ',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 {search ? 'No matching items' : 'Trash is empty'}
 </p>
 <p
 className={cn(
 'text-xs font-bold mt-1',
 dark ? 'text-gray-700' : 'text-gray-300'
 )}
 >
 {search
 ? 'Try a different search term'
 : 'Deleted items will appear here'}
 </p>
 </div>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <div className="overflow-x-auto min-w-full pb-4"><table className="w-full text-left">
 <thead>
 <tr
 className={cn(
 'text-[10px] font-black uppercase tracking-widest border-b',
 dark
 ? 'text-gray-500 border-white/[0.08]'
 : 'text-gray-400 border-gray-200 shadow-sm'
 )}
 >
 <th className="px-5 py-4 font-normal">Title</th>
 <th className="px-5 py-4 font-normal w-40 hidden sm:table-cell">
 Collection
 </th>
 <th className="px-5 py-4 font-normal w-44 hidden md:table-cell">
 Deleted At
 </th>
 <th className="px-5 py-4 font-normal w-32" />
 </tr>
 </thead>
 <tbody>
 {items.map((item) => (
 <tr
 key={`${item.collectionSlug}-${item._id}`}
 className={cn(
 'text-xs border-b transition-colors',
 dark
 ? 'border-white/[0.02] hover:bg-white/[0.02]'
 : 'border-gray-50 hover:bg-gray-50'
 )}
 >
 <td className="px-5 py-4">
 <span
 className={cn(
 'font-bold',
 dark ? 'text-gray-200' : 'text-gray-800'
 )}
 >
 {item.title}
 </span>
 </td>
 <td className="px-5 py-4 hidden sm:table-cell">
 <span
 className={cn(
 'inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-wider',
 dark
 ? 'bg-white/5 text-gray-400'
 : 'bg-gray-100 text-gray-500'
 )}
 >
 <Database size={10} />
 {item.collectionName}
 </span>
 </td>
 <td className="px-5 py-4 hidden md:table-cell">
 <span
 className={cn(
 'text-[11px] font-mono',
 dark ? 'text-gray-600' : 'text-gray-400'
 )}
 >
 {formatDate(item.deletedAt)}
 </span>
 </td>
 <td className="px-5 py-4">
 <div className="flex items-center gap-2 justify-end">
 <button
 onClick={() => setRestoreConfirm(item)}
 className={cn(
 'p-1.5 border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-600 hover:text-gray-600 dark:text-gray-400 hover:border-gray-500/30'
 : 'border-gray-200 text-gray-400 hover:text-gray-600'
 )}
 title="Restore"
 >
 <RotateCcw size={12} />
 </button>
 <button
 onClick={() => setPurgeConfirm(item)}
 className="p-1.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
 title="Permanently delete"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table></div>
 </div>
 )}

 {/* Pagination */}
 {totalPages > 1 && (
 <div
 className={cn(
 'flex items-center justify-between px-5 py-4 border-t',
 dark ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}
 >
 <span
 className={cn(
 'text-[10px] font-bold',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 Page {page} of {totalPages}
 </span>
 <div className="flex gap-2">
 <button
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page <= 1}
 className={cn(
 'px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30'
 : 'border-gray-200 text-gray-600 hover:text-black disabled:opacity-30'
 )}
 >
 Previous
 </button>
 <button
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page >= totalPages}
 className={cn(
 'px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30'
 : 'border-gray-200 text-gray-600 hover:text-black disabled:opacity-30'
 )}
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Restore Confirmation */}
 <AnimatePresence>
 {restoreConfirm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className={cn(
 'w-full max-w-sm border shadow-2xl p-6 text-center',
 dark
 ? 'bg-black border-white/[0.08]'
 : 'bg-white border-gray-200'
 )}
 >
 <RotateCcw size={32} className="mx-auto mb-4 text-gray-600 dark:text-gray-500" />
 <h3
 className={cn(
 'text-sm font-black uppercase tracking-wider mb-2',
 dark ? 'text-white' : 'text-gray-900'
 )}
 >
 Restore Document?
 </h3>
 <p
 className={cn(
 'text-xs font-bold mb-2',
 dark ? 'text-gray-300' : 'text-gray-600'
 )}
 >
 {restoreConfirm.title}
 </p>
 <p
 className={cn(
 'text-xs font-bold mb-6',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 This will move it out of the trash and restore it to the
 collection.
 </p>
 <div className="flex gap-3 justify-center">
 <button
 onClick={() => setRestoreConfirm(null)}
 className={cn(
 'px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-400 hover:text-white'
 : 'border-gray-200 text-gray-600 hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 onClick={handleRestore}
 disabled={restoreLoading}
 className="px-5 py-2.5 bg-gray-600 dark:bg-gray-600 hover:bg-gray-500 text-white text-[10px] font-black uppercase tracking-widest transition-all border-0 flex items-center gap-2"
 >
 {restoreLoading && (
 <Loader2 size={12} className="animate-spin" />
 )}
 Restore
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Permanent Delete Confirmation */}
 <AnimatePresence>
 {purgeConfirm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className={cn(
 'w-full max-w-sm border shadow-2xl p-6 text-center',
 dark
 ? 'bg-black border-white/[0.08]'
 : 'bg-white border-gray-200'
 )}
 >
 <AlertTriangle
 size={32}
 className="mx-auto mb-4 text-red-500"
 />
 <h3
 className={cn(
 'text-sm font-black uppercase tracking-wider mb-2',
 dark ? 'text-white' : 'text-gray-900'
 )}
 >
 Permanently Delete?
 </h3>
 <p
 className={cn(
 'text-xs font-bold mb-2',
 dark ? 'text-gray-300' : 'text-gray-600'
 )}
 >
 {purgeConfirm.title}
 </p>
 <p
 className={cn(
 'text-xs font-bold mb-6',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 This action cannot be undone. The document will be permanently
 removed.
 </p>
 <div className="flex gap-3 justify-center">
 <button
 onClick={() => setPurgeConfirm(null)}
 className={cn(
 'px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-400 hover:text-white'
 : 'border-gray-200 text-gray-600 hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 onClick={handlePurge}
 disabled={purgeLoading}
 className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all border-0 flex items-center gap-2"
 >
 {purgeLoading && (
 <Loader2 size={12} className="animate-spin" />
 )}
 Delete Forever
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Empty Trash Confirmation */}
 <AnimatePresence>
 {emptyConfirm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className={cn(
 'w-full max-w-sm border shadow-2xl p-6 text-center',
 dark
 ? 'bg-black border-white/[0.08]'
 : 'bg-white border-gray-200'
 )}
 >
 <AlertTriangle
 size={32}
 className="mx-auto mb-4 text-red-500"
 />
 <h3
 className={cn(
 'text-sm font-black uppercase tracking-wider mb-2',
 dark ? 'text-white' : 'text-gray-900'
 )}
 >
 Empty Trash?
 </h3>
 <p
 className={cn(
 'text-xs font-bold mb-6',
 dark ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 This will permanently delete all {total} trashed item
 {total !== 1 ? 's' : ''}. This action cannot be undone.
 </p>
 <div className="flex gap-3 justify-center">
 <button
 onClick={() => setEmptyConfirm(false)}
 className={cn(
 'px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border transition-all',
 dark
 ? 'border-white/[0.08] text-gray-400 hover:text-white'
 : 'border-gray-200 text-gray-600 hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 onClick={handleEmptyTrash}
 disabled={emptyLoading}
 className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all border-0 flex items-center gap-2"
 >
 {emptyLoading && (
 <Loader2 size={12} className="animate-spin" />
 )}
 Delete All
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default TrashPage
