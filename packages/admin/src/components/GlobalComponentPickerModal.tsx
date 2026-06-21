import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModalStore } from '../store/modalStore'
import { useEditorBlocks } from '../context/BlockLibraryContext'
import { useTheme } from '../context/ThemeContext'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { cn } from '../lib/utils'

// ── Category gradient accents ─────────────────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, string> = {
  Layout:   'from-z-accent to-transparent',
  Content:  'from-z-accent to-transparent',
  Commerce: 'from-z-accent to-transparent',
  Media:    'from-rose-900/70 to-pink-900/40',
  Social:   'from-amber-900/70 to-orange-900/40',
  General:  'from-[#1a1a2e]/80 to-[#16213e]/60',
}

const CATEGORY_ORDER = ['All', 'Layout', 'Content', 'Media', 'Social', 'Commerce', 'General']

// ── Main Modal ────────────────────────────────────────────────────────────────
export const GlobalComponentPickerModal: React.FC = () => {
  const { theme } = useTheme()
  const { componentPickerOpen, componentPickerCallback, componentPickerBlocks, closeComponentPicker } = useModalStore()

  const BASE_LIBRARY = useEditorBlocks()
  
  const BLOCK_LIBRARY = useMemo(() => {
    if (!componentPickerBlocks || componentPickerBlocks.length === 0) return BASE_LIBRARY
    const overrideSlugs = new Set(componentPickerBlocks.map((b: any) => b.slug || b))
    return BASE_LIBRARY.filter(b => overrideSlugs.has(b.type))
  }, [BASE_LIBRARY, componentPickerBlocks])

  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState('All')
  const containerRef                  = useRef<HTMLDivElement>(null)
  const searchRef                     = useRef<HTMLInputElement>(null)

  // Reset state when closed
  useEffect(() => {
    if (!componentPickerOpen) {
      setSearch('')
      setCategory('All')
    } else {
      // Auto-focus search when opened
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [componentPickerOpen])

  useFocusTrap(componentPickerOpen, {
    containerRef,
    onEscape: closeComponentPicker,
  })

  // Derive visible categories from library
  const categories = useMemo(() => {
    const cats = new Set(BLOCK_LIBRARY.map((b) => b.category || 'General'))
    return CATEGORY_ORDER.filter((c) => c === 'All' || cats.has(c))
  }, [BLOCK_LIBRARY])

  // Filter blocks
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return BLOCK_LIBRARY.filter((b) => {
      const matchSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      const matchCat = activeCategory === 'All' || (b.category || 'General') === activeCategory
      return matchSearch && matchCat
    })
  }, [BLOCK_LIBRARY, search, activeCategory])

  // Group filtered blocks by category
  const grouped = useMemo(() => {
    if (activeCategory !== 'All') return { [activeCategory]: filtered }
    const g: Record<string, typeof filtered> = {}
    filtered.forEach((b) => {
      const cat = b.category || 'General'
      if (!g[cat]) g[cat] = []
      g[cat].push(b)
    })
    return g
  }, [filtered, activeCategory])

  const handleSelect = (blockType: string) => {
    componentPickerCallback?.(blockType)
    closeComponentPicker()
  }

  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {componentPickerOpen && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeComponentPicker}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add a Component"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'relative w-full max-w-3xl flex flex-col overflow-hidden rounded-none-none shadow-sm max-h-[90vh] border',
              isDark
                ? 'bg-[#08080a] border-white/10'
                : 'bg-z-panel border-z-border'
            )}
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-z-accent/70 to-transparent" />

            {/* Header */}
            <div className={cn('px-6 pt-6 pb-4 border-b flex-shrink-0', isDark ? 'border-white/5' : 'border-z-border')}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-z-active-text mb-1.5">
                    Zenith Page Builder
                  </p>
                  <h3 className={cn('text-2xl font-semibold', isDark ? 'text-white' : 'text-black')}>
                    Add a Component
                  </h3>
                  <p className={cn('text-sm mt-1', isDark ? 'text-z-muted' : 'text-z-secondary')}>
                    Choose a component to add to your layout
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeComponentPicker}
                  aria-label="Close component picker"
                  className={cn(
                    'w-9 h-9 flex items-center justify-center border rounded-none-none transition-all flex-shrink-0 mt-0.5',
                    isDark
                      ? 'bg-z-hover border-white/10 text-white hover:bg-white hover:text-black'
                      : 'bg-gray-100 border-z-border text-black hover:bg-black hover:text-white'
                  )}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search
                  size={13}
                  className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none', isDark ? 'text-z-secondary' : 'text-z-muted')}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search components..."
                  className={cn(
                    'w-full pl-10 pr-10 py-2.5 text-sm rounded-none-none border transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                    isDark
                      ? 'bg-z-hover border-white/10 text-white placeholder-gray-600 focus:border-z-accent/40 focus:bg-white/[0.06]'
                      : 'bg-z-input border-z-border text-black placeholder-gray-400 focus:border-z-active-border'
                  )}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                      isDark ? 'text-gray-600 hover:text-white' : 'text-z-muted hover:text-black'
                    )}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-semibold   whitespace-nowrap flex-shrink-0 transition-all rounded-none-none border',
                      activeCategory === cat
                        ? 'bg-z-accent border-z-accent text-white shadow-sm'
                        : isDark
                          ? 'bg-z-hover border-white/8 text-z-muted hover:text-white hover:border-z-active-border'
                          : 'bg-z-input border-z-border text-z-secondary hover:text-black hover:border-z-active-border/50'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto flex-1 p-6 space-y-8 custom-editor-scrollbar">
              {Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Search size={28} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                  <p className={cn('text-sm font-bold', isDark ? 'text-z-muted' : 'text-z-secondary')}>
                    No results for "{search}"
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-gray-600' : 'text-z-muted')}>
                    Try a different keyword or browse all categories
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, blocks]) => (
                  <div key={category}>
                    {activeCategory === 'All' && (
                      <div className="flex items-center gap-3 mb-4">
                        <span className={cn('h-px flex-1', isDark ? 'bg-z-hover' : 'bg-gray-100')} />
                        <span className={cn('text-sm font-semibold  ', isDark ? 'text-z-secondary' : 'text-z-muted')}>
                          {category}
                        </span>
                        <span className={cn('h-px flex-1', isDark ? 'bg-z-hover' : 'bg-gray-100')} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {blocks.map((block) => {
                        const Icon = block.icon
                        const grad = CATEGORY_GRADIENTS[block.category || 'General'] ?? CATEGORY_GRADIENTS.General
                        return (
                          <motion.button
                            key={block.type}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelect(block.type)}
                            className={cn(
                              'flex flex-col text-left group border overflow-hidden rounded-none-none transition-all',
                              isDark
                                ? 'bg-z-panel border-white/8 hover:border-z-accent/50 hover:shadow-sm'
                                : 'bg-z-panel border-z-border hover:border-z-active-border hover:shadow-sm'
                            )}
                          >
                            {/* Preview area */}
                            <div className={cn('w-full h-20 flex items-center justify-center relative bg-gradient-to-br', grad)}>
                              <div className="text-white/30 group-hover:text-white/70 transition-colors duration-300" style={{ transform: 'scale(2.5)' }}>
                                <Icon size={16} />
                              </div>
                              {block.category && (
                                <span className="absolute top-2 left-2 px-1.5 py-0.5 text-sm font-semibold bg-black/50 backdrop-blur text-white/80 rounded-none-none">
                                  {block.category}
                                </span>
                              )}
                              <div className="absolute bottom-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-5 h-5 bg-z-accent flex items-center justify-center rounded-none-none">
                                  <Plus size={10} className="text-white" />
                                </div>
                              </div>
                            </div>

                            {/* Info */}
                            <div className={cn('p-3 flex-1 transition-colors', isDark ? 'group-hover:opacity-90/5' : 'group-hover:bg-z-active-bg/50')}>
                              <p className={cn('text-sm font-semibold  italic  mb-0.5', isDark ? 'text-white' : 'text-black')}>
                                {block.title}
                              </p>
                              <p className={cn('text-sm leading-relaxed line-clamp-2', isDark ? 'text-z-secondary' : 'text-z-muted')}>
                                {block.description}
                              </p>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={cn('px-6 py-3 border-t flex items-center justify-between flex-shrink-0', isDark ? 'border-white/5 bg-z-panel' : 'border-z-border bg-gray-50/50')}>
              <p className={cn('text-sm', isDark ? 'text-z-secondary' : 'text-z-muted')}>
                {filtered.length} component{filtered.length !== 1 ? 's' : ''} available
              </p>
              <p className={cn('text-sm', isDark ? 'text-z-secondary' : 'text-z-muted')}>
                Press{' '}
                <kbd className={cn('px-1.5 py-0.5 font-mono rounded-none-none text-sm border', isDark ? 'bg-z-hover border-white/10' : 'bg-z-panel border-z-border')}>
                  Esc
                </kbd>{' '}
                to close
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default GlobalComponentPickerModal
