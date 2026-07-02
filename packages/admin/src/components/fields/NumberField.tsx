import React from 'react'
import type { FieldConfig } from '@zenith-open/zenithcms-types'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const NumberField: React.FC<Props> = ({ field: _field, value, onChange, disabled }) => {
  return (
    <input
      type="number"
      value={(value as number | string) ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={disabled}
      className="w-full bg-z-base/65 backdrop-blur-md border border-z-border rounded-none-none px-4 py-3 text-sm focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border outline-none disabled:opacity-60 disabled:cursor-not-allowed text-z-primary placeholder:text-z-secondary transition-all font-mono"
    />
  )
}

export default NumberField
