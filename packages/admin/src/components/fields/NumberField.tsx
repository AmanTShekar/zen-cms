import React from 'react'
import type { FieldConfig } from '@zenithcms/types'

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
      className="w-full bg-gray-900/65 backdrop-blur-md border border-white/8 rounded-none px-4 py-2.5 text-xs focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-gray-500 transition-all font-mono"
    />
  )
}

export default NumberField
