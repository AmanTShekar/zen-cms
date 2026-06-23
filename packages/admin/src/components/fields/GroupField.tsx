import React from 'react'
import type { FieldConfig, GroupFieldConfig } from '@zenith-open/zenithcms-types'
import { cn } from '../../lib/utils'

interface GroupFieldProps {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
  renderField: (f: FieldConfig, val: unknown, change: (val: unknown) => void, disabled?: boolean) => React.ReactNode
}

const GroupField: React.FC<GroupFieldProps> = ({ field, value, onChange, disabled, renderField }) => {
  const groupValue = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const gf = field as GroupFieldConfig
  const subFields = gf.fields || []

  return (
    <div className={cn(
      'border border-white/10 bg-z-panel backdrop-blur-md p-4 space-y-4'
    )}>
      <div className="flex items-center gap-2 pb-3 border-b border-white/5">
        <span className="text-sm font-semibold text-z-active-text">
          {field.label || field.name}
        </span>
        {gf.admin?.description && (
          <span className="text-sm text-z-secondary italic">{gf.admin.description}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-2">
        {subFields.map((f: FieldConfig) => (
          <div key={f.name} className="space-y-1.5">
            <label className="text-sm font-bold text-z-muted">
              {f.label || f.name}
              {(f as any).required && <span className="text-danger ml-1">*</span>}
            </label>
            {renderField(
              f,
              groupValue[f.name],
              (val: unknown) => onChange({ ...groupValue, [f.name]: val }),
              disabled
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GroupField
