import { useEffect, useState } from 'react'
import { Cpu, HardDrive, Network } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function SystemHealthWidget({ theme, title, isPreview }: WidgetProps) {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    if (isPreview) {
      setHealth({ cpu: { usage: 35 }, memory: { used: 45 }, database: 'ok' });
      return;
    }
    const fetch = () =>
      api
        .get('/system/health')
        .then((r) => setHealth(r.data?.data))
        .catch(() => {})
    fetch()
    const t = setInterval(fetch, 10000)
    return () => clearInterval(t)
  }, [isPreview])

  const parsePercent = (val: string | number | undefined) => {
    if (typeof val === 'number') return val
    if (typeof val === 'string' && val.includes('%')) {
      const num = parseFloat(val.replace('%', ''))
      if (!isNaN(num)) return num
    }
    return null
  }

  const getStatusColor = (pct: number | null) => {
    if (pct === null) return 'bg-z-border'
    if (pct < 50) return 'bg-z-accent'
    if (pct < 80) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const metrics = [
    { label: 'CPU', value: health?.cpu?.usage || '—', icon: Cpu, pct: parsePercent(health?.cpu?.usage) },
    { label: 'Memory', value: health?.memory?.used || '—', icon: HardDrive, pct: parsePercent(health?.memory?.used) },
    {
      label: 'Database',
      value: health?.database === 'ok' ? 'Connected' : health?.database || '—',
      icon: Network,
      pct: health?.database === 'ok' ? 0 : null,
      isDb: true
    },
  ]

  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-z-primary  flex items-center gap-2">
          <Cpu size={14} className="text-z-secondary" /> 
          {title || 'Infrastructure Vitals'}
        </p>
      </div>
      <div 
        className="grid gap-3 flex-1"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              'flex flex-col items-start justify-between gap-1 p-4 border rounded-none-none transition-colors w-full',
              'bg-z-panel border-z-border shadow-sm'
            )}
          >
            <div className="w-full">
              <div className="flex items-center gap-1.5 text-z-secondary mb-2">
                <m.icon size={12} />
                <span className="text-sm font-bold">{m.label}</span>
              </div>
              <span className={cn(
                "text-xl font-semibold  leading-none block mb-3",
                m.isDb && m.value === 'Connected' ? "text-z-active-text" : "text-z-primary "
              )}>
                {m.value}
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full h-1.5 bg-z-hover rounded-none-none overflow-hidden flex items-center">
              {m.pct !== null ? (
                <div 
                  className={cn("h-full transition-all duration-1000", getStatusColor(m.pct))} 
                  style={{ width: `${m.pct}%` }} 
                />
              ) : m.isDb && m.value === 'Connected' ? (
                <div className="h-full bg-z-accent w-full" />
              ) : (
                <div className="h-full bg-z-input  w-full opacity-50" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
