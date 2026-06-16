import React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DateFieldProps {
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
  format?: 'date' | 'datetime' | 'time'
}

function formatForInput(value: unknown, format: 'date' | 'datetime' | 'time'): string {
  if (!value) return ''
  try {
    const d = new Date(value as string)
    if (isNaN(d.getTime())) return typeof value === 'string' ? value : ''
    if (format === 'datetime') return d.toISOString().slice(0, 16)
    if (format === 'time') return d.toISOString().slice(11, 16)
    return d.toISOString().slice(0, 10)
  } catch {
    return typeof value === 'string' ? value : ''
  }
}

function parseInput(value: string, format: 'date' | 'datetime' | 'time'): string {
  if (!value) return ''
  if (format === 'time') return value
  try {
    return new Date(value).toISOString()
  } catch {
    return value
  }
}

const DateField: React.FC<DateFieldProps> = ({ value, onChange, disabled, format = 'date' }) => {
  const inputType = format === 'datetime' ? 'datetime-local' : format === 'time' ? 'time' : 'date'

  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
        <Calendar size={14} />
      </div>
      <input
        type={inputType}
        value={formatForInput(value, format)}
        onChange={(e) => onChange(parseInput(e.target.value, format))}
        disabled={disabled}
        className={cn(
          'w-full bg-gray-900/65 backdrop-blur-md border border-white/8 rounded-none-none pl-9 pr-4 py-2.5 text-xs',
          'focus:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/50 outline-none disabled:opacity-60 disabled:cursor-not-allowed',
          'text-white placeholder:text-gray-500 transition-all font-mono'
        )}
      />
    </div>
  )
}

export default DateField
