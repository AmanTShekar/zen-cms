import React, { useRef, useMemo } from 'react'
import { X, Image as ImageIcon, Search, Upload, Loader2, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useModalStore } from '../../../store/modalStore'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import { registerMediaBlob } from '../../../components/lexical/nodes/MediaNode'
import { useShallow } from 'zustand/react/shallow'

const fileFullUrl = (file: any, blobMap: Record<string, string>): string => {
 if (!file.url) return ''
 if (file.url.startsWith('http')) return file.url
 return blobMap[file.url] || `${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${file.url}`
}

export const MediaLibraryModal: React.FC = () => {
 const { theme } = useTheme()
 const { mediaLibraryOpen, setMediaLibraryOpen  } = useModalStore(useShallow(state => ({ mediaLibraryOpen: state.mediaLibraryOpen, setMediaLibraryOpen: state.setMediaLibraryOpen })))
 const { mediaAssets,
 setMediaAssets,
 mediaSearch,
 setMediaSearch,
 mediaTypeFilter,
 setMediaTypeFilter,
 mediaLoading,
 setMediaLoading,
  } = useEditorStore(useShallow(state => ({ mediaAssets: state.mediaAssets, setMediaAssets: state.setMediaAssets, mediaSearch: state.mediaSearch, setMediaSearch: state.setMediaSearch, mediaTypeFilter: state.mediaTypeFilter, setMediaTypeFilter: state.setMediaTypeFilter, mediaLoading: state.mediaLoading, setMediaLoading: state.setMediaLoading })))

 const [blobMap, setBlobMap] = React.useState<Record<string, string>>({})
 const blobTokens = useRef<Set<string>>(new Set())

 // Pre-fetch media assets with credentials when modal opens
 React.useEffect(() => {
 if (!mediaLibraryOpen || !mediaAssets.length) return
 const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
 const uncached = mediaAssets.filter((f: any) => f.url && !f.url.startsWith('http') && !blobMap[f.url])
 uncached.forEach((file: any) => {
 fetch(`${apiBase}${file.url}`, { credentials: 'include' })
 .then((r) => r.blob())
 .then((blob) => {
 const objectUrl = URL.createObjectURL(blob)
 blobTokens.current.add(objectUrl)
 setBlobMap(prev => ({ ...prev, [file.url]: objectUrl }))
 registerMediaBlob(file.url, objectUrl)
 })
 .catch(() => {})
 })
 }, [mediaLibraryOpen, mediaAssets])

 React.useEffect(() => {
 return () => { blobTokens.current.forEach((u) => URL.revokeObjectURL(u)) }
 }, [])

 React.useEffect(() => {
 if (!mediaLibraryOpen) return
 setMediaSearch('')
 setMediaTypeFilter('all')
 setMediaLoading(true)
 api.get('/media')
 .then((res) => {
 setMediaAssets(res.data.data || [])
 })
 .catch(() => {})
 .finally(() => {
 setMediaLoading(false)
 })
 }, [mediaLibraryOpen, setMediaAssets, setMediaLoading, setMediaSearch, setMediaTypeFilter])

 // Pre-filter assets to avoid duplicating filter logic in render
 const filteredAssets = useMemo(() => {
 return mediaAssets.filter((file) => {
 const matchSearch = !mediaSearch ||
 file.name?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
 file.alt?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
 file.url?.toLowerCase().includes(mediaSearch.toLowerCase())
 const fileType = file.mimetype || ''
 const matchType = mediaTypeFilter === 'all' ||
 (mediaTypeFilter === 'image' && fileType.startsWith('image/')) ||
 (mediaTypeFilter === 'video' && fileType.startsWith('video/')) ||
 (mediaTypeFilter === 'audio' && fileType.startsWith('audio/')) ||
 (mediaTypeFilter === 'application/pdf' && fileType.includes('pdf')) ||
 (mediaTypeFilter === 'other' && !fileType.startsWith('image/') && !fileType.startsWith('video/') && !fileType.startsWith('audio/') && !fileType.includes('pdf'))
 return matchSearch && matchType
 })
 }, [mediaAssets, mediaSearch, mediaTypeFilter])

 const dialogRef = useRef<HTMLDivElement>(null)
 const modalTitleId = 'media-library-modal-title'

 useFocusTrap(mediaLibraryOpen, {
 onEscape: () => setMediaLibraryOpen(false),
 containerRef: dialogRef
 })

 return (
 <AnimatePresence>
 {mediaLibraryOpen && (
 <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 md:p-10">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setMediaLibraryOpen(false)}
 className="absolute inset-0 bg-black/80 backdrop-blur-md"
 />
 <motion.div
 ref={dialogRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby={modalTitleId}
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className={cn(
 'w-full max-w-6xl border rounded-none-none overflow-hidden shadow-2xl flex flex-col h-[85vh]',
 theme === 'dark'
 ? 'bg-[#0a0a0a] border-z-border'
 : 'bg-z-panel border-z-border'
 )}
 >
 <div
 className={cn(
 'p-6 border-b flex items-center justify-between shrink-0',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm',
 )}
 >
 <h3
 id={modalTitleId}
 className={cn(
 'text-lg font-black uppercase leading-none',
 theme === 'dark' ? 'text-white' : 'text-black',
 )}
 >
 Asset Registry
 </h3>
 <button
 onClick={() => setMediaLibraryOpen(false)}
 aria-label="Close"
 className={cn(
 'p-1 transition-colors',
 theme === 'dark' ? 'text-z-muted hover:text-gray-600 dark:text-z-secondary' : 'text-z-secondary hover:text-gray-600'
 )}
 >
 <X size={18} />
 </button>
 </div>

 {/* Toolbar: search, filters, upload */}
 <div className={cn(
 'flex items-center gap-4 px-8 py-4 border-b shrink-0',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <div className="relative group flex-1">
 <Search
 className={cn(
 'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
 theme === 'dark' ? 'text-gray-555 group-focus-within:text-gray-600 dark:text-z-muted' : 'text-z-muted group-focus-within:text-gray-600'
 )}
 size={15}
 />
 <input
 type="text"
 aria-label="Search assets"
 placeholder="Search assets by name or type..."
 value={mediaSearch}
 onChange={(e) => setMediaSearch(e.target.value)}
 className={cn(
 'w-full rounded-none-none pl-12 pr-4 py-3 text-xs font-bold transition-all',
 theme === 'dark'
 ? 'bg-z-hover border border-z-border text-white placeholder:text-gray-600 focus-visible:border-gray-500/40 focus-visible:bg-white/[0.05]'
 : 'bg-gray-50 border border-z-border text-z-primary placeholder:text-z-muted focus-visible:border-gray-400 focus-visible:bg-white'
 )}
 />
 </div>

 {/* Type filter */}
 <select
 aria-label="Filter by file type"
 value={mediaTypeFilter}
 onChange={(e) => setMediaTypeFilter(e.target.value)}
 className={cn(
 'rounded-none-none border py-3 px-4 text-xs font-black uppercase transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-muted focus-visible:border-gray-500/40'
 : 'bg-gray-55 border-z-border text-gray-600 focus-visible:border-gray-400'
 )}
 >
 <option value="all">All Types</option>
 <option value="image">Images</option>
 <option value="video">Video</option>
 <option value="audio">Audio</option>
 <option value="application/pdf">PDF</option>
 <option value="other">Other</option>
 </select>

 {/* Upload button */}
 <label className={cn(
 'flex items-center gap-2 px-5 py-3 rounded-none-none border cursor-pointer transition-all text-xs font-black uppercase tracking-wider',
 theme === 'dark'
 ? 'bg-gray-600/20 border-gray-500/30 text-gray-300 hover:bg-gray-600/30 hover:border-gray-500/50'
 : 'bg-z-input border-z-border text-gray-700 hover:bg-gray-100 hover:border-z-border-strong'
 )}>
 <Upload size={14} />
 Ingest
 <input
 type="file"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0]
 if (!file) return
 const formData = new FormData()
 formData.append('file', file)
 try {
 const res = await api.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 })
 setMediaAssets([res.data.data, ...mediaAssets])
 toast.success(`"${file.name}" ingested`)
 } catch {
 toast.error('Upload failed')
 }
 }}
 />
 </label>
 </div>

 {/* Asset Grid */}
 <div className="flex-1 overflow-y-auto p-6">
 {mediaLoading ? (
 <div className="flex flex-col items-center justify-center h-full gap-5">
 <Loader2 size={36} className="animate-spin text-gray-600 dark:text-z-secondary" />
 <span className="text-xs font-black uppercase text-gray-600 dark:text-z-muted tracking-[0.3em] animate-pulse">
 Loading Registry...
 </span>
 </div>
 ) : (
 (() => {
 if (mediaAssets.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
 <div className={cn(
 'w-16 h-16 rounded-none-none border-2 border-dashed flex items-center justify-center',
 theme === 'dark' ? 'border-z-border text-gray-600' : 'border-z-border text-gray-300'
 )}>
 <ImageIcon size={28} />
 </div>
 <p className={cn(
 'text-xs font-black uppercase tracking-wider',
 theme === 'dark' ? 'text-gray-600' : 'text-z-muted'
 )}>
 No assets in the registry
 </p>
 <span className={cn(
 'text-xs font-bold uppercase tracking-widest',
 theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
 )}>
 Upload files using the ingest button above
 </span>
 </div>
 )
 }

 if (filteredAssets.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center h-40 gap-3">
 <Search size={28} className={theme === 'dark' ? 'text-gray-700' : 'text-gray-300'} />
 <span className={cn(
 'text-xs font-black uppercase ',
 theme === 'dark' ? 'text-gray-600' : 'text-z-muted'
 )}>
 No assets match your filter
 </span>
 </div>
 )
 }

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
 {filteredAssets.map((file, i) => {
 const isImage = (file.mimetype || '').startsWith('image/')
 const url = fileFullUrl(file, blobMap)
 return (
 <motion.div
 key={file._id || i}
 role="button"
 tabIndex={0}
 aria-label={`Asset: ${file.name}${file.mimetype ? `, ${file.mimetype.split('/')[1]?.toUpperCase()}` : ''}. Press Enter to copy URL.`}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: Math.min(i * 0.015, 1) }}
 className="group relative aspect-square border rounded-none-none overflow-hidden cursor-pointer transition-all hover:scale-[1.04] hover:z-10"
 onClick={() => {
 navigator.clipboard.writeText(url).catch(() => {})
 toast.success('URL copied to clipboard')
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault()
 navigator.clipboard.writeText(url).catch(() => {})
 toast.success('URL copied to clipboard')
 }
 }}
 >
 {isImage ? (
 <img
 src={url}
 alt={file.alt || file.name || ''}
 className="w-full h-full object-cover"
 loading="lazy"
 />
 ) : (
 <div className={cn(
 'w-full h-full flex flex-col items-center justify-center gap-2',
 theme === 'dark' ? 'bg-z-hover' : 'bg-gray-50'
 )}>
 <File size={24} className={theme === 'dark' ? 'text-z-secondary' : 'text-z-muted'} />
 <span className={cn(
 'text-[7px] font-black uppercase tracking-widest text-center px-1 truncate w-full',
 theme === 'dark' ? 'text-gray-600' : 'text-z-muted'
 )}>
 {(file.mimetype || 'file').split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
 </span>
 </div>
 )}
 {/* Hover overlay */}
 <div className={cn(
 'absolute inset-0 flex flex-col items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity',
 theme === 'dark' ? 'bg-gradient-to-t from-black/90 via-black/40' : 'bg-gradient-to-t from-black/80 via-black/20'
 )}>
 <p className="text-white text-xs font-black uppercase truncate w-full leading-tight">
 {file.name}
 </p>
 {file.size && (
 <span className="text-white/50 text-xs font-bold uppercase ">
 {(file.size / 1024).toFixed(1)} KB
 </span>
 )}
 {/* Copy URL button */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation()
 navigator.clipboard.writeText(url)
 toast.success('URL copied')
 }}
 className={cn(
 'mt-1.5 px-2 py-1 rounded-none-none border text-xs font-black uppercase transition-all',
 theme === 'dark'
 ? 'border-z-border text-white/70 hover:border-white/40 hover:text-white bg-z-hover'
 : 'border-white/30 text-white/80 hover:border-z-border0 hover:text-white bg-white/10'
 )}
 >
 Copy URL
 </button>
 {/* Select for editor button */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation()
 window.dispatchEvent(new CustomEvent('zenith:media-selected', {
 detail: {
 url: url,
 alt: file.alt || file.name || '',
 mimeType: file.mimetype || 'image/jpeg',
 width: (file as any).width,
 height: (file as any).height,
 },
 }))
 setMediaLibraryOpen(false)
 toast.success('Media selected')
 }}
 className={cn(
 'mt-1 px-2 py-1 rounded-none-none border text-xs font-black uppercase transition-all',
 'border-gray-500/40 text-gray-600 dark:text-z-muted hover:border-gray-500 hover:text-gray-300 bg-gray-500/10'
 )}
 >
 Select
 </button>
 </div>
 {/* Type badge */}
 <div className={cn(
 'absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[6px] font-black uppercase border rounded-none-none',
 theme === 'dark'
 ? 'bg-black/60 border-z-border text-z-muted'
 : 'bg-white/80 border-z-border text-z-secondary'
 )}>
 {(file.mimetype || 'file').split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
 </div>
 </motion.div>
 )
 })}
 </div>
 )
 })()
 )}
 </div>

 {/* Footer */}
 <div className={cn(
 'flex items-center justify-between px-8 py-3 border-t shrink-0',
 theme === 'dark' ? 'border-z-border bg-white/[0.015]' : 'border-z-border shadow-sm bg-gray-50'
 )}>
 <span className={cn(
 'text-xs font-bold uppercase tracking-widest',
 theme === 'dark' ? 'text-gray-655' : 'text-z-muted'
 )}>
 Click any asset to copy its URL • Supports images, video, audio, PDF
 </span>
 <button
 onClick={() => setMediaLibraryOpen(false)}
 aria-label="Close media library"
 className={cn(
 'px-5 py-2 text-xs font-black uppercase rounded-none-none border transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-white'
 : 'border-z-border text-gray-600 hover:border-z-border-strong hover:text-black'
 )}
 >
 Close
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 )
}
