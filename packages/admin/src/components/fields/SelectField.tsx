import React from 'react'
import type { FieldConfig } from '@zenithcms/types'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const SelectField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const { theme } = useTheme()
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
      className={cn(
        "w-full px-3 py-2 text-sm focus:outline-none transition-all duration-350",
        "backdrop-blur-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.05)]",
        theme === 'dark'
          ? "bg-[#111827]/65 text-white border border-white/[0.08] focus:border-indigo-500/50"
          : "bg-white/65 text-gray-900 border border-black/[0.08] focus:border-indigo-500/30",
        f.hasMany ? "rounded-lg min-h-[120px]" : "rounded-lg",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
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