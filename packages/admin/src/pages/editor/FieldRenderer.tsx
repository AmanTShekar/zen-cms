import React from 'react'
import { Plus, Trash2, Settings2, HelpCircle, GripVertical } from 'lucide-react'
import { Reorder } from 'framer-motion'
import RichTextEditor from '../../components/RichTextEditor'
import MediaPicker from '../../components/MediaPicker'
import { InlineRelationPicker } from './components/InlineRelationPicker'
import { NestedDynamicZone } from './components/NestedDynamicZone'
import { humanize, type FieldDefinition } from './constants'
import { useEditorStore } from '../../store/editorStore'
import { useModalStore } from '../../store/modalStore'
import { cn } from '../../lib/utils'

interface FieldRendererProps {
  blockId: string
  field: FieldDefinition
  value: any
  onChange: (value: any) => void
  onFieldSelect?: (blockId: string, fieldKey: string) => void
  theme: 'light' | 'dark'
  error?: string
}

// ── Date helper utilities ───────────────────────────────────────────────────
function formatDateForInput(value: string, format: 'date' | 'datetime' | 'time'): string {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    if (format === 'datetime') {
      // datetime-local expects YYYY-MM-DDTHH:MM
      return d.toISOString().slice(0, 16)
    }
    if (format === 'time') {
      return d.toISOString().slice(11, 16)
    }
    return d.toISOString().slice(0, 10)
  } catch {
    return value
  }
}

function parseInputDate(value: string, format: 'date' | 'datetime' | 'time'): string {
  if (!value) return ''
  // For date and datetime, store ISO string; for time, store HH:MM
  if (format === 'time') return value
  try {
    return new Date(value).toISOString()
  } catch {
    return value
  }
}

