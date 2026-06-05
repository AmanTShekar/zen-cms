import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
 Clock,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useEditorStore } from '../../store/editorStore'
import { usePanelStore } from '../../store/panelStore'
import { useModalStore } from '../../store/modalStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { useI18nStore } from '../../store/i18nStore'
import { cn } from '../../lib/utils'
import { AutoSaveIndicator } from './components/AutoSaveIndicator'
import { SchedulePicker } from './components/SchedulePicker'
import { ConfirmPublishModal } from './components/ConfirmPublishModal'
import { TranslationModal } from './components/TranslationModal'
import { CollabAvatars } from './components/CollabAvatars'

interface EditorToolbarProps {
 handleSave: () => Promise<void>
 handlePublish: () => Promise<void>
 handleUnpublish: () => Promise<void>
 isGlobal?: boolean
 onClose?: () => void
 collab?: any
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
 handleSave,
 handlePublish,
 handleUnpublish,
 isGlobal,
 onClose,
 collab,
}) => {
 const navigate = useNavigate()
 const { id, slug } = useParams<{ id: string; slug: string }>()
 const { theme, toggleTheme } = useTheme()

 const handleBack = () => {
 if (onClose) {
 onClose()
 } else {
 if (isGlobal) {
 navigate('/')
 } else {
 navigate(`/collections/${slug || 'pages'}`)
 }
 }
 }

 const {
 saving,
 undoStack,
 redoStack,
 undo,
 redo,
 lastSavedAt,
 } = useEditorStore()

 const {
 viewMode,
 setViewMode,
 leftOpen,
 setLeftOpen,
 rightOpen,
 setRightOpen,
 } = usePanelStore()

 const {
 seoOpen,
 setSeoOpen,
 } = useModalStore()

 const {
 publishStatus,
 workflowStatus,
 scheduledAt,
 } = useWorkflowStore()

 const {
 i18nEnabled,
 availableLocales,
 currentLocale,
 setCurrentLocale,
 setI18nEnabled,
 } = useI18nStore()

 const [showSchedulePicker, setShowSchedulePicker] = useState(false)
 const [showLocaleDropdown, setShowLocaleDropdown] = useState(false)
 const [showPublishConfirm, setShowPublishConfirm] = useState(false)
 const [showTranslationModal, setShowTranslationModal] = useState(false)

 const localeRef = useRef<HTMLDivElement>(null)

 // Close locale dropdown on outside click
 useEffect(() => {
 if (!showLocaleDropdown) return
 const handle = (e: MouseEvent) => {
 if (localeRef.current && !localeRef.current.contains(e.target as Node)) {
 setShowLocaleDropdown(false)
 }
 }
 document.addEventListener('mousedown', handle)
 return () => document.removeEventListener('mousedown', handle)
 }, [showLocaleDropdown])

 const dark = theme === 'dark'

 // Common button class for toolbar icon buttons
 const iconBtn = cn(
 'w-8 h-8 rounded-none flex items-center justify-center border transition-all',
 dark ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
 )

 const iconBtnActive = (active: boolean) =>
 active
 ? dark ? 'bg-white/10 border-white/[0.08] text-white' : 'bg-gray-200 border-gray-300 text-black'
 : dark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'

 const iconBtnDisabled = (disabled: boolean) =>
 disabled
 ? dark ? 'bg-black/20 border-white/[0.08] text-white/20 cursor-not-allowed' : 'bg-gray-50 border-gray-200 shadow-sm text-gray-300 cursor-not-allowed'
 : dark ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-emerald-600'

 // Last saved time display
 const lastSavedLabel = lastSavedAt
 ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
 : null

 return (
 <header
 className={cn(
 'h-14 border-b flex items-center justify-between px-4 z-[100] backdrop-blur-3xl transition-all gap-3 shrink-0 overflow-visible',
 dark ? 'bg-black/90 border-white/[0.08]' : 'bg-white/90 border-gray-200 shadow-sm shadow-sm'
 )}
 >
 {/* Left: Back + SEO */}
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={handleBack}
 className={cn(iconBtn, dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black')}
 aria-label="Back to collection"
 title="Back"
 >
 <ChevronLeft size={16} />
 </button>
 <div className={cn('h-4 w-px mx-1', dark ? 'bg-white/10' : 'bg-gray-200')} />
 <button
 onClick={() => setSeoOpen(!seoOpen)}
 className={cn(
 'px-2.5 py-1.5 rounded-none border text-xs font-black uppercase flex items-center gap-1.5 transition-all',
 seoOpen
 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
 : dark ? 'bg-white/5 border-white/[0.08] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
 )}
 aria-label={seoOpen ? 'Close SEO panel' : 'Open SEO panel'}
 title="SEO"
 >
 <Globe size={12} />
 SEO
 </button>
 </div>

 {/* Center: Essential actions */}
 <div className="flex items-center gap-1 shrink-0">
 {/* Undo / Redo */}
 <button
 onClick={undo}
 disabled={undoStack.length === 0}
 aria-label={undoStack.length > 0 ? `Undo (${undoStack.length} step${undoStack.length !== 1 ? 's' : ''} available)` : 'Nothing to undo'}
 title={undoStack.length > 0 ? `Undo (${undoStack.length} step${undoStack.length !== 1 ? 's' : ''})` : 'Nothing to undo'}
 className={cn(iconBtn, iconBtnDisabled(undoStack.length === 0), 'relative')}
 >
 <Undo2 size={15} />
 {undoStack.length > 0 && (
 <span
 className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-black tabular-nums rounded-none bg-emerald-600 dark:bg-emerald-600 text-white leading-none"
 aria-hidden="true"
 >
 {undoStack.length > 99 ? '99+' : undoStack.length}
 </span>
 )}
 </button>
 <button
 onClick={redo}
 disabled={redoStack.length === 0}
 aria-label={redoStack.length > 0 ? `Redo (${redoStack.length} step${redoStack.length !== 1 ? 's' : ''} available)` : 'Nothing to redo'}
 title={redoStack.length > 0 ? `Redo (${redoStack.length} step${redoStack.length !== 1 ? 's' : ''})` : 'Nothing to redo'}
 className={cn(iconBtn, iconBtnDisabled(redoStack.length === 0), 'relative')}
 >
 <Redo2 size={15} />
 {redoStack.length > 0 && (
 <span
 className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-black tabular-nums rounded-none bg-emerald-600/80 text-white leading-none"
 aria-hidden="true"
 >
 {redoStack.length > 99 ? '99+' : redoStack.length}
 </span>
 )}
 </button>

 <div className="w-px h-6 bg-white/5 mx-1" />

 {/* Panel toggles */}
 <button
 onClick={() => setLeftOpen(!leftOpen)}
 aria-label={leftOpen ? 'Close layers panel' : 'Open layers panel'}
 title="Layers (Ctrl+\\)"
 className={cn(iconBtn, iconBtnActive(leftOpen))}
 >
 <PanelLeft size={15} />
 </button>
 <button
 onClick={() => setRightOpen(!rightOpen)}
 aria-label={rightOpen ? 'Close preview panel' : 'Open preview panel'}
 title="Preview (Ctrl+P)"
 className={cn(iconBtn, iconBtnActive(rightOpen))}
 >
 <PanelRight size={15} />
 </button>

 <div className="w-px h-6 bg-white/5 mx-1" />

 {/* Theme toggle */}
 <button
 onClick={toggleTheme}
 aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
 className={cn(iconBtn, dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')}
 >
 {dark ? <Sun size={15} /> : <Moon size={15} />}
 </button>

 {/* i18n toggle */}
 <button
 onClick={() => setI18nEnabled(!i18nEnabled)}
 className={cn(iconBtn, iconBtnActive(i18nEnabled))}
 aria-label={i18nEnabled ? 'Disable translations' : 'Enable translations'}
 title={i18nEnabled ? 'Disable translations' : 'Enable translations'}
 >
 <Languages size={13} />
 </button>

 {/* Translation Mode */}
 {i18nEnabled && (
 <button
 onClick={() => setShowTranslationModal(true)}
 className={cn(iconBtn, 'text-emerald-600 dark:text-emerald-500 hover:text-emerald-600 dark:text-emerald-400')}
 title="Translation Mode (Side-by-Side)"
 aria-label="Open Translation Mode"
 >
 <Globe size={13} />
 </button>
 )}

 {/* Locale dropdown */}
 {i18nEnabled && (
 <div className="relative" ref={localeRef}>
 <button
 onClick={() => setShowLocaleDropdown(!showLocaleDropdown)}
 aria-label={`Current language: ${currentLocale.toUpperCase()}. Click to change.`}
 className={cn(
 'h-8 px-2 rounded-none border flex items-center gap-1.5 text-xs font-black uppercase transition-all',
 dark ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-black'
 )}
 >
 <Languages size={13} />
 {currentLocale.toUpperCase()}
 </button>
 {showLocaleDropdown && (
 <div
 className={cn(
 'absolute top-full mt-2 w-36 border rounded-none shadow-2xl z-50 overflow-hidden',
 dark ? 'bg-[#0a0a0a] border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 {availableLocales.map((locale) => (
 <button
 key={locale.code}
 onClick={() => { setCurrentLocale(locale.code); setShowLocaleDropdown(false) }}
 className={cn(
 'w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase transition-colors',
 currentLocale === locale.code
 ? dark ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-emerald-50 text-emerald-600'
 : dark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'
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

 {/* Visual / JSON toggle */}
 <div className={cn('flex items-center gap-0.5 p-0.5 rounded-none border', dark ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200')}>
 <button
 onClick={() => setViewMode('visual')}
 className={cn(
 'px-2.5 py-1 rounded-none text-xs font-black uppercase transition-all',
 viewMode === 'visual'
 ? dark ? 'bg-white text-black' : 'bg-black text-white'
 : dark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-black'
 )}
 >
 Visual
 </button>
 <button
 onClick={() => setViewMode('code')}
 className={cn(
 'px-2.5 py-1 rounded-none text-xs font-black uppercase transition-all',
 viewMode === 'code'
 ? dark ? 'bg-white text-black' : 'bg-black text-white'
 : dark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-black'
 )}
 >
 JSON
 </button>
 </div>
 </div>

 {/* Right: Status + Save */}
 <div className="flex items-center gap-2 shrink-0">
 {/* Draft / Publish */}
 <div className="flex items-center gap-1">
 <button
 onClick={handleUnpublish}
 disabled={publishStatus === 'draft'}
 className={cn(
 'flex items-center gap-1 px-2.5 py-1.5 rounded-none border text-xs font-black uppercase transition-all',
 publishStatus === 'draft' && workflowStatus !== 'scheduled'
 ? dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
 : dark ? 'bg-white/5 border-white/[0.08] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'
 )}
 aria-label="Set as draft"
 >
 <Circle size={7} className={(publishStatus === 'draft' && workflowStatus !== 'scheduled') || workflowStatus === 'scheduled' ? 'fill-current' : ''} />
 {workflowStatus === 'scheduled' ? 'Scheduled' : 'Draft'}
 </button>
 <button
 onClick={() => setShowPublishConfirm(true)}
 disabled={publishStatus === 'published'}
 className={cn(
 'flex items-center gap-1 px-2.5 py-1.5 rounded-none border text-xs font-black uppercase transition-all',
 publishStatus === 'published'
 ? dark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-600'
 : dark ? 'bg-white/5 border-white/[0.08] text-gray-500 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-black'
 )}
 aria-label="Publish document"
 >
 <Check size={10} />
 Publish
 </button>
 </div>

 <AutoSaveIndicator />

 {/* Last saved timestamp */}
 {lastSavedLabel && (
 <span className={cn('text-[10px] font-black uppercase tracking-wider', dark ? 'text-gray-600' : 'text-gray-400')}>
 {lastSavedLabel}
 </span>
 )}

 {/* Schedule publish */}
 <div className="relative">
 <button
 onClick={() => setShowSchedulePicker(!showSchedulePicker)}
 className={cn(
 'h-8 px-2.5 rounded-none border flex items-center gap-1.5 text-xs font-black uppercase transition-all',
 scheduledAt
 ? dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
 : dark ? 'bg-white/5 border-white/[0.08] text-gray-500 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-black'
 )}
 title={scheduledAt ? `Scheduled: ${new Date(scheduledAt).toLocaleString()}` : 'Schedule publish'}
 aria-label={scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleDateString()}` : 'Schedule publish'}
 >
 <Clock size={12} />
 {scheduledAt
 ? new Date(scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
 : 'Schedule'}
 </button>
 <SchedulePicker open={showSchedulePicker} onClose={() => setShowSchedulePicker(false)} />
 </div>

 {/* Collab Avatars */}
 {collab && (
 <div className="mx-2">
 <CollabAvatars
 users={collab.collabUsers}
 localUser={collab.localUser}
 isConnected={collab.isConnected}
 theme={theme}
 />
 </div>
 )}

 {/* Save */}
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-black uppercase bg-emerald-600 dark:bg-emerald-600 text-white shadow-[0_0_16px_rgba(79,70,229,0.3)] hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
 aria-label="Save document"
 >
 {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
 {saving ? 'Saving...' : 'Save'}
 </button>
 </div>

 {/* Publish confirmation modal */}
 <ConfirmPublishModal
 open={showPublishConfirm}
 onConfirm={() => {
 setShowPublishConfirm(false)
 handlePublish()
 }}
 onCancel={() => setShowPublishConfirm(false)}
 />

 {/* Translation modal */}
 <TranslationModal
 open={showTranslationModal}
 onClose={() => setShowTranslationModal(false)}
 />
 </header>
 )
}
