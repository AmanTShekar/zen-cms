import React from 'react'

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-white/[0.03] border border-white/[0.05] animate-pulse ${className}`}
    />
  )
}

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-glass-gradient border border-white/[0.05] shadow-glass">
      <Skeleton className="h-44 rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="pt-2 flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ArticleDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <Skeleton className="h-6 w-32 mb-6" />
      <Skeleton className="h-12 w-full mb-3" />
      <Skeleton className="h-12 w-4/5 mb-6" />
      <Skeleton className="h-80 w-full rounded-2xl mb-10" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  )
}