/** Returns true if valid JSON, false if invalid, null if empty/undefined */
function tryParseJson(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') return null
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

export const FieldRenderer = React.memo(({
  blockId,
  field,
  value,
  onChange,
  onFieldSelect,
  theme,
  error,
  isSelected: isSelectedProp,
}: FieldRendererProps & { isSelected?: boolean }) => {
  const setSelectedField = useEditorStore((s) => s.setSelectedField)
  const showFieldIndicators = useModalStore((s) => s.showFieldIndicators)

  const isSelected = !!isSelectedProp




  // Handle Array manipulation
  const handleAddArrayItem = () => {
    const list = Array.isArray(value) ? [...value] : []
    const newItem: Record<string, any> = { _id: crypto.randomUUID() }
    field.fields?.forEach((subField) => {
      newItem[subField.name] = subField.type === 'array' ? [] : ''
    })
    list.push(newItem)
    onChange(list)
  }

  const handleRemoveArrayItem = (index: number) => {
    if (!Array.isArray(value)) return
    const list = value.filter((_, idx) => idx !== index)
    onChange(list)
  }

  const handleUpdateArrayItem = (index: number, subFieldName: string, subValue: any) => {
    if (!Array.isArray(value)) return
    const list = [...value]
    list[index] = {
      ...list[index],
      [subFieldName]: subValue,
    }
    onChange(list)
  }

  const renderInnerField = () => {
    switch (field.type) {
      case 'media':
        return (
          <MediaPicker
            value={value}
            onChange={onChange}
            hasMany={field.hasMany}
          />
        )

      case 'richtext':
      case 'lexical':
        return (
          <RichTextEditor
            mode="full"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
          />
        )

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Enter email address...'}
            autoComplete="email"
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )

      case 'password':
        return (
          <input
            type="password"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Enter password...'}
            autoComplete="new-password"
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )

      case 'uid': {
        const [isAuto, setIsAuto] = React.useState(!value)
        const sourceField = field.sourceField || 'title'
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value || ''}
                onChange={(e) => { onChange(e.target.value); setIsAuto(false) }}
                placeholder={field.placeholder || `Auto-generated from ${sourceField}...`}
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs transition-all rounded-none font-mono",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
                )}
              />
              <button
                type="button"
                onClick={() => setIsAuto(!isAuto)}
                className={cn(
                  'px-2.5 py-2.5 text-[9px] font-black uppercase italic border rounded-none transition-all shrink-0',
                  isAuto
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : theme === 'dark'
                      ? 'border-white/10 text-gray-500 hover:text-indigo-400'
                      : 'border-gray-200 text-gray-400 hover:text-indigo-600'
                )}
                title={isAuto ? 'Auto-generation enabled' : 'Enable auto-generation'}
              >
                {isAuto ? '⚡ Auto' : 'Manual'}
              </button>
            </div>
            {isAuto && (
              <p className={cn('text-[9px] font-bold italic px-1', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
                Will be auto-generated from the "{sourceField}" field
              </p>
            )}
          </div>
        )
      }

      case 'color': {
        const presetColors = field.options || ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={value || '#000000'}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-10 h-10 rounded-none border cursor-pointer p-0.5"
                  style={{ background: 'transparent' }}
                />
              </div>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs font-mono transition-all rounded-none uppercase",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
                )}
              />
            </div>
            {presetColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {presetColors.map((color: any) => {
                  const colorVal = typeof color === 'string' ? color : color.value
                  const colorLabel = typeof color === 'string' ? color : color.label
                  return (
                    <button
                      key={colorVal}
                      type="button"
                      onClick={() => onChange(colorVal)}
                      className={cn(
                        'w-6 h-6 rounded-none border-2 transition-all',
                        value === colorVal
                          ? 'border-indigo-500 scale-110'
                          : theme === 'dark' ? 'border-white/10 hover:border-white/30' : 'border-gray-200 hover:border-gray-400'
                      )}
                      style={{ backgroundColor: colorVal }}
                      title={colorLabel}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      }

      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
            rows={4}
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none resize-y",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )

      case 'code':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.language || 'code'}...`}
            rows={8}
            spellCheck={false}
            className={cn(
              "w-full px-4 py-2.5 text-xs font-mono transition-all rounded-none resize-y",
              theme === 'dark'
                ? "bg-[#0d1117] backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-[#e6edf3]"
                : "bg-gray-900 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-gray-100"
            )}
          />
        )

      case 'collapsible': {
        const collapsibleFields = field.fields || []
        const collapsibleVal = value && typeof value === 'object' ? value : {}
        return (
          <div className={cn(
            "border-l-2 pl-3 space-y-2",
            theme === 'dark' ? "border-indigo-500/30" : "border-indigo-300"
          )}>
            {collapsibleFields.map((subField) => (
              <div key={subField.name} className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
                  {humanize(subField.name)}
                </label>
                <FieldRenderer
                  blockId={`${blockId}:${field.name}`}
                  field={subField}
                  value={collapsibleVal[subField.name]}
                  onChange={(val) => onChange({ ...collapsibleVal, [subField.name]: val })}
                  theme={theme}
                />
              </div>
            ))}
          </div>
        )
      }

      case 'join':
        return (
          <div className={cn(
            "w-full px-4 py-3 border text-xs italic rounded-none",
            theme === 'dark'
              ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-300"
              : "bg-indigo-50 border-indigo-200 text-indigo-600"
          )}>
            ⧉ Joined data — read-only
          </div>
        )

      case 'point': {
        const coords = (Array.isArray(value) && value.length === 2 && !isNaN(value[0]) && !isNaN(value[1])
          ? value
          : [0, 0]) as [number, number]
        return (
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Lng</label>
              <input
                type="number"
                value={coords[0]}
                onChange={(e) => onChange([Number(e.target.value), coords[1]])}
                step="any"
                className={cn(
                  "w-full px-3 py-2 text-xs transition-all rounded-none",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
                )}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Lat</label>
              <input
                type="number"
                value={coords[1]}
                onChange={(e) => onChange([coords[0], Number(e.target.value)])}
                step="any"
                className={cn(
                  "w-full px-3 py-2 text-xs transition-all rounded-none",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
                )}
              />
            </div>
          </div>
        )
      }

      case 'radio': {
        const options = field.options || []
        const isHorizontal = field.layout === 'horizontal'
        return (
          <div className={cn("flex gap-3", isHorizontal ? "flex-row flex-wrap" : "flex-col gap-1.5")}>
            {options.map((opt: string | { label: string; value: any }) => {
              const optVal = typeof opt === 'string' ? opt : opt.value
              const optLabel = typeof opt === 'string' ? opt : opt.label
              return (
                <label key={optVal} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${blockId}:${field.name}`}
                    value={optVal}
                    checked={value == optVal}
                    onChange={(e) => {
                      // Preserve numeric type when option value is a number
                      const nextVal = typeof optVal === 'number' ? Number(e.target.value) : e.target.value
                      onChange(nextVal)
                    }}
                    className="w-3.5 h-3.5 accent-indigo-500"
                  />
                  <span className={cn(
                    "text-xs",
                    theme === 'dark' ? "text-gray-300" : "text-gray-700"
                  )}>
                    {optLabel}
                  </span>
                </label>
              )
            })}
          </div>
        )
      }

      case 'row': {
        const rowFields = field.fields || []
        const rowVal = value && typeof value === 'object' ? value : {}
        return (
          <div className="flex gap-2 items-end">
            {rowFields.map((subField) => (
              <div key={subField.name} className="flex-1 space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
                  {humanize(subField.name)}
                </label>
                <FieldRenderer
                  blockId={`${blockId}:${field.name}`}
                  field={subField}
                  value={rowVal[subField.name]}
                  onChange={(val) => onChange({ ...rowVal, [subField.name]: val })}
                  theme={theme}
                />
              </div>
            ))}
          </div>
        )
      }

      case 'ui': {
        const CustomComponent = field.admin?.components?.Field
        if (CustomComponent) {
          return <CustomComponent field={field} value={value} onChange={onChange} />
        }
        return null
      }

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value)
              onChange(val)
            }}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )

      case 'boolean':
      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 rounded-none border border-white/10 bg-white/5 checked:bg-indigo-50 checked:border-indigo-50 transition-all accent-indigo-500"
            />
            <span className={cn(
              "text-xs font-medium",
              theme === 'dark' ? "text-gray-300" : "text-gray-700"
            )}>
              {humanize(field.name)}
            </span>
          </label>
        )

      case 'select': {
        const options = field.options || []
        const hasMany = !!field.hasMany
        const [dropdownOpen, setDropdownOpen] = React.useState(false)
        const dropdownRef = React.useRef<HTMLDivElement>(null)
        const selectedValues = hasMany
          ? (Array.isArray(value) ? value : [])
          : (value != null && value !== '' ? [value] : [])

        const getLabel = (opt: string | { label: string; value: any }) =>
          typeof opt === 'string' ? opt : opt.label
        const getVal = (opt: string | { label: string; value: any }) =>
          typeof opt === 'string' ? opt : opt.value
        const selectedLabels = selectedValues
          .map((v) => getLabel(options.find((o) => getVal(o) === v)) || String(v))
          .join(', ')

        const toggleOption = (optVal: any) => {
          if (hasMany) {
            const current = Array.isArray(value) ? [...value] : []
            const idx = current.indexOf(optVal)
            if (idx >= 0) current.splice(idx, 1); else current.push(optVal)
            onChange(current)
          } else {
            onChange(optVal)
            setDropdownOpen(false)
          }
        }

        React.useEffect(() => {
          if (!dropdownOpen) return
          const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
              setDropdownOpen(false)
            }
          }
          document.addEventListener('mousedown', handleClick)
          return () => document.removeEventListener('mousedown', handleClick)
        }, [dropdownOpen])

        return (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(
                'w-full px-4 py-2.5 text-xs transition-all rounded-none flex items-center justify-between gap-2',
                theme === 'dark'
                  ? 'bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white'
                  : 'bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black'
              )}
            >
              <span className={cn('truncate', !selectedValues.length && (theme === 'dark' ? 'text-gray-500' : 'text-gray-400'))}>
                {selectedLabels || 'Select option...'}
              </span>
              <svg className={cn('w-3 h-3 shrink-0 transition-transform', dropdownOpen && 'rotate-180', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {dropdownOpen && (
              <div
                className={cn(
                  'absolute z-50 left-0 right-0 mt-1 border shadow-xl max-h-60 overflow-y-auto',
                  theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
                )}
              >
                {hasMany && selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className={cn('w-full text-left px-3 py-1.5 text-[10px] font-black uppercase italic', theme === 'dark' ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50')}
                  >Clear all</button>
                )}
                {options.map((opt: string | { label: string; value: any }) => {
                  const optLabel = getLabel(opt)
                  const optVal = getVal(opt)
                  const isSelected = selectedValues.includes(optVal)
                  return (
                    <button
                      key={optVal}
                      type="button"
                      onClick={() => toggleOption(optVal)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
                        isSelected
                          ? theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                          : theme === 'dark' ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className={cn(
                        'w-3.5 h-3.5 border shrink-0 flex items-center justify-center transition-all',
                        hasMany ? 'rounded-none' : 'rounded-full',
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500'
                          : theme === 'dark' ? 'border-white/20' : 'border-gray-300'
                      )}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </span>
                      <span className="font-bold truncate">{optLabel}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      }

      case 'relation':
        return (
          <InlineRelationPicker
            blockId={blockId}
            fieldKey={field.name}
            value={value}
            onChange={onChange}
            theme={theme}
            hasMany={field.hasMany}
            relationTo={field.relationTo}
            anchorEl={null}
          />
        )

      case 'date': {
        const dateFormat = field.dateFormat || 'date'
        const dateInputType = dateFormat === 'datetime' ? 'datetime-local' : dateFormat === 'time' ? 'time' : 'date'
        return (
          <input
            type={dateInputType}
            value={value ? formatDateForInput(value, dateFormat) : ''}
            onChange={(e) => onChange(e.target.value ? parseInputDate(e.target.value, dateFormat) : '')}
            className={cn(
              "w-full px-4 py-2.5 text-xs transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-black"
            )}
          />
        )
      }

      case 'array': {
        const items = Array.isArray(value) ? value : []
        const handleReorder = (newItems: any[]) => {
          onChange(newItems)
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-widest text-indigo-400 uppercase italic">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
              <button
                type="button"
                onClick={handleAddArrayItem}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all border',
                  theme === 'dark'
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                )}
              >
                <Plus size={10} /> Add Item
              </button>
            </div>

            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-3">
              {items.map((item, idx) => (
                <Reorder.Item key={item._id || idx} value={item} as="div">
                  <div
                    className={cn(
                      'p-3 border rounded-none relative transition-all group/item',
                      theme === 'dark'
                        ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        : 'bg-gray-50 border-gray-155 hover:border-gray-300 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical size={12} className={cn('cursor-grab opacity-30', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                      <span className={cn('text-[9px] font-black uppercase tracking-widest italic', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem(idx)}
                        aria-label="Remove item"
                        className={cn(
                          'ml-auto p-1 transition-colors',
                          'opacity-0 group-hover/item:opacity-100',
                          theme === 'dark' ? 'text-red-500/50 hover:text-red-400' : 'text-red-400/50 hover:text-red-600'
                        )}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="space-y-3 pl-5">
                      {field.fields?.map((subField) => (
                        <div key={subField.name} className="space-y-1">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest italic block">
                            {humanize(subField.name)}
                          </label>
                          <FieldRenderer
                            blockId={`${blockId}:${idx}`}
                            field={subField}
                            value={item[subField.name]}
                            onChange={(val) => handleUpdateArrayItem(idx, subField.name, val)}
                            theme={theme}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )
      }

      case 'group': {
        const groupVal = value && typeof value === 'object' ? value : {}
        return (
          <div className="border-l border-indigo-500/20 pl-3 space-y-3">
            {field.fields?.map((subField) => (
              <div key={subField.name} className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
                  {humanize(subField.name)}
                </label>
                <FieldRenderer
                  blockId={`${blockId}:${field.name}`}
                  field={subField}
                  value={groupVal[subField.name]}
                  onChange={(val) => onChange({ ...groupVal, [subField.name]: val })}
                  theme={theme}
                />
              </div>
            ))}
          </div>
        )
      }

      case 'json': {
        const jsonValid = tryParseJson(value)
        return (
          <div className="space-y-1">
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || 'Enter JSON...'}
              rows={8}
              spellCheck={false}
              className={cn(
                "w-full px-4 py-2.5 text-xs font-mono transition-all rounded-none resize-y",
                theme === 'dark'
                  ? "bg-[#0d1117] backdrop-blur-md border border-white/8 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-[#e6edf3]"
                  : "bg-gray-900 border border-gray-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-gray-100"
              )}
            />
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-block w-1.5 h-1.5 rounded-none",
                jsonValid === true ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : jsonValid === false ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-gray-600"
              )} />
              <span className="text-xs font-bold uppercase tracking-widest italic" style={{ color: jsonValid === true ? '#10b981' : jsonValid === false ? '#ef4444' : '#6b7280' }}>
                {jsonValid === true ? 'Valid JSON' : jsonValid === false ? 'Invalid JSON' : 'JSON'}
              </span>
            </div>
          </div>
        )
      }

      case 'blocks': {
        const blocks = value && Array.isArray(value) ? value : []
        const availableBlocks = (field as any).blocks || []
        return (
          <div className="space-y-3">
            {blocks.length > 0 && (
              <div className="space-y-2">
                {blocks.map((block: any, idx: number) => {
                  const blockType = block.blockType || block.__blockType
                  const blockDef = availableBlocks.find((b: any) => b.slug === blockType)
                  const blockFields = blockDef?.fields || []
                  return (
                    <div
                      key={block._id || idx}
                      className={cn(
                        'border rounded-none overflow-hidden',
                        theme === 'dark' ? 'bg-white/[0.02] border-white/8' : 'bg-gray-50 border-gray-200'
                      )}
                    >
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-2 border-b',
                        theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-gray-100/50 border-gray-200'
                      )}>
                        <span className={cn(
                          'text-[8px] font-black uppercase italic tracking-wider px-1.5 py-0.5 border rounded-none',
                          theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        )}>
                          {blockDef?.title || humanize(blockType || 'block')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = blocks.filter((_: any, i: number) => i !== idx)
                            onChange(next)
                          }}
                          className="ml-auto p-1 text-gray-500 hover:text-rose-500 transition-colors"
                          aria-label="Remove block"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <div className="px-3 py-3 space-y-3">
                        {blockFields.map((subField: FieldDefinition) => (
                          <div key={subField.name} className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
                              {subField.label || humanize(subField.name)}
                            </label>
                            <FieldRenderer
                              blockId={`${blockId}:${field.name}:${idx}`}
                              field={subField}
                              value={block[subField.name]}
                              onChange={(val) => {
                                const next = [...blocks]
                                next[idx] = { ...next[idx], [subField.name]: val }
                                onChange(next)
                              }}
                              theme={theme}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {availableBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableBlocks.map((b: any) => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => {
                      const newBlock = { blockType: b.slug, _id: crypto.randomUUID() }
                      b.fields?.forEach((f: FieldDefinition) => {
                        newBlock[f.name] = f.type === 'array' ? [] : ''
                      })
                      onChange([...blocks, newBlock])
                    }}
                    className={cn(
                      'px-2.5 py-1 text-[9px] font-black uppercase italic tracking-wider border rounded-none transition-all',
                      theme === 'dark'
                        ? 'bg-white/[0.03] border-white/8 text-gray-400 hover:bg-indigo-500/5 hover:border-indigo-500/30 hover:text-indigo-300'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                    )}
                  >
                    + {b.title || humanize(b.slug)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 'tabs': {
        const tabs = (field as any).tabs || []
        const [activeTab, setActiveTab] = useState(0)
        const tabData = value && typeof value === 'object' ? value : {}
        return (
          <div className="space-y-3">
            {tabs.length > 1 && (
              <div className={cn(
                'flex gap-0.5 p-0.5 rounded-none border',
                theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-100 border-gray-200'
              )}>
                {tabs.map((tab: any, idx: number) => (
                  <button
                    key={tab.label || idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={cn(
                      'px-3 py-1.5 text-[9px] font-black uppercase italic tracking-wider transition-all',
                      activeTab === idx
                        ? theme === 'dark'
                          ? 'bg-white/10 text-white'
                          : 'bg-white text-black shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-500 hover:text-white'
                          : 'text-gray-400 hover:text-black'
                    )}
                  >
                    {tab.label || `Tab ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
            {tabs[activeTab] && (
              <div className="space-y-3">
                {tabs[activeTab].fields?.map((subField: FieldDefinition) => (
                  <div key={subField.name} className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
                      {subField.label || humanize(subField.name)}
                    </label>
                    <FieldRenderer
                      blockId={`${blockId}:${field.name}`}
                      field={subField}
                      value={tabData[subField.name]}
                      onChange={(val) => onChange({ ...tabData, [subField.name]: val })}
                      theme={theme}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 'dz':
        return (
          <NestedDynamicZone
            blockId={blockId}
            fieldName={field.name}
            value={value || []}
            onChange={onChange}
            theme={theme}
            components={field.components || []}
          />
        )

      default:
        return (
          <div className="flex items-center gap-2 p-2 border border-dashed border-red-500/30 text-red-400 text-xs">
            <HelpCircle size={14} /> Unsupported field type: {field.type}
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        'stega-field-wrapper relative transition-all duration-200',
        showFieldIndicators && 'group/field',
        isSelected && 'field-selected'
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (onFieldSelect) {
          onFieldSelect(blockId, field.name)
        } else {
          setSelectedField({ blockId, fieldKey: field.name })
        }
        useEditorStore.getState().setActiveSection(blockId)
      }}
      style={{ padding: showFieldIndicators ? '2px' : 0 }}
    >
      {showFieldIndicators && (
        <div className="stega-field-indicator">
          {isSelected ? <Settings2 size={10} /> : <span className="text-[7px]">⚡</span>}
        </div>
      )}
      {field.description && (
        <p className={cn('text-[11px] font-medium mt-0.5 mb-1', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
          {field.description}
        </p>
      )}
      {renderInnerField()}
      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  )
}, (prev, next) => {
  if (prev.value !== next.value) return false
  if (prev.error !== next.error) return false
  if (prev.theme !== next.theme) return false
  if (prev.field !== next.field) return false
  if (prev.isSelected !== next.isSelected) return false
  return true
})

export default FieldRenderer
