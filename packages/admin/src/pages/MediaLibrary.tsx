import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
 Search,
 Trash2,
 Download,
 Plus,
 X,
 Database,
 Zap,
 Layers,
 RefreshCw,
 Archive,
 Maximize2,
 HardDrive,
 BoxSelect,
 Binary,
 Clock,
 Fingerprint,
 Cpu,
 CheckSquare,
 Square,
 RotateCw,
 RotateCcw,
 FlipHorizontal,
 FlipVertical,
 Crop,
 Save,
 Undo2,
 Target,
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useTenantStore } from '../lib/tenantStore'

const MediaLibrary = () => {
 const { theme } = useTheme()
 const activeSiteId = useTenantStore((state) => state.activeSiteId)
 const [files, setFiles] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [activeFolder, setActiveFolder] = useState<string | null>(null)
 const [folders, setFolders] = useState<string[]>([])
 const [selectedFile, setSelectedFile] = useState<any>(null)

 const [previewWidth, setPreviewWidth] = useState(1200)
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
 const [rotation, setRotation] = useState(0)
 const [flipX, setFlipX] = useState(false)
 const [flipY, setFlipY] = useState(false)
 const [isCropMode, setIsCropMode] = useState(false)
 const [isFocalMode, setIsFocalMode] = useState(false)
 const [focalPoint, setFocalPoint] = useState<{ x: number; y: number } | null>(null)
 const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
 const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
 const [isProcessing, setIsProcessing] = useState(false)
 const [saveName, setSaveName] = useState('')
 const isMountedRef = useRef(true)
 useEffect(() => { return () => { isMountedRef.current = false } }, [])

 useEffect(() => {
   if (selectedFile) {
     setFocalPoint(selectedFile.focalPoint || { x: 50, y: 50 })
   }
 }, [selectedFile])

 const handleSaveMetadata = async () => {
   if (!selectedFile) return
   setIsProcessing(true)
   try {
     await api.patch(`/media/${selectedFile._id}`, { focalPoint })
     toast.success('METADATA_SYNCED')
     fetchFiles()
   } catch {
     toast.error('METADATA_SYNC_FAILED')
   } finally {
     setIsProcessing(false)
   }
 }

 const filteredFiles = useMemo(() => {
 return files.filter((f: any) => {
 const matchesSearch = (f.name || f.alt || f.id || '')
 .toLowerCase()
 .includes(search.toLowerCase())
 const matchesFolder = activeFolder ? f.folder === activeFolder : true
 return matchesSearch && matchesFolder
 })
 }, [files, search, activeFolder])

 const toggleSelect = useCallback((id: string) => {
 setSelectedIds((prev) => {
 const next = new Set(prev)
 if (next.has(id)) {
 next.delete(id)
 } else {
 next.add(id)
 }
 return next
 })
 }, [])

 const toggleSelectAll = useCallback(() => {
 setSelectedIds((prev) => {
 if (prev.size === filteredFiles.length) return new Set()
 return new Set(filteredFiles.map((f) => f._id))
 })
 }, [filteredFiles])

 const bulkDelete = useCallback(async () => {
 if (selectedIds.size === 0) return
 if (!confirm(`Purge ${selectedIds.size} selected assets?`)) return
 try {
 await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/media/${id}`)))
 toast.success(`${selectedIds.size} ASSETS_PURGED`)
 setSelectedIds(new Set())
 fetchFiles()
 } catch {
 toast.error('BULK_PURGE_FAILED')
 }
 }, [selectedIds])

 const fetchFiles = async () => {
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
 console.error('Failed to fetch media')
 toast.error('REGISTRY_SYNC_FAILURE')
 } finally {
 setTimeout(() => setLoading(false), 500)
 }
 }

 useEffect(() => {
 const timer = setTimeout(() => {
 fetchFiles()
 }, 0)
 return () => clearTimeout(timer)
 }, [activeSiteId])

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

 const deleteFile = async (id: string) => {
 if (!confirm('Execute purge protocol for this node?')) return
 try {
 await api.delete(`/media/${id}`)
 toast.success('NODE_PURGED')
 fetchFiles()
 if (selectedFile?._id === id) setSelectedFile(null)
 } catch {
 toast.error('PURGE_SEQUENCE_TERMINATED')
 }
 }


  // Blob URL cache for authenticated media - prevents bare URLs that skip auth cookies
  const [blobMap, setBlobMap] = React.useState<Record<string, string>>({})
  const blobTokens = React.useRef<Set<string>>(new Set())

  const getFullUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return blobMap[url] || `${import.meta.env.VITE_API_URL || ''}${url}`
  }

 // Pre-fetch internal media URLs with credentials when files load
  React.useEffect(() => {
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

 React.useEffect(() => {
 return () => { blobTokens.current.forEach((u) => URL.revokeObjectURL(u)) }
 }, [])

 const resetTransform = () => {
    setRotation(0)
    setFlipX(false)
    setFlipY(false)
    setCropRect(null)
    setCropStart(null)
    setIsCropMode(false)
    setIsFocalMode(false)
    if (selectedFile) setFocalPoint(selectedFile.focalPoint || { x: 50, y: 50 })
  }

 const handleSaveTransformed = async () => {
 if (!selectedFile || !selectedFile.mimetype?.startsWith('image')) return
 setIsProcessing(true)
 try {
 const img = new Image()
 img.crossOrigin = 'anonymous'
 await new Promise<void>((resolve, reject) => {
 img.onload = () => resolve()
 img.onerror = () => reject(new Error('Image load failed'))
 img.src = getFullUrl(selectedFile.url)
 })

 const canvas = document.createElement('canvas')
 const ctx = canvas.getContext('2d')!

 let w = img.naturalWidth
 let h = img.naturalHeight

 // Apply crop first
 if (cropRect) {
 const scaleX = img.naturalWidth / previewWidth
 const scaleY = img.naturalHeight / (previewWidth * (img.naturalHeight / img.naturalWidth))
 w = cropRect.w * scaleX
 h = cropRect.h * scaleY
 }

 // Swap for 90/270 rotation
 if (rotation === 90 || rotation === 270) {
 canvas.width = h
 canvas.height = w
 } else {
 canvas.width = w
 canvas.height = h
 }

 ctx.save()
 ctx.translate(canvas.width / 2, canvas.height / 2)
 ctx.rotate((rotation * Math.PI) / 180)
 ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)

 if (cropRect) {
 const sx = cropRect.x * (img.naturalWidth / previewWidth)
 const sy = cropRect.y * (img.naturalHeight / (previewWidth * (img.naturalHeight / img.naturalWidth)))
 const sw = cropRect.w * (img.naturalWidth / previewWidth)
 const sh = cropRect.h * (img.naturalHeight / (previewWidth * (img.naturalHeight / img.naturalWidth)))
 ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h)
 } else {
 ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
 }

 ctx.restore()

 const blob = await new Promise<Blob>((resolve, reject) => {
 canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), selectedFile.mimetype || 'image/png')
 })

 const formData = new FormData()
 formData.append('file', blob, saveName || `transformed_${selectedFile.name || 'image'}`)

 await api.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 })
 toast.success('TRANSFORMED_ASSET_SAVED')
 resetTransform()
 fetchFiles()
 } catch {
 toast.error('TRANSFORM_FAILED')
 } finally {
 setIsProcessing(false)
 }
 }

 const handleMouseDownOnImage = (e: React.MouseEvent) => {
    if (isFocalMode) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      const xPct = Math.round((clickX / rect.width) * 100)
      const yPct = Math.round((clickY / rect.height) * 100)
      setFocalPoint({ x: Math.max(0, Math.min(100, xPct)), y: Math.max(0, Math.min(100, yPct)) })
      return
    }
    if (!isCropMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setCropRect(null)
 }

  const handleMouseMoveOnImage = (e: React.MouseEvent) => {
    if (!isCropMode || !cropStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const w = Math.abs(e.clientX - rect.left - cropStart.x)
    const h = Math.abs(e.clientY - rect.top - cropStart.y)
    setCropRect({ x: Math.min(cropStart.x, Math.max(0, e.clientX - rect.left)), y: Math.min(cropStart.y, Math.max(0, e.clientY - rect.top)), w, h })
  }

 const handleMouseUpOnImage = () => {
 setCropStart(null)
 }

 if (!activeSiteId) {
   return (
     <div className={cn('flex-1 h-screen w-full flex flex-col items-center justify-center p-12 transition-colors duration-500', theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900')}>
       <Database size={48} className="text-gray-500/30 mb-6" />
       <h2 className="text-xl font-black uppercase tracking-widest text-gray-400 mb-2">No Site Selected</h2>
       <p className="text-sm font-medium text-gray-500">Please select a site from the navigation menu to manage its media registry.</p>
     </div>
   )
 }

 if (loading && files.length === 0) {
 return (
 <div
 className={cn(
 'h-screen w-full flex flex-col items-center justify-center gap-8',
 theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
 )}
 >
 <div className="relative">
 <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-none-none animate-pulse" />
 <Cpu
 size={48}
 className="text-emerald-600 dark:text-emerald-500 animate-spin transition-all duration-1000"
 strokeWidth={1}
 />
 </div>
 <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 animate-pulse ">
 Scanning_Digital_Assets...
 </p>
 </div>
 )
 }

 return (
 <div
 className={cn(
 'p-6 space-y-6 min-h-screen transition-colors duration-500',
 theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
 )}
 >
 {/* 🏛️ Compact Header */}
 <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div className="flex items-center gap-5">
 <div
 className={cn(
 'w-14 h-14 rounded-none-none flex items-center justify-center shadow-lg transition-all',
 theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
 )}
 >
 <Archive size={28} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-3 mb-2">
 <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.4em] leading-none border px-2 py-1 rounded-none-none border-emerald-500/10 bg-emerald-500/5">
 OPERATIONAL_STORAGE
 </span>
 <div className="w-1.5 h-1.5 rounded-none-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
 </div>
 <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
 Media_Registry
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div
 className={cn(
 'hidden md:flex px-6 py-3 border rounded-none-none items-center gap-8 transition-colors',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <div className="flex flex-col items-end leading-none">
 <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
 Asset_Mass
 </span>
 <span className="text-xl font-black tracking-tighter">{files.length}</span>
 </div>
 <div className="w-px h-6 bg-white/10" />
 <div className="flex flex-col items-end leading-none">
 <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
 Status
 </span>
 <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 uppercase ">
 HARDENED
 </span>
 </div>
 </div>

 <label
 className={cn(
 'px-8 py-3.5 rounded-none-none font-black text-[11px] uppercase tracking-widest shadow-xl transition-all leading-none flex items-center gap-4 cursor-pointer',
 theme === 'dark'
 ? 'bg-white text-black hover:bg-gray-200'
 : 'bg-gray-900 text-white hover:bg-black'
 )}
 >
 <Plus size={16} strokeWidth={3} />
 INGEST_ASSET
 <input type="file" className="hidden" onChange={handleUpload} />
 </label>
 </div>
 </header>

 <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
 {/* Sleek Sidebar Navigation */}
 <div className="xl:col-span-1 space-y-1">
 <button
 onClick={() => setActiveFolder(null)}
 className={cn(
 'w-full flex items-center justify-between px-5 py-3.5 rounded-none-none transition-all group border border-transparent leading-none',
 activeFolder === null
 ? theme === 'dark'
 ? 'bg-white/[0.03] border-white/[0.08] text-white shadow-lg'
 : 'bg-white border-gray-200 shadow-sm shadow-lg text-gray-900'
 : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.02]'
 )}
 >
 <div className="flex items-center gap-4">
 <Database
 size={16}
 className={
 activeFolder === null ? 'text-emerald-600 dark:text-emerald-500' : 'opacity-30 group-hover:opacity-60'
 }
 />
 <div className="flex flex-col items-start">
 <span className="text-[10px] font-black uppercase tracking-tight ">
 ROOT_NODE
 </span>
 <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 opacity-60">
 System_Default
 </span>
 </div>
 </div>
 {activeFolder === null && (
 <div className="w-1 h-4 bg-emerald-500 rounded-none-none shadow-[0_0_8px_#10b981]" />
 )}
 </button>

 {folders.map((folder) => (
 <button
 key={folder}
 onClick={() => setActiveFolder(folder)}
 className={cn(
 'w-full flex items-center justify-between px-5 py-3.5 rounded-none-none transition-all group border border-transparent leading-none',
 activeFolder === folder
 ? theme === 'dark'
 ? 'bg-white/[0.03] border-white/[0.08] text-white shadow-lg'
 : 'bg-white border-gray-200 shadow-sm shadow-lg text-gray-900'
 : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.02]'
 )}
 >
 <div className="flex items-center gap-4">
 <Layers
 size={16}
 className={
 activeFolder === folder
 ? 'text-emerald-600 dark:text-emerald-500'
 : 'opacity-30 group-hover:opacity-60'
 }
 />
 <div className="flex flex-col items-start">
 <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[80px]">
 {folder.toUpperCase()}
 </span>
 <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 opacity-60">
 Collection
 </span>
 </div>
 </div>
 {activeFolder === folder && (
 <div className="w-1 h-4 bg-emerald-500 rounded-none-none shadow-[0_0_8px_#10b981]" />
 )}
 </button>
 ))}
 </div>

 {/* Grid Panel */}
 <div className="xl:col-span-5 space-y-6">
 <div
 className={cn(
 'flex items-center gap-4 px-6 border rounded-none-none shadow-sm relative transition-all group overflow-hidden backdrop-blur-3xl',
 theme === 'dark' ? 'bg-black/80 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <button
 onClick={toggleSelectAll}
 className="p-1 text-gray-500 hover:text-emerald-600 dark:text-emerald-400 transition-colors shrink-0"
 title={selectedIds.size === filteredFiles.length ? 'Deselect all' : 'Select all visible'}
 >
 {selectedIds.size > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
 </button>
 <Search
 className="text-gray-500 group-focus-within:text-emerald-600 dark:text-emerald-500 transition-colors"
 size={20}
 strokeWidth={1.5}
 />
 <input
 type="text"
 placeholder="SCAN_REGISTRY_INDICES..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-transparent py-5 text-[11px] font-black tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black placeholder:text-gray-700 uppercase transition-all"
 />
 <button
 onClick={fetchFiles}
 className={cn(
 'p-2 rounded-none-none transition-all',
 theme === 'dark'
 ? 'text-gray-500 hover:text-white'
 : 'text-gray-400 hover:text-emerald-600'
 )}
 >
 <RefreshCw
 size={18}
 className={cn('transition-transform duration-1000', loading ? 'animate-spin' : '')}
 />
 </button>
 </div>

 {/* Bulk action toolbar */}
 <AnimatePresence>
 {selectedIds.size > 0 && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className={cn(
 'flex items-center justify-between px-6 py-4 border shadow-lg backdrop-blur-md',
 theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'
 )}
 >
 <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
 <CheckSquare size={14} className="text-emerald-600 dark:text-emerald-500" />
 {selectedIds.size} asset{selectedIds.size !== 1 ? 's' : ''} selected
 </span>
 <div className="flex items-center gap-3">
 <button
 onClick={() => setSelectedIds(new Set())}
 className="px-4 py-2 text-[9px] font-black uppercase tracking-widest border rounded-none-none transition-all "
 >
 Clear
 </button>
 <button
 onClick={bulkDelete}
 className="px-4 py-2 text-[9px] font-black uppercase tracking-widest bg-red-600 text-white rounded-none-none hover:bg-red-700 transition-all flex items-center gap-2"
 >
 <Trash2 size={12} />
 Delete Selected
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
 <AnimatePresence mode="popLayout">
 {filteredFiles.map((file) => (
 <motion.div
 layout
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.98 }}
 key={file._id}
 onClick={() => setSelectedFile(file)}
 className={cn(
 'group relative border rounded-none-none overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-2xl hover:scale-[1.03]',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] hover:border-emerald-500/40'
 : 'bg-white border-gray-200 shadow-sm hover:border-emerald-200',
 selectedIds.has(file._id) && (theme === 'dark' ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-emerald-400 ring-1 ring-emerald-400/40')
 )}
 >
 {/* Selection checkbox */}
 <div
 onClick={(e) => { e.stopPropagation(); toggleSelect(file._id) }}
 className={cn(
 'absolute top-2 left-2 z-20 w-6 h-6 flex items-center justify-center border transition-all',
 selectedIds.has(file._id)
 ? 'bg-emerald-500 border-emerald-500 text-white'
 : 'bg-black/40 border-white/[0.08] text-white opacity-0 group-hover:opacity-100'
 )}
 >
 {selectedIds.has(file._id) ? <CheckSquare size={14} /> : <Square size={14} />}
 </div>

 <div className="aspect-square flex items-center justify-center bg-black/[0.03] overflow-hidden relative">
 {file.mimetype?.startsWith('image') ? (
 <img
 src={getFullUrl(file.url)}
 alt={file.alt}
 className="w-full h-full object-cover grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all duration-700"
 />
 ) : (
 <div className="flex flex-col items-center gap-3">
 <Binary size={40} strokeWidth={1} className="text-emerald-500/30" />
 <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest ">
 {file.mimetype?.split('/')[1] || 'DATA'}
 </span>
 </div>
 )}

 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
 <div className="flex gap-3">
 <div className="w-10 h-10 bg-white text-black rounded-none-none flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
 <Maximize2 size={18} />
 </div>
 <a
 href={getFullUrl(file.url)}
 download
 onClick={(e) => e.stopPropagation()}
 className="w-10 h-10 bg-white/10 text-white rounded-none-none flex items-center justify-center hover:bg-white hover:text-black transition-all"
 >
 <Download size={18} />
 </a>
 </div>
 </div>
 </div>

 <div
 className={cn(
 'p-4 border-t transition-colors',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08]'
 : 'bg-gray-50/20 border-gray-50'
 )}
 >
 <p className="text-[10px] font-black truncate uppercase tracking-tight leading-none mb-2">
 {file.name || 'UNIT_0x' + file._id.slice(-4)}
 </p>
 <div className="flex items-center justify-between">
 <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest ">
 {(file.size / 1024).toFixed(0)}KB
 </span>
 <div className="w-1 h-1 rounded-none-none bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" />
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 </div>
 </div>

 {/* 🧬 Forensics Synthesis Modal */}
 <AnimatePresence>
 {selectedFile && (
 <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setSelectedFile(null)}
 className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 30 }}
 className={cn(
 'w-full max-w-[1200px] h-full max-h-[800px] rounded-none-none overflow-hidden border shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col xl:row relative z-10',
 theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <div className="flex flex-col xl:flex-row h-full">
 {/* Visual Analysis Sector */}
 <div className="flex-1 bg-black/[0.1] flex items-center justify-center relative p-8 md:p-16 overflow-hidden min-h-[300px]">
 <div
 className="absolute inset-0 opacity-10 pointer-events-none"
 style={{
 backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
 backgroundSize: '40px 40px',
 }}
 />

 {selectedFile.mimetype?.startsWith('image') ? (
 <div className="relative z-10 w-full h-full flex items-center justify-center"
 onMouseDown={handleMouseDownOnImage}
 onMouseMove={handleMouseMoveOnImage}
 onMouseUp={handleMouseUpOnImage}
 onMouseLeave={handleMouseUpOnImage}
 >
 <img
 src={getFullUrl(selectedFile.url)}
 alt="Synthesis"
 style={{
 maxWidth: `${previewWidth}px`,
 transform: `rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
 }}
 className="max-h-full object-contain shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative rounded-none-none border border-white/[0.08] transition-transform duration-300 select-none"
 draggable={false}
 />
 {isCropMode && cropRect && (
 <div
 className="absolute border-2 border-emerald-500 bg-emerald-500/10 pointer-events-none z-30"
 style={{
 left: cropRect.x,
 top: cropRect.y,
 width: cropRect.w,
 height: cropRect.h,
 }}
 />
 )}
 {isFocalMode && focalPoint && (
 <div
 className="absolute pointer-events-none z-30 flex items-center justify-center transition-all duration-150"
 style={{
 left: `${focalPoint.x}%`,
 top: `${focalPoint.y}%`,
 transform: 'translate(-50%, -50%)',
 width: '28px',
 height: '28px',
 borderRadius: '50%',
 border: '2.5px solid #10B981',
 boxShadow: '0 0 12px #10B981, inset 0 0 4px #10B981',
 }}
 >
 <div className="w-[6px] h-[6px] rounded-none-full bg-emerald-500" />
 </div>
 )}
 {isFocalMode && focalPoint && (
 <div 
   className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-xl border border-white/10 p-4 rounded-none-none shadow-2xl flex items-center gap-6 z-40 transition-all pointer-events-auto"
   onMouseDown={(e) => e.stopPropagation()}
 >
   <div className="flex flex-col">
     <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1 flex items-center gap-2">
       <Target size={12} /> Precision Matrix
     </span>
     <span className="text-[13px] font-mono text-white tracking-widest">X:{focalPoint.x}% | Y:{focalPoint.y}%</span>
   </div>
   <button
     onClick={handleSaveMetadata}
     disabled={isProcessing}
     className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
   >
     {isProcessing ? 'SYNCING...' : 'SYNC_NODE'}
   </button>
 </div>
 )}
 </div>
 ) : (
 <div className="relative z-10 flex flex-col items-center gap-6">
 <div className="p-12 rounded-none-none bg-emerald-500/5 border border-emerald-500/10 shadow-2xl">
 <Binary
 size={80}
 className="text-emerald-600 dark:text-emerald-500 opacity-20"
 strokeWidth={0.5}
 />
 </div>
 <p className="text-[12px] font-black uppercase tracking-[0.8em] text-gray-500 ">
 BINARY_DATA_NODE
 </p>
 </div>
 )}

 <div className="absolute top-8 left-8 flex items-center gap-4 z-20">
 <div
 className={cn(
 'w-12 h-12 rounded-none-none flex items-center justify-center shadow-xl border',
 theme === 'dark'
 ? 'bg-white text-black border-white'
 : 'bg-gray-900 text-white border-gray-800'
 )}
 >
 <BoxSelect size={24} />
 </div>
 <div className="leading-none">
 <p className="text-[20px] font-black uppercase tracking-tighter leading-none mb-1.5">
 Asset_Forensics
 </p>
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-none-none bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
 <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.4em] ">
 NODE_SYNC_ACTIVE
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Tactical Control Module */}
 <div
 className={cn(
 'w-full xl:w-[400px] border-l p-10 space-y-10 overflow-y-auto no-scrollbar transition-colors',
 theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <h3 className="text-[24px] font-black uppercase tracking-tighter leading-none">
 Metadata
 </h3>
 <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em] ">
 Structural_Signature
 </p>
 </div>
 <button
 onClick={() => setSelectedFile(null)}
 className={cn(
 'w-12 h-12 rounded-none-none transition-all flex items-center justify-center border shadow-lg group hover:rotate-90',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-white'
 : 'bg-white border-gray-200 shadow-sm text-gray-400 hover:text-gray-900'
 )}
 >
 <X size={20} />
 </button>
 </div>

 <div className="space-y-8">
 {/* Resolution Matrix */}
 <div className="space-y-4">
 <div className="flex justify-between items-end px-1">
 <div className="flex items-center gap-3 text-gray-500">
 <Maximize2 size={12} />
 <span className="text-[9px] font-black uppercase tracking-widest ">
 Simulation_Scale
 </span>
 </div>
 <span className="text-[18px] font-black text-emerald-600 dark:text-emerald-500 tracking-tighter">
 {previewWidth}PX
 </span>
 </div>
 <input
 type="range"
 min="300"
 max="4000"
 step="100"
 value={previewWidth}
 onChange={(e) => setPreviewWidth(parseInt(e.target.value))}
 className="w-full appearance-none bg-emerald-500/10 h-1 rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black cursor-pointer accent-emerald-500"
 />
 </div>

 {/* Transformation Matrix */}
 {selectedFile.mimetype?.startsWith('image') && (
 <div className="space-y-4">
 <div className="flex items-center gap-3 text-gray-500 px-1">
 <Crop size={12} />
 <span className="text-[9px] font-black uppercase tracking-widest ">
 Transformation_Matrix
 </span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
 <button
 onClick={() => setRotation((r) => (r + 270) % 360)}
 className={cn(
 'p-3 rounded-none-none border flex items-center justify-center transition-all',
 theme === 'dark' ? 'border-white/[0.08] hover:border-white/30 text-gray-400' : 'border-gray-200 shadow-sm hover:border-gray-300'
 )}
 title="Rotate 90° CCW"
 >
 <RotateCcw size={16} />
 </button>
 <button
 onClick={() => setRotation((r) => (r + 90) % 360)}
 className={cn(
 'p-3 rounded-none-none border flex items-center justify-center transition-all',
 theme === 'dark' ? 'border-white/[0.08] hover:border-white/30 text-gray-400' : 'border-gray-200 shadow-sm hover:border-gray-300'
 )}
 title="Rotate 90° CW"
 >
 <RotateCw size={16} />
 </button>
 <button
 onClick={() => setFlipX((f) => !f)}
 className={cn(
 'p-3 rounded-none-none border flex items-center justify-center transition-all',
 flipX
 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-500'
 : theme === 'dark' ? 'border-white/[0.08] hover:border-white/30 text-gray-400' : 'border-gray-200 shadow-sm hover:border-gray-300'
 )}
 title="Flip horizontal"
 >
 <FlipHorizontal size={16} />
 </button>
 <button
 onClick={() => setFlipY((f) => !f)}
 className={cn(
 'p-3 rounded-none-none border flex items-center justify-center transition-all',
 flipY
 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-500'
 : theme === 'dark' ? 'border-white/[0.08] hover:border-white/30 text-gray-400' : 'border-gray-200 shadow-sm hover:border-gray-300'
 )}
 title="Flip vertical"
 >
 <FlipVertical size={16} />
 </button>
 </div>
 <div className="flex gap-2">
 <button
   onClick={() => { setIsFocalMode((c) => !c); setIsCropMode(false); }}
   className={cn(
     'flex-1 py-3 rounded-none-none text-[9px] font-black uppercase tracking-widest transition-all leading-none flex items-center justify-center gap-2 border',
     isFocalMode
       ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-500'
       : theme === 'dark' ? 'border-white/[0.08] text-gray-400 hover:border-white/30' : 'border-gray-200 shadow-sm hover:border-gray-300'
   )}
 >
   <Target size={12} /> {isFocalMode ? 'FOCAL_ACTIVE' : 'FOCAL_PT'}
 </button>
 <button
 onClick={() => { setIsCropMode((c) => !c); setIsFocalMode(false); }}
 className={cn(
 'flex-1 py-3 rounded-none-none text-[9px] font-black uppercase tracking-widest transition-all leading-none flex items-center justify-center gap-2 border',
 isCropMode
 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-500'
 : theme === 'dark' ? 'border-white/[0.08] text-gray-400 hover:border-white/30' : 'border-gray-200 shadow-sm hover:border-gray-300'
 )}
 >
 <Crop size={12} /> {isCropMode ? 'CROP_ACTIVE' : 'CROP'}
 </button>
 {rotation !== 0 || flipX || flipY || cropRect ? (
 <button
 onClick={resetTransform}
 className={cn(
 'py-3 px-4 rounded-none-none text-[9px] font-black uppercase tracking-widest transition-all leading-none flex items-center justify-center gap-2 border',
 theme === 'dark' ? 'border-white/[0.08] text-gray-400 hover:text-red-400 hover:border-red-400/30' : 'border-gray-200 shadow-sm hover:text-red-500 hover:border-red-300'
 )}
 >
 <Undo2 size={12} /> RESET
 </button>
 ) : null}
 </div>
 {(rotation !== 0 || flipX || flipY || cropRect) && (
 <div className="flex gap-2">
 <input
 type="text"
 value={saveName}
 onChange={(e) => setSaveName(e.target.value)}
 placeholder="transformed_filename.ext"
 className={cn(
 'flex-1 px-3 py-3 text-[9px] font-mono border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black bg-transparent',
 theme === 'dark' ? 'border-white/[0.08] text-white' : 'border-gray-200 shadow-sm'
 )}
 />
 <button
 onClick={handleSaveTransformed}
 disabled={isProcessing}
 className={cn(
 'px-6 py-3 rounded-none-none text-[9px] font-black uppercase tracking-widest transition-all leading-none flex items-center justify-center gap-2',
 isProcessing
 ? 'bg-gray-500 text-gray-300'
 : 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 shadow-lg'
 )}
 >
 <Save size={12} /> {isProcessing ? 'SAVING...' : 'SAVE'}
 </button>
 </div>
 )}
 </div>
 )}

 {/* Data Points Grid */}
 <div className="grid grid-cols-1 gap-3">
 {[
 {
 label: 'Asset_Mass',
 value: (selectedFile.size / 1024).toFixed(1) + ' KB',
 icon: HardDrive,
 },
 {
 label: 'Encoding',
 value: selectedFile.mimetype?.split('/')[1]?.toUpperCase() || 'DATA',
 icon: Binary,
 },
 {
 label: 'Ingested',
 value: new Date(selectedFile.createdAt).toLocaleDateString(),
 icon: Clock,
 },
 {
 label: 'Unique_ID',
 value: selectedFile._id.slice(-12).toUpperCase(),
 icon: Fingerprint,
 },
 ].map((item, i) => (
 <div
 key={i}
 className={cn(
 'p-4 border rounded-none-none flex items-center justify-between group transition-all',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08] hover:bg-white/[0.03]'
 : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4">
 <item.icon
 size={14}
 className="text-gray-500 group-hover:text-emerald-600 dark:text-emerald-500 transition-colors"
 />
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">
 {item.label}
 </span>
 </div>
 <span className="text-[11px] font-black tracking-tight">
 {item.value}
 </span>
 </div>
 ))}
 </div>

 <div className="space-y-4 pt-4">
 <div className="flex flex-col gap-2">
 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">
 Gateway_Pointer
 </label>
 <div
 className={cn(
 'p-4 rounded-none-none border font-mono text-[9px] break-all leading-relaxed shadow-inner opacity-60',
 theme === 'dark'
 ? 'bg-black border-white/[0.08]'
 : 'bg-gray-100 border-gray-200'
 )}
 >
 {selectedFile.url}
 </div>
 </div>

 <div className="flex gap-3">
 <button
 onClick={() => {
 navigator.clipboard.writeText(selectedFile.url)
 toast.success('POINTER_EXTRACTED')
 }}
 className={cn(
 'flex-1 py-4 rounded-none-none text-[10px] font-black uppercase tracking-widest transition-all shadow-lg leading-none flex items-center justify-center gap-3',
 theme === 'dark'
 ? 'bg-white text-black hover:bg-gray-200'
 : 'bg-gray-900 text-white hover:bg-black'
 )}
 >
 <Zap size={14} /> EXTRACT
 </button>
 <button
 onClick={() => deleteFile(selectedFile._id)}
 className={cn(
 'w-14 h-14 rounded-none-none border flex items-center justify-center transition-all hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-500'
 : 'bg-white border-gray-200 shadow-sm text-gray-400'
 )}
 >
 <Trash2 size={20} />
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default MediaLibrary
