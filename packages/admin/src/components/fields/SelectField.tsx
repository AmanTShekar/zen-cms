import React from 'react'
import type { FieldConfig, SelectFieldConfig } from '@zenith-open/zenithcms-types'
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
        "w-full px-4 py-3 text-sm transition-all duration-350 outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black",
        "backdrop-blur-md",
        theme === 'dark'
          ? "bg-gray-900/65 text-white border border-white/8 focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border"
          : "bg-white/80 text-z-primary border border-z-border focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border",
        isMulti ? "rounded-none-none min-h-[120px]" : "rounded-none-none",
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
