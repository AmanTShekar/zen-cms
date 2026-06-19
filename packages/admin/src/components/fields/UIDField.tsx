import React, { useCallback } from 'react'
import { Hash, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface UIDFieldProps {
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

function generateUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const UIDField: React.FC<UIDFieldProps> = ({ value, onChange, disabled }) => {
  const handleRegenerate = useCallback(() => {
    onChange(generateUID())
  }, [onChange])

  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary pointer-events-none">
        <Hash size={14} />
      </div>
      <input
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        readOnly
        className={cn(
          'w-full bg-z-hover backdrop-blur-md border border-white/10 rounded-none-none pl-9 pr-10 py-2 text-sm',
          'focus:border-z-accent/50 outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed',
          'text-z-active-text/80 font-mono'
        )}
        placeholder="auto-generated-uid"
      />
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={disabled}
        title="Regenerate UID"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-z-secondary hover:text-z-active-text disabled:opacity-30 transition-colors"
      >
        <RefreshCw size={13} />
      </button>
    </div>
  )
}

export default UIDField
