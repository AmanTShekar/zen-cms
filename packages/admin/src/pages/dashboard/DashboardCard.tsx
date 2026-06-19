import React from 'react'
import { cn } from '../../lib/utils'
import { useTheme } from '../../context/ThemeContext'

interface DashboardCardProps {
  title?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardCard({ title, icon, action, children, className, noPadding }: DashboardCardProps) {
  const { theme } = useTheme()

  return (
    <div
      className={cn(
        'flex flex-col',
        // Glassmorphism spec from AGENTS.md
        'border',
        theme === 'dark'
          ? 'bg-z-panel backdrop-blur-[12px] border-z-border shadow-[var(--z-active-glow)]'
          : 'bg-white/80 backdrop-blur-[12px] border-z-border/60 shadow-sm',
        className
      )}
    >
      {(title || action) && (
        <div
          className={cn(
            'flex items-center justify-between px-5 py-4 border-b shrink-0',
            theme === 'dark' ? 'border-z-border' : 'border-z-border'
          )}
        >
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className={cn('text-z-secondary', theme === 'dark' ? 'text-z-secondary' : 'text-z-muted')}>
                {icon}
              </span>
            )}
            {title && (
              <h2 className={cn(
                'text-[11px] font-black uppercase tracking-[0.1em]',
                theme === 'dark' ? 'text-z-muted' : 'text-z-secondary'
              )}>
                {title}
              </h2>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn('flex-1 min-h-0', !noPadding && 'p-5')}>
        {children}
      </div>
    </div>
  )
}
