import React from 'react'
import type { FieldConfig } from '@zenithcms/types'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const SelectField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const f = field as any
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = f.hasMany
      ? Array.from(e.target.selectedOptions, (option) => option.value)
      : e.target.value
    onChange(val)
  }

  const selectedVals: string[] = f.hasMany
    ? (Array.isArray(value) ? value.map(String) : [])
    : []

  return (
    <select
      value={f.hasMany ? undefined : ((value as string) || '')}
      onChange={handleChange}
      multiple={f.hasMany}
      disabled={disabled}
      className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-none px-3 py-2 text-sm focus:border-purple-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white"
    >
      {!f.required && !f.hasMany && <option value="">Select...</option>}
      {(f.options || []).map((opt: string | { value?: string; label?: string }) => {
        const optVal = typeof opt === 'string' ? opt : (opt.value || opt)
        const optLabel = typeof opt === 'string' ? opt : (opt.label || opt)
        const strVal = String(optVal)
        return f.hasMany ? (
          <option key={strVal} value={strVal} selected={selectedVals.includes(strVal)}>
            {String(optLabel)}
          </option>
        ) : (
          <option key={strVal} value={strVal}>
            {String(optLabel)}
          </option>
        )
      })}
    </select>
  )
}

export default SelectField