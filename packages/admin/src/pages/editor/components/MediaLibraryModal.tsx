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

import { useShallow } from 'zustand/react/shallow'

const fileFullUrl = (file: any): string => {
 if (!file.url) return ''
 if (file.url.startsWith('http')) return file.url
 return `${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${file.url}`
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
 className="absolute inset-0 bg-[var(--z-bg-modal)] backdrop-blur-md"
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
 'text-lg font-semibold  leading-none',
 theme === 'dark' ? 'text-z-primary' : 'text-z-primary',
 )}
 >
 Asset Registry
 </h3>
 <button
 type="button"
 onClick={() => setMediaLibraryOpen(false)}
 aria-label="Close"
 className={cn(
 'p-1 transition-colors',
 theme === 'dark' ? 'text-z-muted hover:text-z-secondary ' : 'text-z-secondary hover:text-z-secondary'
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
 theme === 'dark' ? 'text-z-secondary group-focus-within:text-z-secondary' : 'text-z-muted group-focus-within:text-z-secondary'
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
 ? 'bg-z-hover border border-z-border text-z-primary placeholder:text-z-secondary focus-visible:border-z-border/40 focus-visible:bg-z-panel/[0.05]'
 : 'bg-[var(--z-bg-input)] border border-z-border text-z-primary placeholder:text-z-muted focus-visible:border-z-border focus-visible:bg-z-panel'
 )}
 />
 </div>

 {/* Type filter */}
 <select
 aria-label="Filter by file type"
 value={mediaTypeFilter}
 onChange={(e) => setMediaTypeFilter(e.target.value)}
 className={cn(
 'rounded-none-none border py-3 px-4 text-xs font-semibold  transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-muted focus-visible:border-z-border/40'
 : 'bg-[var(--z-bg-hover)] border-z-border text-z-secondary focus-visible:border-z-border'
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
 'flex items-center gap-2 px-5 py-3 rounded-none-none border cursor-pointer transition-all text-xs font-semibold  ',
 theme === 'dark'
 ? 'bg-z-accent/20 border-z-border/30 text-z-secondary hover:bg-z-accent/30 hover:border-z-border/50'
 : 'bg-z-input border-z-border text-z-primary hover:bg-[var(--z-bg-hover)] hover:border-z-border-strong'
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
 <Loader2 size={36} className="animate-spin text-z-secondary " />
 <span className="text-xs font-semibold text-z-secondary animate-pulse">
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
 theme === 'dark' ? 'border-z-border text-z-secondary' : 'border-z-border text-z-secondary'
 )}>
 <ImageIcon size={28} />
 </div>
 <p className={cn(
 'text-xs font-semibold  ',
 'text-z-secondary'
 )}>
 No assets in the registry
 </p>
 <span className={cn(
 'text-xs font-bold  ',
 theme === 'dark' ? 'text-z-primary' : 'text-z-secondary'
 )}>
 Upload files using the ingest button above
 </span>
 </div>
 )
 }

 if (filteredAssets.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center h-40 gap-3">
 <Search size={28} className={theme === 'dark' ? 'text-z-primary' : 'text-z-secondary'} />
 <span className={cn(
 'text-xs font-semibold  ',
 'text-z-secondary'
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
 const url = fileFullUrl(file)
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
 theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-input)]'
 )}>
 <File size={24} className={'text-z-secondary'} />
 <span className={cn(
 'text-sm font-semibold   text-center px-1 truncate w-full',
 'text-z-secondary'
 )}>
 {(file.mimetype || 'file').split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
 </span>
 </div>
 )}
 {/* Hover overlay */}
 <div className={cn(
 'absolute inset-0 flex flex-col items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity',
 theme === 'dark' ? 'bg-gradient-to-t from-[var(--z-bg-panel)] via-[var(--z-bg-base)]' : 'bg-gradient-to-t from-[var(--z-bg-panel)] via-[var(--z-bg-base)]'
 )}>
 <p className="text-z-primary text-xs font-semibold truncate w-full leading-tight">
 {file.name}
 </p>
 {file.size && (
 <span className="text-z-primary/50 text-xs font-bold">
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
 'mt-1.5 px-2 py-1 rounded-none-none border text-xs font-semibold  transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-primary/70 hover:border-z-border hover:text-z-primary bg-z-hover'
 : 'border-z-border text-z-primary/80 hover:border-z-border0 hover:text-z-primary bg-z-panel/10'
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
 'mt-1 px-2 py-1 rounded-none-none border text-xs font-semibold  transition-all',
 'border-z-border/40 text-z-secondary hover:border-z-border hover:text-z-secondary bg-z-panel'
 )}
 >
 Select
 </button>
 </div>
 {/* Type badge */}
 <div className={cn(
 'absolute top-1.5 left-1.5 px-1.5 py-0.5 text-sm font-semibold  border rounded-none-none',
 theme === 'dark'
 ? 'bg-app/60 border-z-border text-z-muted'
 : 'bg-z-panel/80 border-z-border text-z-secondary'
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
 theme === 'dark' ? 'border-z-border bg-z-panel/[0.015]' : 'border-z-border shadow-sm bg-[var(--z-bg-input)]'
 )}>
 <span className={cn(
 'text-xs font-bold  ',
 theme === 'dark' ? 'text-z-secondary' : 'text-z-muted'
 )}>
 Click any asset to copy its URL • Supports images, video, audio, PDF
 </span>
 <button
 type="button"
 onClick={() => setMediaLibraryOpen(false)}
 aria-label="Close media library"
 className={cn(
 'px-5 py-2 text-xs font-semibold  rounded-none-none border transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-z-primary'
 : 'border-z-border text-z-secondary hover:border-z-border-strong hover:text-z-primary'
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
