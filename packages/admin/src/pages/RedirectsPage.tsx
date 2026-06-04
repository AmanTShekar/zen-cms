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
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save redirect'
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
      case '302': return 'text-blue-500 border-blue-500/30'
      case '307': return 'text-emerald-500 border-emerald-500/30'
      case '308': return 'text-emerald-500 border-emerald-500/30'
      default: return 'text-gray-500 border-gray-500/30'
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-10 h-10 flex items-center justify-center border',
            dark ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
          )}>
            <ArrowLeftRight size={20} className="text-emerald-500" />
          </div>
          <div>
            <h1 className={cn(
              'text-[22px] font-black uppercase italic tracking-tight leading-none',
              dark ? 'text-white' : 'text-gray-900'
            )}>
              Redirects
            </h1>
            <p className={cn(
              'text-xs font-bold mt-1',
              dark ? 'text-gray-500' : 'text-gray-400'
            )}>
              {total} redirect rule{total !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase italic tracking-widest transition-all border-0"
        >
          <Plus size={14} />
          Add Redirect
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2',
          dark ? 'text-gray-600' : 'text-gray-400'
        )} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search redirect paths..."
          className={cn(
            'w-full pl-10 pr-4 py-3 text-xs font-bold tracking-wider border outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
            dark
              ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-600 focus:border-emerald-500/30'
              : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500'
          )}
        />
      </div>

      {/* Table */}
      <div className={cn('border', dark ? 'border-white/[0.08]' : 'border-gray-200')}>
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
            <span className={cn('text-xs font-black uppercase italic tracking-widest', dark ? 'text-gray-500' : 'text-gray-400')}>
              Loading...
            </span>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ArrowLeftRight size={40} className={dark ? 'text-gray-700' : 'text-gray-300'} />
            <div className="text-center">
              <p className={cn('text-xs font-black uppercase italic', dark ? 'text-gray-500' : 'text-gray-400')}>
                {search ? 'No matching redirects' : 'No redirects configured'}
              </p>
              <p className={cn('text-xs font-bold mt-1', dark ? 'text-gray-700' : 'text-gray-300')}>
                {search ? 'Try a different search term' : 'Redirect old URLs to new destinations'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={cn(
                  'text-[10px] font-black uppercase tracking-widest italic border-b',
                  dark ? 'text-gray-500 border-white/[0.08]' : 'text-gray-400 border-gray-100'
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
                      dark
                        ? 'border-white/[0.02] hover:bg-white/[0.02]'
                        : 'border-gray-50 hover:bg-gray-50'
                    )}
                  >
                    <td className="px-5 py-4">
                      <code className={cn(
                        'px-2 py-1 text-xs font-mono font-bold',
                        dark ? 'bg-white/5 text-emerald-400' : 'bg-gray-100 text-emerald-600'
                      )}>
                        {rule.from}
                      </code>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={12} className="text-gray-500 shrink-0" />
                        <span className={cn(
                          'font-mono font-bold truncate max-w-[300px]',
                          dark ? 'text-gray-300' : 'text-gray-600'
                        )}>
                          {rule.to}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'inline-block px-2 py-0.5 text-[10px] font-black font-mono border',
                        typeColor(rule.type)
                      )}>
                        {rule.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick size={11} className={dark ? 'text-gray-600' : 'text-gray-400'} />
                        <span className={cn(
                          'font-bold tabular-nums',
                          dark ? 'text-gray-300' : 'text-gray-600'
                        )}>
                          {rule.hits?.toLocaleString() || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className={cn(
                        'text-[11px] font-mono',
                        dark ? 'text-gray-600' : 'text-gray-400'
                      )}>
                        {rule.lastHitAt
                          ? new Date(rule.lastHitAt).toLocaleString()
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(rule.from, '_blank') }}
                          className={cn(
                            'p-1.5 border transition-all',
                            dark
                              ? 'border-white/[0.08] text-gray-600 hover:text-gray-300 hover:border-white/[0.08]'
                              : 'border-gray-200 text-gray-400 hover:text-gray-600'
                          )}
                          title="Test redirect"
                        >
                          <ExternalLink size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(rule._id) }}
                          className="p-1.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={cn(
            'flex items-center justify-between px-5 py-4 border-t',
            dark ? 'border-white/[0.08]' : 'border-gray-100'
          )}>
            <span className={cn(
              'text-[10px] font-bold',
              dark ? 'text-gray-500' : 'text-gray-400'
            )}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'px-4 py-2 text-[10px] font-black uppercase italic tracking-widest border transition-all',
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
                  'px-4 py-2 text-[10px] font-black uppercase italic tracking-widest border transition-all',
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

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'w-full max-w-lg border shadow-2xl',
                dark ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-white border-gray-200'
              )}
            >
              <div className={cn(
                'px-6 py-5 border-b flex items-center justify-between',
                dark ? 'border-white/[0.08]' : 'border-gray-100'
              )}>
                <h2 className={cn(
                  'text-sm font-black uppercase italic tracking-wider',
                  dark ? 'text-white' : 'text-gray-900'
                )}>
                  {editing ? 'Edit Redirect' : 'New Redirect'}
                </h2>
                <button
                  onClick={() => setShowEditor(false)}
                  className={cn(
                    'p-1 border transition-all',
                    dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-gray-200 text-gray-400'
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className={cn(
                    'block text-[10px] font-black uppercase tracking-widest italic mb-2',
                    dark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    From Path
                  </label>
                  <input
                    type="text"
                    value={formFrom}
                    onChange={(e) => setFormFrom(e.target.value)}
                    placeholder="/old-path"
                    className={cn(
                      'w-full px-4 py-3 text-xs font-mono font-bold border outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
                      dark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-emerald-500/40'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500'
                    )}
                  />
                </div>

                <div>
                  <label className={cn(
                    'block text-[10px] font-black uppercase tracking-widest italic mb-2',
                    dark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    To URL
                  </label>
                  <input
                    type="text"
                    value={formTo}
                    onChange={(e) => setFormTo(e.target.value)}
                    placeholder="https://example.com/new-path"
                    className={cn(
                      'w-full px-4 py-3 text-xs font-mono font-bold border outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
                      dark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-emerald-500/40'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500'
                    )}
                  />
                </div>

                <div>
                  <label className={cn(
                    'block text-[10px] font-black uppercase tracking-widest italic mb-2',
                    dark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    Redirect Type
                  </label>
                  <div className="flex gap-2">
                    {REDIRECT_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        className={cn(
                          'flex-1 py-3 text-xs font-black font-mono border transition-all',
                          formType === t
                            ? typeColor(t) + ' bg-emerald-500/5'
                            : dark
                              ? 'border-white/[0.08] text-gray-600 hover:text-gray-400'
                              : 'border-gray-200 text-gray-400 hover:text-gray-600'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className={cn(
                    'text-[10px] font-bold mt-2',
                    dark ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {formType === '301' ? 'Permanent — search engines will update their index' :
                     formType === '302' ? 'Temporary — search engines will keep the original URL' :
                     formType === '307' ? 'Temporary — preserves HTTP method' :
                     'Permanent — preserves HTTP method'}
                  </p>
                </div>
              </div>

              <div className={cn(
                'px-6 py-4 border-t flex items-center justify-end gap-3',
                dark ? 'border-white/[0.08]' : 'border-gray-100'
              )}>
                <button
                  onClick={() => setShowEditor(false)}
                  className={cn(
                    'px-5 py-2.5 text-[10px] font-black uppercase italic tracking-widest border transition-all',
                    dark
                      ? 'border-white/[0.08] text-gray-400 hover:text-white'
                      : 'border-gray-200 text-gray-600 hover:text-black'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formFrom || !formTo}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase italic tracking-widest transition-all border-0 flex items-center gap-2"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'w-full max-w-sm border shadow-2xl p-6 text-center',
                dark ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-white border-gray-200'
              )}
            >
              <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" />
              <h3 className={cn(
                'text-sm font-black uppercase italic tracking-wider mb-2',
                dark ? 'text-white' : 'text-gray-900'
              )}>
                Delete Redirect?
              </h3>
              <p className={cn(
                'text-xs font-bold mb-6',
                dark ? 'text-gray-500' : 'text-gray-400'
              )}>
                This action cannot be undone. Visitors hitting this path will get a 404.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={cn(
                    'px-5 py-2.5 text-[10px] font-black uppercase italic tracking-widest border transition-all',
                    dark ? 'border-white/[0.08] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-black'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase italic tracking-widest transition-all border-0"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RedirectsPage
