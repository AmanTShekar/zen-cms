import React from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

interface FooterProps {
  siteName?: string
  description?: string
  socialLinks?: Record<string, string>
}

export default function Footer({
  siteName = 'Zenith Storefront',
  description = 'A premium content experience powered by Zenith CMS.',
  socialLinks = {},
}: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-24 border-t border-white/[0.06]">
      {/* Background glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-black text-base text-white tracking-tight">{siteName}</span>
            </Link>
            <p className="text-sm text-zenith-textMuted leading-relaxed max-w-xs">
              {description}
            </p>
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex gap-3 pt-2">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zenith-textMuted hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all text-xs font-bold uppercase"
                  >
                    {platform.charAt(0)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zenith-textDim mb-5">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/posts', label: 'All Posts' },
                { to: '/about', label: 'About' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm text-zenith-textMuted hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tech Note */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zenith-textDim mb-5">
              Powered By
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zenith-textMuted">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Zenith CMS — Headless Engine
              </div>
              <div className="flex items-center gap-2 text-sm text-zenith-textMuted">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                React 19 + Vite
              </div>
              <div className="flex items-center gap-2 text-sm text-zenith-textMuted">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Tailwind CSS
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zenith-textDim font-mono">
            © {currentYear} {siteName}. All rights reserved.
          </p>
          <a
            href="https://github.com/zenith-cms/zenith"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zenith-textDim hover:text-indigo-400 transition-colors font-mono"
          >
            Built with Zenith CMS →
          </a>
        </div>
      </div>
    </footer>
  )
}