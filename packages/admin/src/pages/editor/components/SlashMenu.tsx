import React from 'react'
import { cn } from '../../../lib/utils'

export interface SlashMenuItem {
 id: string
 label: string
 description: string
 icon: any
 action: () => void
}

interface SlashMenuProps {
 position: { top: number; left: number }
 selectedIndex: number
 items: SlashMenuItem[]
 onSelectItem: (index: number) => void
 theme: 'light' | 'dark'
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
 position,
 selectedIndex,
 items,
 onSelectItem,
 theme,
}) => {
 if (items.length === 0) return null

 return (
 <div
 className={cn(
 'fixed z-[2500] w-64 max-h-[320px] overflow-y-auto border p-1 shadow-2xl transition-all duration-200',
 theme === 'dark'
 ? 'bg-black/85 backdrop-blur-[12px] border-white/8 shadow-[var(--z-active-glow)] text-white'
 : 'bg-white/95 backdrop-blur-[12px] border-z-border shadow-[var(--z-active-glow)] text-black'
 )}
 style={{
 top: `${position.top}px`,
 left: `${position.left}px`,
 }}
 >
 <div className="px-3 py-2 border-b border-z-border mb-1 flex items-center justify-between">
 <span className="text-xs font-black uppercase tracking-[0.2em] text-z-secondary ">
 Block Command
 </span>
 <span className="text-[7px] font-bold text-z-secondary/80 px-1 border border-gray-500/20 rounded-none uppercase">
 ↑↓ Enter
 </span>
 </div>
 <div className="space-y-0.5">
 {items.map((item, index) => {
 const Icon = item.icon
 const isSelected = index === selectedIndex

 return (
 <button
 key={item.id}
 onClick={() => onSelectItem(index)}
 className={cn(
 'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all duration-150 relative group',
 isSelected
 ? theme === 'dark'
 ? 'bg-gray-500/20 text-gray-600 dark:text-z-muted border-l-2 border-gray-500'
 : 'bg-gray-50 text-gray-600 border-l-2 border-gray-500'
 : 'border-l-2 border-transparent hover:bg-z-hover'
 )}
 >
 <div
 className={cn(
 'w-7 h-7 rounded-none flex items-center justify-center border shrink-0',
 isSelected
 ? theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-z-muted'
 : 'bg-gray-100 border-z-border text-gray-600'
 : theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-muted'
 : 'bg-gray-100 border-z-border text-z-secondary'
 )}
 >
 <Icon size={14} className="transition-transform group-hover:scale-110" />
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-[11px] font-black uppercase tracking-tight ">
 {item.label}
 </span>
 <span className="text-xs text-z-muted leading-tight truncate mt-0.5">
 {item.description}
 </span>
 </div>
 </button>
 )
 })}
 </div>
 </div>
 )
}

export default SlashMenu
