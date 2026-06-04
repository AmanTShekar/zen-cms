import React from 'react'
import { cn } from '../../lib/utils'
import type { FieldConfig, CodeFieldConfig } from '@zenithcms/types'

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
 'w-full bg-[#0d1117] backdrop-blur-md border border-white/[0.08] rounded-none px-4 py-3 text-sm font-mono',
 'focus:border-emerald-500/50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed',
 'text-[#e6edf3] placeholder:text-gray-600'
 )}
 placeholder={`Enter ${cf.language || 'code'}...`}
 />
 <div className="absolute top-2 right-3 flex items-center gap-2">
 {cf.language && (
 <span className="text-[9px] font-bold text-emerald-400/60 font-mono uppercase">
 {cf.language}
 </span>
 )}
 {cf.maxLength && (
 <span className="text-[9px] font-bold text-gray-500 font-mono">
 {((value as string) || '').length}/{cf.maxLength}
 </span>
 )}
 </div>
 </div>
 )
}

export default CodeField
