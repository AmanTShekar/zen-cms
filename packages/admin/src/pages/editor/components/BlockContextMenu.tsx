import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Copy, Trash2, AlignLeft, AlignCenter, AlignRight, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'

interface BlockContextMenuProps {
 x: number
 y: number
 theme: 'light' | 'dark'
 onClose: () => void
 onDuplicate: () => void
 onDelete: () => void
 onAlign: (align: 'left' | 'center' | 'right') => void
 onConvert: (blockType: string) => void
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
 x,
 y,
 theme,
 onClose,
 onDuplicate,
 onDelete,
 onAlign,
 onConvert,
}) => {
 const BLOCK_LIBRARY = useEditorBlocks()
 const menuRef = useRef<HTMLDivElement>(null)
 const [showConvertMenu, setShowConvertMenu] = React.useState(false)

 useEffect(() => {
 const handleOutsideClick = (e: MouseEvent) => {
 if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 onClose()
 }
 }
 window.addEventListener('mousedown', handleOutsideClick)
 return () => window.removeEventListener('mousedown', handleOutsideClick)
 }, [onClose])

 // Adjust coordinates if menu would render off screen
 const [coords, setCoords] = React.useState({ top: y, left: x })

 useEffect(() => {
 if (menuRef.current) {
 const rect = menuRef.current.getBoundingClientRect()
 const newCoords = { top: y, left: x }
 if (x + rect.width > window.innerWidth) {
 newCoords.left = x - rect.width
 }
 if (y + rect.height > window.innerHeight) {
 newCoords.top = y - rect.height
 }
 setCoords(newCoords)
 }
 }, [x, y])

 return (
 <div
 ref={menuRef}
 style={{ top: coords.top, left: coords.left }}
 className="fixed z-[999] w-56 select-none font-sans"
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: -5 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -5 }}
 transition={{ duration: 0.15 }}
 className={cn(
 'p-1.5 border rounded-none-none shadow-2xl backdrop-blur-xl relative',
 theme === 'dark'
 ? 'bg-app/95 border-z-border text-z-primary'
 : 'bg-z-panel/95 border-z-border text-z-primary shadow-sm/50'
 )}
 >
 {/* Transform Submenu Trigger */}
 <div className="relative">
 <button
 onMouseEnter={() => setShowConvertMenu(true)}
 onClick={() => setShowConvertMenu(!showConvertMenu)}
 className={cn(
 'w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold rounded-none-none transition-colors',
 theme === 'dark' ? 'hover:bg-z-hover' : 'hover:bg-[var(--z-bg-hover)]'
 )}
 >
 <span className="flex items-center gap-2">
 <RefreshCw size={13} className="text-z-secondary" />
 Convert to Layout
 </span>
 <ChevronRight size={12} className="opacity-50" />
 </button>

 {/* Submenu */}
 {showConvertMenu && (
 <div
 className="absolute left-full top-0 ml-1 w-52 select-none"
 onMouseLeave={() => setShowConvertMenu(false)}
 >
 <motion.div
 initial={{ opacity: 0, x: -5 }}
 animate={{ opacity: 1, x: 0 }}
 className={cn(
 'p-1.5 border rounded-none-none shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto custom-editor-scrollbar',
 theme === 'dark'
 ? 'bg-app/95 border-z-border text-z-primary'
 : 'bg-z-panel/95 border-z-border text-z-primary'
 )}
 >
 {BLOCK_LIBRARY.map((block) => (
 <button
 key={block.type}
 onClick={() => {
 onConvert(block.type)
 onClose()
 }}
 className={cn(
 'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left text-xs rounded-none-none transition-colors font-medium',
 theme === 'dark' ? 'hover:bg-z-hover' : 'hover:bg-[var(--z-bg-hover)]'
 )}
 >
 {block.icon && <block.icon size={13} className="text-z-secondary shrink-0" />}
 <span className="truncate">{block.title}</span>
 </button>
 ))}
 </motion.div>
 </div>
 )}
 </div>

 <div className={cn('h-px my-1', theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-hover)]')} />

 {/* Duplicate */}
 <button
 onClick={() => {
 onDuplicate()
 onClose()
 }}
 className={cn(
 'w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-none-none transition-colors',
 theme === 'dark' ? 'hover:bg-z-hover' : 'hover:bg-[var(--z-bg-hover)]'
 )}
 >
 <Copy size={13} className="text-z-secondary" />
 Duplicate Section
 </button>

 {/* Align Submenu */}
 <div className={cn('h-px my-1', theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-hover)]')} />
 <div className="px-3 py-1.5 text-xs font-semibold opacity-40">Alignment</div>
 <div className="flex gap-1 px-1.5 pb-1">
 <button
 onClick={() => { onAlign('left'); onClose() }}
 aria-label="Align left"
 className={cn('flex-1 flex items-center justify-center p-1.5 border rounded-none-none transition-all', theme === 'dark' ? 'border-z-border hover:border-z-border/30 hover:bg-z-hover text-z-muted hover:text-z-secondary' : 'border-z-border hover:border-z-border hover:bg-[var(--z-bg-input)] text-z-secondary hover:text-z-secondary')}
 >
 <AlignLeft size={13} aria-hidden="true" />
 </button>
 <button
 onClick={() => { onAlign('center'); onClose() }}
 aria-label="Align center"
 className={cn('flex-1 flex items-center justify-center p-1.5 border rounded-none-none transition-all', theme === 'dark' ? 'border-z-border hover:border-z-border/30 hover:bg-z-hover text-z-muted hover:text-z-secondary' : 'border-z-border hover:border-z-border hover:bg-[var(--z-bg-input)] text-z-secondary hover:text-z-secondary')}
 >
 <AlignCenter size={13} aria-hidden="true" />
 </button>
 <button
 onClick={() => { onAlign('right'); onClose() }}
 aria-label="Align right"
 className={cn('flex-1 flex items-center justify-center p-1.5 border rounded-none-none transition-all', theme === 'dark' ? 'border-z-border hover:border-z-border/30 hover:bg-z-hover text-z-muted hover:text-z-secondary' : 'border-z-border hover:border-z-border hover:bg-[var(--z-bg-input)] text-z-secondary hover:text-z-secondary')}
 >
 <AlignRight size={13} aria-hidden="true" />
 </button>
 </div>

 <div className={cn('h-px my-1', theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-hover)]')} />

 {/* Delete */}
 <button
 onClick={() => {
 onDelete()
 onClose()
 }}
 className={cn(
 'w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-none-none transition-colors',
 theme === 'dark' ? 'hover:bg-rose-500/10 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
 )}
 >
 <Trash2 size={13} className="text-rose-500" />
 Delete Section
 </button>
 </motion.div>
 </div>
 )
}
