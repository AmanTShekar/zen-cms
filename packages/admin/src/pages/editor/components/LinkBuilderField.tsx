import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Search, X, Hash, Globe, FileText, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'
import { useEditorStore } from '../../../store/editorStore'

interface LinkBuilderFieldProps {
  value: string
  onChange: (val: string) => void
  theme: 'light' | 'dark'
  anchorEl?: HTMLElement | null
}

export const LinkBuilderField: React.FC<LinkBuilderFieldProps> = ({
  value,
  onChange,
  theme,
  anchorEl
}) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'url' | 'pages' | 'anchors'>('pages')
  const [search, setSearch] = useState('')
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  
  const { data } = useEditorStore()

  // Extract page anchors
  const anchors = data?.sections?.map(s => s.content?.anchorId).filter(Boolean) || []

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handle)
    return () => window.removeEventListener('mousedown', handle)
  }, [open])

  // Fetch pages
  useEffect(() => {
    if (open && activeTab === 'pages') {
      fetchPages(search)
    }
  }, [open, activeTab, search])

  const fetchPages = async (q: string) => {
    setLoading(true)
    try {
      const params: any = { limit: 20 }
      if (q) params.search = q
      const res = await api.get(`/pages`, { params })
      setPages(res.data.data || [])
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const [pos, setPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!open) return
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect()
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(8, rect.left + window.scrollX),
      })
    } else if (popoverRef.current?.parentElement) {
      const rect = popoverRef.current.parentElement.getBoundingClientRect()
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(8, rect.left + window.scrollX),
      })
    }
  }, [open, anchorEl])

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full px-3 py-2 flex items-center justify-between border text-xs transition-all rounded-none font-medium',
          theme === 'dark'
            ? 'bg-[#111827]/40 border-white/10 text-gray-300 hover:border-emerald-500/50 focus:border-emerald-500 focus:bg-[#111827]/80'
            : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-500 focus:border-emerald-500'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Link2 size={13} className="text-emerald-500 shrink-0" />
          <span className="truncate">{value || 'Select link...'}</span>
        </span>
        <ChevronDown size={13} className="opacity-50 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ top: pos.top, left: pos.left }}
            className={cn(
              'fixed z-[1000] w-[340px] border rounded-none shadow-2xl overflow-hidden flex flex-col',
              theme === 'dark'
                ? 'bg-[#0B0F19]/98 backdrop-blur-xl border-white/10 text-white'
                : 'bg-white/98 backdrop-blur-xl border-gray-200 text-gray-900'
            )}
          >
            <div className={cn(
              'flex items-center border-b p-1.5 gap-1 shrink-0',
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
            )}>
              {[
                { id: 'pages', label: 'Pages', icon: FileText },
                { id: 'anchors', label: 'Sections', icon: Hash },
                { id: 'url', label: 'Custom', icon: Globe }
              ].map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-none transition-all',
                      isActive
                        ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        : theme === 'dark' ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon size={11} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'url' && (
                <div className="p-4 space-y-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Custom URL</p>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https:// or /path"
                    className={cn(
                      'w-full px-3 py-2 text-xs font-medium border rounded-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:border-emerald-500',
                      theme === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-gray-200 text-black'
                    )}
                  />
                </div>
              )}

              {activeTab === 'anchors' && (
                <div className="flex flex-col h-56">
                  <div className="p-3 pb-1 border-b border-white/5">
                    <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500 mb-2">On this page</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-editor-scrollbar">
                    {anchors.length === 0 ? (
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 text-center py-6">No anchors found</p>
                    ) : (
                      anchors.map(anchor => (
                        <button
                          key={anchor}
                          onClick={() => {
                            onChange(`#${anchor}`)
                            setOpen(false)
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-xs font-medium border border-transparent hover:border-emerald-500/30 rounded-none transition-colors flex items-center gap-2',
                            theme === 'dark' ? 'hover:bg-emerald-500/10 text-gray-300' : 'hover:bg-emerald-50 text-gray-700'
                          )}
                        >
                          <Hash size={12} className="text-emerald-500" />
                          {anchor}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pages' && (
                <div className="flex flex-col h-64">
                  <div className="p-2 border-b border-white/5">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search pages..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                          'w-full pl-8 pr-3 py-1.5 text-xs border rounded-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:border-emerald-500',
                          theme === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-gray-200 text-black'
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-editor-scrollbar">
                    {loading ? (
                      <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500 text-center py-6 animate-pulse">Searching...</p>
                    ) : pages.length === 0 ? (
                      <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 text-center py-6">No pages found</p>
                    ) : (
                      pages.map(page => (
                        <button
                          key={page.id}
                          onClick={() => {
                            // Automatically format to absolute slug path for storefront routing
                            onChange(`/${page.slug}`)
                            setOpen(false)
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 border rounded-none transition-colors flex flex-col gap-1',
                            value === `/${page.slug}` 
                              ? theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                              : theme === 'dark' ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50'
                          )}
                        >
                          <span className={cn("text-xs font-bold", theme === 'dark' ? 'text-gray-200' : 'text-gray-800')}>{page.title}</span>
                          <span className="text-[10px] font-mono text-emerald-500">/{page.slug}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className={cn(
              'p-2 border-t flex justify-end shrink-0',
              theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'
            )}>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 text-[10px] uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
