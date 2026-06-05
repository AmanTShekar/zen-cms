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
 ? 'bg-black/85 backdrop-blur-[12px] border-white/8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-white'
 : 'bg-white/95 backdrop-blur-[12px] border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] text-black'
 )}
 style={{
 top: `${position.top}px`,
 left: `${position.left}px`,
 }}
 >
 <div className="px-3 py-2 border-b border-white/[0.08] mb-1 flex items-center justify-between">
 <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 ">
 Block Command
 </span>
 <span className="text-[7px] font-bold text-emerald-500/80 px-1 border border-emerald-500/20 rounded uppercase">
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
 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500'
 : 'bg-emerald-50 text-emerald-600 border-l-2 border-emerald-500'
 : 'border-l-2 border-transparent hover:bg-white/5'
 )}
 >
 <div
 className={cn(
 'w-7 h-7 rounded flex items-center justify-center border shrink-0',
 isSelected
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
 : 'bg-emerald-100 border-emerald-200 text-emerald-600'
 : theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-gray-100 border-gray-200 text-gray-500'
 )}
 >
 <Icon size={14} className="transition-transform group-hover:scale-110" />
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-[11px] font-black uppercase tracking-tight ">
 {item.label}
 </span>
 <span className="text-xs text-gray-400 leading-tight truncate mt-0.5">
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
