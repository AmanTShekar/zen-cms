import React from 'react'
import { X, Image as ImageIcon, Search, Upload, Loader2, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

export const MediaLibraryModal: React.FC = () => {
  const { theme } = useTheme()
  const { mediaLibraryOpen, setMediaLibraryOpen } = usePanelStore()
  const {
    mediaAssets,
    setMediaAssets,
    mediaSearch,
    setMediaSearch,
    mediaTypeFilter,
    setMediaTypeFilter,
    mediaLoading,
    setMediaLoading,
  } = useEditorStore()

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
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'relative w-full max-w-[1200px] h-[88vh] flex flex-col border rounded-none shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden',
              theme === 'dark'
                ? 'bg-[#0d0d12] border-white/10'
                : 'bg-white border-gray-200'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-8 py-5 border-b shrink-0',
              theme === 'dark' ? 'border-white/5 bg-white/[0.015]' : 'border-gray-100 bg-gray-50'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-11 h-11 rounded-none flex items-center justify-center shadow-xl',
                  theme === 'dark' ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400' : 'bg-purple-100 border border-purple-200 text-purple-600'
                )}>
                  <ImageIcon size={22} />
                </div>
                <div className="flex flex-col">
                  <h2 className={cn(
                    'text-xl font-black uppercase italic tracking-tight leading-none',
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>
                    Asset_Registry
                  </h2>
                  <span className={cn(
                    'text-[9px] font-bold uppercase italic tracking-widest mt-1.5',
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    {mediaAssets.length} File{mediaAssets.length !== 1 ? 's' : ''} / Centralized_Media_Store
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMediaLibraryOpen(false)}
                className={cn(
                  'w-10 h-10 rounded-none border flex items-center justify-center transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    : 'bg-gray-100 border-gray-200 text-gray-555 hover:text-black hover:bg-gray-200'
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar: search, filters, upload */}
            <div className={cn(
              'flex items-center gap-4 px-8 py-4 border-b shrink-0',
              theme === 'dark' ? 'border-white/5' : 'border-gray-100'
            )}>
              <div className="relative group flex-1">
                <Search
                  className={cn(
                    'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                    theme === 'dark' ? 'text-gray-555 group-focus-within:text-purple-400' : 'text-gray-400 group-focus-within:text-purple-600'
                  )}
                  size={15}
                />
                <input
                  type="text"
                  placeholder="Search assets by name or type..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className={cn(
                    'w-full rounded-none pl-12 pr-4 py-3 text-xs font-bold outline-none transition-all',
                    theme === 'dark'
                      ? 'bg-white/[0.03] border border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/40 focus:bg-white/[0.05]'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:bg-white'
                  )}
                />
              </div>

              {/* Type filter */}
              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value)}
                className={cn(
                  'rounded-none border py-3 px-4 text-[9px] font-black uppercase italic outline-none transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400 focus:border-purple-500/40'
                    : 'bg-gray-55 border-gray-200 text-gray-600 focus:border-purple-400'
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
                'flex items-center gap-2 px-5 py-3 rounded-none border cursor-pointer transition-all text-[9px] font-black uppercase italic tracking-wider',
                theme === 'dark'
                  ? 'bg-purple-600/20 border-purple-500/30 text-purple-300 hover:bg-purple-600/30 hover:border-purple-500/50'
                  : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300'
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
                  <Loader2 size={36} className="animate-spin text-purple-500" />
                  <span className="text-[9px] font-black uppercase italic text-purple-400 tracking-[0.3em] animate-pulse">
                    Loading Registry...
                  </span>
                </div>
              ) : (
                <>
                  {mediaAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <div className={cn(
                        'w-16 h-16 rounded-none border-2 border-dashed flex items-center justify-center',
                        theme === 'dark' ? 'border-white/10 text-gray-600' : 'border-gray-200 text-gray-300'
                      )}>
                        <ImageIcon size={28} />
                      </div>
                      <p className={cn(
                        'text-[11px] font-black uppercase italic tracking-wider',
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      )}>
                        No assets in the registry
                      </p>
                      <span className={cn(
                        'text-[9px] font-bold uppercase italic tracking-widest',
                        theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                      )}>
                        Upload files using the ingest button above
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {mediaAssets
                        .filter((file) => {
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
                        .map((file, i) => {
                          const isImage = (file.mimetype || '').startsWith('image/')
                          const fileFullUrl = file.url.startsWith('http')
                            ? file.url
                            : `${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api/v1', '')}${file.url}`
                          return (
                            <motion.div
                              key={file._id || i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: Math.min(i * 0.015, 1) }}
                              className="group relative aspect-square border rounded-none overflow-hidden cursor-pointer transition-all hover:scale-[1.04] hover:z-10"
                              onClick={() => {
                                navigator.clipboard.writeText(fileFullUrl).catch(() => {})
                                toast.success('URL copied to clipboard')
                              }}
                            >
                              {isImage ? (
                                <img
                                  src={fileFullUrl}
                                  alt={file.alt || file.name || ''}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className={cn(
                                  'w-full h-full flex flex-col items-center justify-center gap-2',
                                  theme === 'dark' ? 'bg-white/[0.03]' : 'bg-gray-50'
                                )}>
                                  <File size={24} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />
                                  <span className={cn(
                                    'text-[7px] font-black uppercase italic tracking-widest text-center px-1 truncate w-full',
                                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                                  )}>
                                    {file.mimetype?.split('/')[1] || 'FILE'}
                                  </span>
                                </div>
                              )}
                              {/* Hover overlay */}
                              <div className={cn(
                                'absolute inset-0 flex flex-col items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity',
                                theme === 'dark' ? 'bg-gradient-to-t from-black/90 via-black/40' : 'bg-gradient-to-t from-black/80 via-black/20'
                              )}>
                                <p className="text-white text-[8px] font-black uppercase italic truncate w-full leading-tight">
                                  {file.name}
                                </p>
                                {file.size && (
                                  <span className="text-white/50 text-[6px] font-bold uppercase italic">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                )}
                                {/* Copy URL button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(fileFullUrl)
                                    toast.success('URL copied')
                                  }}
                                  className={cn(
                                    'mt-1.5 px-2 py-1 rounded-none border text-[7px] font-black uppercase italic transition-all',
                                    theme === 'dark'
                                      ? 'border-white/20 text-white/70 hover:border-white/40 hover:text-white bg-white/5'
                                      : 'border-white/30 text-white/80 hover:border-white/50 hover:text-white bg-white/10'
                                  )}
                                >
                                  Copy URL
                                </button>
                              </div>
                              {/* Type badge */}
                              <div className={cn(
                                'absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[6px] font-black uppercase italic border rounded-none',
                                theme === 'dark'
                                  ? 'bg-black/60 border-white/10 text-gray-400'
                                  : 'bg-white/80 border-gray-200 text-gray-500'
                              )}>
                                {(file.mimetype || 'file').split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>
                  )}
                  {mediaAssets.filter((file) => {
                    const matchSearch = !mediaSearch ||
                      file.name?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                      file.alt?.toLowerCase().includes(mediaSearch.toLowerCase())
                    const fileType = file.mimetype || ''
                    const matchType = mediaTypeFilter === 'all' ||
                      (mediaTypeFilter === 'image' && fileType.startsWith('image/')) ||
                      (mediaTypeFilter === 'video' && fileType.startsWith('video/')) ||
                      (mediaTypeFilter === 'audio' && fileType.startsWith('audio/')) ||
                      (mediaTypeFilter === 'application/pdf' && fileType.includes('pdf')) ||
                      (mediaTypeFilter === 'other' && !fileType.startsWith('image/') && !fileType.startsWith('video/') && !fileType.startsWith('audio/') && !fileType.includes('pdf'))
                    return matchSearch && matchType
                  }).length === 0 && mediaAssets.length > 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <span className={cn(
                        'text-[10px] font-black uppercase italic text-gray-500',
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      )}>
                        No assets match your filter
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={cn(
              'flex items-center justify-between px-8 py-3 border-t shrink-0',
              theme === 'dark' ? 'border-white/5 bg-white/[0.015]' : 'border-gray-100 bg-gray-50'
            )}>
              <span className={cn(
                'text-[8px] font-bold uppercase italic tracking-widest',
                theme === 'dark' ? 'text-gray-655' : 'text-gray-400'
              )}>
                Click any asset to copy its URL • Supports images, video, audio, PDF
              </span>
              <button
                onClick={() => setMediaLibraryOpen(false)}
                className={cn(
                  'px-5 py-2 text-[9px] font-black uppercase italic rounded-none border transition-all',
                  theme === 'dark'
                    ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black'
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
