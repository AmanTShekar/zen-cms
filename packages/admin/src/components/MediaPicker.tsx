import React, { useEffect, useState } from 'react'
import { Image as ImageIcon, X, Plus, Search, Check, Loader2, UploadCloud } from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'react-hot-toast'
import { FocalPointCropper } from './FocalPointCropper'
import EmptyState from './EmptyState'
import { useTheme } from '../context/ThemeContext'

interface MediaPickerProps {
 value?: any
 onChange: (value: any) => void
 hasMany?: boolean
 disabled?: boolean
 /** Enable the focal point editor step after image selection */
 focalPoint?: boolean
}

const MediaPicker: React.FC<MediaPickerProps> = ({ value, onChange, hasMany, disabled = false, focalPoint = false }) => {
 const { theme } = useTheme()
 const [isOpen, setIsOpen] = useState(false)
 const [files, setFiles] = useState<any[]>([])
 const [loading, setLoading] = useState(false)
 const [search, setSearch] = useState('')
 // Focal point state: null = not active, { file, candidate } = pending confirmation
 const [focalPending, setFocalPending] = useState<any>(null)

 const selectedFiles = Array.isArray(value) ? value : value ? [value] : []

 // Blob URL cache for authenticated media — prevents naked <img src> that skip auth cookies
 const blobMap = React.useRef<Record<string, string>>({})
 const blobTokens = React.useRef<Set<string>>(new Set())

 const getMediaUrl = (url: string): string => {
 if (!url) return ''
 if (url.startsWith('http')) return url
 // Return cached blob URL if already fetched
 return blobMap.current[url] || url
 }

 // Pre-fetch internal media URLs with auth credentials when files change
 useEffect(() => {
 if (!files.length) return
 const toFetch = files.filter((f: any) => f.url && !f.url.startsWith('http') && !blobMap.current[f.url])
 if (!toFetch.length) return
 const apiUrl = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
 toFetch.forEach((file: any) => {
 fetch(`${apiUrl}${file.url}`, { credentials: 'include' })
 .then((r) => r.blob())
 .then((blob) => {
 const objectUrl = URL.createObjectURL(blob)
 blobTokens.current.add(objectUrl)
 blobMap.current[file.url] = objectUrl
 setRenderTrigger((n) => n + 1) // force re-render to pick up new blob URL
 })
 .catch(() => {
 // Non-fatal: leave url as-is; browser will fail gracefully
 })
 })
 }, [files])

 // Re-render trigger for blob map updates
 const [, setRenderTrigger] = React.useState(0)

 // Clean up blob URLs on unmount
 useEffect(() => {
 return () => {
 blobTokens.current.forEach((url) => URL.revokeObjectURL(url))
 }
 }, [])

 const fetchFiles = async () => {
 setLoading(true)
 try {
 const res = await api.get('/media')
 setFiles(res.data.data || [])
 } catch {
 console.error('Failed to fetch media')
 toast.error('Failed to load media library')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 if (isOpen) {
 const timer = setTimeout(() => fetchFiles(), 0)
 return () => clearTimeout(timer)
 }
 }, [isOpen])

 const toggleSelect = (file: any) => {
 // If focal point mode enabled and single-select, enter the focal-editor step
 if (focalPoint && !hasMany) {
 setFocalPending(file)
 return
 }
 if (hasMany) {
 const exists = selectedFiles.find((f) => f._id === file._id)
 if (exists) {
 onChange(selectedFiles.filter((f) => f._id !== file._id))
 } else {
 onChange([...selectedFiles, file])
 }
 } else {
 onChange(file)
 setIsOpen(false)
 }
 }

 const confirmFocalSelection = async (file: any, x: number, y: number) => {
 const updated = { ...file, focalPoint: { x, y } }
 // Persist focal point to the media record
 try {
 if (file._id) {
 await api.patch(`/media/${file._id}`, { focalPoint: { x, y } })
 }
 } catch {
 console.error('Failed to save focal point')
 toast.error('Failed to save focal point')
 }
 onChange(updated)
 setFocalPending(null)
 setIsOpen(false)
 }

 const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files?.[0]) return
 const formData = new FormData()
 formData.append('file', e.target.files[0])

 // If focal point mode is active, prompt user to set focal point after upload
 try {
 const res = await api.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 })
 const newFile = res.data.data
 setFiles([newFile, ...files])

 // If focal point mode and single-select, open the cropper for the new upload
 if (focalPoint && !hasMany) {
 setFocalPending(newFile)
 return
 }

 if (!hasMany) {
 onChange(newFile)
 setIsOpen(false)
 }
 } catch {
 console.error('Upload failed')
 toast.error('Upload failed')
 }
 }

 return (
 <div className="space-y-2">
 <div className="flex flex-wrap gap-3">
 {selectedFiles.map((file, i) => (
 <div
 key={file._id || i}
 className="relative w-20 h-20 rounded-none border border-white/[0.08] overflow-hidden group shadow-sm transition-all hover:scale-105 active:scale-95"
 >
 <img 
 src={getMediaUrl(file.url)} 
 className="w-full h-full object-cover" 
 alt="" 
 />
 {!disabled && (
 <button
 type="button"
 onClick={() =>
 hasMany ? onChange(selectedFiles.filter((_, idx) => idx !== i)) : onChange(null)
 }
 className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <X size={10} />
 </button>
 )}
 </div>
 ))}
 {!disabled && (hasMany || selectedFiles.length === 0) && (
 <button
 type="button"
 onClick={() => setIsOpen(true)}
 className="w-20 h-20 rounded-none border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-all group"
 >
 <Plus
 size={18}
 strokeWidth={3}
 className="group-hover:scale-110 transition-transform"
 />
 <span className="text-[8px] font-black uppercase tracking-widest ">
 Add_Media
 </span>
 </button>
 )}
 </div>

 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0, height: 0, marginTop: 0 }}
 animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
 exit={{ opacity: 0, height: 0, marginTop: 0 }}
 className="overflow-hidden w-full"
 >
 <div
 className={cn(
 'w-full border rounded-none overflow-hidden shadow-2xl flex flex-col',
 theme === 'dark' ? 'bg-black/80 backdrop-blur-xl border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 <div className="flex flex-col p-4 gap-4">
 <div className="flex items-center justify-between">
 <h3 className={cn('text-sm font-black uppercase tracking-widest', theme === 'dark' ? 'text-white' : 'text-black')}>
 Asset Registry
 </h3>
 <button
 type="button"
 onClick={() => setIsOpen(false)}
 className={cn('p-1 rounded-none transition-colors', theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/5')}
 >
 <X size={14} />
 </button>
 </div>

 <AnimatePresence mode="wait">
 {focalPending ? (
 <motion.div key="focal-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
 {/* Focal Point Editor */}
 <div className="flex items-center gap-3">
 <button type="button" onClick={() => setFocalPending(null)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors border border-white/[0.08] px-3 py-1.5 rounded-none">
 ← Back
 </button>
 </div>
 <div className="flex-1 min-h-[300px] flex items-center justify-center">
 <FocalPointCropper
 imageUrl={getMediaUrl(focalPending.url)}
 initialX={focalPending.focalPoint?.x ?? 50}
 initialY={focalPending.focalPoint?.y ?? 50}
 onSave={(x, y) => confirmFocalSelection(focalPending, x, y)}
 />
 </div>
 </motion.div>
 ) : (
 <motion.div key="asset-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
 {/* Top Bar: Search and Upload */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 dark:text-emerald-400 transition-colors" size={14} />
 <input
 type="text"
 placeholder="Search assets..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-white/5 border border-white/[0.08] rounded-none pl-9 pr-3 py-2 text-xs font-medium text-white placeholder:text-gray-500 transition-all focus:bg-white/10 focus:border-emerald-500/50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
 />
 </div>
 <label className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 rounded-none transition-all text-[10px] font-bold uppercase tracking-widest cursor-pointer border border-emerald-500/30">
 <UploadCloud size={14} />
 <span>Upload</span>
 <input type="file" className="hidden" onChange={handleUpload} />
 </label>
 </div>

 {/* Middle Area: Scrollable Grid */}
 <div className="h-[280px] overflow-y-auto grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 pr-2 custom-scrollbar border border-white/[0.08] rounded-none p-2 bg-black/20">
 {loading ? (
 <div className="col-span-full h-full flex flex-col items-center justify-center gap-4">
 <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-500" size={24} />
 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 animate-pulse">Syncing...</span>
 </div>
 ) : (
 (() => {
 const filtered = files.filter((f) =>
 (f.alt || f.id || f.filename || '')
 .toLowerCase()
 .includes(search.toLowerCase())
 )
 
 if (filtered.length === 0) {
 return (
 <div className="col-span-full h-full flex flex-col justify-center py-6">
 <EmptyState
 icon={ImageIcon}
 title={search ? 'No matches found' : 'No media assets'}
 message={search ? 'Try a different search term' : 'Upload an image to get started'}
 />
 </div>
 )
 }

 return filtered.map((file) => {
 const isSelected = selectedFiles.some((f) => f._id === file._id)
 return (
 <div
 key={file._id}
 onClick={() => toggleSelect(file)}
 className={cn(
 'group relative aspect-square rounded-none border overflow-hidden cursor-pointer transition-all',
 isSelected
 ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[0.98]'
 : 'border-white/[0.08] hover:border-emerald-500/30'
 )}
 >
 <img
 src={getMediaUrl(file.url)}
 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
 alt=""
 />
 <div
 className={cn(
 'absolute inset-0 transition-all duration-300',
 isSelected
 ? 'bg-emerald-600/10'
 : 'bg-black/0 group-hover:bg-black/40'
 )}
 />
 <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all bg-gradient-to-t from-black/80 to-transparent">
 <p className="text-[7px] font-black text-white uppercase tracking-widest truncate">
 {file.filename || 'Untitled_Asset'}
 </p>
 </div>
 {isSelected && (
 <div className="absolute top-2 right-2 bg-emerald-600 dark:bg-emerald-600 text-white rounded-none p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
 <Check size={10} strokeWidth={4} />
 </div>
 )}
 </div>
 )
 })
 })()
 )}
 </div>

 {/* Bottom Area: Actions */}
 <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-3 mt-2">
 <button
 type="button"
 onClick={() => { setIsOpen(false); setFocalPending(null) }}
 className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => { setIsOpen(false); setFocalPending(null) }}
 className="px-6 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 hover:text-white rounded-none text-[10px] font-bold uppercase tracking-widest transition-all border border-emerald-500/30"
 >
 Done
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default MediaPicker
