import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeftRight,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Loader2,
  ArrowRight,
  MousePointerClick,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'

interface RedirectRule {
  _id: string
  from: string
  to: string
  type: string
  hits: number
  lastHitAt?: string
  createdAt: string
  siteId?: string
}

const REDIRECT_TYPES = ['301', '302', '307', '308'] as const

const RedirectsPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [rules, setRules] = useState<RedirectRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState<RedirectRule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [formFrom, setFormFrom] = useState('')
  const [formTo, setFormTo] = useState('')
  const [formType, setFormType] = useState('301')
  const [saving, setSaving] = useState(false)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/redirects', {
        params: { page, limit: 20, search: search || undefined },
      })
      const data = res.data
      setRules(data.data || [])
      setTotalPages(data.meta?.pagination?.totalPages || 1)
      setTotal(data.meta?.pagination?.total || 0)
    } catch {
      toast.error('Failed to load redirects')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const openCreate = () => {
    setEditing(null)
    setFormFrom('')
    setFormTo('')
    setFormType('301')
    setShowEditor(true)
  }

  const openEdit = (rule: RedirectRule) => {
    setEditing(rule)
    setFormFrom(rule.from)
    setFormTo(rule.to)
    setFormType(rule.type)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!formFrom || !formTo) {
      toast.error('Both "From" and "To" paths are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/redirects/${editing._id}`, {
          from: formFrom,
          to: formTo,
          type: formType,
        })
        toast.success('Redirect updated')
      } else {
        await api.post('/redirects', {
          from: formFrom,
          to: formTo,
          type: formType,
        })
        toast.success('Redirect created')
      }
      setShowEditor(false)
      fetchRules()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to save redirect'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/redirects/${id}`)
      toast.success('Redirect deleted')
      setDeleteConfirm(null)
      fetchRules()
    } catch {
      toast.error('Failed to delete redirect')
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case '301': return 'text-amber-500 border-amber-500/30'
      case '302': return 'text-z-active-text border-z-active-border'
      case '307': return 'text-z-secondary border-gray-500/30'
      case '308': return 'text-z-secondary border-gray-500/30'
      default: return 'text-z-secondary border-gray-500/30'
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Redirects"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-6 py-2.5 bg-z-accent hover:opacity-90 shadow-[var(--z-active-glow)] text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
          >
            <Plus size={14} />
            Add Redirect
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-6">
        <div className="max-w-md relative">
          <Search size={14} className={cn('absolute left-4 top-1/2 -translate-y-1/2', dark ? 'text-gray-600' : 'text-z-muted')} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search redirect paths..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest border outline-none focus-visible:ring-2 focus-visible:ring-z-active-border transition-colors rounded-none shadow-[var(--z-active-glow)]',
              'z-input'
            )}
          />
        </div>

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 size={20} className="animate-spin text-z-secondary" />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <ArrowLeftRight size={32} className="text-z-secondary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-z-secondary">
                {search ? 'No matching redirects' : 'No redirects configured'}
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
                    <th className="px-5 py-4 font-normal">From</th>
                    <th className="px-5 py-4 font-normal hidden md:table-cell">To</th>
                    <th className="px-5 py-4 font-normal w-20">Type</th>
                    <th className="px-5 py-4 font-normal w-24 hidden sm:table-cell">Hits</th>
                    <th className="px-5 py-4 font-normal w-24 hidden lg:table-cell">Last Hit</th>
                    <th className="px-5 py-4 font-normal w-24" />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule._id}
                      onClick={() => openEdit(rule)}
                      className={cn(
                        'text-xs border-b transition-colors cursor-pointer',
                        dark ? 'border-white/[0.02] hover:bg-z-panel' : 'border-z-border hover:bg-gray-50'
                      )}
                    >
                      <td className="px-5 py-4">
                        <code className={cn('px-2 py-1 text-xs font-mono font-bold', dark ? 'bg-z-hover text-z-muted' : 'bg-gray-100 text-gray-600')}>
                          {rule.from}
                        </code>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <ArrowRight size={12} className="text-z-secondary shrink-0" />
                          <span className={cn('font-mono font-bold truncate max-w-[300px]', dark ? 'text-gray-300' : 'text-gray-600')}>
                            {rule.to}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-block px-2 py-0.5 text-[10px] font-black font-mono border', typeColor(rule.type))}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MousePointerClick size={11} className={dark ? 'text-gray-600' : 'text-z-muted'} />
                          <span className={cn('font-bold tabular-nums', dark ? 'text-gray-300' : 'text-gray-600')}>
                            {rule.hits?.toLocaleString() || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className={cn('text-[11px] font-mono', dark ? 'text-gray-600' : 'text-z-muted')}>
                          {rule.lastHitAt ? new Date(rule.lastHitAt).toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(rule.from, '_blank') }}
                            className={cn('p-1.5 border transition-all', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                            title="Test redirect"
                          >
                            <ExternalLink size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(rule._id) }}
                            className="p-1.5 border rounded-none border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                            title="Delete"
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

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showEditor && (
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
                className="w-full max-w-md"
              >
                <Card>
                  <div className={cn('px-6 py-4 border-b flex items-center justify-between', dark ? 'border-z-border' : 'border-z-border')}>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-z-secondary">
                      {editing ? 'Edit Redirect' : 'New Redirect'}
                    </h2>
                    <button onClick={() => setShowEditor(false)} className="text-z-secondary hover:text-z-primary dark:hover:text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-z-secondary">From Path</label>
                      <input
                        type="text"
                        value={formFrom}
                        onChange={(e) => setFormFrom(e.target.value)}
                        placeholder="/old-path"
                        className={cn('w-full px-4 py-2.5 text-xs font-mono font-bold border outline-none focus-visible:ring-2 focus-visible:ring-z-active-border transition-colors rounded-none', dark ? 'bg-z-panel backdrop-blur-md border-z-border text-white focus:border-z-active-border' : 'bg-z-input border-z-border text-z-primary focus:border-z-accent')}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-z-secondary">To URL</label>
                      <input
                        type="text"
                        value={formTo}
                        onChange={(e) => setFormTo(e.target.value)}
                        placeholder="https://example.com/new-path"
                        className={cn('w-full px-4 py-2.5 text-xs font-mono font-bold border outline-none focus-visible:ring-2 focus-visible:ring-z-active-border transition-colors rounded-none', dark ? 'bg-z-panel backdrop-blur-md border-z-border text-white focus:border-z-active-border' : 'bg-z-input border-z-border text-z-primary focus:border-z-accent')}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest mb-1.5 text-z-secondary">Redirect Type</label>
                      <div className="flex gap-2">
                        {REDIRECT_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={() => setFormType(t)}
                            className={cn(
                              'flex-1 py-2.5 text-[10px] font-black font-mono border rounded-none transition-all',
                              formType === t ? (dark ? 'border-z-accent text-z-active-text bg-z-active-bg shadow-[var(--z-active-glow)]' : 'border-z-accent text-z-accent bg-z-active-bg shadow-sm') : (dark ? 'border-z-border text-z-secondary hover:text-white hover:bg-z-hover' : 'border-z-border text-z-muted hover:text-z-primary hover:bg-gray-50')
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <div className={cn('px-6 py-4 border-t flex justify-end gap-3', dark ? 'border-z-border' : 'border-z-border')}>
                    <button
                      onClick={() => setShowEditor(false)}
                      className={cn('px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none', dark ? 'text-z-secondary hover:text-white hover:bg-z-hover' : 'text-z-secondary hover:text-black hover:bg-gray-50')}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !formFrom || !formTo}
                      className="px-6 py-2.5 bg-z-accent hover:opacity-90 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-[var(--z-active-glow)] rounded-none flex items-center gap-2"
                    >
                      {saving && <Loader2 size={12} className="animate-spin" />}
                      {editing ? 'Update' : 'Create'}
                    </button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirm && (
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
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 text-white">Delete Redirect?</h3>
                    <p className="text-[10px] font-bold text-z-secondary uppercase tracking-widest mb-6">
                      This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={cn('px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white' : 'border-z-border text-z-secondary hover:text-black')}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(deleteConfirm)}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none shadow-[var(--z-active-glow)]"
                      >
                        Delete
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

export default RedirectsPage
