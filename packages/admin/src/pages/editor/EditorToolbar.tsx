import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Undo2,
  Redo2,
  PanelLeft,
  PanelRight,
  Sun,
  Moon,
  Languages,
  Globe,
  Circle,
  Check,
  Save,
  Loader2,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useEditorStore } from '../../store/editorStore'
import { usePanelStore } from '../../store/panelStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { useI18nStore } from '../../store/i18nStore'
import { cn } from '../../lib/utils'

interface EditorToolbarProps {
  handleSave: () => Promise<void>
  handlePublish: () => Promise<void>
  handleUnpublish: () => Promise<void>
  isGlobal?: boolean
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  handleSave,
  handlePublish,
  handleUnpublish,
}) => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const {
    saving,
    hasUnsavedChanges,
    undoStack,
    redoStack,
    undo,
    redo,
  } = useEditorStore()

  const {
    viewMode,
    setViewMode,
    seoOpen,
    setSeoOpen,
  } = usePanelStore()

  const {
    publishStatus,
  } = useWorkflowStore()

  const {
    i18nEnabled,
    availableLocales,
    currentLocale,
    setCurrentLocale,
  } = useI18nStore()

  // Simplified: only show locale switcher if i18n is enabled
  const [showLocaleDropdown, setShowLocaleDropdown] = React.useState(false)

  return (
    <header
      className={cn(
        'h-14 border-b flex items-center justify-between px-4 z-[100] backdrop-blur-3xl transition-all gap-3 shrink-0',
        theme === 'dark' ? 'bg-black/90 border-white/5' : 'bg-white/90 border-gray-100 shadow-sm'
      )}
    >
      {/* Left: Back + Status */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className={cn(
            'p-2 rounded-none border transition-colors',
            theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-black'
          )}
          title="Back"
        >
          <ChevronLeft size={18} />
        </button>
        {hasUnsavedChanges && (
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved" />
        )}
        <button
          onClick={() => setSeoOpen(!seoOpen)}
          className={cn(
            'px-2.5 py-1.5 rounded-none border text-[8px] font-black uppercase italic flex items-center gap-1.5 transition-all',
            seoOpen
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              : theme === 'dark'
                ? 'bg-white/5 border-white/5 text-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-500'
          )}
          title="SEO"
        >
          <Globe size={12} />
          SEO
        </button>
      </div>

      {/* Center: Essential actions only */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <button onClick={undo} disabled={undoStack.length === 0}
          className={cn('w-8 h-8 rounded-none flex items-center justify-center border transition-all', undoStack.length > 0 ? theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400 hover:text-indigo-400' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-indigo-600' : theme === 'dark' ? 'bg-black/20 border-white/5 text-white/20 cursor-not-allowed' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed')}>
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={redoStack.length === 0}
          className={cn('w-8 h-8 rounded-none flex items-center justify-center border transition-all', redoStack.length > 0 ? theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400 hover:text-indigo-400' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-indigo-600' : theme === 'dark' ? 'bg-black/20 border-white/5 text-white/20 cursor-not-allowed' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed')}>
          <Redo2 size={15} />
        </button>

        <div className="w-px h-6 bg-white/5 mx-1" />

        {/* Panel toggles */}
        <button
          onClick={() => usePanelStore.getState().setLeftOpen(!usePanelStore.getState().leftOpen)}
          className={cn('w-8 h-8 rounded-none flex items-center justify-center border transition-all', theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-black')}
        >
          <PanelLeft size={15} />
        </button>
        <button
          onClick={() => usePanelStore.getState().setRightOpen(!usePanelStore.getState().rightOpen)}
          className={cn('w-8 h-8 rounded-none flex items-center justify-center border transition-all', theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-black')}
        >
          <PanelRight size={15} />
        </button>

        <div className="w-px h-6 bg-white/5 mx-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn('w-8 h-8 rounded-none flex items-center justify-center border transition-all', theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-black')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Language */}
        {i18nEnabled && (
          <div className="relative">
            <button
              onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
              className={cn(
                'h-8 px-2 rounded-none border flex items-center gap-1.5 text-[8px] font-black uppercase italic transition-all',
                theme === 'dark'
                  ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-black'
              )}
            >
              <Languages size={13} />
              {currentLocale.toUpperCase()}
            </button>
            {showLocaleDropdown && (
              <div
                className={cn(
                  'absolute top-full mt-2 w-36 border rounded-none shadow-2xl z-50 overflow-hidden',
                  theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
                )}
              >
                {availableLocales.map((locale) => (
                  <button
                    key={locale.code}
                    onClick={() => { setCurrentLocale(locale.code); setShowLocaleDropdown(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-[9px] font-bold uppercase transition-colors',
                      currentLocale === locale.code
                        ? theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        : theme === 'dark' ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <span>{locale.flag}</span>
                    <span className="flex-1 text-left">{locale.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-6 bg-white/5 mx-1" />

        {/* Visual / Code toggle */}
        <div className={cn('flex items-center gap-0.5 p-0.5 rounded-none border', theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200')}>
          <button
            onClick={() => setViewMode('visual')}
            className={cn(
              'px-2.5 py-1 rounded-none text-[8px] font-black uppercase italic transition-all',
              viewMode === 'visual'
                ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                : 'text-gray-500 hover:text-indigo-500'
            )}
          >
            Visual
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={cn(
              'px-2.5 py-1 rounded-none text-[8px] font-black uppercase italic transition-all',
              viewMode === 'code'
                ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                : 'text-gray-500 hover:text-indigo-500'
            )}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Right: Status + Save */}
      <div className="flex items-center gap-2">
        {/* Draft / Publish */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUnpublish}
            disabled={publishStatus === 'draft'}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-none border text-[8px] font-black uppercase italic transition-all',
              publishStatus === 'draft'
                ? theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                : theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'
            )}
          >
            <Circle size={7} className={publishStatus === 'draft' ? 'fill-current' : ''} />
            Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={publishStatus === 'published'}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-none border text-[8px] font-black uppercase italic transition-all',
              publishStatus === 'published'
                ? theme === 'dark' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-600'
                : theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-black'
            )}
          >
            <Check size={10} />
            Publish
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-none text-[8px] font-black uppercase bg-indigo-600 text-white shadow-[0_0_16px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50'
          )}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </header>
  )
}