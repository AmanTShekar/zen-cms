import React from 'react'
import { Grip, Copy, Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { BLOCK_LIBRARY, type Section, type FieldDefinition } from '../constants'
import { FieldRenderer } from '../FieldRenderer'

interface SectionBlockProps {
  section: Section
  isActive: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAlign: (align: 'left' | 'center' | 'right') => void
  onFieldChange: (fieldKey: string, value: any) => void
  theme: 'light' | 'dark'
  showFieldIndicators?: boolean
  selectedField?: { blockId: string; fieldKey: string } | null
  schemaFields?: any[]
  fieldErrors?: Record<string, string>
  onFieldSelect?: (blockId: string, fieldKey: string) => void
  i18nEnabled?: boolean
  currentLocale?: string
  getTranslatedValue?: (sectionId: string, fieldKey: string, defaultValue: any) => any
  setTranslatedValue?: (sectionId: string, fieldKey: string, value: any) => void
  onOpenRelations?: (sectionId: string, fieldKey: string, extra?: { relationTo?: string | string[]; hasMany?: boolean }) => void
  onAddToDynamicZone?: (sectionId: string, fieldKey: string) => void
  BLOCK_LIBRARY?: any[]
  getFieldConfig?: (sectionId: string, fieldKey: string) => any
}

const detectFieldType = (key: string, value: any): 'text' | 'richtext' | 'media' | 'array' | 'group' | 'number' | 'boolean' | 'select' | 'relation' => {
  const k = key.toLowerCase()
  if (k.includes('image') || k.includes('photo') || k.includes('thumbnail') || k.includes('cover') || k.includes('banner') || k.includes('logo')) {
    return 'media'
  }
  if (k.includes('content') || k.includes('description') || k.includes('bio') || (typeof value === 'string' && value.length > 200)) {
    return 'richtext'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'object' && value !== null) {
    return 'group'
  }
  return 'text'
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
  section,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
  onAlign,
  onFieldChange,
  theme,
  i18nEnabled,
  currentLocale,
  getTranslatedValue,
  setTranslatedValue,
  onOpenRelations,
  getFieldConfig,
  fieldErrors = {},
}) => {
  const blockDef = BLOCK_LIBRARY.find((b) => b.type === section.blockType)

  // Get field definitions either from block schema or fallback detected from content keys
  const fieldsToRender: FieldDefinition[] = React.useMemo(() => {
    if (blockDef?.fields) {
      return blockDef.fields
    }
    // Fallback: detect from content keys
    return Object.keys(section.content || {}).map((key) => {
      const val = section.content[key]
      return {
        name: key,
        type: detectFieldType(key, val),
        label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
      }
    })
  }, [blockDef, section.content])

  return (
    <div
      onClick={onSelect}
      className={cn(
          'p-6 rounded-none border transition-all duration-500 relative cursor-pointer',
          isActive
            ? theme === 'dark'
              ? 'bg-white/[0.04] border-indigo-500/40'
              : 'bg-gray-50 border-indigo-500/40'
            : theme === 'dark'
              ? 'bg-white/[0.01] border-white/5 hover:border-white/10'
              : 'bg-white border-gray-100 hover:border-gray-200'
        )}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-8 h-8 rounded-none border flex items-center justify-center cursor-grab active:cursor-grabbing',
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-indigo-400'
                  : 'bg-gray-100 border-gray-200 text-indigo-600'
              )}
            >
              <Grip size={14} />
            </div>
            <div>
              <h2
                className={cn(
                  'text-xl font-black italic uppercase tracking-tighter',
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
              >
                {section.title || blockDef?.title || section.blockType}
              </h2>
              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-[0.4em] block italic">
                {section.blockType}
              </span>
            </div>
          </div>

          {/* Section Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
              className={cn(
                'p-2 rounded-none transition-all border opacity-0 group-hover/item:opacity-100',
                theme === 'dark'
                  ? 'text-gray-600 border-transparent hover:border-indigo-500/20 hover:text-indigo-500'
                  : 'text-gray-400 border-transparent hover:border-indigo-200 hover:text-indigo-500'
              )}
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={14} />
            </button>

            {/* Alignment */}
            <div
              className={cn(
                'flex items-center gap-0.5 p-0.5 rounded-none border',
                theme === 'dark'
                  ? 'bg-black/20 border-white/5'
                  : 'bg-gray-100 border-gray-200'
              )}
            >
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAlign(align)
                  }}
                  className={cn(
                    'p-1.5 transition-all',
                    section.align === align || (!section.align && align === 'left')
                      ? theme === 'dark'
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-black shadow-sm'
                      : 'text-gray-400 hover:text-indigo-500'
                  )}
                >
                  {align === 'left' && <AlignLeft size={12} />}
                  {align === 'center' && <AlignCenter size={12} />}
                  {align === 'right' && <AlignRight size={12} />}
                </button>
              ))}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className={cn(
                'p-2 rounded-none transition-all border opacity-0 group-hover/item:opacity-100',
                theme === 'dark'
                  ? 'text-gray-600 border-transparent hover:border-rose-500/20 hover:text-rose-500'
                  : 'text-gray-400 border-transparent hover:border-rose-200 hover:text-rose-500'
              )}
              title="Delete section"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Fields Grid */}
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 gap-8',
            section.align === 'center' && 'text-center',
            section.align === 'right' && 'text-right'
          )}
        >
          {fieldsToRender.map((field) => {
            const rawVal = section.content?.[field.name]
            const displayValue = i18nEnabled && getTranslatedValue
              ? getTranslatedValue(section.id, field.name, rawVal)
              : rawVal
            const isFullWidth = field.name === 'content' || field.name === 'description' || field.name === 'bio' || field.type === 'richtext'
            const errorKey = `${section.id}:${field.name}`

            return (
              <div
                key={field.name}
                className={cn(
                  'space-y-2',
                  isFullWidth && 'md:col-span-2'
                )}
              >
                {/* Field Label */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1 opacity-50">
                    {field.label || field.name}
                  </label>
                  {/* Field Type Badge */}
                  <span className={cn(
                    'px-1.5 py-0.5 text-[6px] font-black uppercase italic rounded-none',
                    theme === 'dark'
                      ? 'bg-white/5 text-gray-600'
                      : 'bg-gray-100 text-gray-400'
                  )}>
                    {field.type}
                  </span>
                </div>

                <FieldRenderer
                  blockId={section.id}
                  field={field}
                  value={displayValue}
                  onChange={(newVal) => {
                    if (i18nEnabled && currentLocale !== 'en' && setTranslatedValue) {
                      setTranslatedValue(section.id, field.name, newVal)
                    } else {
                      onFieldChange(field.name, newVal)
                    }
                  }}
                  theme={theme}
                  error={fieldErrors[errorKey]}
                  onOpenRelations={onOpenRelations ? (bId, fKey) => {
                    const fieldConfig = getFieldConfig ? getFieldConfig(bId, fKey) : undefined
                    onOpenRelations(bId, fKey, fieldConfig)
                  } : undefined}
                />
              </div>
            )
          })}
        </div>

        {/* Active indicator */}
        {isActive && (
          <div className="absolute inset-0 border-2 border-indigo-500/20 pointer-events-none" />
        )}
      </div>
  )
}
