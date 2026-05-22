import React, { useState } from 'react'
import { X, Search, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { BLOCK_LIBRARY } from '../constants'
import { cn } from '../../../lib/utils'

interface BlockPickerModalProps {
  addBlock: (blockType: string) => void
}

export const BlockPickerModal: React.FC<BlockPickerModalProps> = ({ addBlock }) => {
  const { theme } = useTheme()
  const { blockPickerOpen, setBlockPickerOpen } = useEditorStore()
  const [blockSearch, setBlockSearch] = useState('')

  const filteredBlocks = BLOCK_LIBRARY.filter(
    (b) =>
      b.title.toLowerCase().includes(blockSearch.toLowerCase()) ||
      b.description.toLowerCase().includes(blockSearch.toLowerCase()) ||
      b.type.toLowerCase().includes(blockSearch.toLowerCase())
  )

  return (
    <AnimatePresence>
      {blockPickerOpen && (
        <div className="fixed inset-0 z-[600]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBlockPickerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className={cn(
              'absolute right-0 top-0 bottom-0 w-[400px] border-l shadow-2xl flex flex-col',
              theme === 'dark' ? 'bg-[#050505] border-white/10' : 'bg-white border-gray-200'
            )}
          >
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase italic leading-none text-indigo-500">
                  Add Block
                </h3>
                <button
                  onClick={() => setBlockPickerOpen(false)}
                  className={cn(
                    'p-2 rounded-none border transition-all',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black'
                      : 'bg-gray-100 border-gray-200 text-black hover:bg-black hover:text-white'
                  )}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search Modules..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  className={cn(
                    'w-full rounded-none py-3 pl-12 pr-4 text-[10px] font-black italic outline-none transition-all border',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500/50'
                      : 'bg-gray-50 border-gray-200 text-black focus:border-indigo-600/50'
                  )}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-editor-scrollbar space-y-4">
              {filteredBlocks.map((block) => {
                const Icon = block.icon
                return (
                  <button
                    key={block.type}
                    onClick={() => addBlock(block.type)}
                    className={cn(
                      'group w-full flex items-center gap-4 p-4 rounded-none border transition-all text-left',
                      theme === 'dark'
                        ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5'
                        : 'bg-gray-50 border-gray-200 hover:border-indigo-600/50 hover:bg-indigo-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-none border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform',
                        theme === 'dark'
                          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-500'
                          : 'bg-white border-gray-200 text-indigo-600'
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <h4
                        className={cn(
                          'text-xs font-black uppercase italic tracking-tight',
                          theme === 'dark' ? 'text-white' : 'text-black'
                        )}
                      >
                        {block.title}
                      </h4>
                      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                        {block.description}
                      </p>
                    </div>
                    <Plus
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-all text-indigo-500"
                    />
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
