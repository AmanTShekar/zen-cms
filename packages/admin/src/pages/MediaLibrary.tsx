import { useEffect, useState, useMemo } from 'react'
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
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

const MediaLibrary = () => {
  const { theme } = useTheme()
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)

  const [previewWidth, setPreviewWidth] = useState(1200)

  const fetchFiles = async () => {
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

  const filteredFiles = useMemo(() => {
    return files.filter((f: any) => {
      const matchesSearch = (f.name || f.alt || f.id || '')
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesFolder = activeFolder ? f.folder === activeFolder : true
      return matchesSearch && matchesFolder
    })
  }, [files, search, activeFolder])

  const getFullUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`
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
          <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-none animate-pulse" />
          <Cpu
            size={48}
            className="text-indigo-500 animate-spin transition-all duration-1000"
            strokeWidth={1}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 animate-pulse italic">
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
              'w-14 h-14 rounded-none flex items-center justify-center shadow-lg transition-all',
              theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
            )}
          >
            <Archive size={28} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none border px-2 py-1 rounded-none border-indigo-500/10 bg-indigo-500/5">
                OPERATIONAL_STORAGE
              </span>
              <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
              Media_Registry
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'hidden md:flex px-6 py-3 border rounded-none items-center gap-8 transition-colors',
              theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100'
            )}
          >
            <div className="flex flex-col items-end leading-none">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-1.5">
                Asset_Mass
              </span>
              <span className="text-xl font-black italic tracking-tighter">{files.length}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col items-end leading-none">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-1.5">
                Status
              </span>
              <span className="text-[11px] font-black text-emerald-500 uppercase italic">
                HARDENED
              </span>
            </div>
          </div>

          <label
            className={cn(
              'px-8 py-3.5 rounded-none font-black text-[11px] uppercase tracking-widest shadow-xl transition-all italic leading-none flex items-center gap-4 cursor-pointer',
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
              'w-full flex items-center justify-between px-5 py-3.5 rounded-none transition-all group border border-transparent leading-none',
              activeFolder === null
                ? theme === 'dark'
                  ? 'bg-white/[0.03] border-white/10 text-white shadow-lg'
                  : 'bg-white border-gray-100 shadow-lg text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.02]'
            )}
          >
            <div className="flex items-center gap-4">
              <Database
                size={16}
                className={
                  activeFolder === null ? 'text-indigo-500' : 'opacity-30 group-hover:opacity-60'
                }
              />
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-tight italic">
                  ROOT_NODE
                </span>
                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 opacity-60">
                  System_Default
                </span>
              </div>
            </div>
            {activeFolder === null && (
              <div className="w-1 h-4 bg-indigo-500 rounded-none shadow-[0_0_8px_#6366f1]" />
            )}
          </button>

          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-3.5 rounded-none transition-all group border border-transparent leading-none',
                activeFolder === folder
                  ? theme === 'dark'
                    ? 'bg-white/[0.03] border-white/10 text-white shadow-lg'
                    : 'bg-white border-gray-100 shadow-lg text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/[0.02]'
              )}
            >
              <div className="flex items-center gap-4">
                <Layers
                  size={16}
                  className={
                    activeFolder === folder
                      ? 'text-indigo-500'
                      : 'opacity-30 group-hover:opacity-60'
                  }
                />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-tight italic truncate max-w-[80px]">
                    {folder.toUpperCase()}
                  </span>
                  <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 opacity-60">
                    Collection
                  </span>
                </div>
              </div>
              {activeFolder === folder && (
                <div className="w-1 h-4 bg-indigo-500 rounded-none shadow-[0_0_8px_#6366f1]" />
              )}
            </button>
          ))}
        </div>

        {/* Grid Panel */}
        <div className="xl:col-span-5 space-y-6">
          <div
            className={cn(
              'flex items-center gap-4 px-6 border rounded-none shadow-sm relative transition-all group overflow-hidden backdrop-blur-3xl',
              theme === 'dark' ? 'bg-[#080808]/80 border-white/10' : 'bg-white border-gray-100'
            )}
          >
            <Search
              className="text-gray-500 group-focus-within:text-indigo-500 transition-colors"
              size={20}
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder="SCAN_REGISTRY_INDICES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent py-5 text-[11px] font-black tracking-widest outline-none placeholder:text-gray-700 uppercase italic transition-all"
            />
            <button
              onClick={fetchFiles}
              className={cn(
                'p-2 rounded-none transition-all',
                theme === 'dark'
                  ? 'text-gray-500 hover:text-white'
                  : 'text-gray-400 hover:text-indigo-600'
              )}
            >
              <RefreshCw
                size={18}
                className={cn('transition-transform duration-1000', loading ? 'animate-spin' : '')}
              />
            </button>
          </div>

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
                    'group relative border rounded-none overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-2xl hover:scale-[1.03]',
                    theme === 'dark'
                      ? 'bg-[#080808] border-white/5 hover:border-indigo-500/40'
                      : 'bg-white border-gray-100 hover:border-indigo-200'
                  )}
                >
                  <div className="aspect-square flex items-center justify-center bg-black/[0.03] overflow-hidden relative">
                    {file.mimetype?.startsWith('image') ? (
                      <img
                        src={getFullUrl(file.url)}
                        alt={file.alt}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all duration-700"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Binary size={40} strokeWidth={1} className="text-indigo-500/30" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">
                          {file.mimetype?.split('/')[1] || 'DATA'}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-white text-black rounded-none flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                          <Maximize2 size={18} />
                        </div>
                        <a
                          href={getFullUrl(file.url)}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 h-10 bg-white/10 text-white rounded-none flex items-center justify-center hover:bg-white hover:text-black transition-all"
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
                        ? 'bg-white/[0.01] border-white/5'
                        : 'bg-gray-50/20 border-gray-50'
                    )}
                  >
                    <p className="text-[10px] font-black truncate uppercase tracking-tight italic leading-none mb-2">
                      {file.name || 'UNIT_0x' + file._id.slice(-4)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <div className="w-1 h-1 rounded-none bg-indigo-500/20 group-hover:bg-indigo-500 transition-all" />
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
                'w-full max-w-[1200px] h-full max-h-[800px] rounded-none overflow-hidden border shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col xl:row relative z-10',
                theme === 'dark' ? 'bg-[#050505] border-white/10' : 'bg-white border-gray-100'
              )}
            >
              <div className="flex flex-col xl:flex-row h-full">
                {/* Visual Analysis Sector */}
                <div className="flex-1 bg-black/[0.1] flex items-center justify-center relative p-8 md:p-16 overflow-hidden min-h-[300px]">
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
                      backgroundSize: '40px 40px',
                    }}
                  />

                  {selectedFile.mimetype?.startsWith('image') ? (
                    <img
                      src={getFullUrl(selectedFile.url)}
                      alt="Synthesis"
                      className="max-w-full max-h-full object-contain shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative z-10 rounded-none border border-white/10"
                    />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center gap-6">
                      <div className="p-12 rounded-none bg-indigo-500/5 border border-indigo-500/10 shadow-2xl">
                        <Binary
                          size={80}
                          className="text-indigo-500 opacity-20"
                          strokeWidth={0.5}
                        />
                      </div>
                      <p className="text-[12px] font-black uppercase tracking-[0.8em] text-gray-500 italic">
                        BINARY_DATA_NODE
                      </p>
                    </div>
                  )}

                  <div className="absolute top-8 left-8 flex items-center gap-4 z-20">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-none flex items-center justify-center shadow-xl border',
                        theme === 'dark'
                          ? 'bg-white text-black border-white'
                          : 'bg-gray-900 text-white border-gray-800'
                      )}
                    >
                      <BoxSelect size={24} />
                    </div>
                    <div className="leading-none">
                      <p className="text-[20px] font-black uppercase tracking-tighter italic leading-none mb-1.5">
                        Asset_Forensics
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">
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
                    theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-[24px] font-black uppercase tracking-tighter italic leading-none">
                        Metadata
                      </h3>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">
                        Structural_Signature
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className={cn(
                        'w-12 h-12 rounded-none transition-all flex items-center justify-center border shadow-lg group hover:rotate-90',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
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
                          <span className="text-[9px] font-black uppercase tracking-widest italic">
                            Simulation_Scale
                          </span>
                        </div>
                        <span className="text-[18px] font-black text-indigo-500 italic tracking-tighter">
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
                        className="w-full appearance-none bg-indigo-500/10 h-1 rounded-none outline-none cursor-pointer accent-indigo-500"
                      />
                    </div>

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
                            'p-4 border rounded-none flex items-center justify-between group transition-all',
                            theme === 'dark'
                              ? 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                              : 'bg-white border-gray-100'
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <item.icon
                              size={14}
                              className="text-gray-500 group-hover:text-indigo-500 transition-colors"
                            />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic leading-none">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-black italic tracking-tight">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic px-1">
                          Gateway_Pointer
                        </label>
                        <div
                          className={cn(
                            'p-4 rounded-none border font-mono text-[9px] break-all leading-relaxed shadow-inner opacity-60',
                            theme === 'dark'
                              ? 'bg-black border-white/10'
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
                            'flex-1 py-4 rounded-none text-[10px] font-black uppercase tracking-widest transition-all shadow-lg italic leading-none flex items-center justify-center gap-3',
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
                            'w-14 h-14 rounded-none border flex items-center justify-center transition-all hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500',
                            theme === 'dark'
                              ? 'bg-white/5 border-white/10 text-gray-500'
                              : 'bg-white border-gray-100 text-gray-400'
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
