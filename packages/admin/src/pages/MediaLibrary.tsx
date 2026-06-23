import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Search,
  Trash2,
  Download,
  Plus,
  X,
  Database,
  RefreshCw,
  Archive,
  Maximize2,
  Binary,
  Clock,
  CheckSquare,
  Square,
  Target,
  Server,
  Image as ImageIcon,
  HardDrive,
  List,
  Grid,
  FileText,
  ChevronRight,
  ChevronLeft,
  Link2
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useTenantStore } from '../lib/tenantStore'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function timeAgo(ts: string) {
  if (!ts) return 'Unknown'
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function MediaLibrary() {
  const { theme } = useTheme()
  const activeSiteId = useTenantStore((state) => state.activeSiteId)
  
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [folders, setFolders] = useState<string[]>([])
  
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Forensics / Edit mode state
  const [isFocalMode, setIsFocalMode] = useState(false)
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Blob URL cache
  const [blobMap, setBlobMap] = React.useState<Record<string, string>>({})
  const blobTokens = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    if (selectedFile) {
      setFocalPoint(selectedFile.focalPoint || { x: 50, y: 50 })
    }
  }, [selectedFile])

  const getFullUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return blobMap[url] || `${import.meta.env.VITE_API_URL || ''}${url}`
  }

  const fetchFiles = useCallback(async () => {
    if (!activeSiteId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/media')
      const allFiles = res.data.data || []
      setFiles(allFiles)

      const uniqueFolders = Array.from(
        new Set(allFiles.map((f: any) => f.folder).filter(Boolean))
      ) as string[]
      setFolders(uniqueFolders)
    } catch {
      toast.error('REGISTRY_SYNC_FAILURE')
    } finally {
      setLoading(false)
    }
  }, [activeSiteId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Pre-fetch blob URLs for auth
  useEffect(() => {
    if (!files.length && !selectedFile) return
    const items = [...files, selectedFile].filter((f: any) => f?.url && !f.url.startsWith('http') && !blobMap[f.url])
    if (!items.length) return
    const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
    
    items.forEach((item) => {
      fetch(`${apiBase}${item.url}`, { credentials: 'include' })
        .then((r) => {
          if (!r.ok) throw new Error('Fetch failed')
          return r.blob()
        })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob)
          blobTokens.current.add(objectUrl)
          setBlobMap(prev => ({ ...prev, [item.url]: objectUrl }))
        })
        .catch(() => {})
    })
  }, [files, selectedFile, blobMap])

  useEffect(() => {
    return () => { blobTokens.current.forEach((u) => URL.revokeObjectURL(u)) }
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const formData = new FormData()
    formData.append('file', e.target.files[0])

    try {
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('ASSET_INGESTED')
      fetchFiles()
    } catch {
      toast.error('INGESTION_PROTOCOL_FAILURE')
    }
  }

  const handleUrlLink = async () => {
    const url = window.prompt('Enter the external media URL to link:')
    if (!url) return
    if (!url.startsWith('http')) return toast.error('INVALID_URL_FORMAT')

    try {
      await api.post('/upload', { url })
      toast.success('URL_LINKED_SUCCESSFULLY')
      fetchFiles()
    } catch {
      toast.error('LINKING_PROTOCOL_FAILURE')
    }
  }

  const handleSaveMetadata = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    try {
      await api.patch(`/media/${selectedFile._id}`, { focalPoint })
      toast.success('METADATA_SYNCED')
      fetchFiles()
      setSelectedFile(files.find(f => f._id === selectedFile._id) || selectedFile) // update local
    } catch {
      toast.error('METADATA_SYNC_FAILED')
    } finally {
      setIsProcessing(false)
    }
  }

  const deleteFile = async (id: string) => {
    if (!confirm('Execute purge protocol for this node?')) return
    try {
      await api.delete(`/media/${id}`)
      toast.success('NODE_PURGED')
      if (selectedFile?._id === id) setSelectedFile(null)
      fetchFiles()
    } catch {
      toast.error('PURGE_SEQUENCE_TERMINATED')
    }
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Purge ${selectedIds.size} selected assets?`)) return
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/media/${id}`)))
      toast.success(`${selectedIds.size} ASSETS_PURGED`)
      setSelectedIds(new Set())
      if (selectedFile && selectedIds.has(selectedFile._id)) setSelectedFile(null)
      fetchFiles()
    } catch {
      toast.error('BULK_PURGE_FAILED')
    }
  }

  const filteredFiles = useMemo(() => {
    return files.filter((f: any) => {
      const matchesSearch = (f.name || f.alt || f._id || '').toLowerCase().includes(search.toLowerCase())
      const matchesFolder = activeFolder ? f.folder === activeFolder : true
      return matchesSearch && matchesFolder
    })
  }, [files, search, activeFolder])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === filteredFiles.length) return new Set()
      return new Set(filteredFiles.map((f) => f._id))
    })
  }

  // Calculate Metrics
  const metrics = useMemo(() => {
    let total = 0, images = 0, other = 0
    files.forEach(f => {
      const s = f.size || 0
      total += s
      if (f.mimetype?.startsWith('image')) images += s
      else other += s
    })
    return { total, images, other }
  }, [files])

  if (!activeSiteId) {
    return (
      <div className={cn('flex-1 h-full w-full flex flex-col items-center justify-center p-12 transition-colors duration-500', theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-z-primary')}>
        <Database size={48} className="text-z-secondary/30 mb-6" />
        <h2 className="text-xl font-semibold text-z-muted mb-2">No Site Selected</h2>
        <p className="text-sm font-medium text-z-secondary">Please select a site to manage its media registry.</p>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col transition-colors duration-300', theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-z-primary')}>
      
      {/* ── Storage Dashboard Header ───────────────────────────────────────── */}
      <div className="shrink-0 p-6 space-y-4 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 flex items-center justify-center shadow-sm border transition-colors', theme === 'dark' ? 'bg-z-hover border-z-border text-white' : 'bg-z-panel border-z-border text-z-primary')}>
              <HardDrive size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-none">Storage</h1>
              <p className="text-sm font-semibold text-z-secondary mt-1">Enterprise Media Registry</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleUrlLink}
              className={cn(
                'px-5 py-2.5 font-semibold text-sm transition-all leading-none flex items-center gap-2 shadow-sm',
                theme === 'dark' ? 'bg-z-hover text-white border border-z-border hover:bg-white/10' : 'bg-gray-100 text-black border border-z-border hover:bg-gray-200'
              )}
            >
              <Link2 size={14} strokeWidth={3} />
              Link URL
            </button>
            <label className={cn(
              'px-5 py-2.5 font-semibold text-sm transition-all leading-none flex items-center gap-2 cursor-pointer shadow-sm',
              theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-black'
            )}>
              <Plus size={14} strokeWidth={3} />
              Upload Asset
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border shadow-sm', theme === 'dark' ? 'bg-z-panel backdrop-blur-[12px] border-z-border' : 'bg-z-panel border-z-border/60')}>
          <div className="flex flex-col justify-between">
            <span className="text-sm font-semibold text-z-secondary flex items-center gap-1.5"><Server size={11} /> Adapter</span>
            <span className={cn('text-lg font-semibold  mt-1', theme === 'dark' ? 'text-white' : 'text-z-primary')}>
              {import.meta.env.VITE_S3_BUCKET ? 'AWS S3' : 'Local File System'}
            </span>
          </div>
          <div className="flex flex-col justify-between">
            <span className="text-sm font-semibold text-z-secondary flex items-center gap-1.5"><Database size={11} /> Mass</span>
            <span className={cn('text-lg font-semibold  mt-1 tabular-nums', theme === 'dark' ? 'text-white' : 'text-z-primary')}>
              {files.length} <span className="text-sm text-z-secondary ml-1">Assets</span>
            </span>
          </div>
          <div className="flex flex-col justify-between">
            <span className="text-sm font-semibold text-z-secondary flex items-center gap-1.5"><HardDrive size={11} /> Volume</span>
            <span className={cn('text-lg font-semibold  mt-1 tabular-nums text-z-active-text')}>
              {formatBytes(metrics.total)}
            </span>
          </div>
          <div className="flex flex-col justify-end gap-1.5">
            <div className="flex justify-between text-sm font-semibold text-z-secondary">
              <span>Images</span>
              <span>Data</span>
            </div>
            <div className={cn('w-full h-2 flex border overflow-hidden', theme === 'dark' ? 'border-white/10 bg-z-hover' : 'border-z-border bg-gray-100')}>
              <div 
                className="h-full bg-z-accent transition-all duration-1000" 
                style={{ width: `${metrics.total ? (metrics.images / metrics.total) * 100 : 0}%` }} 
              />
              <div 
                className="h-full bg-z-accent transition-all duration-1000" 
                style={{ width: `${metrics.total ? (metrics.other / metrics.total) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Workspace ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full px-6 pb-6 gap-6">
        
        {/* Left Sidebar - Folders */}
        <div className="hidden md:flex w-48 shrink-0 flex-col space-y-1 overflow-y-auto">
          <div className="text-sm font-semibold text-z-secondary px-3 py-2">
            Directories
          </div>
          <button
            onClick={() => setActiveFolder(null)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 transition-all text-sm font-bold',
              activeFolder === null
                ? (theme === 'dark' ? 'bg-z-hover text-white border-l-2 border-z-accent' : 'bg-gray-100 text-z-primary border-l-2 border-z-accent')
                : 'text-z-secondary hover:text-gray-700 hover:bg-gray-50 border-l-2 border-transparent dark:hover:bg-z-panel'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Archive size={14} className={activeFolder === null ? 'text-z-active-text' : 'opacity-40'} />
              All Assets
            </div>
          </button>
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 transition-all text-sm font-bold capitalize',
                activeFolder === folder
                  ? (theme === 'dark' ? 'bg-z-hover text-white border-l-2 border-z-accent' : 'bg-gray-100 text-z-primary border-l-2 border-z-accent')
                  : 'text-z-secondary hover:text-gray-700 hover:bg-gray-50 border-l-2 border-transparent dark:hover:bg-z-panel'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Database size={14} className={activeFolder === folder ? 'text-z-active-text' : 'opacity-40'} />
                {folder}
              </div>
            </button>
          ))}
        </div>

        {/* Center - File Grid/List */}
        <div className="flex-1 flex flex-col min-w-0 border bg-white dark:bg-black/40 border-z-border dark:border-z-border shadow-sm relative overflow-hidden">
          
          {/* Toolbar */}
          <div className={cn('flex items-center justify-between p-3 border-b z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md', theme === 'dark' ? 'border-z-border' : 'border-z-border')}>
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="p-1.5 text-z-secondary hover:text-z-active-text transition-colors">
                {selectedIds.size > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-z-muted" />
                <input 
                  type="text" 
                  placeholder="Filter assets..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={cn(
                    'pl-8 pr-3 py-1.5 text-sm font-medium w-48 transition-all outline-none border',
                    theme === 'dark' ? 'bg-z-panel border-white/10 text-white placeholder:text-gray-600 focus:border-z-accent/50' : 'bg-z-input border-z-border focus:border-z-accent/50'
                  )}
                />
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-2 border-l pl-4 border-z-border dark:border-white/10">
                  <span className="text-sm font-semibold text-z-active-text">
                    {selectedIds.size} Selected
                  </span>
                  <button onClick={bulkDelete} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors" title="Delete Selected">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200 text-black') : 'text-z-muted hover:text-gray-600 dark:hover:text-gray-300')}>
                <Grid size={15} />
              </button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200 text-black') : 'text-z-muted hover:text-gray-600 dark:hover:text-gray-300')}>
                <List size={15} />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
              <button onClick={fetchFiles} className="p-1.5 text-z-muted hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Asset View */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && files.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-z-muted animate-pulse">Scanning...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-z-muted gap-3">
                <Archive size={32} className="opacity-20" />
                <p className="text-sm font-bold">No assets found</p>
              </div>
            ) : viewMode === 'grid' ? (
              // GRID VIEW
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredFiles.map(file => {
                  const isSelected = selectedIds.has(file._id)
                  const isImage = file.mimetype?.startsWith('image')
                  return (
                    <div 
                      key={file._id}
                      onClick={() => setSelectedFile(file)}
                      className={cn(
                        'group relative border cursor-pointer transition-all duration-200 bg-white dark:bg-black',
                        isSelected ? 'border-z-accent ring-1 ring-z-active-border' : 'border-z-border dark:border-white/10 hover:border-z-active-border/50'
                      )}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(file._id) }}
                        className={cn(
                          'absolute top-2 left-2 z-20 p-1 bg-black/50 backdrop-blur text-white transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                      >
                        {isSelected ? <CheckSquare size={14} className="text-z-active-text" /> : <Square size={14} />}
                      </button>

                      <div className="aspect-square bg-gray-50 dark:bg-z-panel flex items-center justify-center overflow-hidden relative">
                        {isImage ? (
                          <img src={getFullUrl(file.url)} alt={file.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <Binary size={32} className="text-gray-300 dark:text-white/20" strokeWidth={1} />
                        )}
                      </div>
                      <div className="p-3 border-t border-z-border dark:border-z-border">
                        <p className="text-sm font-bold truncate text-z-primary dark:text-gray-200">{file.name || 'Unnamed'}</p>
                        <p className="text-sm font-semibold text-z-secondary mt-1">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // LIST VIEW
              <div className="w-full text-left">
                <div className="grid grid-cols-[auto_1fr_100px_100px_100px] gap-4 px-4 py-2 border-b border-z-border dark:border-white/10 text-sm font-semibold text-z-secondary sticky top-0 bg-white dark:bg-black/40 backdrop-blur z-10">
                  <div className="w-4"></div>
                  <div>Name</div>
                  <div>Size</div>
                  <div>Type</div>
                  <div>Date</div>
                </div>
                {filteredFiles.map(file => {
                  const isSelected = selectedIds.has(file._id)
                  const isImage = file.mimetype?.startsWith('image')
                  return (
                    <div 
                      key={file._id}
                      onClick={() => setSelectedFile(file)}
                      className={cn(
                        'grid grid-cols-[auto_1fr_100px_100px_100px] gap-4 px-4 py-2.5 items-center cursor-pointer border-b border-gray-50 dark:border-z-border hover:bg-gray-50 dark:hover:bg-z-panel transition-colors',
                        isSelected && 'bg-z-active-bg/50 dark:bg-z-active-bg'
                      )}
                    >
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(file._id) }} className={cn('text-z-muted', isSelected && 'text-z-active-text')}>
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 shrink-0 bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                           {isImage ? <img src={getFullUrl(file.url)} className="w-full h-full object-cover" /> : <FileText size={12} className="text-z-muted" />}
                        </div>
                        <span className="text-sm font-bold truncate text-z-primary dark:text-gray-200">{file.name || 'Unnamed'}</span>
                      </div>
                      <span className="text-sm text-gray-600 font-medium tabular-nums">{formatBytes(file.size)}</span>
                      <span className="text-sm font-semibold text-z-secondary truncate">{file.mimetype?.split('/')[1] || 'DATA'}</span>
                      <span className="text-sm text-gray-600 tabular-nums">{timeAgo(file.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Slide Out Forensics */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="shrink-0 h-full border bg-white dark:bg-black/60 backdrop-blur-xl border-z-border dark:border-z-border shadow-2xl flex flex-col overflow-hidden relative z-20"
            >
              <div className="flex items-center justify-between p-4 border-b border-z-border dark:border-white/10">
                <span className="text-sm font-semibold text-z-secondary flex items-center gap-2">
                  <Target size={12} /> Details
                </span>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Preview / Focal Point */}
                <div className="relative w-full aspect-square bg-gray-100 dark:bg-black/50 border border-z-border dark:border-white/10 overflow-hidden flex items-center justify-center group select-none">
                  {selectedFile.mimetype?.startsWith('image') ? (
                    <>
                      <img 
                        src={getFullUrl(selectedFile.url)} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                      {/* Focal Point Interaction Layer */}
                      <div 
                        className="absolute inset-0 cursor-crosshair"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
                          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
                          setFocalPoint({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
                          setIsFocalMode(true)
                        }}
                      />
                      {focalPoint && (
                        <div
                          className="absolute pointer-events-none transition-all duration-100 flex items-center justify-center"
                          style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%`, transform: 'translate(-50%, -50%)', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--z-accent)', boxShadow: '0 0 8px rgba(0,0,0,0.5)' }}
                        >
                          <div className="w-1 h-1 bg-z-accent rounded-full" />
                        </div>
                      )}
                    </>
                  ) : (
                    <Binary size={48} className="text-gray-300 dark:text-white/10" strokeWidth={0.5} />
                  )}
                </div>

                {isFocalMode && focalPoint && selectedFile.mimetype?.startsWith('image') && (
                  <div className="flex flex-col gap-2 p-3 bg-z-active-bg dark:bg-z-active-bg border border-z-active-border dark:border-z-accent/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-z-accent dark:text-z-active-text">Focal Matrix</span>
                      <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">X:{focalPoint.x} Y:{focalPoint.y}</span>
                    </div>
                    <button onClick={handleSaveMetadata} disabled={isProcessing} className="w-full py-1.5 bg-z-accent hover:bg-z-accent text-white text-sm font-semibold transition-colors">
                      {isProcessing ? 'Saving...' : 'Save Coordinates'}
                    </button>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-z-muted border-b border-z-border dark:border-white/10 pb-2">Properties</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-sm text-z-secondary">Name</span>
                      <span className="text-sm font-medium text-right break-all">{selectedFile.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-z-secondary">Size</span>
                      <span className="text-sm font-medium tabular-nums">{formatBytes(selectedFile.size)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-z-secondary">Type</span>
                      <span className="text-sm font-medium">{selectedFile.mimetype}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-z-secondary">Uploaded</span>
                      <span className="text-sm font-medium">{new Date(selectedFile.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-z-secondary">ID</span>
                      <span className="text-sm font-mono text-z-muted truncate max-w-[120px]">{selectedFile._id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-z-border dark:border-white/10 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-black/50">
                <a 
                  href={getFullUrl(selectedFile.url)} 
                  download 
                  className="flex items-center justify-center gap-2 py-2 border border-z-border dark:border-white/10 text-sm font-semibold hover:bg-white dark:hover:bg-z-hover transition-colors"
                >
                  <Download size={12} /> Download
                </a>
                <button 
                  onClick={() => deleteFile(selectedFile._id)}
                  className="flex items-center justify-center gap-2 py-2 text-rose-500 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-semibold transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
