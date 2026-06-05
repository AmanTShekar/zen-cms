import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, Lock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { LexicalRichTextEditor } from './lexical'
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
import GroupField from './fields/GroupField'
import JSONField from './fields/JSONField'
import DateField from './fields/DateField'
import SlugField from './fields/SlugField'
import UIDField from './fields/UIDField'
import TabField from './fields/TabField'
import {
 PointField,
 RowField,
 JoinField,
 RadioField,
} from './fields/SpecialFields'

import BlocksBuilder from './BlocksBuilder'
import SimpleArrayBuilder from './SimpleArrayBuilder'

/** Field config used by the form builder — keeps a flexible shape since runtime
 * field configs can have additional properties not in the base discriminated union. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldConfig = any

interface FormBuilderProps {
 fields: FieldConfig[]
 initialData?: any
 onSubmit?: (data: any) => Promise<void>
 onValuesChange?: (data: any) => void
 isSubmitting?: boolean
 activeLocale?: string
 readOnlyLocale?: string
 hideSubmitButton?: boolean
}

const FormBuilder: React.FC<FormBuilderProps> = ({
 fields,
 initialData,
 onSubmit,
 onValuesChange,
 isSubmitting = false,
 activeLocale,
 readOnlyLocale,
 hideSubmitButton = false,
}) => {
 const { user } = useAuthStore()
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

 React.useEffect(() => {
 if (onValuesChange) {
 const subscription = watch((value) => {
 onValuesChange(value)
 })
 return () => subscription.unsubscribe()
 }
 }, [watch, onValuesChange])

 const formValues = watch()
 const initialDataRef = React.useRef(initialData)

 React.useEffect(() => {
 if (initialData && initialData !== initialDataRef.current) {
 initialDataRef.current = initialData
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

 if (field.type === 'group') {
 return (
 <GroupField
 field={field}
 value={value}
 onChange={onChange}
 disabled={disabled}
 renderField={renderField}
 />
 )
 }

 if (field.type === 'tabs') {
 return (
 <TabField
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
 if (field.type === 'richtext' || field.type === 'lexical') {
 return (
 <LexicalRichTextEditor
 mode={field.type === 'lexical' ? 'full' : undefined}
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
 focalPoint={field.admin?.focalPoint ?? true}
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

 if (field.type === 'blocks' || field.type === 'dz') {
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

 if (field.type === 'json') {
 return <JSONField value={value} onChange={onChange} disabled={disabled} />
 }

 if (field.type === 'date') {
 return <DateField value={value} onChange={onChange} disabled={disabled} format={field.dateFormat || 'date'} />
 }

 if (field.type === 'slug') {
 return (
 <SlugField
 value={value}
 onChange={onChange}
 disabled={disabled}
 sourceField={field.sourceField || 'title'}
 formValues={formValues}
 />
 )
 }

 if (field.type === 'uid') {
 return <UIDField value={value} onChange={onChange} disabled={disabled} />
 }

 // Default: text, email, password, color
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

 const isFullWidth = ['richtext', 'blocks', 'array', 'code', 'collapsible', 'group', 'tabs', 'json'].includes(field.type)
 const fieldName = getFieldName(field, currentLocale)

 // Field Level Security (RBAC)
 let isFieldDisabled = isReadOnly
 if (user?.role !== 'admin') {
 const readAccess = field.admin?.readAccess
 if (readAccess && readAccess.length > 0 && !readAccess.includes(user!.role)) {
 return null // Hide field completely
 }
 const writeAccess = field.admin?.writeAccess
 if (writeAccess && writeAccess.length > 0 && !writeAccess.includes(user!.role)) {
 isFieldDisabled = true
 }
 }

 return (
 <div key={field.name} data-field={fieldName} className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
 <div className="flex items-center justify-between">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
 {field.label || field.name.replace(/([A-Z])/g, ' $1')}
 {field.required && <span className="text-rose-500">*</span>}
 {field.localized && (
 <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-none uppercase">
 {isFieldDisabled ? readOnlyLocale || currentLocale : currentLocale}
 </span>
 )}
 {isFieldDisabled && !isReadOnly && (
 <Lock size={10} className="text-gray-500 ml-1" />
 )}
 </label>
 {field.admin?.description && (
 <span className="text-[10px] text-gray-400">{field.admin.description}</span>
 )}
 </div>

 {isFieldDisabled ? (
 (() => {
 const staticValue = field.localized
 ? (initialData?.[field.name]?.[readOnlyLocale || currentLocale] ?? '')
 : (initialData?.[field.name] ?? '')
 return renderField(field, staticValue, () => {}, true)
 })()
 ) : (
 <Controller
 name={fieldName}
 control={control}
 render={({ field: { onChange, value } }) => <>{renderField(field, value, onChange)}</>}
 />
 )}

 {!isFieldDisabled && !!getFieldError(errors, fieldName) && (
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

 {/* Submit Button */}
 {!hideSubmitButton && (
 <div className="mt-10 pt-6 border-t border-gray-200 shadow-sm flex items-center justify-between">
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
 <div className="flex items-center justify-center gap-2">
 <Loader2 size={16} className="animate-spin" />
 Saving...
 </div>
 ) : (
 'Save Changes'
 )}
 </button>
 </div>
 </div>
 )}
 </form>
 )
}

export default FormBuilder
