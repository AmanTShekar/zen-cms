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
 theme === 'dark' ? "bg-white/[0.02] border border-white/[0.08]" : "bg-gray-50 border border-gray-200 shadow-sm",
 className
 )}>
 <div className={cn(
 "w-12 h-12 mb-4 rounded-none flex items-center justify-center",
 theme === 'dark' ? "bg-white/5 text-white/40" : "bg-gray-200 text-gray-500"
 )}>
 <Icon size={24} />
 </div>
 <h3 className={cn(
 "text-sm font-black uppercase tracking-widest mb-2",
 theme === 'dark' ? "text-white" : "text-gray-900"
 )}>
 {title}
 </h3>
 <p className={cn(
 "text-xs max-w-sm leading-relaxed mb-6",
 theme === 'dark' ? "text-white/40" : "text-gray-500"
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
