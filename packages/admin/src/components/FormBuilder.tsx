import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
type FieldConfig = any
import RichTextEditor from './RichTextEditor'
import MediaPicker from './MediaPicker'
import RelationPicker from './RelationPicker'
import {
  evaluateCondition,
  getFieldError,
  deepMerge,
  getFieldName,
} from '../lib/form-utils'
import TextField from './fields/TextField'
import TextareaField from './fields/TextareaField'
import SelectField from './fields/SelectField'
import BooleanField from './fields/BooleanField'
import NumberField from './fields/NumberField'
import CodeField from './fields/CodeField'
import CollapsibleField from './fields/CollapsibleField'
import {
  PointField,
  RowField,
  JoinField,
  RadioField,
} from './fields/SpecialFields'

import BlocksBuilder from './BlocksBuilder'
import SimpleArrayBuilder from './SimpleArrayBuilder'

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
    // ── UI slot — render custom field component if registered ────────────────
    if (field.type === 'ui') {
      const CustomComponent = field.admin?.components?.Field
      if (CustomComponent) {
        return <CustomComponent field={field} value={value} onChange={onChange} disabled={disabled} />
      }
      return null
    }

    // ── Structural fields — pass renderField for nesting ─────────────────────
    if (field.type === 'collapsible') {
      return (
        <CollapsibleField
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
          renderField={renderField}
        />
      )
    }

    if (field.type === 'row') {
      return (
        <RowField
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled}
          renderField={renderField}
        />
      )
    }

    // ── Complex fields with their own internal state ────────────────────────
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
          label={field.label || field.name}
          renderField={(f: any, val: any, change: any) => renderField(f, val, change, disabled)}
          disabled={disabled}
        />
      )
    }

    // ── Read-only informational fields ───────────────────────────────────────
    if (field.type === 'join') {
      return <JoinField field={field} />
    }

    if (field.type === 'point') {
      return <PointField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    // ── Basic input fields ───────────────────────────────────────────────────
    if (field.type === 'select') {
      return <SelectField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    if (field.type === 'boolean' || field.type === 'checkbox') {
      return <BooleanField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    if (field.type === 'number') {
      return <NumberField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    if (field.type === 'textarea') {
      return <TextareaField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    if (field.type === 'code') {
      return <CodeField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    if (field.type === 'radio') {
      return <RadioField field={field} value={value} onChange={onChange} disabled={disabled} />
    }

    // Default: text, email, password, date, color, uid
    return <TextField field={field} value={value} onChange={onChange} disabled={disabled} />
  }

  const handleFormSubmit = async (formData: any) => {
    if (onSubmit) {
      const merged = deepMerge(initialData || {}, formData)
      await onSubmit(merged)
    }
  }

  const renderFormContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {fields.map((field: FieldConfig) => {
        if (field.name === '_status' || field.name === 'id') return null

        const condition = field.condition || field.admin?.condition
        if (condition && !evaluateCondition(condition, formValues)) return null

        const isFullWidth = ['richtext', 'blocks', 'array', 'code', 'collapsible'].includes(field.type)
        const fieldName = getFieldName(field, currentLocale)

        return (
          <div key={field.name} className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                {field.label || field.name.replace(/([A-Z])/g, ' $1')}
                {field.required && <span className="text-danger">*</span>}
                {field.localized && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black tracking-widest text-accent bg-accent/10 border border-accent/20 rounded uppercase">
                    {isReadOnly ? readOnlyLocale : currentLocale}
                  </span>
                )}
              </label>
              {field.admin?.description && (
                <span className="text-[10px] text-gray-400">{field.admin.description}</span>
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
                name={fieldName}
                control={control}
                render={({ field: { onChange, value } }) => renderField(field, value, onChange)}
              />
            )}

            {!isReadOnly && getFieldError(errors, fieldName) && (
              <p className="text-xs text-danger mt-1 font-medium">
                {(getFieldError(errors, fieldName) as any)?.message || 'Required field'}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )

  if (isReadOnly) {
    return <div className="space-y-8">{renderFormContent()}</div>
  }

  return (
    <form onSubmit={onSubmit ? handleSubmit(handleFormSubmit) : undefined} className="space-y-8">
      {renderFormContent()}

      <div className="pt-8 border-t border-border flex items-center justify-between">
        <p className="text-xs text-gray-400">
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