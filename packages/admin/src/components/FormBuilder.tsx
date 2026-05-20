import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
// FieldConfig removed from @zenithcms/types as it is missing in build environment
type FieldConfig = any
import RichTextEditor from './RichTextEditor'
import MediaPicker from './MediaPicker'
import BlocksBuilder from './BlocksBuilder'
import SimpleArrayBuilder from './SimpleArrayBuilder'
import RelationPicker from './RelationPicker'
import { cn } from '../lib/utils'

interface FormBuilderProps {
  fields: FieldConfig[]
  initialData?: any
  onSubmit?: (data: any) => Promise<void>
  isSubmitting?: boolean
  activeLocale?: string
  readOnlyLocale?: string
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  initialData,
  onSubmit,
  isSubmitting,
  activeLocale,
  readOnlyLocale,
}) => {
  const currentLocale = activeLocale || 'en'
  const isReadOnly = !!readOnlyLocale

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {},
  })

  const formValues = watch()

  const getFieldName = (field: FieldConfig) => {
    return field.localized ? `${field.name}.${currentLocale}` : field.name
  }

  const getFieldError = (name: string) => {
    if (!name.includes('.')) return errors[name]
    const parts = name.split('.')
    let current: any = errors
    for (const part of parts) {
      if (!current) break
      current = current[part]
    }
    return current
  }

  const evaluateCondition = (condition: any): boolean => {
    if (!condition) return true

    if (typeof condition === 'function') {
      try {
        return condition(formValues)
      } catch {
        return true
      }
    }

    if (typeof condition === 'object') {
      const targetField = condition.field
      if (!targetField) return true

      const targetValue = formValues[targetField]

      if (condition.equals !== undefined) {
        return targetValue === condition.equals
      }
      if (condition.notEquals !== undefined) {
        return targetValue !== condition.notEquals
      }
      if (condition.contains !== undefined) {
        return Array.isArray(targetValue) && targetValue.includes(condition.contains)
      }
    }

    return true
  }

  React.useEffect(() => {
    if (initialData) {
      reset(initialData)
    }
  }, [initialData, reset])

  const renderField = (
    field: FieldConfig,
    value: any,
    onChange: (val: any) => void,
    disabled = false
  ) => {
    if (field.type === 'select') {
      return (
        <select
          value={value || (field.hasMany ? [] : '')}
          onChange={(e) => {
            const val = field.hasMany
              ? Array.from(e.target.selectedOptions, (option) => option.value)
              : e.target.value
            onChange(val)
          }}
          multiple={field.hasMany}
          disabled={disabled}
          className="w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {!field.required && !field.hasMany && <option value="">Select...</option>}
          {field.options?.map((opt: any) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'boolean' || field.type === 'checkbox') {
      return (
        <div className="flex items-center h-9">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded-none border-border text-accent focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          className="w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      )
    }

    if (field.type === 'richtext') {
      return (
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={`Enter ${field.name}...`}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'media') {
      return (
        <MediaPicker
          value={value}
          onChange={onChange}
          hasMany={field.hasMany}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'relation' || field.type === 'relationship') {
      return (
        <RelationPicker
          value={value}
          onChange={onChange}
          relationTo={field.relationTo}
          hasMany={field.hasMany}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'blocks') {
      return (
        <BlocksBuilder
          value={value}
          onChange={onChange}
          availableBlocks={field.blocks || []}
          renderField={(f: any, val: any, change: any) => renderField(f, val, change, disabled)}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'array') {
      return (
        <SimpleArrayBuilder
          value={value}
          onChange={onChange}
          fields={field.fields || []}
          label={field.label || (field as any).name}
          renderField={(f: any, val: any, change: any) => renderField(f, val, change, disabled)}
          disabled={disabled}
        />
      )
    }

    if (field.type === 'textarea') {
      const casingStyle =
        field.casing === 'uppercase'
          ? { textTransform: 'uppercase' as const }
          : field.casing === 'lowercase'
            ? { textTransform: 'lowercase' as const }
            : field.casing === 'capitalize'
              ? { textTransform: 'capitalize' as const }
              : undefined

      return (
        <div className="relative w-full">
          <textarea
            value={value || ''}
            onChange={(e) => {
              let val = e.target.value
              if (field.casing === 'uppercase') val = val.toUpperCase()
              else if (field.casing === 'lowercase') val = val.toLowerCase()
              else if (field.casing === 'capitalize')
                val = val.replace(/\b\w/g, (c) => c.toUpperCase())
              onChange(val)
            }}
            maxLength={field.maxLength}
            rows={8}
            style={casingStyle}
            disabled={disabled}
            className="w-full bg-app-subtle border border-border rounded-none px-4 py-3 text-sm focus:border-accent outline-none min-h-[150px] transition-all focus:ring-2 focus:ring-accent/10 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder={`Enter ${field.name}...`}
          />
          {field.maxLength && (
            <span className="absolute bottom-2 right-3 text-[9px] font-bold text-text-muted font-mono uppercase">
              {(value || '').length} / {field.maxLength}
            </span>
          )}
        </div>
      )
    }

    // Default: text, email, password, date, etc.
    const casingStyle =
      field.casing === 'uppercase'
        ? { textTransform: 'uppercase' as const }
        : field.casing === 'lowercase'
          ? { textTransform: 'lowercase' as const }
          : field.casing === 'capitalize'
            ? { textTransform: 'capitalize' as const }
            : undefined

    return (
      <div className="relative w-full">
        <input
          type={['date', 'password', 'color', 'email'].includes(field.type) ? field.type : 'text'}
          value={value || ''}
          onChange={(e) => {
            let val = e.target.value
            if (field.casing === 'uppercase') val = val.toUpperCase()
            else if (field.casing === 'lowercase') val = val.toLowerCase()
            else if (field.casing === 'capitalize')
              val = val.replace(/\b\w/g, (c) => c.toUpperCase())
            onChange(val)
          }}
          maxLength={field.maxLength}
          style={casingStyle}
          disabled={disabled}
          className={cn(
            "w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none disabled:opacity-60 disabled:cursor-not-allowed",
            field.type === 'color' && "h-10 p-1 cursor-pointer",
            field.type === 'uid' && "font-mono text-accent"
          )}
          placeholder={`Enter ${field.name}...`}
        />
        {field.maxLength && field.type !== 'date' && (
          <span className="absolute right-3 top-2.5 text-[9px] font-bold text-text-muted font-mono uppercase pointer-events-none">
            {(value || '').length} / {field.maxLength}
          </span>
        )}
      </div>
    )
  }

  const renderFormContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {fields.map((field: FieldConfig) => {
        if (field.name === '_status' || field.name === 'id') return null

        // ── Conditional field visibility check ─────────────────────────────────
        const condition = field.condition || field.admin?.condition
        if (condition && !evaluateCondition(condition)) return null

        const isFullWidth = ['richtext', 'blocks', 'array'].includes(field.type)

        return (
          <div key={field.name} className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-text-primary capitalize flex items-center gap-2">
                {field.label || field.name.replace(/([A-Z])/g, ' $1')}
                {field.required && <span className="text-danger">*</span>}
                {field.localized && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black tracking-widest text-accent bg-accent/10 border border-accent/20 rounded uppercase">
                    {isReadOnly ? readOnlyLocale : currentLocale}
                  </span>
                )}
              </label>
              {(field.admin as any)?.description && (
                <span className="text-[10px] text-text-muted">
                  {(field.admin as any).description}
                </span>
              )}
            </div>

            {isReadOnly ? (
              (() => {
                const staticValue = field.localized
                  ? (initialData?.[field.name]?.[readOnlyLocale || 'en'] ?? '')
                  : (initialData?.[field.name] ?? '')
                return renderField(field, staticValue, () => {}, true)
              })()
            ) : (
              <Controller
                name={getFieldName(field)}
                control={control}
                render={({ field: { onChange, value } }) => renderField(field, value, onChange)}
              />
            )}

            {!isReadOnly && getFieldError(getFieldName(field)) && (
              <p className="text-xs text-danger mt-1 font-medium">
                {getFieldError(getFieldName(field))?.message || 'Required field'}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )

  const isObject = (item: any) => {
    return item && typeof item === 'object' && !Array.isArray(item)
  }

  const deepMerge = (target: any, source: any): any => {
    const output = { ...target }
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = deepMerge(target[key], source[key])
          }
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    return output
  }

  const handleFormSubmit = async (formData: any) => {
    if (onSubmit) {
      const merged = deepMerge(initialData || {}, formData)
      await onSubmit(merged)
    }
  }

  if (isReadOnly) {
    return <div className="space-y-8">{renderFormContent()}</div>
  }

  return (
    <form onSubmit={onSubmit ? handleSubmit(handleFormSubmit) : undefined} className="space-y-8">
      {renderFormContent()}

      <div className="pt-8 border-t border-border flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Fields marked with <span className="text-danger">*</span> are required.
        </p>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary min-w-[140px] h-11"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormBuilder
