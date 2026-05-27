import { useEffect, useState } from 'react'
import { Database, ArrowUpRight } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

const METRIC_MAP: Record<string, { label: string; path: string; key: string }> = {
  total_records: { label: 'Total Records', path: '/system/counts', key: '__total__' },
  members: { label: 'Team Members', path: '/system/counts', key: 'members' },
  uptime: { label: 'System Uptime', path: '/system/health', key: 'uptime' },
  db_status: { label: 'DB Status', path: '/system/health', key: 'database' },
}

export default function StatCardWidget({ config = {}, theme, title }: WidgetProps) {
  const metric = config.metric || 'total_records'
  const def = METRIC_MAP[metric] || METRIC_MAP.total_records
  const [value, setValue] = useState<string | number>('—')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(def.path)
      .then((r) => {
        const data = r.data?.data
        if (metric === 'total_records') {
          const total =
            typeof data === 'object'
              ? Object.values(data as Record<string, number>).reduce((a, b) => a + (b as number), 0)
              : 0
          setValue(total.toLocaleString())
        } else if (metric === 'uptime') {
          const up = data?.system?.uptime ?? data?.uptime ?? 0
          setValue(`${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`)
        } else if (metric === 'db_status') {
          setValue(data?.database === 'ok' ? 'ONLINE' : 'DEGRADED')
        } else {
          setValue(data?.[def.key] ?? '—')
        }
      })
      .catch(() => setValue('Error'))
      .finally(() => setLoading(false))
  }, [metric, def.path, def.key])

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div
        className={cn(
          'w-9 h-9 rounded-none flex items-center justify-center',
          theme === 'dark' ? 'bg-white/5 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
        )}
      >
        <Database size={16} />
      </div>
      <div>
        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-1">
          {title || config.label || def.label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black italic tracking-tighter leading-none">
            {loading ? '...' : value}
          </span>
          <ArrowUpRight size={12} className="text-gray-400" />
        </div>
      </div>
    </div>
  )
}
