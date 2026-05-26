import React, { useEffect, useState } from 'react'
import { Image as ImageIcon, X, Plus, Search, Check, Loader2, UploadCloud } from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'react-hot-toast'
import { FocalPointCropper } from './FocalPointCropper'

interface MediaPickerProps {
  value?: any
  onChange: (value: any) => void
  hasMany?: boolean
  disabled?: boolean
  /** Enable the focal point editor step after image selection */
  focalPoint?: boolean
}

const MediaPicker: React.FC<MediaPickerProps> = ({ value, onChange, hasMany, disabled = false, focalPoint = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  // Focal point state: null = not active, { file, candidate } = pending confirmation
  const [focalPending, setFocalPending] = useState<any>(null)

  const selectedFiles = Array.isArray(value) ? value : value ? [value] : []

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

  const getMediaUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
    return `${baseUrl}${url}`
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {selectedFiles.map((file, i) => (
          <div
            key={file._id || i}
            className="relative w-20 h-20 rounded-xl border border-white/10 overflow-hidden group shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <img src={getMediaUrl(file.url)} className="w-full h-full object-cover" alt="" />
            {!disabled && (
              <button
                type="button"
                onClick={() =>
                  hasMany ? onChange(selectedFiles.filter((_, idx) => idx !== i)) : onChange(null)
                }
                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="w-20 h-20 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 transition-all group"
          >
            <Plus
              size={18}
              strokeWidth={3}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[8px] font-black uppercase tracking-widest italic">
              Add_Media
            </span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-[#0B0F19]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#111827]/40 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400 shadow-lg">
                    <ImageIcon size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">
                      Asset_Registry
                    </h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic mt-1.5">
                      Centralized_Repository_For_Media_Architectures
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-gray-400 hover:text-white transition-all animate-fade-in"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8 bg-[#0B0F19]/40">
                {/* Focal Point step — show FocalPointCropper instead of the asset grid */}
                <AnimatePresence mode="wait">
                  {focalPending ? (
                    <motion.div
                      key="focal-step"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-4 h-full"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setFocalPending(null)}
                          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors italic border border-white/10 px-4 py-2 rounded-lg"
                        >
                          ← Back
                        </button>
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 italic">
                          Step 2 of 2 — Set Focal Point
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <FocalPointCropper
                          imageUrl={getMediaUrl(focalPending.url)}
                          initialX={focalPending.focalPoint?.x ?? 50}
                          initialY={focalPending.focalPoint?.y ?? 50}
                          onSave={(x, y) => confirmFocalSelection(focalPending, x, y)}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="asset-grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col h-full"
                    >
                      {/* Step indicator for two-stage selection */}
                      {focalPoint && (
                        <div className="text-[9px] font-black uppercase tracking-widest text-purple-400 italic mb-4">
                          Step 1 of 2 — Choose Asset
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1 relative group">
                          <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors"
                            size={16}
                          />
                          <input
                            type="text"
                            placeholder="Filter assets by sequence or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-xs font-bold text-white placeholder:text-gray-500 transition-all focus:bg-white/[0.04] focus:border-purple-500/40 focus-visible:ring-2 focus-visible:ring-indigo-500"
                          />
                        </div>
                        <label className="flex items-center gap-3 px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all text-[11px] font-black uppercase tracking-widest shadow-xl shadow-purple-900/20 cursor-pointer hover:scale-[1.02] active:scale-95 italic leading-none shrink-0 border border-purple-500/30">
                          <UploadCloud size={16} strokeWidth={3} />
                          <span>Ingest New Asset</span>
                          <input type="file" className="hidden" onChange={handleUpload} />
                        </label>
                      </div>

                      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pr-2 custom-scrollbar">
                        {loading ? (
                          <div className="col-span-full h-full flex flex-col items-center justify-center gap-6">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-400 italic animate-pulse">
                              Syncing_Asset_Library...
                            </span>
                          </div>
                        ) : (
                          files
                            .filter((f) =>
                              (f.alt || f.id || f.filename || '')
                                .toLowerCase()
                                .includes(search.toLowerCase())
                            )
                            .map((file) => {
                              const isSelected = selectedFiles.some((f) => f._id === file._id)
                              return (
                                <div
                                  key={file._id}
                                  onClick={() => toggleSelect(file)}
                                  className={cn(
                                    'group relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all',
                                    isSelected
                                      ? 'border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-[0.98]'
                                      : 'border-white/5 hover:border-purple-500/30'
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
                                        ? 'bg-purple-600/10'
                                        : 'bg-black/0 group-hover:bg-black/40'
                                    )}
                                  />
                                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[7px] font-black text-white uppercase tracking-widest truncate">
                                      {file.filename || 'Untitled_Asset'}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-lg p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
                                      <Check size={10} strokeWidth={4} />
                                    </div>
                                  )}
                                </div>
                              )
                            })
                        )}
                      </div>

                      <div className="p-8 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10B981]" />
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">
                            All_Systems_Operational
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => { setIsOpen(false); setFocalPending(null) }}
                            className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { setIsOpen(false); setFocalPending(null) }}
                            className="px-8 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all italic leading-none border border-purple-500/30"
                          >
                            Apply Selection
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MediaPicker
