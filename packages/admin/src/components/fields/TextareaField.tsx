import React from 'react'
import { textCasingStyle } from '../../lib/form-utils'
import type { FieldConfig, TextFieldConfig } from '@zenith-open/zenithcms-types'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'

type TextareaFieldWithExtras = TextFieldConfig & {
  casing?: '' | 'lowercase' | 'capitalize'
}

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const TextareaField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const { theme } = useTheme()
  const cf = field as TextareaFieldWithExtras
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val: string = e.target.value
    if (cf.casing === '') val = val.toUpperCase()
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
        className={cn(
          "w-full px-4 py-3 text-sm transition-all outline-none rounded-none-none border min-h-[140px]",
          theme === 'dark' 
            ? "bg-z-base/65 backdrop-blur-md border-z-border text-z-primary placeholder:text-z-secondary focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border"
            : "bg-z-panel/80 backdrop-blur-md border-z-border text-z-primary placeholder:text-z-muted focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
        placeholder={`Enter ${cf.name}...`}
      />
      {cf.maxLength && (
        <span className="absolute bottom-2 right-3 text-sm font-bold text-z-secondary font-mono">
          {((value as string) || '').length} / {cf.maxLength}
        </span>
      )}
    </div>
  )
}


export default TextareaField
