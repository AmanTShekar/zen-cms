import React from 'react'
import { useParams } from 'react-router-dom'
import { X, Eye, History } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { cn } from '../../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface RightPanelProps {
  isGlobal?: boolean
  resizingSide: 'left' | 'right' | null
  startResizing: (side: 'left' | 'right') => (e: React.MouseEvent) => void
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  handleRestore: (versionId: string) => Promise<void>
  newComment: string
  setNewComment: (val: string) => void
}

const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL as string | undefined

export const RightPanel: React.FC<RightPanelProps> = ({
  isGlobal = false,
  resizingSide,
  startResizing,
  iframeRef,
  handleRestore,
}) => {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const { history } = useEditorStore()
  const { rightOpen, rightWidth, activeRightTab, setActiveRightTab, setRightOpen } = usePanelStore()

  const TABS = [
    { id: 'preview', icon: Eye, label: 'Live' },
    { id: 'history', icon: History, label: 'Versions' },
  ] as const

  return (
    <AnimatePresence initial={false}>
      {rightOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: rightWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className={cn(
            'border-l flex flex-col z-50 overflow-hidden shrink-0 relative',
            theme === 'dark'
              ? 'bg-[#080808] border-white/5'
              : 'bg-white border-gray-200 shadow-xl'
          )}
        >
          {/* Resize handle */}
          <div
            onMouseDown={startResizing('right')}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors',
              resizingSide === 'right'
                ? 'bg-indigo-500 shadow-[0_0_15px_#6366f1]'
                : 'bg-transparent hover:bg-indigo-500/50'
            )}
          />

          {/* Tab bar */}
          <div
            className={cn(
              'px-3 py-2 border-b flex items-center justify-between shrink-0',
              theme === 'dark' ? 'border-white/5' : 'border-gray-100'
            )}
          >
            <div className="flex items-center gap-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id)}
                  className={cn(
                    'flex flex-col transition-all',
                    activeRightTab === tab.id ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-[0.2em] italic',
                      activeRightTab === tab.id
                        ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                        : theme === 'dark' ? 'text-white' : 'text-black'
                    )}
                  >
                    {tab.label}
                  </span>
                  <div
                    className="h-0.5 w-full mt-1"
                    style={{
                      backgroundColor: activeRightTab === tab.id ? '#6366f1' : 'transparent',
                    }}
                  />
                </button>
              ))}
            </div>
            <button onClick={() => setRightOpen(false)} className="p-1 hover:text-indigo-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative custom-editor-scrollbar">
            {activeRightTab === 'preview' ? (
              <div className="w-full h-full flex flex-col">
                {/* Preview Frame */}
                <div className="flex-1 flex items-center justify-center overflow-auto p-3">
                  {storefrontUrl ? (
                    <iframe
                      allow="clipboard-read; clipboard-write"
                      ref={iframeRef}
                      src={`${storefrontUrl}?preview=true&pageId=${id || (isGlobal ? 'landing-page' : '')}`}
                      className={cn(
                        'w-full h-full border-none rounded-none',
                        theme === 'dark' ? 'bg-white/5' : 'bg-white'
                      )}
                      title="Live Preview"
                    />
                  ) : (
                    <div className={cn(
                      'flex flex-col items-center justify-center h-full gap-3 text-center p-8',
                      theme === 'dark' ? 'bg-black/40' : 'bg-gray-50'
                    )}>
                      <Eye size={28} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'} />
                      <div>
                        <p className={cn('text-[10px] font-black uppercase italic', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                          Preview unavailable
                        </p>
                        <p className={cn('text-[8px] font-bold', theme === 'dark' ? 'text-gray-700' : 'text-gray-300')}>
                          Set VITE_STOREFRONT_URL to enable live preview
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Versions */
              <div className="w-full h-full p-3 overflow-y-auto custom-editor-scrollbar space-y-2">
                {history.map((v, idx) => (
                  <div
                    key={v.id}
                    className={cn(
                      'group p-3 rounded-none border transition-all cursor-pointer space-y-1',
                      theme === 'dark'
                        ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[10px] font-black uppercase italic', theme === 'dark' ? 'text-white' : 'text-black')}>
                        {idx === 0 ? 'Current' : `V.${history.length - idx}`}
                      </span>
                      <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium italic truncate">
                      {v.changeLog || 'Saved'}
                    </p>
                    {idx > 0 && (
                      <button
                        onClick={() => handleRestore(v._id)}
                        className="w-full py-1 bg-indigo-600 text-white text-[7px] font-black uppercase italic tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
