import React from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { humanize, type PageData } from '../constants'
import { cn } from '../../../lib/utils'

export const SEOModal: React.FC = () => {
  const { theme } = useTheme()
  const { data: dataRaw, updateData: editorUpdateData } = useEditorStore()
  const { seoOpen, setSeoOpen } = usePanelStore()

  const data = dataRaw as PageData | null

  return (
    <AnimatePresence>
      {seoOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              'w-full max-w-lg border rounded-none overflow-hidden shadow-2xl',
              theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
            )}
          >
            <div
              className={cn(
                'p-6 border-b flex items-center justify-between',
                theme === 'dark' ? 'border-white/5' : 'border-gray-100'
              )}
            >
              <h3
                className={cn(
                  'text-lg font-black uppercase italic leading-none',
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
              >
                SEO Meta
              </h3>
              <button
                onClick={() => setSeoOpen(false)}
                className="p-1 hover:text-indigo-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {['title', 'description', 'keywords'].map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic px-1">
                    {humanize(field)}
                  </label>
                  {field === 'description' ? (
                    <textarea
                      value={data?.meta?.[field] || ''}
                      onChange={(e) =>
                        editorUpdateData((prev) => ({
                          ...prev,
                          meta: { ...(prev.meta || {}), [field]: e.target.value },
                        }))
                      }
                      className={cn(
                        'w-full rounded-none py-3 px-4 text-[10px] font-black italic outline-none h-24 resize-none transition-all border',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 text-black focus:border-indigo-600/30'
                      )}
                    />
                  ) : (
                    <input
                      type="text"
                      value={data?.meta?.[field] || ''}
                      onChange={(e) =>
                        editorUpdateData((prev) => ({
                          ...prev,
                          meta: { ...(prev.meta || {}), [field]: e.target.value },
                        }))
                      }
                      className={cn(
                        'w-full rounded-none py-3 px-4 text-[10px] font-black italic outline-none transition-all border',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-200 text-black focus:border-indigo-600/30'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
