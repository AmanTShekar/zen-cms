import React from 'react'
import type { FieldConfig } from '@zenithcms/types'

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
        className="w-4 h-4 rounded-none border border-white/20 text-purple-500 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  )
}

export default BooleanField