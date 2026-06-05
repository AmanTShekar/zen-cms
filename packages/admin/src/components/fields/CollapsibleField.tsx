import React from 'react'
import type { FieldConfig } from '@zenithcms/types'

type CollapsibleFieldConfig = FieldConfig & {
 initCollapsed?: boolean
 fields?: FieldConfig[]
}

interface Props {
 field: FieldConfig
 value: unknown
 onChange: (val: unknown) => void
 disabled?: boolean
 renderField: (f: FieldConfig, val: unknown, change: (val: unknown) => void) => React.ReactNode
}

const CollapsibleField: React.FC<Props> = ({
 field,
 value,
 onChange,
 disabled: _disabled,
 renderField,
}) => {
 const cfField = field as CollapsibleFieldConfig
 const [isOpen, setIsOpen] = React.useState(!cfField.initCollapsed)
 const collapsibleFields = cfField.fields || []

 return (
 <div className="border border-white/[0.08] rounded-none overflow-hidden">
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm font-semibold text-white"
 >
 <span className="flex items-center gap-2">
 <span
 className={`transition-transform duration-200 text-emerald-600 dark:text-emerald-400 ${
 isOpen ? 'rotate-90' : ''
 }`}
 >
 ▶
 </span>
 {field.label || field.name}
 </span>
 </button>
 {isOpen && (
 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 border-t border-white/[0.08]">
 {collapsibleFields.map((f) => (
 <div key={f.name} className="space-y-1.5">
 <label className="text-xs font-semibold text-gray-300 capitalize">
 {f.label || f.name}
 {(f as any).required && <span className="text-danger ml-1">*</span>}
 </label>
 {renderField(f, (value as Record<string, unknown>)?.[f.name], (val: unknown) =>
 onChange({ ...((value as Record<string, unknown>) || {}), [f.name]: val })
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )
}

export default CollapsibleField
