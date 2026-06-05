import React, { useCallback } from 'react'
import { Link, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SlugFieldProps {
 value: unknown
 onChange: (val: unknown) => void
 disabled?: boolean
 sourceField?: string
 formValues?: Record<string, unknown>
}

function slugify(text: string): string {
 return text
 .toLowerCase()
 .trim()
 .replace(/[^\w\s-]/g, '')
 .replace(/[\s_]+/g, '-')
 .replace(/-+/g, '-')
 .replace(/^-|-$/g, '')
}

const SlugField: React.FC<SlugFieldProps> = ({ value, onChange, disabled, sourceField, formValues }) => {
 const handleGenerate = useCallback(() => {
 if (sourceField && formValues) {
 const source = formValues[sourceField]
 if (typeof source === 'string' && source.trim()) {
 onChange(slugify(source))
 }
 }
 }, [sourceField, formValues, onChange])

 return (
 <div className="relative w-full">
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
 <Link size={14} />
 </div>
 <input
 type="text"
 value={(value as string) || ''}
 onChange={(e) => onChange(e.target.value)}
 disabled={disabled}
 className={cn(
 'w-full bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-none pl-9 pr-10 py-2 text-sm',
 'focus:border-emerald-500/50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed',
 'text-emerald-300 font-mono placeholder:text-gray-500'
 )}
 placeholder="auto-generated-slug"
 />
 {sourceField && (
 <button
 type="button"
 onClick={handleGenerate}
 disabled={disabled}
 title={`Generate from ${sourceField}`}
 className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-emerald-600 dark:text-emerald-400 disabled:opacity-30 transition-colors"
 >
 <RefreshCw size={13} />
 </button>
 )}
 </div>
 )
}

export default SlugField
