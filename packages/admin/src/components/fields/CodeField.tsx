import React from 'react'
import { cn } from '../../lib/utils'
import type { FieldConfig } from '@zenithcms/types'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

const CodeField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  return (
    <div className="relative w-full">
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={(field as any).maxLength}
        rows={10}
        disabled={disabled}
        spellCheck={false}
        className={cn(
          'w-full bg-[#0d1117] backdrop-blur-md border border-white/10 rounded-none px-4 py-3 text-sm font-mono',
          'focus:border-purple-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed',
          'text-[#e6edf3] placeholder:text-gray-600'
        )}
        placeholder={`Enter ${(field as any).language || 'code'}...`}
      />
      <div className="absolute top-2 right-3 flex items-center gap-2">
        {(field as any).language && (
          <span className="text-[9px] font-bold text-purple-400/60 font-mono uppercase">
            {(field as any).language}
          </span>
        )}
        {(field as any).maxLength && (
          <span className="text-[9px] font-bold text-gray-500 font-mono">
            {((value as string) || '').length}/{(field as any).maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

export default CodeField