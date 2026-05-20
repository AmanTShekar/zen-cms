import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  X,
  Settings2,
  Plus,
  RotateCcw,
  Save,
  Pencil,
  CheckCircle2,
  Loader2,
  Monitor,
  Search,
  AlertTriangle,
  Database,
  Layout,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import { WIDGET_REGISTRY, getWidgetDef } from '../widgets/registry'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardWidget {
  id: string
  type: string
  title?: string
  config: Record<string, any>
  position: { x: number; y: number; w: number; h: number }
  isOrphaned?: boolean
}

// ── Widget Error Boundary ─────────────────────────────────────────────────────
class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; widgetType: string; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRetry) this.props.onRetry()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-4">
          <AlertTriangle size={20} className="text-amber-500" />
          <p className="text-[9px] font-black uppercase italic text-gray-400">
            Widget failed to load
          </p>
          <p
            className="text-[8px] text-gray-600 truncate w-full px-2"
            title={this.state.error?.message}
          >
            {this.state.error?.message || this.props.widgetType}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-2 px-3 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[8px] font-black uppercase tracking-wider transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Sortable Widget Item ──────────────────────────────────────────────────────
function SortableWidget({
  widget,
  isEditing,
  theme,
  onRemove,
  onConfigChange,
  onTitleChange,
  onConfigure,
}: {
  widget: DashboardWidget
  isEditing: boolean
  theme: 'dark' | 'light'
  onRemove: (id: string) => void
  onConfigChange: (id: string, cfg: Record<string, any>) => void
  onTitleChange: (id: string, title: string) => void
  onConfigure: (widget: DashboardWidget) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(widget.title || '')
  const def = getWidgetDef(widget.type)

  const widgetStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `span ${widget.position.w}`,
    minHeight: `${widget.position.h * 80}px`,
  }

  const WidgetComponent = def?.component

  return (
    <div
      ref={setNodeRef}
      style={widgetStyle}
      className={cn(
        'relative rounded-none border overflow-hidden transition-all duration-200 flex flex-col',
        theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100 shadow-sm',
        isEditing && 'ring-1 ring-inset ring-indigo-500/20',
        isDragging && 'z-50 shadow-2xl shadow-black/40'
      )}
    >
      {/* Edit Mode Overlay Controls */}
      {isEditing && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 border-b',
            theme === 'dark' ? 'bg-[#0d0d0d] border-white/5' : 'bg-gray-50 border-gray-100'
          )}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-gray-500 hover:text-indigo-400 transition-colors touch-none"
          >
            <GripVertical size={14} />
          </button>

          {/* Editable title */}
          <div className="flex-1 mx-2">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  onTitleChange(widget.id, titleDraft)
                  setEditingTitle(false)
                }}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (onTitleChange(widget.id, titleDraft), setEditingTitle(false))
                }
                className={cn(
                  'w-full text-[10px] font-black uppercase italic outline-none bg-transparent border-b border-indigo-500 pb-0.5',
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 group/title"
              >
                <span
                  className={cn(
                    'text-[10px] font-black uppercase italic truncate max-w-[120px]',
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  )}
                >
                  {widget.title || def?.label || widget.type}
                </span>
                <Pencil
                  size={9}
                  className="text-gray-600 opacity-0 group-hover/title:opacity-100 transition-opacity"
                />
              </button>
            )}
          </div>

          {/* Configure & Remove */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onConfigure(widget)}
              className="p-1 text-gray-500 hover:text-indigo-450 transition-colors"
              title="Configure Widget"
            >
              <Settings2 size={13} />
            </button>
            <button
              onClick={() => onRemove(widget.id)}
              className="p-1 text-gray-600 hover:text-red-500 transition-colors"
              title="Remove Widget"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Orphaned widget state */}
      {widget.isOrphaned ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertTriangle size={18} className="text-amber-400" />
          <p className="text-[9px] font-black uppercase italic text-gray-500">
            Widget type <span className="text-amber-400">{widget.type}</span> is no longer
            available.
          </p>
          {isEditing && (
            <button
              onClick={() => onRemove(widget.id)}
              className="text-[8px] text-red-500 uppercase font-black mt-1 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className={cn('flex-1 p-4 min-h-0 overflow-hidden', isEditing && 'pt-12')}>
          {WidgetComponent && (
            <WidgetErrorBoundary widgetType={widget.type}>
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-gray-500" />
                  </div>
                }
              >
                <WidgetComponent
                  id={widget.id}
                  config={widget.config || {}}
                  title={widget.title || def?.label}
                  isEditing={isEditing}
                  onConfigChange={(cfg) => onConfigChange(widget.id, cfg)}
                  onRemove={() => onRemove(widget.id)}
                  theme={theme}
                />
              </Suspense>
            </WidgetErrorBoundary>
          )}
        </div>
      )}
    </div>
  )
}

