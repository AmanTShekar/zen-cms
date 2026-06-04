import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Zap } from 'lucide-react'

interface HeaderProps {
  siteName?: string
  headerLinks?: { label: string; url: string }[]
}

const CMS_URL = import.meta.env.VITE_CMS_URL as string

export default function Header({ siteName = 'Zenith Storefront', tagline, headerLinks = [] }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const navItems = headerLinks.length > 0 ? headerLinks : [
    { url: '/', label: 'Home' },
    { url: '/posts', label: 'Posts' },
    { url: '/about', label: 'About' },
  ]

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? 'bg-zenith-base/80 backdrop-blur-xl shadow-glass border-b border-white/[0.06]'
            : 'bg-transparent'
          }
        `}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 rounded-lg bg-indigo-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-black text-lg text-white tracking-tight">
              {siteName}
            </span>
            {tagline && (
              <span className="hidden sm:block text-xs text-zenith-textMuted font-mono ml-2">
                — {tagline}
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map(({ url, label }) => (
              <Link
                key={url}
                to={url}
                className={`
                  text-sm font-semibold transition-colors relative
                  ${location.pathname === url
                    ? 'text-white'
                    : 'text-zenith-textMuted hover:text-white'
                  }
                  after:absolute after:-bottom-0.5 after:left-0 after:right-0
                  after:h-px after:bg-indigo-500/50 after:scale-x-0 after:origin-left
                  after:transition-transform
                  ${location.pathname === url ? 'after:scale-x-100' : ''}
                  hover:after:scale-x-100
                `}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CMS Admin Link */}
          {CMS_URL && (
            <a
              href={CMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-xs font-mono text-zenith-textDim hover:text-indigo-400 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow" />
              Live CMS
            </a>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-zenith-textMuted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 left-0 right-0 z-40 bg-zenith-base/95 backdrop-blur-xl border-b border-white/[0.06] md:hidden"
          >
            <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navItems.map(({ url, label }) => (
                <Link
                  key={url}
                  to={url}
                  className={`
                    px-4 py-3 rounded-xl text-sm font-semibold transition-colors
                    ${location.pathname === url
                      ? 'bg-indigo-500/10 text-white'
                      : 'text-zenith-textMuted hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}