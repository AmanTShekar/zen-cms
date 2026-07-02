import React from 'react'
import { cn } from '../../lib/utils'
import type { FieldConfig, CodeFieldConfig } from '@zenith-open/zenithcms-types'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const CodeField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const cf = field as CodeFieldConfig
  return (
    <div className="relative w-full">
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={cf.maxLength}
        rows={10}
        disabled={disabled}
        spellCheck={false}
        className={cn(
          'w-full bg-[#0d1117] backdrop-blur-md border border-z-border rounded-none-none px-4 py-3 text-sm font-mono',
          'focus:border-z-accent/50 outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed',
          'text-[#e6edf3] placeholder:text-z-secondary'
        )}
        placeholder={`Enter ${cf.language || 'code'}...`}
      />
      <div className="absolute top-2 right-3 flex items-center gap-2">
        {cf.language && (
          <span className="text-sm font-bold text-z-active-text/60 font-mono">
            {cf.language}
          </span>
        )}
        {cf.maxLength && (
          <span className="text-sm font-bold text-z-secondary font-mono">
            {((value as string) || '').length}/{cf.maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

export default CodeField
