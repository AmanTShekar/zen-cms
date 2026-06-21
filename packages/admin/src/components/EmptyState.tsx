import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

interface EmptyStateProps {
 icon: LucideIcon
 title: string
 message: string
 action?: React.ReactNode
 theme?: 'light' | 'dark'
 className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
 icon: Icon,
 title,
 message,
 action,
 theme = 'dark',
 className
}) => {
 return (
 <div className={cn(
 "w-full flex flex-col items-center justify-center p-12 text-center",
 theme === 'dark' ? "bg-z-panel border border-z-border" : "bg-gray-50 border border-z-border shadow-sm",
 className
 )}>
 <div className={cn(
 "w-12 h-12 mb-4 rounded-none-none flex items-center justify-center",
 theme === 'dark' ? "bg-z-hover text-white/40" : "bg-gray-200 text-z-secondary"
 )}>
 <Icon size={24} />
 </div>
 <h3 className={cn(
 "text-sm font-semibold   mb-2",
 theme === 'dark' ? "text-white" : "text-z-primary"
 )}>
 {title}
 </h3>
 <p className={cn(
 "text-xs max-w-sm leading-relaxed mb-6",
 theme === 'dark' ? "text-white/40" : "text-z-secondary"
 )}>
 {message}
 </p>
 {action && (
 <div className="mt-2">
 {action}
 </div>
 )}
 </div>
 )
}

export default EmptyState
