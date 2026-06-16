import React, { useState, useMemo } from 'react'
import {
 Plus,
 GripVertical,
 Layout,
 Search,
 X,
 Trash2,
} from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { cn } from '../../../lib/utils'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { type Section, humanize } from '../constants'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import EmptyState from '../../../components/EmptyState'
import { useShallow } from 'zustand/react/shallow'

interface LeftPanelProps {
 isGlobal?: boolean
 resizingSide: 'left' | 'right' | null
 startResizing: (side: 'left' | 'right') => (e: React.MouseEvent) => void
 addBlock: (type: string, data?: any) => void
 setInjectionIndex: (index: number | null) => void
 setBlockPickerOpen: (open: boolean) => void
 removeSection: (id: string) => void
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
 isGlobal,
 resizingSide,
 startResizing,
 addBlock,
 setInjectionIndex,
 setBlockPickerOpen,
 removeSection,
}) => {
 const { theme } = useTheme()
 const BLOCK_LIBRARY = useEditorBlocks()
 const [searchQuery, setSearchQuery] = useState('')

 const {
 data,
 activeSection: editorActiveSection,
 setActiveSection: editorSetActiveSection,
 updateData,
 } = useEditorStore(useShallow(state => ({
  data: state.data,
  activeSection: state.activeSection,
  setActiveSection: state.setActiveSection,
  updateData: state.updateData,
 })))

 const { leftOpen,
 leftWidth,
 setLeftOpen,
  } = usePanelStore(useShallow(state => ({ leftOpen: state.leftOpen, leftWidth: state.leftWidth, setLeftOpen: state.setLeftOpen })))

 const activeSection = editorActiveSection ?? 'root'

 // Filter sections by search query
 const searchActive = searchQuery.trim().length > 0
 const filteredSections = useMemo(() => {
 const sections = data?.sections || []
 if (!searchActive) return sections
 const q = searchQuery.toLowerCase()
 return sections.filter((s: Section) =>
 (s.blockName || s.title || humanize(s.blockType)).toLowerCase().includes(q) ||
 s.blockType.toLowerCase().includes(q)
 )
 }, [data?.sections, searchQuery, searchActive])

 /**
 * Transactional reorder guard:
 * - Blocked entirely while search is active (filtered list != full list)
 * - Validates that every id in newSections exists in the current document
 * before committing, preventing phantom-section bugs
 */
 const handleLayerReorder = (newSections: Section[]) => {
 if (searchActive) return // block reorder in filtered mode
 const allIds = new Set(data?.sections.map((s) => s.id))
 if (!newSections.every((s) => allIds.has(s.id))) return // integrity check
 updateData((draft) => { draft.sections = newSections })
 }

 // Get block icon for a section
 const getBlockIcon = (blockType: string) => {
 const block = BLOCK_LIBRARY.find((b) => b.type === blockType)
 return block?.icon || Layout
 }

 const dark = theme === 'dark'

 return (
 <AnimatePresence>
 {leftOpen && (
 <>
 {/* Mobile backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setLeftOpen(false)}
 className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
 />
 <motion.aside
 initial={{ x: '-100%' }}
 animate={{ x: 0 }}
 exit={{ x: '-100%' }}
 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
 style={{ width: leftWidth }}
 className={cn(
 'border-r flex flex-col z-50 overflow-hidden shrink-0 h-full',
 'md:relative fixed inset-y-0 left-0 max-md:!w-[280px] max-md:z-[100] max-md:shadow-2xl',
 dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 {/* Resize handle */}
 <div
 onMouseDown={startResizing('left')}
 className={cn(
 'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors',
 resizingSide === 'left' ? 'bg-gray-500' : 'bg-transparent hover:bg-gray-500/50'
 )}
 />

 {/* Header */}
 <div className={cn('px-3 py-3 border-b flex items-center justify-between',
 dark ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 ">
 Layers
 </span>
 <div className="flex items-center gap-2">
 <button
 onClick={() => { setInjectionIndex(0); setBlockPickerOpen(true); }}
 className={cn(
 'p-1 rounded-none-none border transition-all text-gray-400 hover:text-gray-600 dark:text-gray-500',
 dark ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-50 border-gray-200'
 )}
 aria-label="Add new section"
 title="Add section"
 >
 <Plus size={14} />
 </button>
 <button
 onClick={() => setLeftOpen(false)}
 className="md:hidden p-1 rounded-none-none border transition-all text-gray-400 hover:text-rose-500"
 aria-label="Close layers panel"
 >
 <X size={14} />
 </button>
 </div>
 </div>

 {/* Search */}
 {(data?.sections?.length || 0) > 3 && (
 <div className="px-3 pt-2 pb-1">
 <div className="relative">
 <Search size={11} className={cn(
 'absolute left-2.5 top-1/2 -translate-y-1/2',
 dark ? 'text-gray-600' : 'text-gray-400'
 )} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Filter layers..."
 className={cn(
 'w-full pl-7 pr-7 py-1.5 text-xs font-bold border rounded-none-none bg-transparent transition-all',
 dark
 ? 'border-white/[0.08] text-white placeholder-gray-600 focus:border-gray-500/30'
 : 'border-gray-200 text-black placeholder-gray-400 focus:border-gray-500/30'
 )}
 aria-label="Filter layers"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className={cn(
 'absolute right-2 top-1/2 -translate-y-1/2 p-0.5',
 dark ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-black'
 )}
 aria-label="Clear filter"
 >
 <X size={10} />
 </button>
 )}
 </div>
 </div>
 )}

 {/* Layers List */}
 <div className="flex-1 overflow-y-auto  custom-editor-scrollbar px-2 pt-3 pb-4 space-y-2">
 {filteredSections.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
 {data?.sections?.length === 0 ? (
 <EmptyState
 icon={Layout}
 title="No sections yet"
 message="Add your first section to start building"
 />
 ) : (
 <EmptyState
 icon={Search}
 title="No matches"
 message="Try a different search term"
 />
 )}
 </div>
 ) : searchActive ? (
 <div className="space-y-1">
 {filteredSections.map((section: Section) => {
 const BlockIcon = getBlockIcon(section.blockType)
 return (
 <button
 key={section.id}
 onClick={() => editorSetActiveSection(section.id)}
 className={cn(
 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-none-none border text-left transition-all',
 activeSection === section.id
 ? dark
 ? 'bg-white border-white text-black'
 : 'bg-black border-black text-white'
 : dark
 ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10'
 : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
 )}
 aria-label={`Select section: ${section.blockName || section.title || humanize(section.blockType)}`}
 >
 <BlockIcon size={12} className={cn(
 'shrink-0',
 activeSection === section.id
 ? ''
 : dark ? 'text-gray-400/60' : 'text-gray-500/60'
 )} />
 <span className="text-xs font-black uppercase tracking-tight truncate flex-1">
 {section.blockName || section.title || humanize(section.blockType)}
 </span>
 {section.blockType !== humanize(section.blockType) && (
 <span className={cn(
 'text-[8px] font-black uppercase tracking-wider shrink-0',
 activeSection === section.id
 ? 'opacity-60'
 : dark ? 'text-gray-600' : 'text-gray-400'
 )}>
 {humanize(section.blockType)}
 </span>
 )}
 </button>
 )
 })}
 </div>
 ) : (
 <Reorder.Group
 axis="y"
 values={data?.sections || []}
 onReorder={handleLayerReorder}
 className="space-y-1"
 as="div"
 >
 {(data?.sections || []).map((section: Section) => {
 const BlockIcon = getBlockIcon(section.blockType)
 return (
 <Reorder.Item key={section.id} value={section} as="div">
 <div className="w-full flex items-center gap-0">
 <div
 onClick={() => editorSetActiveSection(section.id)}
 className={cn(
 'flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-none-none border text-left transition-all cursor-pointer',
 activeSection === section.id
 ? dark
 ? 'bg-white border-white text-black'
 : 'bg-black border-black text-white'
 : dark
 ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10'
 : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
 )}
 aria-label={`Select section: ${section.blockName || section.title || humanize(section.blockType)}`}
 >
 <GripVertical
 size={12}
 className="opacity-30 shrink-0 cursor-grab active:cursor-grabbing"
 aria-hidden="true"
 />
 <BlockIcon size={12} className={cn(
 'shrink-0',
 activeSection === section.id
 ? ''
 : dark ? 'text-gray-400/60' : 'text-gray-500/60'
 )} aria-hidden="true" />
 <span className="text-xs font-black uppercase tracking-tight truncate flex-1">
 {section.blockName || section.title || humanize(section.blockType)}
 </span>
 {section.blockType !== humanize(section.blockType) && (
 <span className={cn(
 'text-[8px] font-black uppercase tracking-wider shrink-0',
 activeSection === section.id
 ? dark ? 'text-gray-400/80' : 'text-gray-600/80'
 : 'text-gray-400'
 )}>
 {humanize(section.blockType)}
 </span>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation()
 removeSection(section.id)
 }}
 className={cn(
 'p-1 shrink-0 rounded-none opacity-0 group-hover:opacity-100 transition-opacity ml-1',
 dark
 ? 'hover:bg-rose-500/20 text-rose-500/70 hover:text-rose-500'
 : 'hover:bg-rose-100 text-rose-500/70 hover:text-rose-600'
 )}
 aria-label="Delete layer"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 </Reorder.Item>
 )
 })}
 </Reorder.Group>
 )}
 </div>
 </motion.aside>
 </>
 )}
 </AnimatePresence>
 )
}