// ── Widget Visual Preview ───────────────────────────────────────────────────
function WidgetPreviewMock({ type, theme }: { type: string; theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark'
  const baseBg = isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200 shadow-sm'
  const lineBg = isDark ? 'bg-white/10' : 'bg-gray-200'

  const renderContent = () => {
    switch (type) {
      case 'stat-card':
        return (
          <div className="flex flex-col justify-between h-full">
            <div
              className={cn(
                'w-6 h-6 flex items-center justify-center',
                isDark ? 'bg-white/5' : 'bg-indigo-50'
              )}
            >
              <Database size={10} className="text-indigo-500" />
            </div>
            <div>
              <div className={cn('h-1.5 w-12 mb-1.5 rounded-sm', lineBg)} />
              <div className={cn('h-4 w-16 rounded-sm', isDark ? 'bg-white/20' : 'bg-gray-300')} />
            </div>
          </div>
        )
      case 'audit-log':
      case 'recent-content':
        return (
          <div className="flex flex-col h-full gap-2 overflow-hidden">
            <div className={cn('h-2 w-16 mb-1 rounded-sm', lineBg)} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className={cn('w-4 h-4 shrink-0', lineBg)} />
                <div className="flex-1 space-y-1">
                  <div className={cn('h-1.5 w-full rounded-sm', lineBg)} />
                  <div className={cn('h-1 w-1/2 rounded-sm', lineBg)} />
                </div>
              </div>
            ))}
          </div>
        )
      case 'quick-actions':
        return (
          <div className="flex flex-col h-full justify-center gap-2">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn('flex-1 h-6', lineBg)} />
              ))}
            </div>
          </div>
        )
      case 'system-health':
      case 'api-status':
        return (
          <div className="flex flex-col h-full gap-2">
            <div className={cn('h-2 w-16 mb-2 rounded-sm', lineBg)} />
            <div className="flex items-end gap-1 h-8">
              {[40, 70, 45, 90, 60].map((h, i) => (
                <div
                  key={i}
                  className={cn('flex-1', isDark ? 'bg-indigo-500/50' : 'bg-indigo-200')}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        )
      case 'media-grid':
        return (
          <div className="grid grid-cols-3 gap-1 h-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={cn('w-full h-full', lineBg)} />
            ))}
          </div>
        )
      default:
        return (
          <div className="h-full flex items-center justify-center">
            <Layout size={20} className={lineBg.replace('bg-', 'text-')} />
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        'w-full h-24 p-3 border overflow-hidden relative group-hover:border-indigo-500/50 transition-colors',
        baseBg
      )}
    >
      {renderContent()}
    </div>
  )
}

