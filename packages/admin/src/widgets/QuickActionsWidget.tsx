import { Plus, Box, Sparkles, Layout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

const ACTIONS = [
  { title: 'New Content', icon: Plus, path: '/collections', color: 'bg-z-accent hover:bg-z-accent', text: 'text-white' },
  { title: 'Media Library', icon: Box, path: '/media', color: 'bg-z-accent hover:bg-z-accent', text: 'text-white' },
  { title: 'AI Writer', icon: Sparkles, path: '/ai-architect', color: 'bg-purple-500 hover:bg-purple-600', text: 'text-white' },
  { title: 'Templates', icon: Layout, path: '/templates', color: 'bg-z-accent hover:bg-z-accent', text: 'text-white' },
]

export default function QuickActionsWidget({ config = {}, theme }: WidgetProps) {
  const navigate = useNavigate()
  const actions = config.actions || ACTIONS

  return (
    <div className="flex flex-col justify-center">
      <div 
        className="grid gap-3 w-full h-full"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
      >
        {actions.map((a: any, i: number) => {
          const Icon = a.icon || Plus
          return (
            <button
              key={i}
              onClick={() => navigate(a.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-3 p-4 border rounded-none-none group transition-all text-center w-full h-full shadow-sm hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5',
                a.color || 'bg-gray-800 hover:bg-gray-900',
                a.text || 'text-white',
                theme === 'dark' ? 'border-z-border' : 'border-transparent'
              )}
            >
              <div className="opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300">
                <Icon size={28} strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold leading-none mt-1 opacity-90 group-hover:opacity-100">
                {a.title}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
