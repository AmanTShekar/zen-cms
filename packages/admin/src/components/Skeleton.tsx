import React from 'react'
import { cn } from '../lib/utils'

interface SkeletonProps {
  className?: string
  count?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('animate-pulse bg-text-muted/10 rounded-none', className)} />
      ))}
    </>
  )
}

export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 px-6 py-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 border-t border/50">
          <Skeleton className="h-10 w-10 rounded-none" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3 opacity-50" />
          </div>
          <Skeleton className="h-10 w-10 rounded-none" />
        </div>
      ))}
    </div>
  )
}
