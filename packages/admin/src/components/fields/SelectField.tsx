import React from 'react'
import type { FieldConfig, SelectFieldConfig } from '@zenithcms/types'
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
  const selectField = field as SelectFieldConfig
  const isMulti = selectField.hasMany ?? false

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = isMulti
      ? Array.from(e.target.selectedOptions, (option) => option.value)
      : e.target.value
    onChange(val)
  }

  const selectedVals: string[] = isMulti
    ? (Array.isArray(value) ? value.map(String) : [])
    : []

  return (
    <select
      value={isMulti ? undefined : ((value as string) || '')}
      onChange={handleChange}
      multiple={isMulti}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all duration-350",
        "backdrop-blur-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.05)]",
        theme === 'dark'
          ? "bg-[#111827]/65 text-white border border-white/[0.08] focus:border-indigo-500/50"
          : "bg-white/65 text-gray-900 border border-black/[0.08] focus:border-indigo-500/30",
        isMulti ? "rounded-lg min-h-[120px]" : "rounded-lg",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
    >
      {!selectField.required && !isMulti && <option value="">Select...</option>}
      {(selectField.options || []).map((opt: string | { value?: string; label?: string }) => {
        const optVal = typeof opt === 'string' ? opt : (opt.value || opt)
        const optLabel = typeof opt === 'string' ? opt : (opt.label || opt)
        const strVal = String(optVal)
        return (
          <option key={strVal} value={strVal}>
            {String(optLabel)}
          </option>
        )
      })}
    </select>
  )
}

export default SelectField
