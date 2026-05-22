import React, { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Box,
  Puzzle,
  Command,
  Sparkles,
  ShieldCheck,
  Workflow,
  Layout,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { SiteSelector } from '../components/SiteSelector'

import Logo from '../components/Logo'
import GlobalSearch from '../components/GlobalSearch'

interface RegistryItem {
  slug: string
  name: string
  [key: string]: unknown
}

interface HealthData {
  maintenanceMode?: boolean
  collections?: RegistryItem[]
  globals?: RegistryItem[]
  registry?: {
    collections?: RegistryItem[]
    globals?: RegistryItem[]
  }
  [key: string]: unknown
}

const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [, setCommandPaletteOpen] = useState(false)
  const [collections, setCollections] = useState<RegistryItem[]>([])
  const [globals, setGlobals] = useState<RegistryItem[]>([])
  const [health, setHealth] = useState<HealthData | null>(null)
  const location = useLocation()

  // RESPONSIVE SCREEN ADJUSTMENTS & AUTO-COLLAPSE
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // SYSTEM HANDSHAKE
    const fetchMetadata = async () => {
      try {
        const response = await api.get('/health')
        const data = response.data.data
        setCollections(data.collections || data.registry?.collections || [])
        setGlobals(data.globals || data.registry?.globals || [])
        setHealth(data)
      } catch {
        console.error('System Handshake Failed')
      }
    }

    // KEYBOARD INTERRUPTS
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }

    fetchMetadata()
    window.addEventListener('keydown', handleKeyDown)
    const interval = setInterval(fetchMetadata, 30000)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(interval)
    }
  }, [])

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Templates', path: '/templates', icon: Layout },
    { name: 'AI Content Hub', path: '/ai-architect', icon: Sparkles },
    { name: 'Automations', path: '/automations', icon: Workflow },
    { name: 'Plugins', path: '/plugins', icon: Puzzle },
    { name: 'Media Library', path: '/media', icon: Box },
  ]

  return (
    <div
      className={cn(
        'flex h-full w-full transition-colors duration-500 font-sans',
        theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
      )}
    >
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* 🛡️ Compact Tactical Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? 260 : (isSidebarOpen ? 260 : 90),
          x: isMobile ? (isSidebarOpen ? 0 : -260) : 0
        }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'h-full flex-shrink-0 flex flex-col border-r z-50 transition-colors duration-500',
          isMobile ? 'fixed inset-y-0 left-0 shadow-2xl' : 'relative',
          theme === 'dark'
            ? 'bg-[#080808] border-white/5'
            : 'bg-white border-gray-100 shadow-sm'
        )}
      >
        {/* Brand Terminal */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/[0.03]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-9 h-9 rounded-none flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden',
                theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
              )}
            >
              <Logo size="sm" />
              {/* SYSTEM PULSE */}
              <motion.div
                animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-indigo-500/20"
              />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight uppercase italic leading-none">
                      Zenith
                    </span>
                    <div className="w-1 h-1 bg-emerald-500 rounded-none animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none mt-1.5">
                    v6.0 Stable
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active Site Workspace Indicator / Switcher */}
          <SiteSelector />
        <div
          className={cn(
            'px-6 py-4 border-b flex items-center justify-between transition-all duration-300',
            theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-gray-50/50 border-gray-100'
          )}
        >
          {isSidebarOpen ? (
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5">
                Workspace
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider truncate leading-none">
                {localStorage.getItem('activeSiteName') || 'Zenith Site'}
              </span>
            </div>
          ) : (
            <span
              className="text-[12px] filter saturate-50 hover:saturate-100 transition-all cursor-help"
              title={localStorage.getItem('activeSiteName') || 'Zenith Site'}
            >
              🌐
            </span>
          )}
          {isSidebarOpen && (
            <Link
              to="/sites"
              className={cn(
                'px-2.5 py-1.5 border hover:bg-white/[0.04] text-[8px] font-black uppercase tracking-widest font-mono transition-all',
                theme === 'dark'
                  ? 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-black'
              )}
            >
              Switch
            </Link>
          )}
        </div>

        {/* Navigation Core */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-8 px-4 space-y-10">
          <nav className="space-y-1.5">
            <div className="px-3 mb-4 flex items-center justify-between">
              {isSidebarOpen && (
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic leading-none">
                  Command Center
                </span>
              )}
              <Command size={10} className="text-gray-500" />
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 rounded-none transition-all group relative border',
                    isActive
                      ? theme === 'dark'
                        ? 'bg-white border-white text-black shadow-lg shadow-white/5'
                        : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                      : theme === 'dark'
                        ? 'text-gray-500 border-transparent hover:bg-white/[0.03] hover:text-gray-300'
                        : 'text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    size={16}
                    strokeWidth={isActive ? 3 : 1.5}
                    className={cn(
                      'transition-transform relative z-10',
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    )}
                  />
                  {isSidebarOpen && (
                    <span className="text-[12px] font-black uppercase tracking-[0.1em] relative z-10 italic leading-none truncate">
                      {item.name}
                    </span>
                  )}
                  {isActive && !isSidebarOpen && (
                    <motion.div
                      layoutId="nav-glow-mini"
                      className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-none"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <nav className="space-y-1.5 pt-4 border-t border-white/[0.03]">
            <div className="px-3 mb-4 flex items-center justify-between">
              {isSidebarOpen && (
                <span className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none">
                  Global Settings
                </span>
              )}
              <ShieldCheck size={10} className="text-indigo-500" />
            </div>

            <div className="space-y-0.5">
              {globals.map((global) => {
                const isActive = location.pathname === `/globals/${global.slug}`
                return (
                  <Link
                    key={global.slug}
                    to={`/globals/${global.slug}`}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-none transition-all duration-300 group relative border',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                          : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                        : theme === 'dark'
                          ? 'text-gray-500 border-white/5 hover:bg-white/[0.03] hover:text-gray-300'
                          : 'text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-none transition-all shadow-[0_0_10px_currentColor]',
                        isActive
                          ? theme === 'dark'
                            ? 'bg-black'
                            : 'bg-emerald-400'
                          : 'bg-gray-700/40 group-hover:bg-indigo-500'
                      )}
                    />
                    {isSidebarOpen && (
                      <span className="text-[12px] font-black uppercase tracking-widest italic truncate">
                        {global.slug === 'landing-page'
                          ? 'Page Editor'
                          : global.name.replace(/-/g, ' ').replace(/_/g, ' ')}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          <nav className="space-y-1.5">
            <div className="px-3 mb-4 flex items-center justify-between">
              {isSidebarOpen && (
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] italic leading-none">
                  Collections
                </span>
              )}
              <Database size={10} className="text-gray-500" />
            </div>

            <div className="space-y-0.5">
              {collections.map((col) => {
                const isActive = location.pathname.startsWith(`/collections/${col.slug}`)
                return (
                  <Link
                    key={col.slug}
                    to={`/collections/${col.slug}`}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                          : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                        : theme === 'dark'
                          ? 'text-gray-400 border-white/5 hover:bg-white/[0.04] hover:text-white'
                          : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
                        isActive
                          ? theme === 'dark'
                            ? 'bg-black scale-110'
                            : 'bg-emerald-400'
                          : 'bg-gray-700/40 group-hover:bg-indigo-500'
                      )}
                    />
                    {isSidebarOpen && (
                      <span className="text-[12px] font-black uppercase tracking-tight italic leading-none truncate">
                        {col.slug?.replace(/-/g, ' ').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* 🖥️ System Administration Category */}
          <nav className="space-y-1.5 pt-4 border-t border-white/[0.03]">
            <div className="px-3 mb-4 flex items-center justify-between">
              {isSidebarOpen && (
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] italic leading-none">
                  System Administration
                </span>
              )}
              <Settings size={10} className="text-gray-500" />
            </div>

            <div className="space-y-0.5">
              <Link
                to="/audit-log"
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
                  location.pathname === '/audit-log'
                    ? theme === 'dark'
                      ? 'bg-white border-white text-black shadow-lg'
                      : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                    : theme === 'dark'
                      ? 'text-gray-450 border-white/5 hover:bg-white/[0.04] hover:text-white'
                      : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
                    location.pathname === '/audit-log'
                      ? theme === 'dark'
                        ? 'bg-black scale-110'
                        : 'bg-emerald-400'
                      : 'bg-gray-700/40 group-hover:bg-indigo-500'
                  )}
                />
                {isSidebarOpen && (
                  <span className="text-[12px] font-black uppercase tracking-tight italic leading-none truncate">
                    Audit Logs
                  </span>
                )}
              </Link>

              <Link
                to="/collections/members"
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
                  location.pathname.startsWith('/collections/members')
                    ? theme === 'dark'
                      ? 'bg-white border-white text-black shadow-lg'
                      : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                    : theme === 'dark'
                      ? 'text-gray-450 border-white/5 hover:bg-white/[0.04] hover:text-white'
                      : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
                    location.pathname.startsWith('/collections/members')
                      ? theme === 'dark'
                        ? 'bg-black scale-110'
                        : 'bg-emerald-400'
                      : 'bg-gray-700/40 group-hover:bg-indigo-500'
                  )}
                />
                {isSidebarOpen && (
                  <span className="text-[12px] font-black uppercase tracking-tight italic leading-none truncate">
                    Members
                  </span>
                )}
              </Link>

              <Link
                to="/system"
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
                  location.pathname === '/system'
                    ? theme === 'dark'
                      ? 'bg-white border-white text-black shadow-lg'
                      : 'bg-gray-900 border-gray-800 text-white shadow-xl'
                    : theme === 'dark'
                      ? 'text-gray-450 border-white/5 hover:bg-white/[0.04] hover:text-white'
                      : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
                    location.pathname === '/system'
                      ? theme === 'dark'
                        ? 'bg-black scale-110'
                        : 'bg-emerald-400'
                      : 'bg-gray-700/40 group-hover:bg-indigo-500'
                  )}
                />
                {isSidebarOpen && (
                  <span className="text-[12px] font-black uppercase tracking-tight italic leading-none truncate">
                    System Health
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.03] bg-black/[0.02]">
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center justify-center gap-4 py-3.5 rounded-none transition-all group border border-transparent hover:border-red-500/20',
              theme === 'dark'
                ? 'bg-red-500/5 text-red-400 hover:bg-red-500/10'
                : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
            )}
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">
                Logout
              </span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* 🚀 Dynamic Main Node */}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0 relative h-full overflow-hidden transition-colors duration-500',
          theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
        )}
      >
        <div className="flex-1 flex flex-col overflow-auto">
          <header
            className={cn(
              'h-20 flex items-center justify-between px-4 md:px-8 border-b z-40 transition-colors duration-500 backdrop-blur-xl shrink-0',
              theme === 'dark' ? 'bg-black/60 border-white/5' : 'bg-white/60 border-gray-100'
            )}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                className={cn(
                  'p-2 rounded-none transition-all border',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                )}
              >
                {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-5">
              {/* Tactical Clock */}
              <div className="hidden lg:flex flex-col items-end mr-4">
                <span className="text-[10px] font-black italic tracking-tighter tabular-nums leading-none">
                  {new Date().toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Universal Time
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-none border border-emerald-500/10 group cursor-help">
                <div className="w-1 h-1 bg-emerald-500 rounded-none animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 italic">
                  Core_Stable
                </span>
                {/* Status Tooltip Mock */}
                <div className="absolute top-full mt-2 right-0 hidden group-hover:block z-50">
                  <div
                    className={cn(
                      'p-3 border rounded-none shadow-2xl min-w-[200px]',
                      theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-gray-500 uppercase">
                          Latency
                        </span>
                        <span className="text-[8px] font-black text-emerald-500">14ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-gray-500 uppercase">
                          Uptime
                        </span>
                        <span className="text-[8px] font-black text-emerald-500">99.9%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/settings"
                title="System Settings"
                className={cn(
                  'p-2 rounded-none border transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400'
                    : 'bg-gray-50 border-gray-100 text-gray-600'
                )}
              >
                <Settings size={16} />
              </Link>

              <button
                onClick={toggleTheme}
                title="Switch Visual Mode (Light/Dark)"
                className={cn(
                  'p-2 rounded-none border transition-all',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-amber-400'
                    : 'bg-gray-50 border-gray-100 text-gray-600'
                )}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div className="flex items-center gap-3 group cursor-pointer" title="User Profile">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase italic leading-none">
                    {user?.name || 'Operator'}
                  </span>
                  <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Admin
                  </span>
                </div>
                <div
                  className={cn(
                    'w-8 h-8 rounded-none flex items-center justify-center text-[10px] font-black shadow-xl transition-all',
                    theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
                  )}
                >
                  {(user?.name || 'A')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-4 md:p-6">
            <AnimatePresence>
              {health?.maintenanceMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-amber-500 text-black p-4 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-600">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-black/10 flex items-center justify-center animate-pulse">
                        <X size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                          System Alert: Maintenance Protocol Active
                        </span>
                        <span className="text-[8px] font-bold opacity-80 uppercase tracking-widest leading-none">
                          External handshakes are currently throttled for database optimization.
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      className="px-4 py-2 bg-black text-white text-[8px] font-black uppercase tracking-widest hover:bg-black/80 transition-all"
                    >
                      Configure
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {children || <Outlet />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
