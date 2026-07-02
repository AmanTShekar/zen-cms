import React from 'react'
import type { FieldConfig } from '@zenith-open/zenithcms-types'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const BooleanField: React.FC<Props> = ({ field: _field, value, onChange, disabled }) => {
  return (
    <div className="flex items-center h-9">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded-none-none border border-z-border bg-z-input backdrop-blur-md text-z-active-text focus:ring-z-active-border focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      />
    </div>
  )
}

export default BooleanField
