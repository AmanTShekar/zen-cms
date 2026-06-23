import React from 'react'
import type { FieldConfig } from '@zenith-open/zenithcms-types'
import { cn } from '../../lib/utils'

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}

type RowFieldConfig = FieldConfig & {
  layout?: 'horizontal' | 'vertical'
  fields?: FieldConfig[]
}

interface RowFieldProps extends Props {
  renderField: (f: FieldConfig, val: unknown, change: (val: unknown) => void) => React.ReactNode
}

const PointField: React.FC<Props> = ({ field: _field, value, onChange, disabled }) => {
  const coords: [number, number] = Array.isArray(value) && value.length === 2 ? (value as [number, number]) : [0, 0]

  return (
    <div className="flex gap-3">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-bold text-z-secondary">
          Longitude
        </label>
        <input
          type="number"
          value={coords[0]}
          onChange={(e) => onChange([Number(e.target.value), coords[1]])}
          step="any"
          disabled={disabled}
          className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-none-none px-3 py-3 text-sm focus:border-z-accent/50 outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-z-secondary"
          placeholder="0.0"
        />
      </div>
      <div className="flex-1 space-y-1">
        <label className="text-sm font-bold text-z-secondary">
          Latitude
        </label>
        <input
          type="number"
          value={coords[1]}
          onChange={(e) => onChange([coords[0], Number(e.target.value)])}
          step="any"
          disabled={disabled}
          className="w-full bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-none-none px-3 py-3 text-sm focus:border-z-accent/50 outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed text-white placeholder:text-z-secondary"
          placeholder="0.0"
        />
      </div>
    </div>
  )
}

const RowField: React.FC<RowFieldProps> = ({ field, value, onChange, renderField }) => {
  const cf = field as RowFieldConfig
  const rowFields = cf.fields || []

  return (
    <div className="flex gap-4 items-end">
      {rowFields.map((f) => (
        <div key={f.name} className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-gray-300 capitalize">
            {f.label || f.name}
            {(f as any).required && <span className="text-danger ml-1">*</span>}
          </label>
          {renderField(
            f,
            (value as Record<string, unknown>)?.[f.name],
            (val: unknown) =>
              onChange({ ...((value as Record<string, unknown>) || {}), [f.name]: val })
          )}
        </div>
      ))}
    </div>
  )
}

const JoinField: React.FC<{ field: { collection?: string } }> = ({ field }) => (
  <div className="w-full bg-z-hover border border-white/10 rounded-none-none px-4 py-3 text-sm text-z-muted italic flex items-center gap-2">
    <span className="text-z-active-text">⧉</span>
    Joined data from{' '}
    <span className="font-mono text-z-active-text text-xs">{field.collection}</span> — read-only
  </div>
)

type RadioFieldConfig = FieldConfig & {
  layout?: 'horizontal' | 'vertical'
  options?: Array<{ value?: string; label?: string } | string>
}


const RadioField: React.FC<Props> = ({ field, value, onChange, disabled }) => {
  const cf = field as RadioFieldConfig
  const isHorizontal = cf.layout === 'horizontal'

  return (
    <div className={cn('flex gap-4', isHorizontal ? 'flex-row flex-wrap' : 'flex-col gap-2')}>
      {(cf.options || []).map((opt, i) => {
        const optVal = typeof opt === 'string' ? opt : (opt.value || '')
        const optLabel = typeof opt === 'string' ? opt : (opt.label || optVal)
        return (
          <label key={`${String(optVal)}-${i}`} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name={field.name}
              value={String(optVal)}
              checked={value === optVal}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 border border-white/20 text-z-active-text focus:ring-z-active-border disabled:opacity-60 accent-z-accent"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              {String(optLabel)}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export { PointField, RowField, JoinField, RadioField }
