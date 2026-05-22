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
      className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-none px-3 py-2 text-sm focus:border-purple-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-gray-500"
    />
  )
}

export default NumberField