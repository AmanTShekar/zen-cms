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
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

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
      const msg = err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to restore'
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
      const msg = err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to purge'
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
      const msg = err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to empty trash'
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
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Trash"
        actions={
          total > 0 && (
            <button
              onClick={() => setEmptyConfirm(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 shadow-[var(--z-active-glow)] text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
            >
              <Trash2 size={14} />
              Empty Trash
            </button>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-6">
        <div className="max-w-md relative">
          <Search size={14} className={cn('absolute left-4 top-1/2 -translate-y-1/2', dark ? 'text-gray-600' : 'text-z-muted')} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search trashed items..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest border outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors rounded-none shadow-[var(--z-active-glow)]',
              'z-input'
            )}
          />
        </div>

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 size={20} className="animate-spin text-z-secondary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Trash2 size={32} className="text-z-secondary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-z-secondary">
                {search ? 'No matching items' : 'Trash is empty'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn(
                    'text-[9px] font-black uppercase tracking-widest border-b',
                    dark ? 'text-z-secondary border-z-border' : 'text-z-secondary border-z-border'
                  )}>
                    <th className="px-5 py-4 font-normal">Title</th>
                    <th className="px-5 py-4 font-normal w-40 hidden sm:table-cell">Collection</th>
                    <th className="px-5 py-4 font-normal w-44 hidden md:table-cell">Deleted At</th>
                    <th className="px-5 py-4 font-normal w-32" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`${item.collectionSlug}-${item._id}`}
                      className={cn(
                        'text-xs border-b transition-colors',
                        dark ? 'border-white/[0.02] hover:bg-z-panel' : 'border-z-border hover:bg-gray-50'
                      )}
                    >
                      <td className="px-5 py-4">
                        <span className={cn('font-bold', dark ? 'text-gray-200' : 'text-gray-800')}>
                          {item.title}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-wider',
                          dark ? 'bg-z-hover text-z-muted' : 'bg-gray-100 text-z-secondary'
                        )}>
                          <Database size={10} />
                          {item.collectionName}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className={cn('text-[11px] font-mono', dark ? 'text-gray-600' : 'text-z-muted')}>
                          {formatDate(item.deletedAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setRestoreConfirm(item)}
                            className={cn('p-1.5 border transition-all rounded-none', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                            title="Restore"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button
                            onClick={() => setPurgeConfirm(item)}
                            className="p-1.5 border rounded-none border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                            title="Permanently delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className={cn('flex items-center justify-between px-5 py-4 border-t', dark ? 'border-z-border' : 'border-z-border')}>
              <span className={cn('text-[10px] font-bold', dark ? 'text-z-secondary' : 'text-z-muted')}>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn('px-4 py-2 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white disabled:opacity-30' : 'border-z-border text-z-secondary hover:text-black disabled:opacity-30')}
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn('px-4 py-2 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white disabled:opacity-30' : 'border-z-border text-z-secondary hover:text-black disabled:opacity-30')}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Restore Confirmation */}
        <AnimatePresence>
          {restoreConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
              >
                <Card>
                  <CardContent className="p-8 text-center">
                    <RotateCcw size={32} className="mx-auto mb-4 text-z-active-text" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 text-white">Restore Document?</h3>
                    <p className="text-[10px] font-bold text-z-secondary uppercase tracking-widest mb-6">
                      {restoreConfirm.title}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setRestoreConfirm(null)}
                        className={cn('px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRestore}
                        disabled={restoreLoading}
                        className="px-5 py-2.5 bg-z-accent hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none shadow-[var(--z-active-glow)] flex items-center gap-2"
                      >
                        {restoreLoading && <Loader2 size={12} className="animate-spin" />}
                        Restore
                      </button>
                    </div>
                  </CardContent>
                </Card>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
              >
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 text-white">Permanently Delete?</h3>
                    <p className="text-[10px] font-bold text-z-secondary uppercase tracking-widest mb-6">
                      {purgeConfirm.title}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setPurgeConfirm(null)}
                        className={cn('px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePurge}
                        disabled={purgeLoading}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none shadow-[var(--z-active-glow)] flex items-center gap-2"
                      >
                        {purgeLoading && <Loader2 size={12} className="animate-spin" />}
                        Delete
                      </button>
                    </div>
                  </CardContent>
                </Card>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
              >
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 text-white">Empty Trash?</h3>
                    <p className="text-[10px] font-bold text-z-secondary uppercase tracking-widest mb-6">
                      Delete all {total} items permanently.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setEmptyConfirm(false)}
                        className={cn('px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEmptyTrash}
                        disabled={emptyLoading}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none shadow-[var(--z-active-glow)] flex items-center gap-2"
                      >
                        {emptyLoading && <Loader2 size={12} className="animate-spin" />}
                        Delete All
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default TrashPage
