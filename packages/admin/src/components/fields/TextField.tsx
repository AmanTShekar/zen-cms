import React from 'react'
import { cn } from '../../lib/utils'
import { textCasingStyle } from '../../lib/form-utils'
import type { FieldConfig, TextFieldConfig } from '@zenith-open/zenithcms-types'

type TextFieldWithExtras = TextFieldConfig & {
  casing?: 'uppercase' | 'lowercase' | 'capitalize'
}

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const TextField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const cf = field as TextFieldWithExtras
  const casingStyle = textCasingStyle(cf.casing)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val: string = e.target.value
    if (cf.casing === 'uppercase') val = val.toUpperCase()
    else if (cf.casing === 'lowercase') val = val.toLowerCase()
    else if (cf.casing === 'capitalize')
      val = val.replace(/\b\w/g, (c) => c.toUpperCase())
    onChange(val)
  }

  return (
    <div className="relative w-full">
      <input
        type={['date', 'password', 'color', 'email'].includes(cf.type) ? cf.type : 'text'}
        value={(value as string) || ''}
        onChange={handleChange}
        maxLength={cf.maxLength}
        style={casingStyle}
        disabled={disabled}
        className={cn(
          "w-full bg-gray-900/65 backdrop-blur-md border border-white/8 rounded-none-none px-4 py-2.5 text-xs focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-gray-500 transition-all",
          cf.type === 'color' && "h-10 p-1 cursor-pointer",
          cf.type === 'uid' && "font-mono text-emerald-400"
        )}
        placeholder={`Enter ${cf.name}...`}
      />
      {cf.maxLength && (cf.type as string) !== 'date' && (
        <span className="absolute right-3 top-2.5 text-[9px] font-bold text-gray-500 font-mono uppercase pointer-events-none">
          {((value as string) || '').length} / {cf.maxLength}
        </span>
      )}
    </div>
  )
}


export default TextField
