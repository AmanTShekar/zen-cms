import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, ChevronLeft, ChevronRight, Loader2, Edit, Trash2,
  Database, Download, Layers, Fingerprint, Activity as ActivityIcon,
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

const CollectionList: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
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
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const healthRes = await api.get('/health')
        const globals = healthRes.data.data?.globals || []
        const collections = healthRes.data.data?.collections || []
        const isGlobal = globals.some((g: any) => g.slug === slug)
        const colConfig = collections.find((c: any) => c.slug === slug)
        setConfig(colConfig)
        const isSingleton = colConfig?.singleton || isGlobal
        if (isSingleton) {
          navigate(isGlobal ? `/globals/${slug}` : `/collections/${slug}/singleton`)
          return
        }
        
        const endpoint = viewMode === 'trash' ? `/${slug}/trash?page=${page}` : `/${slug}?page=${page}`
        const res = await api.get(endpoint)
        
        const items = res.data.data || []
        setData(items)
        setTotal(res.data.meta?.pagination?.total || items.length || 0)
        if (items.length > 0) {
          const keys = Array.from(new Set(items.flatMap((item: any) => Object.keys(item)))).filter(
            (k) => typeof k === 'string' && !k.startsWith('_') && k !== 'id' && k !== '__v'
          ) as string[]
          setAvailableColumns(keys)
        }
      } catch { setError('SYNCHRONIZATION_FAILED') }
      finally { setTimeout(() => setLoading(false), 300) }
    }
    if (slug) fetchData()
  }, [slug, page, navigate, viewMode])

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
    } catch { toast.error('Purge failure') }
  }

  const handleRestore = async (id: string) => {
    if (!await confirm({ message: 'Restore this record?' })) return
    try {
      await api.post(`/${slug}/${id}/restore`)
      toast.success('Record restored')
      setData(data.filter((item) => (item._id || item.id) !== id))
      setTotal((prev) => prev - 1)
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
    } catch { toast.error(`Bulk ${action} failed`) }
    finally { setBulkProcessing(false) }
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
    const refreshRes = await api.get(`/${slug}?page=${page}`)
    setData(refreshRes.data.data || [])
    setTotal(refreshRes.data.meta?.pagination?.total || 0)
  }

  return (
    <div className={cn('p-10 space-y-10 min-h-screen transition-colors duration-500', theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900')}>
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={cn('w-12 h-12 rounded-none flex items-center justify-center shadow-lg transition-all', theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white')}>
            <Layers size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic">REGISTRY_COLLECTION</span>
              <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">{slug?.replace(/-/g, '_')}</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link to={`/collections/${slug}/new`} className={cn('px-8 py-4 rounded-none font-black text-[11px] uppercase tracking-widest shadow-xl transition-all italic leading-none flex items-center gap-3', theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-emerald-600 text-white shadow-emerald-600/10')}>
            <Plus size={16} strokeWidth={3} /> Initialize_Record
          </Link>
        </div>
      </header>

      {/* Stats Rail */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6">
        {[
          { label: 'Total Units', value: total, icon: Database },
          { label: 'Registry ID', value: slug?.toUpperCase().slice(0, 8), icon: Fingerprint },
          { label: 'Status', value: 'OPTIMAL', icon: ActivityIcon },
          { label: 'Security', value: 'HARDENED', icon: ShieldCheck },
        ].map((stat) => (
          <div key={stat.label} className={cn('border rounded-none p-6 flex flex-col transition-all', theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100 shadow-sm')}>
            <div className="flex items-center justify-between mb-4">
              <stat.icon size={14} className="text-gray-500" />
              <span className="text-[8px] font-black uppercase text-emerald-500 tracking-[0.2em] italic">Operational</span>
            </div>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic leading-none mb-2">{stat.label}</span>
            <span className="text-3xl font-black italic tracking-tighter leading-none">{stat.value}</span>
          </div>
        ))}
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
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-white/10 mb-4 pb-2">
          <button
            onClick={() => { setViewMode('active'); setPage(1); }}
            className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] italic transition-colors", viewMode === 'active' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')}
          >
            Active Records
          </button>
          <button
            onClick={() => { setViewMode('trash'); setPage(1); }}
            className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] italic transition-colors flex items-center gap-2", viewMode === 'trash' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-red-400')}
          >
            <Trash2 size={12} /> Recycle Bin
          </button>
        </div>
      )}

      {/* Data Registry */}
      <div className={cn('border rounded-none overflow-hidden shadow-sm backdrop-blur-3xl transition-all', theme === 'dark' ? 'bg-[#080808]/80 border-white/5' : 'bg-white border-gray-100')}>
        <div className={cn('px-6 py-4 border-b flex items-center justify-between', theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50/20')}>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="NEURAL_SEARCH_KERNEL..."
              className={cn('w-full border rounded-none py-2.5 pl-10 pr-4 text-[9px] font-black italic focus:ring-4 transition-all outline-none uppercase tracking-widest', theme === 'dark' ? 'bg-black border-white/10 text-white focus:ring-emerald-500/20' : 'bg-white border-gray-100 focus:ring-emerald-500/10')}
            />
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">{filteredData.length} Matches</span>
            </div>
            <div className="relative">
              <button onClick={() => setColumnMenuOpen(!columnMenuOpen)} className="p-2.5 border rounded-none text-gray-500 hover:text-emerald-500 transition-colors">
                <Layers size={14} />
              </button>
              <AnimatePresence>
                {columnMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className={cn('absolute right-0 top-full mt-2 w-64 border rounded-none shadow-2xl z-50 p-4 backdrop-blur-3xl', theme === 'dark' ? 'bg-black/90 border-white/10' : 'bg-white border-gray-100')}
                  >
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic mb-4 text-emerald-500">Column_Orchestration</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                      {availableColumns.map((col) => (
                        <button key={col} onClick={() => setVisibleColumns((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])}
                          className="w-full flex items-center justify-between p-2 rounded-none hover:bg-white/5 transition-all group"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-white">{col.replace(/_/g, ' ')}</span>
                          <div className={cn('w-3 h-3 rounded-none border transition-all', visibleColumns.includes(col) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20')} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={exportCSV} className="p-2.5 border rounded-none text-gray-500 hover:text-emerald-500 transition-colors" title="Export"><Download size={14} /></button>
            <button onClick={() => setImportModalOpen(true)} className="p-2.5 border rounded-none text-gray-500 hover:text-emerald-500 transition-colors" title="Import"><Upload size={14} /></button>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-2" />
            <div className="flex bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-none p-0.5">
              <button onClick={() => setLayout('table')} className={cn('p-2 transition-all', layout === 'table' ? 'bg-white dark:bg-black shadow-sm text-emerald-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')} title="Table View"><LayoutList size={14} /></button>
              <button onClick={() => setLayout('cards')} className={cn('p-2 transition-all', layout === 'cards' ? 'bg-white dark:bg-black shadow-sm text-emerald-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')} title="Cards View"><LayoutGrid size={14} /></button>
              <button onClick={() => setLayout('kanban')} className={cn('p-2 transition-all', layout === 'kanban' ? 'bg-white dark:bg-black shadow-sm text-emerald-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')} title="Kanban View"><Kanban size={14} /></button>
            </div>
          </div>
        </div>

        {layout === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn('border-b text-left text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] italic', theme === 'dark' ? 'border-white/5' : 'border-gray-50')}>
                  <th className="px-4 py-4 w-10">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} className="flex items-center justify-center" title={selectedIds.size === filteredData.length && filteredData.length > 0 ? 'Deselect all' : 'Select all'}>
                      {selectedIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className={cn('text-gray-500', selectedIds.size > 0 && 'text-emerald-400')} />}
                    </button>
                  </th>
                  <th className="px-6 py-4">Node_ID</th>
                  {availableColumns.filter((c) => visibleColumns.includes(c)).map((col) => (<th key={col} className="px-6 py-4">{col.toUpperCase()}</th>))}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y', theme === 'dark' ? 'divide-white/5' : 'divide-gray-50')}>
                {loading ? (
                  <tr><td colSpan={visibleColumns.length + 3} className="py-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-emerald-500 opacity-20" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={visibleColumns.length + 3} className="py-20 text-center opacity-20 text-[9px] font-black uppercase italic tracking-[0.4em]">No_Records_Found</td></tr>
                ) : filteredData.map((item: any) => {
                  const itemId = item._id || item.id
                  const isSelected = selectedIds.has(itemId)
                  return (
                    <tr key={itemId} className={cn("hover:bg-emerald-500/[0.02] transition-colors group cursor-pointer border-b border-white/[0.02]", isSelected && 'bg-emerald-500/[0.06]')}
                      onClick={() => navigate(`/collections/${slug}/${itemId}`)}
                    >
                      <td className="px-4 py-4">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }} className="flex items-center justify-center">
                          {isSelected ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-gray-600 group-hover:text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-none", isSelected ? 'bg-emerald-400' : 'bg-emerald-500')} />
                          <span className="text-[9px] font-black text-emerald-500 uppercase italic">#{String(itemId).slice(-6)}</span>
                        </div>
                      </td>
                      {availableColumns.filter((c) => visibleColumns.includes(c)).map((col) => (
                        <td key={col} className="px-6 py-4">
                          <span className={cn('text-[10px] font-black uppercase italic', col === '_status' && item[col] === 'published' ? 'text-emerald-400' : col === '_status' && item[col] === 'draft' ? 'text-amber-400' : '')}>
                            {typeof item[col] === 'object' ? '[Complex_Object]' : String(item[col] || '—')}
                          </span>
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {viewMode === 'active' ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-2 rounded-none border hover:text-emerald-500"><Edit size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId); }} className="p-2 rounded-none border hover:text-red-500"><Trash2 size={12} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleRestore(itemId); }} className="px-3 py-1 rounded-none border hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-[9px] uppercase font-bold tracking-widest transition-all">Restore</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId, true); }} className="px-3 py-1 rounded-none border hover:bg-red-500 hover:text-white hover:border-red-500 text-[9px] uppercase font-bold tracking-widest transition-all">Delete Forever</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {layout === 'cards' && (
          <div className="p-6">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-emerald-500 opacity-20" /></div>
            ) : filteredData.length === 0 ? (
              <div className="py-20 text-center opacity-20 text-[9px] font-black uppercase italic tracking-[0.4em]">No_Records_Found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredData.map((item: any) => {
                  const itemId = item._id || item.id
                  const isSelected = selectedIds.has(itemId)
                  return (
                    <div key={itemId} onClick={() => navigate(`/collections/${slug}/${itemId}`)} className={cn("border rounded-none p-5 flex flex-col gap-4 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl", theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-emerald-500/20', isSelected && (theme === 'dark' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500/50 bg-emerald-50'))}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }}>
                            {isSelected ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-gray-400" />}
                          </button>
                          <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-wider">#{String(itemId).slice(-8)}</span>
                        </div>
                        <div className="flex gap-2">
                          {viewMode === 'active' ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); }} className="text-gray-400 hover:text-emerald-500"><Edit size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(itemId); }} className="text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                            </>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleRestore(itemId); }} className="text-[9px] uppercase font-bold text-emerald-500">Restore</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {availableColumns.filter((c) => visibleColumns.includes(c)).slice(0, 4).map((col) => (
                          <div key={col} className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{col.replace(/_/g, ' ')}</span>
                            <span className={cn('text-xs font-medium truncate', col === '_status' && item[col] === 'published' ? 'text-emerald-500' : '')}>
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
              <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-emerald-500 opacity-20" /></div>
            ) : filteredData.length === 0 ? (
              <div className="py-20 text-center opacity-20 text-[9px] font-black uppercase italic tracking-[0.4em]">No_Records_Found</div>
            ) : (
              <div className="flex gap-6 min-w-max pb-4">
                {(() => {
                  const hasStatus = availableColumns.includes('_status') || availableColumns.includes('status')
                  const statusField = hasStatus ? (availableColumns.includes('_status') ? '_status' : 'status') : null
                  
                  let groups: Record<string, any[]> = {}
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
                    <div key={status} className={cn("w-80 flex flex-col border rounded-none", theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-gray-50 border-gray-100')}>
                      <div className="p-4 flex items-center justify-between border-b border-inherit">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-none shadow-[0_0_8px_currentColor]", status === 'published' ? 'bg-emerald-500 text-emerald-500' : status === 'draft' ? 'bg-amber-500 text-amber-500' : 'bg-gray-500 text-gray-500')} />
                          {status}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-none">{items.length}</span>
                      </div>
                      <div className="p-4 flex flex-col gap-3 h-full max-h-[60vh] overflow-y-auto no-scrollbar">
                        {items.map(item => {
                          const itemId = item._id || item.id
                          const isSelected = selectedIds.has(itemId)
                          return (
                            <div key={itemId} onClick={() => navigate(`/collections/${slug}/${itemId}`)} className={cn("p-4 border rounded-none cursor-pointer transition-all hover:shadow-lg", theme === 'dark' ? 'bg-[#0a0a0a] border-white/10 hover:border-white/20' : 'bg-white border-gray-200 hover:border-emerald-500/30', isSelected && 'ring-1 ring-emerald-500')}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-black text-gray-500 italic">#{String(itemId).slice(-6)}</span>
                                <button onClick={(e) => { e.stopPropagation(); toggleSelect(itemId); }}>
                                  {isSelected ? <CheckSquare size={12} className="text-emerald-500" /> : <Square size={12} className="text-gray-400" />}
                                </button>
                              </div>
                              {availableColumns.filter((c) => visibleColumns.includes(c) && c !== statusField).slice(0, 2).map((col) => (
                                <div key={col} className="mb-1">
                                  <div className="text-[8px] font-bold text-gray-500 uppercase">{col}</div>
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

        <div className={cn('p-4 border-t flex items-center justify-between text-[8px] font-black text-gray-500 uppercase italic', theme === 'dark' ? 'border-white/5' : 'border-gray-50')}>
          <div className="flex items-center gap-2"><Fingerprint size={10} /><span>REG_0x{slug?.length}•STABLE</span></div>
          <div className="flex items-center gap-3">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 border rounded-none disabled:opacity-20"><ChevronLeft size={14} /></button>
            <span className={cn('px-3 py-1 rounded-none text-white', theme === 'dark' ? 'bg-white/10' : 'bg-gray-900')}>{page}</span>
            <button disabled={data.length < 10} onClick={() => setPage(page + 1)} className="p-1.5 border rounded-none disabled:opacity-20"><ChevronRight size={14} /></button>
          </div>
        </div>
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
