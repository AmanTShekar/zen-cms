import React from 'react'
import { Layers, X, GripVertical, Layout, Trash2, PlusCircle, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { BLOCK_LIBRARY, humanize, type PageData } from '../constants'
import { cn } from '../../../lib/utils'

interface DynamicZoneModalProps {
  dynamicZoneModalOpen: boolean
  setDynamicZoneModalOpen: (val: boolean) => void
  activeDynamicZone: { sectionId: string; fieldKey: string } | null
  addToDynamicZone: (componentType: string) => void
  removeFromDynamicZone: (index: number) => void
}

export const DynamicZoneModal: React.FC<DynamicZoneModalProps> = ({
  dynamicZoneModalOpen,
  setDynamicZoneModalOpen,
  activeDynamicZone,
  addToDynamicZone,
  removeFromDynamicZone,
}) => {
  const { theme } = useTheme()
  const { data: dataRaw } = useEditorStore()
  const data = dataRaw as PageData | null

  return (
    <AnimatePresence>
      {dynamicZoneModalOpen && (
        <div className="fixed inset-0 z-[700]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDynamicZoneModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'absolute right-0 top-0 bottom-0 w-[450px] border-l shadow-2xl flex flex-col overflow-hidden',
              theme === 'dark' ? 'bg-[#060606] border-white/10' : 'bg-white border-gray-200'
            )}
          >
            <div className={cn(
              'p-6 border-b flex items-center justify-between',
              theme === 'dark' ? 'border-white/5' : 'border-gray-100'
            )}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Layers size={16} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase italic text-purple-400 leading-none">
                    Dynamic Zone
                  </h2>
                  <p className="text-[7px] text-gray-505 font-bold uppercase tracking-widest mt-1">
                    Add/arrange component blocks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDynamicZoneModalOpen(false)}
                className={cn(
                  'p-1.5 rounded-none border transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 hover:bg-white hover:text-black'
                    : 'bg-gray-100 border-gray-200 hover:bg-black hover:text-white'
                )}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-editor-scrollbar space-y-4">
              {/* Current Zone Items */}
              {activeDynamicZone && (
                (() => {
                  const section = data?.sections?.find((s) => s.id === activeDynamicZone.sectionId)
                  const zone = section?.content?.[activeDynamicZone.fieldKey] || []
                  return zone.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase italic px-1">
                        Zone Contents ({zone.length}) — drag to reorder
                      </p>
                      {zone.map((item: any, idx: number) => (
                        <div key={item.id || idx} className={cn(
                          'flex items-center gap-3 p-3 rounded-none border group',
                          theme === 'dark'
                            ? 'bg-white/5 border-white/10 hover:border-purple-500/20'
                            : 'bg-gray-50 border-gray-200 hover:border-purple-200'
                        )}>
                          <GripVertical size={12} className="text-gray-500 cursor-grab" />
                          <div className="w-6 h-6 rounded-none bg-purple-500/10 flex items-center justify-center">
                            <Layout size={12} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black uppercase italic truncate">
                              {humanize(item.__component?.replace('content.', '') || item.__component || 'Component')}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromDynamicZone(idx)}
                            className="p-1 text-gray-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Box size={24} className="mx-auto text-gray-655 mb-2" />
                      <p className="text-[8px] text-gray-500 font-bold italic">
                        Zone is empty — add components below
                      </p>
                    </div>
                  )
                })()
              )}

              {/* Add Components */}
              <div className="space-y-2">
                <p className="text-[8px] font-black text-gray-500 uppercase italic px-1">
                  Available Components
                </p>
                {BLOCK_LIBRARY.map((block) => {
                  const Icon = block.icon
                  return (
                    <button
                      key={block.type}
                      onClick={() => addToDynamicZone(block.type)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-none border transition-all text-left',
                        theme === 'dark'
                          ? 'bg-white/[0.01] border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5'
                          : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-none bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] font-black uppercase italic">{block.title}</p>
                        <p className="text-[7px] text-gray-500">{block.description}</p>
                      </div>
                      <PlusCircle size={14} className="text-purple-500 opacity-50" />
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
