import React from 'react'
import { cn } from '../../lib/utils'
import { textCasingStyle } from '../../lib/form-utils'
import type { FieldConfig, TextFieldConfig } from '@zenith-open/zenithcms-types'
import { useTheme } from '../../context/ThemeContext'

type TextFieldWithExtras = TextFieldConfig & {
  casing?: '' | 'lowercase' | 'capitalize'
}

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const TextField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const { theme } = useTheme()
  const cf = field as TextFieldWithExtras
  const casingStyle = textCasingStyle(cf.casing)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val: string = e.target.value
    if (cf.casing === '') val = val.toUpperCase()
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
          "w-full px-4 py-3 text-sm transition-all outline-none rounded-none-none border",
          theme === 'dark' 
            ? "bg-gray-900/65 backdrop-blur-md border-white/8 text-white placeholder:text-z-secondary focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border"
            : "bg-white/80 backdrop-blur-md border-z-border text-z-primary placeholder:text-z-muted focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border",
          cf.type === 'color' && "h-11 p-1 cursor-pointer",
          cf.type === 'uid' && "font-mono text-z-active-text",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
        placeholder={`Enter ${cf.name}...`}
      />
      {cf.maxLength && (cf.type as string) !== 'date' && (
        <span className="absolute right-3 top-2.5 text-sm font-bold text-z-secondary font-mono pointer-events-none">
          {((value as string) || '').length} / {cf.maxLength}
        </span>
      )}
    </div>
  )
}


export default TextField
