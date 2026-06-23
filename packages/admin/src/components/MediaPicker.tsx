/* eslint-disable */
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Image as ImageIcon, X, Plus, Search, Check, Loader2, UploadCloud, Link } from 'lucide-react'
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
 const [externalUrl, setExternalUrl] = useState('')
 // Focal point state: null = not active, { file, candidate } = pending confirmation
 const [focalPending, setFocalPending] = useState<any>(null)
 const [mounted, setMounted] = useState(false)

 useEffect(() => {
   setMounted(true)
 }, [])

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

 const handleAddExternalUrl = () => {
 if (!externalUrl.trim()) return
 const newFile = {
 _id: Math.random().toString(36).substring(7),
 url: externalUrl.trim(),
 filename: externalUrl.trim().split('/').pop() || 'External URL'
 }
 if (hasMany) {
 onChange([...selectedFiles, newFile])
 } else {
 onChange(newFile)
 setIsOpen(false)
 }
 setExternalUrl('')
 }

 return (
 <div className="space-y-2">
 <div className="flex flex-wrap gap-3">
 {selectedFiles.map((file, i) => (
 <div
 key={file._id || i}
 className="relative w-20 h-20 rounded-none-none border border-z-border overflow-hidden group shadow-sm transition-all hover:scale-105 active:scale-95"
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
 className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-none-none opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <X size={10} />
 </button>
 )}
 </div>
 ))}
 {!disabled && (hasMany || selectedFiles.length === 0) && (
 <button
 type="button"
 onClick={(e) => {
   e.stopPropagation()
   setIsOpen(true)
 }}
 className="w-20 h-20 rounded-none-none border border-dashed border-z-border flex flex-col items-center justify-center gap-1.5 text-z-muted hover:border-gray-500/50 hover:text-gray-600 dark:text-z-muted hover:bg-gray-500/5 transition-all group"
 >
 <Plus
 size={18}
 strokeWidth={3}
 className="group-hover:scale-110 transition-transform"
 />
 <span className="text-sm font-semibold">
 Add_Media
 </span>
 </button>
 )}
 </div>

 {mounted && createPortal(
 <AnimatePresence>
 {isOpen && (
 <motion.div
 key="media-picker-backdrop"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-12"
 onClick={() => setIsOpen(false)}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className={cn(
 'w-full max-w-5xl max-h-full border rounded-none-none shadow-2xl flex flex-col overflow-hidden',
 theme === 'dark' ? 'bg-black/90 backdrop-blur-xl border-white/10' : 'bg-z-popover border-z-border'
 )}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex flex-col p-4 gap-4">
 <div className="flex items-center justify-between">
 <h3 className={cn('text-sm font-semibold  ', theme === 'dark' ? 'text-white' : 'text-black')}>
 Asset Registry
 </h3>
 <button
 type="button"
 onClick={() => setIsOpen(false)}
 className={cn('p-1 rounded-none-none transition-colors', theme === 'dark' ? 'text-z-muted hover:text-white hover:bg-white/10' : 'text-z-secondary hover:text-black hover:bg-black/5')}
 >
 <X size={14} />
 </button>
 </div>

 <AnimatePresence mode="wait">
 {focalPending ? (
 <motion.div key="focal-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
 {/* Focal Point Editor */}
 <div className="flex items-center gap-3">
 <button type="button" onClick={() => setFocalPending(null)} className="text-sm font-semibold text-z-muted hover:text-white transition-colors border border-z-border px-3 py-1.5 rounded-none-none">
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
 {/* Top Bar: Search, URL, and Upload */}
 <div className="flex flex-col md:flex-row gap-3">
 <div className="flex-[2] relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary group-focus-within:text-gray-600 dark:text-z-muted transition-colors" size={14} />
 <input
 type="text"
 placeholder="Search assets..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-z-hover border border-z-border rounded-none-none pl-9 pr-3 py-2 text-sm font-medium text-white placeholder:text-z-secondary transition-all focus:bg-white/10 focus:border-gray-500/50 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
 />
 </div>
 <div className="flex-[2] relative flex gap-2">
 <div className="relative flex-1 group">
 <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary group-focus-within:text-gray-600 dark:text-z-muted transition-colors" size={14} />
 <input
 type="url"
 placeholder="https://..."
 value={externalUrl}
 onChange={(e) => setExternalUrl(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleAddExternalUrl()}
 className="w-full bg-z-hover border border-z-border rounded-none-none pl-9 pr-3 py-2 text-sm font-medium text-white placeholder:text-z-secondary transition-all focus:bg-white/10 focus:border-gray-500/50 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
 />
 </div>
 <button
 type="button"
 onClick={handleAddExternalUrl}
 disabled={!externalUrl.trim()}
 className="px-3 py-2 bg-gray-500/20 text-gray-600 dark:text-z-muted hover:bg-gray-500/30 hover:text-white rounded-none-none text-sm font-bold transition-all border border-gray-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Add
 </button>
 </div>
 <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-600 dark:text-z-muted rounded-none-none transition-all text-sm font-bold cursor-pointer border border-gray-500/30">
 <UploadCloud size={14} />
 <span>Upload</span>
 <input type="file" className="hidden" onChange={handleUpload} />
 </label>
 </div>

 {/* Middle Area: Scrollable Grid */}
 <div className="flex-1 min-h-[300px] max-h-[50vh] overflow-y-auto grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 pr-2 custom-scrollbar border border-z-border rounded-none-none p-3 bg-black/20">
 {loading ? (
 <div className="col-span-full h-full flex flex-col items-center justify-center gap-4">
 <Loader2 className="animate-spin text-gray-600 dark:text-z-secondary" size={24} />
 <span className="text-sm font-semibold text-gray-600 dark:text-z-muted animate-pulse">Syncing...</span>
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
 'group relative aspect-square rounded-none-none border overflow-hidden cursor-pointer transition-all',
 isSelected
 ? 'border-gray-500 shadow-sm scale-[0.98]'
 : 'border-z-border hover:border-gray-500/30'
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
 ? 'bg-gray-600/10'
 : 'bg-black/0 group-hover:bg-black/40'
 )}
 />
 <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all bg-gradient-to-t from-black/80 to-transparent">
 <p className="text-sm font-semibold text-white truncate">
 {file.filename || 'Untitled_Asset'}
 </p>
 </div>
 {isSelected && (
 <div className="absolute top-2 right-2 bg-gray-600 dark:bg-gray-600 text-white rounded-none-none p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
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
 <div className="pt-2 border-t border-z-border flex items-center justify-end gap-3 mt-2">
 <button
 type="button"
 onClick={() => { setIsOpen(false); setFocalPending(null) }}
 className="px-4 py-2 text-sm font-bold text-z-muted hover:text-white transition-colors"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => { setIsOpen(false); setFocalPending(null) }}
 className="px-6 py-2 bg-gray-500/20 text-gray-600 dark:text-z-muted hover:bg-gray-500/30 hover:text-white rounded-none-none text-sm font-bold transition-all border border-gray-500/30"
 >
 Done
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body
 )}
 </div>
 )
}

export default MediaPicker

