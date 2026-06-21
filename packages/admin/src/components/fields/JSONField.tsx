import React, { useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Code } from 'lucide-react'
import { cn } from '../../lib/utils'

interface JSONFieldProps {
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
  rows?: number
}

function tryParseJson(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') return null
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

const JSONField: React.FC<JSONFieldProps> = ({ value, onChange, disabled, rows = 8 }) => {
  const [focused, setFocused] = useState(false)
  const jsonValid = tryParseJson(value)

  const displayValue = typeof value === 'string'
    ? value
    : value !== undefined && value !== null
      ? JSON.stringify(value, null, 2)
      : ''

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value
    onChange(raw)
  }, [onChange])

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(typeof value === 'string' ? value : JSON.stringify(value))
      onChange(JSON.stringify(parsed, null, 2))
    } catch {
      // ignore — can't format invalid JSON
    }
  }, [value, onChange])

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute left-3 top-2.5 text-z-secondary pointer-events-none">
          <Code size={14} />
        </div>
        <textarea
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={rows}
          disabled={disabled}
          spellCheck={false}
          className={cn(
            'w-full bg-[#0d1117] backdrop-blur-md border rounded-none-none px-9 py-2.5 text-xs font-mono resize-y outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
            'text-[#e6edf3] placeholder:text-gray-600 disabled:opacity-60 disabled:cursor-not-allowed',
            focused
              ? 'border-z-accent/50'
              : jsonValid === false
                ? 'border-red-500/40'
                : 'border-white/10'
          )}
          placeholder='{"key": "value"}'
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-block w-1.5 h-1.5 rounded-none-full',
            jsonValid === true ? 'bg-z-accent shadow-sm' : jsonValid === false ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-gray-600'
          )} />
          <span className={cn(
            'text-sm font-bold  ',
            jsonValid === true ? 'text-z-active-text' : jsonValid === false ? 'text-red-400' : 'text-z-secondary'
          )}>
            {jsonValid === true ? 'Valid JSON' : jsonValid === false ? 'Invalid JSON' : 'JSON'}
          </span>
        </div>
        {jsonValid === true && (
          <button
            type="button"
            onClick={handleFormat}
            className="text-sm font-bold text-z-secondary hover:text-z-active-text transition-colors"
          >
            Format
          </button>
        )}
      </div>
    </div>
  )
}

export default JSONField
