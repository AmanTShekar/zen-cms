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
 Maximize,
 Minimize
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
import { useShallow } from 'zustand/react/shallow'

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

 const { saving,
 undoStack,
 redoStack,
 undo,
 redo,
 lastSavedAt,
  } = useEditorStore(useShallow(state => ({ saving: state.saving, undoStack: state.undoStack, redoStack: state.redoStack, undo: state.undo, redo: state.redo, lastSavedAt: state.lastSavedAt })))

 const { viewMode,
 setViewMode,
 leftOpen,
 setLeftOpen,
 rightOpen,
 setRightOpen,
 focusMode,
 toggleFocusMode
  } = usePanelStore(useShallow(state => ({ viewMode: state.viewMode, setViewMode: state.setViewMode, leftOpen: state.leftOpen, setLeftOpen: state.setLeftOpen, rightOpen: state.rightOpen, setRightOpen: state.setRightOpen, focusMode: state.focusMode, toggleFocusMode: state.toggleFocusMode })))

 const { seoOpen,
 setSeoOpen,
  } = useModalStore(useShallow(state => ({ seoOpen: state.seoOpen, setSeoOpen: state.setSeoOpen })))

 const { publishStatus,
 workflowStatus,
 scheduledAt,
  } = useWorkflowStore(useShallow(state => ({ publishStatus: state.publishStatus, workflowStatus: state.workflowStatus, scheduledAt: state.scheduledAt })))

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
 'w-8 h-8 rounded-none-none flex items-center justify-center border transition-all',
 dark ? 'bg-z-hover border-z-border' : 'bg-z-panel border-z-border'
 )

 const iconBtnActive = (active: boolean) =>
 active
 ? dark ? 'bg-z-panel/10 border-z-border text-z-primary' : 'bg-[var(--z-active-bg)] text-[var(--z-active-text)] border border-[var(--z-active-border)] shadow-sm'
 : dark ? 'text-z-secondary hover:text-z-primary' : 'text-z-muted hover:text-z-primary'

 const iconBtnDisabled = (disabled: boolean) =>
 disabled
 ? dark ? 'bg-app/20 border-z-border text-z-primary/20 cursor-not-allowed' : 'bg-z-input border-z-border shadow-sm text-z-secondary cursor-not-allowed'
 : dark ? 'bg-z-hover border-z-border text-z-muted hover:text-z-secondary' : 'bg-z-panel border-z-border text-z-secondary hover:bg-[var(--z-bg-input)]'

 // Last saved time display
 const lastSavedLabel = lastSavedAt
 ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
 : null

 return (
 <header
 className={cn(
 'h-14 border-b flex items-center justify-between px-4 z-[100] backdrop-blur-3xl transition-all gap-3 shrink-0 overflow-visible',
 dark ? 'bg-z-popover border-z-border' : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 {/* Left: Back + SEO */}
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={handleBack}
 className={cn(iconBtn, dark ? 'text-z-muted hover:text-z-primary' : 'text-z-secondary hover:text-z-primary')}
 aria-label="Back to collection"
 title="Back"
 >
 <ChevronLeft size={16} />
 </button>
 <div className={cn('h-4 w-px mx-1', dark ? 'bg-z-panel/10' : 'bg-[var(--z-border)]')} />
 <button
 onClick={() => setSeoOpen(!seoOpen)}
 className={cn(
 'px-2.5 py-1.5 rounded-none-none border text-xs font-semibold  flex items-center gap-1.5 transition-all',
 seoOpen
 ? 'bg-z-panel/5 border-z-border text-z-secondary'
 : dark ? 'bg-z-hover border-z-border text-z-muted' : 'bg-z-input border-z-border text-z-secondary'
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
 className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-sm font-semibold tabular-nums rounded-none-none bg-z-accent  text-z-primary leading-none"
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
 className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-sm font-semibold tabular-nums rounded-none-none bg-z-accent/80 text-z-primary leading-none"
 aria-hidden="true"
 >
 {redoStack.length > 99 ? '99+' : redoStack.length}
 </span>
 )}
 </button>

 <div className="w-px h-6 bg-z-hover mx-1" />

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
 <button
 onClick={toggleFocusMode}
 aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
 title="Focus Mode"
 className={cn(iconBtn, iconBtnActive(focusMode))}
 >
 {focusMode ? <Minimize size={15} /> : <Maximize size={15} />}
 </button>

 <div className="w-px h-6 bg-z-hover mx-1" />

 {/* Theme toggle */}
 <button
 onClick={toggleTheme}
 aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
 className={cn(iconBtn, dark ? 'text-z-muted hover:text-z-primary' : 'text-z-secondary hover:text-z-primary')}
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
 className={cn(iconBtn, 'text-z-secondary  hover:text-z-secondary')}
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
 'h-8 px-2 rounded-none-none border flex items-center gap-1.5 text-xs font-semibold  transition-all',
 dark ? 'bg-z-hover border-z-border text-z-muted hover:text-z-primary' : 'bg-z-panel border-z-border text-z-secondary hover:bg-[var(--z-bg-input)] hover:text-z-primary'
 )}
 >
 <Languages size={13} />
 {currentLocale.toUpperCase()}
 </button>
 {showLocaleDropdown && (
 <div
 className={cn(
 'absolute top-full mt-2 w-36 border rounded-none-none shadow-2xl z-50 overflow-hidden',
 dark ? 'bg-[#0a0a0a] border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 {availableLocales.map((locale) => (
 <button
 key={locale.code}
 onClick={() => { setCurrentLocale(locale.code); setShowLocaleDropdown(false) }}
 className={cn(
 'w-full flex items-center gap-2 px-3 py-2 text-xs font-bold  transition-colors',
 currentLocale === locale.code
 ? dark ? 'bg-z-panel/5 text-z-secondary' : 'bg-z-hover text-z-primary shadow-sm'
 : dark ? 'text-z-muted hover:bg-z-hover' : 'text-z-secondary hover:bg-[var(--z-bg-hover)] hover:text-z-primary'
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

 <div className="w-px h-6 bg-z-hover mx-1" />

 {/* Visual / JSON toggle */}
 <div className={cn('flex items-center gap-0.5 p-0.5 rounded-none-none border', dark ? 'bg-z-hover border-z-border' : 'bg-z-panel border-z-border')}>
 <button
 onClick={() => setViewMode('visual')}
 className={cn(
 'px-2.5 py-1 rounded-none-none text-xs font-semibold  transition-all',
 viewMode === 'visual'
 ? dark ? 'bg-z-panel text-z-primary' : 'bg-[var(--z-active-bg)] text-[var(--z-active-text)] border border-[var(--z-active-border)] shadow-sm'
 : dark ? 'text-z-primary/50 hover:text-z-primary' : 'text-z-secondary hover:text-z-primary'
 )}
 >
 Visual
 </button>
 <button
 onClick={() => setViewMode('code')}
 className={cn(
 'px-2.5 py-1 rounded-none-none text-xs font-semibold  transition-all',
 viewMode === 'code'
 ? dark ? 'bg-z-panel text-z-primary' : 'bg-[var(--z-active-bg)] text-[var(--z-active-text)] border border-[var(--z-active-border)] shadow-sm'
 : dark ? 'text-z-primary/50 hover:text-z-primary' : 'text-z-secondary hover:text-z-primary'
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
 'flex items-center gap-1 px-2.5 py-1.5 rounded-none-none border text-xs font-semibold  transition-all',
 publishStatus === 'draft' && workflowStatus !== 'scheduled'
 ? dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
 : dark ? 'bg-z-hover border-z-border text-z-secondary' : 'bg-z-input border-z-border text-z-muted'
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
 'flex items-center gap-1 px-2.5 py-1.5 rounded-none-none border text-xs font-semibold  transition-all',
 publishStatus === 'published'
 ? dark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-600'
 : dark ? 'bg-z-hover border-z-border text-z-secondary hover:text-z-primary' : 'bg-z-input border-z-border text-z-muted hover:text-z-primary'
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
 <span className={cn('text-sm font-semibold  ', dark ? 'text-z-secondary' : 'text-z-muted')}>
 {lastSavedLabel}
 </span>
 )}

 {/* Schedule publish */}
 <div className="relative">
 <button
 onClick={() => setShowSchedulePicker(!showSchedulePicker)}
 className={cn(
 'h-8 px-2.5 rounded-none-none border flex items-center gap-1.5 text-xs font-semibold  transition-all',
 scheduledAt
 ? dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
 : dark ? 'bg-z-hover border-z-border text-z-secondary hover:text-z-primary' : 'bg-[var(--z-bg-hover)] border-z-border text-z-muted hover:text-z-primary'
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
 className="flex items-center gap-1.5 px-4 py-1.5 rounded-none-none text-xs font-semibold bg-z-accent  text-z-primary shadow-[0_0_16px_rgba(79,70,229,0.3)] hover:bg-z-border transition-all active:scale-95 disabled:opacity-50"
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