// ── Widget Picker Drawer ──────────────────────────────────────────────────────
function WidgetPicker({
  open,
  onClose,
  onAdd,
  existingTypes,
  role,
  theme,
}: {
  open: boolean
  onClose: () => void
  onAdd: (def: any) => void
  existingTypes: string[]
  role: string
  theme: 'dark' | 'light'
}) {
  const [search, setSearch] = useState('')
  const categories = ['data', 'content', 'system', 'team', 'custom'] as const
  const filtered = WIDGET_REGISTRY.filter((w) => {
    if (w.adminOnly && role !== 'admin') return false
    if (
      search &&
      !w.label.toLowerCase().includes(search.toLowerCase()) &&
      !w.description.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })
  const grouped = categories
    .map((cat) => ({ cat, widgets: filtered.filter((w) => w.category === cat) }))
    .filter((g) => g.widgets.length > 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[100] w-[460px] flex flex-col border-l shadow-2xl',
              theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#fcfcfc] border-gray-100'
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-transparent to-indigo-500/5">
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tighter">
                  Add Widget
                </h3>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                  Select a module to place on your dashboard
                </p>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                )}
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 border-b border-white/5">
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 border rounded-none shadow-inner',
                  theme === 'dark' ? 'bg-black/50 border-white/10' : 'bg-white border-gray-200'
                )}
              >
                <Search size={14} className="text-gray-500 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search widgets by name or description..."
                  className="bg-transparent text-[11px] font-black uppercase italic tracking-wider outline-none flex-1 placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-editor-scrollbar">
              {grouped.map(({ cat, widgets }) => (
                <div key={cat}>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    {cat}{' '}
                    <span className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {widgets.map((def) => {
                      const alreadyAdded = def.singleton && existingTypes.includes(def.type)
                      return (
                        <button
                          key={def.type}
                          disabled={alreadyAdded}
                          onClick={() => {
                            onAdd(def)
                            onClose()
                          }}
                          className={cn(
                            'flex flex-col text-left transition-all group relative',
                            alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                          )}
                        >
                          <WidgetPreviewMock type={def.type} theme={theme} />

                          <div
                            className={cn(
                              'mt-3 w-full border-l-2 pl-3 py-1 transition-colors',
                              theme === 'dark'
                                ? 'border-white/10 group-hover:border-indigo-500'
                                : 'border-gray-200 group-hover:border-indigo-500'
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <def.icon
                                size={12}
                                className={
                                  theme === 'dark'
                                    ? 'text-gray-400 group-hover:text-indigo-400'
                                    : 'text-gray-500 group-hover:text-indigo-600'
                                }
                              />
                              <p className="text-[11px] font-black uppercase italic tracking-tight">
                                {def.label}
                              </p>
                            </div>
                            <p className="text-[9px] text-gray-500 leading-snug line-clamp-2 pr-2">
                              {def.description}
                            </p>
                          </div>

                          {alreadyAdded && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                              <span className="bg-black text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest border border-white/10 shadow-xl">
                                Already Added
                              </span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Widget Configuration Drawer/Modal ───────────────────────────────────────
function WidgetConfigModal({
  widget,
  open,
  onClose,
  onSave,
  theme,
}: {
  widget: DashboardWidget | null
  open: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<DashboardWidget>) => void
  theme: 'dark' | 'light'
}) {
  const [title, setTitle] = useState('')
  const [width, setWidth] = useState(3)
  const [height, setHeight] = useState(2)
  const [config, setConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '')
      setWidth(widget.position.w)
      setHeight(widget.position.h)
      setConfig(widget.config || {})
    }
  }, [widget])

  if (!widget) return null
  const def = getWidgetDef(widget.type)

  const handleSave = () => {
    onSave(widget.id, {
      title,
      position: { ...widget.position, w: width, h: height },
      config,
    })
    onClose()
  }

  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[100] w-[460px] flex flex-col border-l shadow-2xl',
              isDark
                ? 'bg-[#0a0a0a] border-white/5 text-white'
                : 'bg-[#fcfcfc] border-gray-100 text-gray-900'
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-transparent to-indigo-500/5">
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tighter">
                  Configure Widget
                </h3>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                  {def?.label || widget.type}
                </p>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                )}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-editor-scrollbar">
              {/* Title Field */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                  Custom Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2 text-[11px] font-black uppercase italic tracking-wider border rounded-none focus:border-indigo-500 outline-none',
                    isDark
                      ? 'bg-black border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  )}
                  placeholder={def?.label}
                />
              </div>

              {/* Grid Width/Height Spans */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                    Width Columns (1-12)
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className={cn(
                      'w-full px-3 py-2 text-[11px] font-black uppercase italic border rounded-none outline-none focus:border-indigo-500',
                      isDark
                        ? 'bg-black border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    )}
                  >
                    {[2, 3, 4, 6, 8, 12].map((w) => (
                      <option key={w} value={w}>
                        {w} Columns
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                    Height Span
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className={cn(
                      'w-full px-3 py-2 text-[11px] font-black uppercase italic border rounded-none outline-none focus:border-indigo-500',
                      isDark
                        ? 'bg-black border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    )}
                  >
                    {[2, 3, 4, 5, 6, 8].map((h) => (
                      <option key={h} value={h}>
                        {h} Row-units
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Type Configs */}
              {widget.type === 'stat-card' && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">
                    Metric Settings
                  </p>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                      Data Source Metric
                    </label>
                    <select
                      value={config.metric || 'total_records'}
                      onChange={(e) => setConfig({ ...config, metric: e.target.value })}
                      className={cn(
                        'w-full px-3 py-2 text-[11px] font-black uppercase italic border rounded-none outline-none focus:border-indigo-500',
                        isDark
                          ? 'bg-black border-white/10'
                          : 'bg-white border-gray-200 font-sans text-xs'
                      )}
                    >
                      <option value="total_records">Total Records Count</option>
                      <option value="members">Team Members Count</option>
                      <option value="uptime">System Uptime</option>
                      <option value="db_status">Database Connection Health</option>
                    </select>
                  </div>
                </div>
              )}

              {widget.type === 'custom-html' && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">
                    HTML Configuration
                  </p>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                      HTML Code
                    </label>
                    <textarea
                      value={config.html || ''}
                      onChange={(e) => setConfig({ ...config, html: e.target.value })}
                      rows={12}
                      className={cn(
                        'w-full p-4 font-mono text-[11px] border rounded-none outline-none focus:border-indigo-500 resize-none',
                        isDark
                          ? 'bg-black border-white/10 text-white'
                          : 'bg-white border-gray-200 text-gray-900'
                      )}
                      placeholder="<h3>Custom Block</h3>"
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              className={cn(
                'p-6 border-t flex items-center justify-end gap-3',
                isDark ? 'border-white/5' : 'border-gray-100'
              )}
            >
              <button
                onClick={onClose}
                className={cn(
                  'px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-none',
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                    : 'bg-gray-100 hover:bg-gray-250 text-gray-600'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-none transition-colors shadow-lg shadow-indigo-600/20"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Main Dashboard Builder ────────────────────────────────────────────────────
export default function DashboardBuilder() {
  const { theme } = useTheme()
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [columns] = useState(12)
  const [isEditing, setIsEditing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [configWidget, setConfigWidget] = useState<DashboardWidget | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const savedUpdatedAt = useRef<string | undefined>(undefined)
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = window.innerWidth < 768

  // Get user role from localStorage/auth store
  const userStr = localStorage.getItem('zenith-auth')
  const userRole = (() => {
    try {
      return JSON.parse(userStr || '{}')?.state?.user?.role || 'editor'
    } catch {
      return 'editor'
    }
  })()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Load layout ──────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get('/dashboard/layout')
      .then((r) => {
        const data = r.data?.data
        setWidgets(data?.widgets || [])
        savedUpdatedAt.current = data?.updatedAt
      })
      .catch(() => toast.error('Could not load dashboard layout'))
      .finally(() => setLoading(false))
  }, [])

  // ── Save layout ──────────────────────────────────────────────────────────
  const saveLayout = useCallback(
    async (ws: DashboardWidget[], silent = false) => {
      if (!silent) setSaving(true)
      try {
        const r = await api.put('/dashboard/layout', {
          widgets: ws,
          columns,
          updatedAt: savedUpdatedAt.current,
        })
        savedUpdatedAt.current = r.data?.data?.updatedAt
        if (r.data?.data?.warnings?.length) {
          r.data.data.warnings.forEach((w: string) => toast(w, { icon: '⚠️' }))
        }
        if (!silent) {
          toast.success('Dashboard saved')
          setIsDirty(false)
        }
      } catch (err: any) {
        if (err?.response?.status === 409) {
          toast.error('Dashboard was updated in another tab. Refresh to get latest.')
        } else {
          toast.error('Failed to save layout')
        }
      } finally {
        if (!silent) setSaving(false)
      }
    },
    [columns]
  )

  // Auto-save with debounce when dirty
  useEffect(() => {
    if (!isDirty || !isEditing) return
    if (saveDebounce.current) clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(() => saveLayout(widgets, true), 1500)
    return () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current)
    }
  }, [widgets, isDirty, isEditing, saveLayout])

  const markDirty = (ws: DashboardWidget[]) => {
    setWidgets(ws)
    setIsDirty(true)
  }

  // ── DnD handlers ────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = widgets.findIndex((w) => w.id === active.id)
    const newIdx = widgets.findIndex((w) => w.id === over.id)
    markDirty(arrayMove(widgets, oldIdx, newIdx))
  }

  // ── Widget actions ───────────────────────────────────────────────────────
  const addWidget = (def: any) => {
    const newWidget: DashboardWidget = {
      id: uuidv4(),
      type: def.type,
      title: def.label,
      config: {},
      position: { x: 0, y: 999, w: def.defaultSize.w, h: def.defaultSize.h },
    }
    if (widgets.length >= 50) {
      toast.error('Maximum 50 widgets reached')
      return
    }
    markDirty([...widgets, newWidget])
  }

  const removeWidget = (id: string) => markDirty(widgets.filter((w) => w.id !== id))
  const updateWidgetConfig = (id: string, cfg: Record<string, any>) =>
    markDirty(widgets.map((w) => (w.id === id ? { ...w, config: cfg } : w)))
  const updateWidgetTitle = (id: string, title: string) =>
    markDirty(widgets.map((w) => (w.id === id ? { ...w, title } : w)))

  const resetLayout = async () => {
    if (!window.confirm('Reset your dashboard to the default layout? This cannot be undone.'))
      return
    try {
      const r = await api.post('/dashboard/layout/reset')
      setWidgets(r.data?.data?.widgets || [])
      setIsDirty(false)
      toast.success('Dashboard reset to default')
    } catch {
      toast.error('Failed to reset layout')
    }
  }

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null

  if (loading)
    return (
      <div
        className={cn(
          'h-screen w-full flex flex-col items-center justify-center gap-6',
          theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
        )}
      >
        <Loader2 size={32} className="animate-spin text-indigo-500" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">
          Loading Dashboard...
        </p>
      </div>
    )

  return (
    <div
      className={cn(
        'min-h-full transition-colors duration-500',
        theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={cn(
          'sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md transition-colors',
          theme === 'dark' ? 'bg-black/90 border-white/5' : 'bg-white/90 border-gray-100'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-none flex items-center justify-center',
              theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
            )}
          >
            <Monitor size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">
                Zenith Command Center
              </span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none shadow-[0_0_8px_#10b981]" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
              Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMobile && isEditing && (
            <span className="text-[8px] text-amber-500 font-black uppercase italic">
              Desktop recommended for editing
            </span>
          )}

          {isEditing ? (
            <>
              <button
                onClick={resetLayout}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase italic rounded-none transition-all',
                  theme === 'dark'
                    ? 'border-white/10 text-gray-400 hover:text-white'
                    : 'border-gray-200 text-gray-500 hover:text-gray-900'
                )}
              >
                <RotateCcw size={13} /> Reset
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase italic rounded-none transition-all',
                  theme === 'dark'
                    ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-50/10'
                    : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                )}
              >
                <Plus size={13} /> Add Widget
              </button>
              <button
                onClick={() => {
                  saveLayout(widgets)
                  setIsEditing(false)
                }}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase italic rounded-none transition-all shadow-lg shadow-indigo-600/20"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setIsDirty(false)
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase italic rounded-none transition-all',
                  theme === 'dark'
                    ? 'text-gray-500 hover:text-gray-300'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <X size={13} /> Cancel
              </button>
            </>
          ) : (
            <>
              {isDirty && (
                <span className="text-[8px] text-amber-500 font-black uppercase italic">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 border text-[9px] font-black uppercase italic rounded-none transition-all',
                  theme === 'dark'
                    ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                )}
              >
                <Settings2 size={13} /> Customize
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Edit Mode Banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600/10 border-b border-indigo-500/20 px-6 py-3 flex items-center gap-3"
          >
            <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
            <p className="text-[10px] font-black text-indigo-300 uppercase italic tracking-wider">
              Edit mode active — drag widgets to reorder, click <strong>+ Add Widget</strong> to add
              new ones, click <strong>✕</strong> to remove.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Widget Grid ─────────────────────────────────────────────────────── */}
      <div className="p-6">
        {widgets.length === 0 && !isEditing && (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-24 gap-6 border rounded-none border-dashed',
              theme === 'dark' ? 'border-white/5' : 'border-gray-200'
            )}
          >
            <Monitor size={36} className="text-gray-500" strokeWidth={1} />
            <div className="text-center">
              <p className="text-[13px] font-black uppercase italic text-gray-400">
                Your dashboard is empty
              </p>
              <p className="text-[9px] text-gray-600 mt-2 uppercase tracking-widest">
                Click "Customize" to add widgets
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase italic rounded-none shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} /> Get Started
            </button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {widgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditing={isEditing}
                  theme={theme}
                  onRemove={removeWidget}
                  onConfigChange={updateWidgetConfig}
                  onTitleChange={updateWidgetTitle}
                  onConfigure={setConfigWidget}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeWidget && (
              <div
                className={cn(
                  'border rounded-none p-4 shadow-2xl opacity-90 font-black text-[11px] uppercase italic',
                  theme === 'dark'
                    ? 'bg-[#0a0a0a] border-indigo-500/30 text-white'
                    : 'bg-white border-indigo-200 text-gray-900'
                )}
              >
                {activeWidget.title || activeWidget.type}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Widget Picker Drawer ─────────────────────────────────────────────── */}
      <WidgetPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onAdd={addWidget}
        existingTypes={widgets.map((w) => w.type)}
        role={userRole}
        theme={theme}
      />

      {/* ── Widget Configuration Drawer ───────────────────────────────────────── */}
      <WidgetConfigModal
        widget={configWidget}
        open={!!configWidget}
        onClose={() => setConfigWidget(null)}
        onSave={(id, updates) => {
          markDirty(widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)))
        }}
        theme={theme}
      />
    </div>
  )
}
