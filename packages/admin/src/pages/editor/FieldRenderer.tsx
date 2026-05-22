import React from 'react'
import { Plus, Trash2, Settings2, HelpCircle, Link2 } from 'lucide-react'
import RichTextEditor from '../../components/RichTextEditor'
import MediaPicker from '../../components/MediaPicker'
import { humanize, type FieldDefinition } from './constants'
import { useEditorStore } from '../../store/editorStore'
import { usePanelStore } from '../../store/panelStore'
import { cn } from '../../lib/utils'

interface FieldRendererProps {
  blockId: string
  field: FieldDefinition
  value: any
  onChange: (value: any) => void
  theme: 'light' | 'dark'
  onOpenRelations?: (blockId: string, fieldKey: string) => void
  error?: string
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  blockId,
  field,
  value,
  onChange,
  theme,
  onOpenRelations,
  error,
}) => {
  const {
    selectedField,
    setSelectedField,
  } = useEditorStore()

  const { showFieldIndicators } = usePanelStore()

  const isSelected = selectedField?.blockId === blockId && selectedField?.fieldKey === field.name



  // Handle Array manipulation
  const handleAddArrayItem = () => {
    const list = Array.isArray(value) ? [...value] : []
    const newItem: Record<string, any> = {}
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
            hasMany={false}
          />
        )

      case 'richtext':
        return (
          <RichTextEditor
            mode="full"
            value={value || ''}
            onChange={onChange}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
          />
        )

      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
            className={cn(
              "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
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
              "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none resize-y",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
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
              "w-full px-4 py-2.5 text-xs font-mono outline-none transition-all rounded-none resize-y",
              theme === 'dark'
                ? "bg-[#0d1117] backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-[#e6edf3]"
                : "bg-gray-900 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-100"
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
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic block">
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
        const coords = (Array.isArray(value) && value.length === 2 ? value : [0, 0]) as [number, number]
        return (
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Lng</label>
              <input
                type="number"
                value={coords[0]}
                onChange={(e) => onChange([Number(e.target.value), coords[1]])}
                step="any"
                className={cn(
                  "w-full px-3 py-2 text-xs outline-none transition-all rounded-none",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                )}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Lat</label>
              <input
                type="number"
                value={coords[1]}
                onChange={(e) => onChange([coords[0], Number(e.target.value)])}
                step="any"
                className={cn(
                  "w-full px-3 py-2 text-xs outline-none transition-all rounded-none",
                  theme === 'dark'
                    ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                    : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
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
                    checked={value === optVal}
                    onChange={(e) => onChange(e.target.value)}
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
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic block">
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
              "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
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
        return (
          <select
            multiple={hasMany}
            value={value ?? (hasMany ? [] : '')}
            onChange={(e) => {
              if (hasMany) {
                const selectedOptions = Array.from(e.target.selectedOptions, (opt) => opt.value)
                onChange(selectedOptions)
              } else {
                onChange(e.target.value)
              }
            }}
            className={cn(
              "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
            )}
          >
            {!hasMany && <option value="">Select option...</option>}
            {options.map((opt: string | { label: string; value: any }) => {
              const label = typeof opt === 'string' ? opt : opt.label
              const val = typeof opt === 'string' ? opt : opt.value
              return (
                <option key={val} value={val} className={theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-white text-black'}>
                  {label}
                </option>
              )
            })}
          </select>
        )
      }

      case 'relation':
        return (
          <button
            type="button"
            onClick={() => {
              if (onOpenRelations) onOpenRelations(blockId, field.name)
            }}
            className={cn(
              "w-full px-4 py-3 flex items-center justify-between border text-xs font-bold transition-all rounded-none",
              theme === 'dark'
                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
            )}
          >
            <span className="flex items-center gap-2">
              <Link2 size={14} />
              {value ? (Array.isArray(value) ? `${value.length} Relations Selected` : '1 Relation Selected') : 'Manage Relations'}
            </span>
            <span className="text-[10px] opacity-60">Edit ➔</span>
          </button>
        )

      case 'date':
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
            className={cn(
              "w-full px-4 py-2.5 text-xs outline-none transition-all rounded-none",
              theme === 'dark'
                ? "bg-gray-900/65 backdrop-blur-md border border-white/8 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white"
                : "bg-white/80 border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
            )}
          />
        )

      case 'array': {
        const items = Array.isArray(value) ? value : []
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase italic">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
              <button
                type="button"
                onClick={handleAddArrayItem}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider transition-all border',
                  theme === 'dark'
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                )}
              >
                <Plus size={10} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 border rounded-none relative transition-all group/item',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      : 'bg-gray-50 border-gray-155 hover:border-gray-300 shadow-sm'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveArrayItem(idx)}
                    className="absolute top-2 right-2 p-1 text-red-500/50 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                    title="Remove Item"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div className="space-y-3">
                    {field.fields?.map((subField) => (
                      <div key={subField.name} className="space-y-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic block">
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
              ))}
            </div>
          </div>
        )
      }

      case 'group': {
        const groupVal = value && typeof value === 'object' ? value : {}
        return (
          <div className="border-l border-indigo-500/20 pl-3 space-y-3">
            {field.fields?.map((subField) => (
              <div key={subField.name} className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic block">
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

      default:
        return (
          <div className="flex items-center gap-2 p-2 border border-dashed border-red-500/30 text-red-400 text-[10px]">
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
        setSelectedField({ blockId, fieldKey: field.name })
      }}
      style={{ padding: showFieldIndicators ? '2px' : 0 }}
    >
      {showFieldIndicators && (
        <div className="stega-field-indicator">
          {isSelected ? <Settings2 size={10} /> : <span className="text-[7px]">⚡</span>}
        </div>
      )}
      {renderInnerField()}
      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  )
}

export default FieldRenderer
