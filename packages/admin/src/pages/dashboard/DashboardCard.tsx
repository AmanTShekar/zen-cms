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

export const DashboardCard = React.memo(function DashboardCard({ title, icon, action, children, className, noPadding }: DashboardCardProps) {
  const { theme } = useTheme()

  return (
    <div
      className={cn(
        'flex flex-col border z-panel backdrop-blur-md shadow-sm',
        className
      )}
      style={{ background: 'var(--z-bg-panel)', borderColor: 'var(--z-border)' }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0 border-z-border"
        >
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="text-z-secondary">
                {icon}
              </span>
            )}
            {title && (
              <h2 className="text-sm font-semibold text-z-secondary">
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
})
