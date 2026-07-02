import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function ApiStatusWidget({ theme, title, isPreview }: WidgetProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'degraded'>(isPreview ? 'ok' : 'checking')
  const [latency, setLatency] = useState<number | null>(isPreview ? 45 : null)
  const [version, setVersion] = useState(isPreview ? 'v1.0.0-beta' : '—')
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  useEffect(() => {
    if (isPreview) return;
    const check = async () => {
      const t0 = performance.now()
      try {
        const r = await api.get('/system/health')
        setLatency(Math.round(performance.now() - t0))
        setVersion(r.data?.data?.version || '—')
        setStatus(r.data?.data?.status === 'ok' ? 'ok' : 'degraded')
      } catch {
        setStatus('degraded')
      }
      setLastChecked(new Date())
    }
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [isPreview])

  const isOk = status === 'ok'
  const isChecking = status === 'checking'

  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-z-primary  flex items-center gap-2">
          <Activity size={14} className={isOk ? "text-z-active-text" : "text-z-muted"} /> 
          {title || 'API Health & Connectivity'}
        </p>
        <span className="text-sm text-z-secondary flex items-center gap-1 font-medium">
          <Clock size={10} /> {lastChecked.toLocaleTimeString()}
        </span>
      </div>
      
      <div
        className={cn(
          'flex-1 flex items-center justify-between p-4 border rounded-none-none transition-colors',
          'bg-z-panel border-z-border shadow-sm'
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-none-none flex items-center justify-center border",
            isChecking ? "bg-[var(--z-bg-hover)] border-z-border text-z-muted  " :
            isOk ? "bg-z-active-bg border-z-active-border text-z-accent dark:bg-z-active-bg dark:border-z-accent/20 dark:text-z-active-text" : 
            "bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
          )}>
            {isChecking ? <Activity size={24} /> : isOk ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex flex-col">
            <span className={cn(
                'text-[15px] font-semibold   leading-none mb-1',
                isChecking ? 'text-z-secondary' : isOk ? 'text-z-accent dark:text-z-active-text' : 'text-red-500'
              )}
            >
              {isChecking ? 'Verifying...' : isOk ? 'All Systems Operational' : 'API Degraded'}
            </span>
            <span className="text-sm text-z-secondary font-medium">
              Core Engine v{version}
            </span>
          </div>
        </div>

        {latency !== null && !isChecking && (
          <div className="flex flex-col items-end border-l pl-4 border-z-border ">
            <span className="text-sm text-z-secondary font-bold mb-1">Latency</span>
            <span className="text-xl font-semibold tabular-nums text-z-primary  leading-none">
              {latency}<span className="text-sm font-medium text-z-muted ml-0.5">ms</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
