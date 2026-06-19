import React from 'react'
import { Send, Archive, Trash2, X, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface CollectionListBulkToolbarProps {
 selectedIds: Set<string>
 bulkProcessing: boolean
 theme: 'light' | 'dark'
 onClearSelection: () => void
 onBulkAction: (action: 'delete' | 'publish' | 'unpublish') => void
}

const CollectionListBulkToolbar: React.FC<CollectionListBulkToolbarProps> = ({
 selectedIds, bulkProcessing, theme, onClearSelection, onBulkAction,
}) => {
 return (
 <motion.div
 initial={{ opacity: 0, y: -10, height: 0 }}
 animate={{ opacity: 1, y: 0, height: 'auto' }}
 exit={{ opacity: 0, y: -10, height: 0 }}
 transition={{ duration: 0.2 }}
 className={cn(
 'border rounded-none-none px-6 py-3 flex items-center justify-between gap-4 shadow-lg',
 theme === 'dark' ? 'bg-gray-500/10 border-gray-500/20' : 'bg-z-input border-z-border'
 )}
 >
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-z-muted ">
 {selectedIds.size} Selected
 </span>
 <button onClick={onClearSelection} className="p-1 text-z-secondary hover:text-white transition-colors" title="Clear selection">
 <X size={12} />
 </button>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => onBulkAction('publish')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border',
 theme === 'dark' ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-z-muted hover:bg-gray-500/20' : 'bg-z-input border-z-border text-gray-600 hover:bg-gray-100'
 )}
 >
 <Send size={11} /> Publish
 </button>
 <button
 onClick={() => onBulkAction('unpublish')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border',
 theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
 )}
 >
 <Archive size={11} /> Unpublish
 </button>
 <button
 onClick={() => onBulkAction('delete')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border',
 theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
 )}
 >
 {bulkProcessing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
 </button>
 </div>
 </motion.div>
 )
}

export default CollectionListBulkToolbar
