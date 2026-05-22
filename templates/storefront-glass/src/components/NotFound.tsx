import React from 'react'
import { Link } from 'react-router-dom'

interface NotFoundProps {
  title?: string
  description?: string
  action?: { label: string; to: string }
}

export default function NotFound({
  title = '404 — Page Not Found',
  description = "The page you're looking for doesn't exist or has been moved.",
  action = { label: '← Back to Home', to: '/' },
}: NotFoundProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-white/[0.08]" />
          <div className="absolute inset-0 rounded-2xl bg-glass-gradient border border-white/[0.06]" />
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl font-black text-white/60">404</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="mt-3 text-sm text-zenith-textMuted leading-relaxed">{description}</p>
        </div>
        {action && (
          <div>
            <Link
              to={action.to}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm font-bold text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all"
            >
              {action.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}