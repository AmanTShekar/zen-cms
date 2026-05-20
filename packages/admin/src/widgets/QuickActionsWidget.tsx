import { Plus, Box, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

const ACTIONS = [
  { title: 'New Content', icon: Plus, path: '/collections', color: 'bg-indigo-500' },
  { title: 'Media Library', icon: Box, path: '/media', color: 'bg-emerald-500' },
  { title: 'AI Writer', icon: Sparkles, path: '/ai-architect', color: 'bg-amber-500' },
]

export default function QuickActionsWidget({ config = {}, theme }: WidgetProps) {
  const navigate = useNavigate()
  const actions = config.actions || ACTIONS

  return (
    <div className="h-full flex items-center gap-4 overflow-x-auto pb-1">
      {actions.map((a: any, i: number) => {
        const Icon = a.icon || Plus
        return (
          <button
            key={i}
            onClick={() => navigate(a.path)}
            className={cn(
              'flex items-center gap-4 px-6 py-4 border rounded-none flex-shrink-0 group transition-all text-left h-full',
              theme === 'dark'
                ? 'bg-white/[0.02] border-white/5 hover:border-white/20'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-none flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-110',
                a.color || 'bg-indigo-500'
              )}
            >
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase italic leading-none mb-1">{a.title}</p>
              {a.sub && (
                <p className="text-[8px] text-gray-500 uppercase tracking-widest">{a.sub}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
