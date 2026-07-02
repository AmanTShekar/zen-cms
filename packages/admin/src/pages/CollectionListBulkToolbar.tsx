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
 theme === 'dark' ? 'bg-z-panel/5 border-z-border' : 'bg-z-input border-z-border'
 )}
 >
 <div className="flex items-center gap-3">
 <span className="text-sm font-semibold text-z-secondary">
 {selectedIds.size} Selected
 </span>
 <button onClick={onClearSelection} className="p-1 text-z-secondary hover:text-z-primary transition-colors" title="Clear selection">
 <X size={12} />
 </button>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => onBulkAction('publish')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-semibold text-sm   transition-all flex items-center gap-2 border',
 theme === 'dark' ? 'bg-z-panel/5 border-z-border text-z-secondary hover:bg-z-hover border-z-border-strong' : 'bg-z-input border-z-border text-z-secondary hover:bg-[var(--z-bg-hover)]'
 )}
 >
 <Send size={11} /> Publish
 </button>
 <button
 onClick={() => onBulkAction('unpublish')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-semibold text-sm   transition-all flex items-center gap-2 border',
 theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
 )}
 >
 <Archive size={11} /> Unpublish
 </button>
 <button
 onClick={() => onBulkAction('delete')}
 disabled={bulkProcessing}
 className={cn(
 'px-4 py-2 rounded-none-none font-semibold text-sm   transition-all flex items-center gap-2 border',
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
