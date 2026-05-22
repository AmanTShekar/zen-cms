import React from 'react'
import { Layout, X, Trash2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { cn } from '../../../lib/utils'

interface TemplatesModalProps {
  selectedSections: Set<string>
  setSelectedSections: (s: Set<string>) => void
  applyTemplate: (template: any) => Promise<void>
  deleteTemplate: (templateId: string) => Promise<void>
  saveAsTemplate: (sectionIds: string[]) => Promise<void>
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  selectedSections,
  setSelectedSections,
  applyTemplate,
  deleteTemplate,
  saveAsTemplate,
}) => {
  const { theme } = useTheme()
  const { templates } = useEditorStore()
  const { templatesOpen, setTemplatesOpen } = usePanelStore()

  return (
    <AnimatePresence>
      {templatesOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              'w-full max-w-2xl border rounded-none overflow-hidden shadow-2xl',
              theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
            )}
          >
            <div
              className={cn(
                'p-6 border-b flex items-center justify-between',
                theme === 'dark' ? 'border-white/5' : 'border-gray-100'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-indigo-600 flex items-center justify-center text-white">
                  <Layout size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic leading-none text-indigo-505">
                    Block Templates
                  </h3>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest">
                    Save & reuse component combinations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTemplatesOpen(false)}
                className="p-1 hover:text-indigo-505 transition-colors"
                style={{ color: theme === 'dark' ? '#fff' : '#000' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-editor-scrollbar">
              {templates.length === 0 ? (
                <div className="py-12 text-center">
                  <Layout size={40} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">
                    No saved templates yet
                  </p>
                  <p className="text-[8px] text-gray-600 mt-2">
                    Select blocks, then save as template from the context menu
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template: any) => (
                    <div
                      key={template.id || template._id}
                      className={cn(
                        'p-4 border rounded-none space-y-3 relative group',
                        theme === 'dark'
                          ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase italic text-indigo-400">
                          {template.name}
                        </span>
                        <span className="text-[7px] text-gray-555">
                          {template.content?.sections?.length || template.sections?.length || 0} blocks
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyTemplate(template)}
                          className="flex-1 py-2 bg-indigo-600 text-white text-[8px] font-black uppercase italic rounded-none hover:bg-indigo-555 transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            deleteTemplate(template.id || template._id)
                            // Force re-render
                            setTemplatesOpen(false)
                            setTimeout(() => setTemplatesOpen(true), 50)
                          }}
                          className={cn(
                            'p-2 border rounded-none transition-colors',
                            theme === 'dark'
                              ? 'border-white/10 text-gray-500 hover:border-rose-500/30 hover:text-rose-500'
                              : 'border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-500'
                          )}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedSections.size > 0 && (
              <div className={cn(
                'p-4 border-t flex items-center justify-between',
                theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
              )}>
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest italic">
                  {selectedSections.size} block{selectedSections.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => {
                    saveAsTemplate(Array.from(selectedSections))
                    setSelectedSections(new Set())
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[8px] font-black uppercase italic rounded-none hover:bg-indigo-500 transition-colors"
                >
                  <Download size={12} />
                  Save as Template
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
