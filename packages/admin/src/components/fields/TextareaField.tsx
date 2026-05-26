import React from 'react'
import { textCasingStyle } from '../../lib/form-utils'
import type { FieldConfig, TextFieldConfig } from '@zenithcms/types'

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
        className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-none px-4 py-3 text-sm focus:border-purple-500/50 outline-none min-h-[150px] transition-all focus:ring-2 focus:ring-purple-500/10 disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-gray-500"
        placeholder={`Enter ${cf.name}...`}
      />
      {cf.maxLength && (
        <span className="absolute bottom-2 right-3 text-[9px] font-bold text-gray-400 font-mono uppercase">
          {((value as string) || '').length} / {cf.maxLength}
        </span>
      )}
    </div>
  )
}


export default TextareaField