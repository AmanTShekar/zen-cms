import React from 'react'
import {
  Plus,
  GripVertical,
} from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { usePanelStore } from '../../../store/panelStore'
import { cn } from '../../../lib/utils'
import { Reorder } from 'framer-motion'
import { type Section } from '../constants'

interface LeftPanelProps {
  isGlobal?: boolean
  resizingSide: 'left' | 'right' | null
  startResizing: (side: 'left' | 'right') => (e: React.MouseEvent) => void
  addBlock: (blockType: string) => void
  setInjectionIndex: (idx: number | null) => void
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  resizingSide,
  startResizing,
  setInjectionIndex,
}) => {
  const { theme } = useTheme()

  const {
    data,
    activeSection: editorActiveSection,
    setActiveSection: editorSetActiveSection,
    updateData: editorUpdateData,
  } = useEditorStore()

  const {
    leftOpen,
    leftWidth,
  } = usePanelStore()

  const activeSection = editorActiveSection ?? 'root'

  const handleReorder = (newSections: Section[]) => {
    editorUpdateData((prev: any) => ({ ...prev, sections: newSections }))
  }

  if (!leftOpen) return null

  return (
    <aside
      style={{ width: leftWidth }}
      className={cn(
        'border-r flex flex-col z-50 overflow-hidden shrink-0 relative h-full',
        theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-200'
      )}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResizing('left')}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors',
          resizingSide === 'left' ? 'bg-indigo-500' : 'bg-transparent hover:bg-indigo-500/50'
        )}
      />

      {/* Header */}
      <div className={cn('px-3 py-3 border-b flex items-center justify-between',
        theme === 'dark' ? 'border-white/5' : 'border-gray-100'
      )}>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 italic">
          Layers
        </span>
        <button
          onClick={() => { setInjectionIndex(0); }}
          className={cn(
            'p-1 rounded-none border transition-all text-gray-400 hover:text-indigo-500',
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
          )}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto no-scrollbar custom-editor-scrollbar px-2 pt-3 pb-4 space-y-2">
        <Reorder.Group axis="y" values={data?.sections || []} onReorder={handleReorder} className="space-y-1">
          {data?.sections?.map((section: Section) => (
            <Reorder.Item key={section.id} value={section} as="div">
              <button
                onClick={() => editorSetActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-none border text-left transition-all',
                  activeSection === section.id
                    ? theme === 'dark'
                      ? 'bg-white border-white text-black'
                      : 'bg-black border-black text-white'
                    : theme === 'dark'
                      ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                )}
              >
                <GripVertical size={12} className="opacity-30 shrink-0" />
                <span className="text-[10px] font-black uppercase italic tracking-tight truncate">
                  {section.title || section.blockType}
                </span>
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    </aside>
  )
}
