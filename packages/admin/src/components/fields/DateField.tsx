import React from 'react'
import { Calendar } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
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
  const { theme } = useTheme()
  const inputType = format === 'datetime' ? 'datetime-local' : format === 'time' ? 'time' : 'date'

  return (
    <div className="relative w-full">
      <div className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
        theme === 'dark' ? 'text-z-primary/60' : 'text-z-secondary'
      )}>
        <Calendar size={14} />
      </div>
      <input
        type={inputType}
        value={formatForInput(value, format)}
        onChange={(e) => onChange(parseInput(e.target.value, format))}
        disabled={disabled}
        style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
        className={cn(
          'w-full pl-9 pr-4 py-3 text-sm transition-all outline-none rounded-none-none border',
          theme === 'dark'
            ? 'bg-z-input backdrop-blur-md border-z-border text-z-primary placeholder:text-z-secondary focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border'
            : 'bg-z-panel/80 backdrop-blur-md border-z-border text-z-primary placeholder:text-z-muted focus:border-z-accent/50 focus-visible:ring-2 focus-visible:ring-z-active-border',
          'disabled:opacity-60 disabled:cursor-not-allowed font-mono'
        )}
      />
    </div>
  )
}

export default DateField
