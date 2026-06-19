import React from 'react'
import { textCasingStyle } from '../../lib/form-utils'
import type { FieldConfig, TextFieldConfig } from '@zenith-open/zenithcms-types'

type TextareaFieldWithExtras = TextFieldConfig & {
  casing?: 'uppercase' | 'lowercase' | 'capitalize'
}

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const TextareaField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const cf = field as TextareaFieldWithExtras
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val: string = e.target.value
    if (cf.casing === 'uppercase') val = val.toUpperCase()
    else if (cf.casing === 'lowercase') val = val.toLowerCase()
    else if (cf.casing === 'capitalize')
      val = val.replace(/\b\w/g, (c) => c.toUpperCase())
    onChange(val)
  }

  return (
    <div className="relative w-full">
      <textarea
        value={(value as string) || ''}
        onChange={handleChange}
        maxLength={cf.maxLength}
        rows={8}
        style={textCasingStyle(cf.casing)}
        disabled={disabled}
        className="w-full bg-gray-900/65 backdrop-blur-md border border-white/8 rounded-none-none px-4 py-2.5 text-xs focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border outline-none min-h-[120px] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-z-secondary"
        placeholder={`Enter ${cf.name}...`}
      />
      {cf.maxLength && (
        <span className="absolute bottom-2 right-3 text-[9px] font-bold text-z-secondary font-mono uppercase">
          {((value as string) || '').length} / {cf.maxLength}
        </span>
      )}
    </div>
  )
}


export default TextareaField
