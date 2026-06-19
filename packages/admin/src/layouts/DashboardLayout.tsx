import React, { useState, useEffect, useCallback } from 'react'
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
 Eye,
 EyeOff,
 GripVertical,
 Network,
 Paintbrush,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import api from '../lib/api'
import { toast } from 'react-hot-toast'
import { SiteSelector } from '../components/SiteSelector'
import { useTenantStore } from '../lib/tenantStore'
import { useSystemMetadata } from '../hooks/useQueries'

import Logo from '../components/Logo'
import GlobalSearch from '../components/GlobalSearch'
import { useShallow } from 'zustand/react/shallow'
import { useBrand, THEME_PRESETS } from '../context/BrandContext'

interface RegistryItem {
 slug: string
 name: string
 [key: string]: any
}

interface HealthData {
 maintenanceMode?: boolean
 collections?: RegistryItem[]
 globals?: RegistryItem[]
 registry?: {
 collections?: RegistryItem[]
 globals?: RegistryItem[]
 }
 [key: string]: any
}

 const LiveClock = () => {
 const [time, setTime] = useState(new Date())

 useEffect(() => {
 const timer = setInterval(() => setTime(new Date()), 1000)
 return () => clearInterval(timer)
 }, [])

 return (
 <span className="text-sm font-black tracking-tighter tabular-nums leading-none">
 {time.toLocaleTimeString([], {
 hour12: false,
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit',
 })}
 </span>
 )
 }

const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { logout, user  } = useAuthStore(useShallow(state => ({ logout: state.logout, user: state.user })))
  const { theme, toggleTheme } = useTheme()
  const { brand, preset, applyPreset } = useBrand()
  const activeSiteName = useTenantStore((state) => state.activeSiteName)
  const activeSiteId = useTenantStore((state) => state.activeSiteId)
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [, setCommandPaletteOpen] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)

  // ── Preset-driven active styles ───────────────────────────────────────
  const activeLink = (isActive: boolean): React.CSSProperties =>
    isActive ? { background: preset.activeBg, borderColor: preset.activeBorder, color: preset.activeText, boxShadow: preset.activeGlow } : {}
  const activeDot = (isActive: boolean): React.CSSProperties =>
    isActive ? { background: preset.activeText } : {}

  const navBase = (dark: boolean) => `flex items-center gap-4 px-4 py-3 transition-all group relative border ${
    dark ? 'border-transparent hover:bg-z-hover hover:text-gray-300 text-z-secondary' : 'border-transparent hover:bg-gray-100 hover:text-z-primary text-z-secondary'}`
  const dotBase = 'w-2 h-2 transition-all flex-shrink-0'

  const envMode = import.meta.env.MODE || 'development'
 let envConfig = {
 bg: 'bg-gray-500/5',
 border: 'border-gray-500/10',
 dot: 'bg-gray-500',
 shadow: 'shadow-[0_0_8px_#6b7280]',
 text: 'text-gray-600 dark:text-z-secondary'
 }
 if (envMode === 'development') {
 envConfig = {
 bg: 'bg-z-accent/5',
 border: 'border-z-accent/10',
 dot: 'bg-z-accent',
 shadow: 'shadow-[var(--z-active-glow)]',
 text: 'text-z-accent dark:text-z-active-text'
 }
 } else if (envMode === 'production') {
 envConfig = {
 bg: 'bg-purple-500/5',
 border: 'border-purple-500/10',
 dot: 'bg-purple-500',
 shadow: 'shadow-[var(--z-active-glow)]',
 text: 'text-purple-600 dark:text-purple-500'
 }
 } else if (envMode === 'test') {
 envConfig = {
 bg: 'bg-amber-500/5',
 border: 'border-amber-500/10',
 dot: 'bg-amber-500',
 shadow: 'shadow-[var(--z-active-glow)]',
 text: 'text-amber-600 dark:text-amber-500'
 }
 }
 
 // React Query Hook for metadata
 const { data: health, isSuccess } = useSystemMetadata()
  const collections = (health?.collections || []).filter((c: any) => {
    if ((user as any)?.role === 'admin') return true
    if (!(user as any)?.specialAccess || (user as any).specialAccess.length === 0) return true
    return (user as any).specialAccess.includes(`col:${c.slug}`)
  })
  const globals = (health?.globals || []).filter((g: any) => {
    if ((user as any)?.role === 'admin') return true
    if (!(user as any)?.specialAccess || (user as any).specialAccess.length === 0) return true
    return (user as any).specialAccess.includes(`glb:${g.slug}`)
  })

 const [isCustomizing, setIsCustomizing] = useState(false)
 const [sidebarConfig, setSidebarConfig] = useState<{ name: string; path: string; visible: boolean }[]>(() => {
 try {
 const saved = localStorage.getItem('zenith_sidebar_config')
 return saved ? JSON.parse(saved) : []
 } catch { return [] }
 })
 const location = useLocation()

 const defaultNavItems = [
 { name: 'System Overview', path: '/', icon: LayoutDashboard },
 { name: 'Media Storage', path: '/media', icon: Box },
 { name: 'Templates', path: '/templates', icon: Layout },
 { name: 'Data Graph', path: '/graph', icon: Network },
 { name: 'Campaigns', path: '/campaigns', icon: Command },
 { name: 'Workflows', path: '/automations', icon: Workflow },
 { name: 'AI Assistant', path: '/ai-architect', icon: Sparkles },
 { name: 'Plugins', path: '/plugins', icon: Puzzle },
 ]

 const saveSidebarConfig = useCallback((items: { name: string; path: string; visible: boolean }[]) => {
 setSidebarConfig(items)
 localStorage.setItem('zenith_sidebar_config', JSON.stringify(items))
 }, [])

 const toggleItemVisibility = useCallback((name: string) => {
 saveSidebarConfig(
 sidebarConfig.map((item) =>
 item.name === name ? { ...item, visible: !item.visible } : item
 )
 )
 }, [sidebarConfig, saveSidebarConfig])

 const reorderSidebar = useCallback((reordered: { name: string; path: string; visible: boolean }[]) => {
 saveSidebarConfig(reordered)
 }, [saveSidebarConfig])

 // Initialize sidebar config from defaults if not yet saved
 useEffect(() => {
 if (sidebarConfig.length === 0) {
 saveSidebarConfig(defaultNavItems.map(({ name, path }) => ({ name, path, visible: true })))
 }
 }, []) // eslint-disable-line react-hooks/exhaustive-deps

 // Merge saved config with default nav items (preserving order and visibility)
 const navItems = sidebarConfig.length > 0
 ? sidebarConfig
 .filter((c) => defaultNavItems.some((d) => d.name === c.name))
 .map((c) => ({ ...c, icon: defaultNavItems.find((d) => d.name === c.name)!.icon }))
 .concat(
 defaultNavItems
 .filter((d) => !sidebarConfig.some((c) => c.name === d.name))
 .map((d) => ({ name: d.name, path: d.path, visible: true, icon: d.icon }))
 )
 : defaultNavItems.map((d) => ({ ...d, visible: true }))

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
 // TENANT THEME INJECTION
 const updateTheme = () => {
 let link = document.getElementById('theme-stylesheet') as HTMLLinkElement
 if (!link) {
 link = document.createElement('link')
 link.id = 'theme-stylesheet'
 link.rel = 'stylesheet'
 document.head.appendChild(link)
 }
 const timestamp = new Date().getTime()
 const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
 link.href = `${baseUrl}/system/settings/theme${activeSiteId ? `?siteId=${activeSiteId}&t=${timestamp}` : `?t=${timestamp}`}`
 }

 updateTheme()

 // KEYBOARD INTERRUPTS
 const handleKeyDown = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 e.preventDefault()
 setCommandPaletteOpen((prev) => !prev)
 }
 }

 window.addEventListener('keydown', handleKeyDown)

 return () => {
 window.removeEventListener('keydown', handleKeyDown)
 }
 }, [activeSiteId])


  const isTopNav = preset.layoutVariant === 'topnav' && !isMobile; // Fallback to sidebar on mobile

  if (isTopNav) {
    return (
      <div className="flex flex-col h-full w-full font-sans" style={{ background: 'var(--z-bg-base)', color: 'var(--z-text-primary)' }}>
        <header className="h-16 flex items-center justify-between px-6 border-b z-50 shrink-0" style={{ background: preset.sidebarBg, borderColor: 'var(--z-border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 border-r border-white/5 pr-4 h-full">
            <div className="w-8 h-8 flex items-center justify-center font-black text-xs" style={{ background: preset.logoIconBg, color: preset.logoIconText, borderRadius: preset.borderRadius === 'sm' ? '2px' : preset.borderRadius === 'md' ? '4px' : preset.borderRadius === 'lg' ? '6px' : '0px' }}>
              {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.appName} className="w-full h-full object-contain" /> : <Logo size="sm" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight uppercase leading-none">{brand.appName || 'Zenith'}</span>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mt-1">{brand.appTagline || 'v1.0'}</span>
            </div>
          </div>

          {/* Site Selector (Inline) */}
          <div className="mx-4 flex-shrink-0">
            <div className="text-[9px] font-black uppercase tracking-widest text-z-secondary mb-1">Active Scope</div>
            <div className="text-[11px] font-black text-z-primary">{activeSiteName || 'System Root'}</div>
          </div>

          {/* Horizontal Navigation */}
          <nav className="flex-1 overflow-x-auto hidden md:flex items-center gap-1 px-4 h-full">
            {navItems.filter(n => n.visible).map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.path} style={activeLink(isActive)}
                  className={cn("flex items-center gap-2 px-3 py-2 border transition-all whitespace-nowrap", theme === 'dark' ? 'border-transparent hover:bg-white/5 text-z-secondary' : 'border-transparent hover:bg-black/5 text-z-secondary')}
                  style={{ ...(isActive ? activeLink(true) : {}), borderRadius: preset.borderRadius === 'sm' ? '2px' : preset.borderRadius === 'md' ? '4px' : preset.borderRadius === 'lg' ? '6px' : '0px' }}>
                  <Icon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-4 pl-4 border-l border-white/5 h-full">
            <GlobalSearch />
            <div className={cn("hidden lg:flex items-center gap-2 px-2 py-1 border", envConfig.bg, envConfig.border)}>
               <div className={cn("w-1.5 h-1.5 animate-pulse", envConfig.dot, envConfig.shadow)} />
               <span className={cn("text-[8px] font-black uppercase tracking-widest", envConfig.text)}>{envMode}</span>
            </div>
            <Link to="/settings" className="p-1.5 hover:bg-white/10 text-z-secondary transition-all"><Settings size={14} /></Link>
            <button onClick={toggleTheme} className="p-1.5 hover:bg-white/10 text-z-secondary transition-all">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
            <button onClick={logout} className="p-1.5 hover:bg-red-500/20 text-red-400 transition-all ml-2 border border-red-500/20"><LogOut size={14} /></button>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-auto" style={{ background: 'var(--z-bg-base)' }}>
          {children || <Outlet />}
        </main>
      </div>
    )
  }

 return (
 <div
  className="flex h-full w-full font-sans"
  style={{ background: 'var(--z-bg-base)', color: 'var(--z-text-primary)' }}
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

 {/* 🛡️ Compact Sidebar */}
 <motion.aside
 initial={false}
 animate={{ 
 width: isMobile ? 220 : (isSidebarOpen ? 220 : 70),
 x: isMobile ? (isSidebarOpen ? 0 : -220) : 0
 }}
 transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
  className={cn(
  'h-full flex-shrink-0 flex flex-col z-50',
  isMobile ? 'fixed inset-y-0 left-0 shadow-2xl' : 'relative'
  )}
  style={{ background: 'var(--z-bg-sidebar)', borderRight: '1px solid var(--z-border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
 >
 {/* Workspace */}
 <div className="h-20 flex items-center justify-between px-6 border-b border-white/[0.03]">
  <div className="flex items-center gap-3 min-w-0">
  <div
  className={cn(
  'w-9 h-9 flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden font-black text-sm',
  )}
  style={{ background: preset.logoIconBg, color: preset.logoIconText }}
  >
  {brand.logoUrl
    ? <img src={brand.logoUrl} alt={brand.appName} className="w-full h-full object-contain" />
    : <Logo size="sm" />}
  {/* SYSTEM PULSE */}
  <motion.div
  animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
  className="absolute inset-0 bg-gray-500/20"
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
  <span className="text-lg font-black tracking-tight uppercase leading-none">
  {brand.appName || 'Zenith'}
  </span>
  <div className="w-1 h-1 bg-gray-500 animate-pulse" />
  </div>
  <span className="text-[10px] font-black text-gray-600 dark:text-z-secondary uppercase tracking-wider leading-none mt-1.5">
  {brand.appTagline || 'v1.0 Beta'}
  </span>
  </motion.div>
  )}
  </AnimatePresence>
  </div>
 </div>

 {/* Active Site Workspace Indicator / Switcher */}
 <SiteSelector isSidebarOpen={isSidebarOpen} />

 {/* Navigation Core */}
 <div className="flex-1 overflow-y-auto py-8 px-4 space-y-10">
 <nav className="space-y-1.5">
 {(() => {
 const visibleItems = isCustomizing ? navItems : navItems.filter((n) => n.visible)
 return (
 <div>
 <div className="px-3 mb-4 flex items-center justify-between">
 {isSidebarOpen && (
 <span className="text-[10px] font-black text-z-secondary uppercase tracking-wider leading-none">
 Navigation
 </span>
 )}
 <div className="flex items-center gap-1">
 <button
 onClick={() => setIsCustomizing(!isCustomizing)}
 className={cn(
 'p-1 border rounded-none-none transition-all',
 isCustomizing
 ? 'bg-gray-500/20 border-gray-500/40 text-gray-600 dark:text-z-muted'
 : 'border-transparent text-z-secondary hover:text-gray-300'
 )}
 title={isCustomizing ? 'Done' : 'Customize'}
 >
 <Settings size={10} />
 </button>
 <Command size={10} className="text-z-secondary" />
 </div>
 </div>

 {isCustomizing ? (
 <Reorder.Group axis="y" values={visibleItems} onReorder={reorderSidebar} className="space-y-0.5">
 {visibleItems.map((item) => {
 const Icon = item.icon
 return (
 <Reorder.Item
 key={item.name}
 value={item}
 as="div"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none-none border group cursor-grab active:cursor-grabbing',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:bg-z-hover'
 : 'border-z-border shadow-sm text-z-secondary hover:bg-gray-50'
 )}
 >
 <GripVertical size={12} className="text-z-secondary shrink-0" />
 <Icon size={16} strokeWidth={1.5} className="shrink-0" />
 {isSidebarOpen && (
 <span className="flex-1 text-[12px] font-black uppercase tracking-wide leading-none truncate">
 {item.name}
 </span>
 )}
 <button
 onClick={(e) => { e.stopPropagation(); toggleItemVisibility(item.name) }}
 className="p-1 hover:text-gray-100 transition-colors shrink-0"
 title={item.visible ? 'Hide' : 'Show'}
 >
 {item.visible ? <Eye size={10} /> : <EyeOff size={10} className="text-gray-600" />}
 </button>
 </Reorder.Item>
 )
 })}
 </Reorder.Group>
 ) : (
 <div className="space-y-0.5">
 {visibleItems.map((item) => {
 const isActive = location.pathname === item.path
 const Icon = item.icon
 return (
 <Link
 key={item.name}
 to={item.path}
 style={activeLink(isActive)}
 className={cn(navBase(theme === 'dark'))}
 >
 <Icon
 size={16}
 strokeWidth={isActive ? 3 : 1.5}
 className={cn(
 'transition-transform relative z-10',
 isActive ? 'scale-110' : 'group-hover:scale-110'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-wide relative z-10 leading-none truncate">
 {item.name}
 </span>
 )}
 {isActive && !isSidebarOpen && (
 <motion.div
 layoutId="nav-glow-mini"
 style={{ background: preset.activeText }}
 className="absolute left-0 w-1 h-4"
 />
 )}
 </Link>
 )
 })}
 </div>
 )}
 </div>
 )
 })()}
 </nav>

 <nav className="space-y-1.5 pt-4 border-t border-white/[0.03]">
  <div className="px-3 mb-2 flex items-center justify-end">
  <ShieldCheck size={10} className="text-gray-600 dark:text-z-secondary opacity-50" />
  </div>

 <div className="space-y-0.5">
 {globals.map((global) => {
 const isActive = location.pathname.startsWith(`/globals/${global.slug}`)
 return (
 <Link
 key={global.slug}
 to={`/globals/${global.slug}`}
 style={activeLink(isActive)}
 className={cn(navBase(theme === 'dark'), theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm')}
 >
 <div className={cn(dotBase, 'shadow-[0_0_6px_currentColor]')} style={isActive ? activeDot(true) : {}} />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-widest truncate">
 {global.name.replace(/-/g, ' ').replace(/_/g, ' ')}
 </span>
 )}
 </Link>
 )
 })}
 </div>
 </nav>

 <nav className="space-y-1.5">
  <div className="px-3 mb-2 flex items-center justify-end">
  <Database size={10} className="text-z-secondary opacity-50" />
  </div>

 <div className="space-y-0.5">
 {collections.map((col) => {
 const isActive = location.pathname.startsWith(`/collections/${col.slug}`)
 return (
 <Link
 key={col.slug}
 to={`/collections/${col.slug}`}
 style={activeLink(isActive)}
 className={cn(navBase(theme === 'dark'), theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm', 'overflow-hidden')}
 >
 <div className={cn(dotBase, isActive ? 'scale-110 shadow-[0_0_6px_currentColor]' : 'bg-gray-700/40 group-hover:bg-gray-500')} style={activeDot(isActive)} />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
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
  <div className="px-3 mb-2 flex items-center justify-end">
  <Settings size={10} className="text-z-secondary opacity-50" />
  </div>

 <div className="space-y-0.5">
  {[
  { to: '/audit-log', label: 'Audit Logs' },
  { to: '/schema-builder', label: 'Schema Builder' },
  { to: '/block-builder', label: 'Block Builder' },
  { to: '/component-builder', label: 'Component Builder' },
  { to: '/redirects', label: 'Redirects' },
  { to: '/trash', label: 'Trash' },
  { to: '/system', label: 'System Health' },
  ].map(({ to, label }) => {
  const isActive = location.pathname === to
  return (
  <Link key={to} to={to}
  style={activeLink(isActive)}
  className={cn(navBase(theme === 'dark'), theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm', 'overflow-hidden')}
  >
  <div className={cn(dotBase, isActive ? 'scale-110 shadow-[0_0_6px_currentColor]' : 'bg-gray-700/40 group-hover:bg-gray-500')} style={activeDot(isActive)} />
  {isSidebarOpen && <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">{label}</span>}
  </Link>
  )
  })}
  </div>
 </nav>
 </div>

 {/* Footer */}
 <div className="p-4 border-t border-white/[0.03] bg-black/[0.02]">
 <button
 onClick={logout}
 className={cn(
 'w-full flex items-center justify-center gap-4 py-3.5 rounded-none-none transition-all group border border-transparent hover:border-red-500/20',
 theme === 'dark'
 ? 'bg-red-500/5 text-red-400 hover:bg-red-500/10'
 : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
 )}
 >
 <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
 {isSidebarOpen && (
 <span className="text-[10px] font-black uppercase tracking-wider ">
 Logout
 </span>
 )}
 </button>
 </div>
 </motion.aside>

 {/* 🚀 Dynamic Main Node */}
  <main
  className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden"
  style={{ background: 'var(--z-bg-base)' }}
 >
  <div className="flex-1 flex flex-col overflow-hidden">
  <header
  className="h-20 flex items-center justify-between px-4 md:px-8 z-40 shrink-0"
  style={{ background: 'var(--z-bg-header)', borderBottom: '1px solid var(--z-border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
 >
  <div className="flex items-center gap-4">
  <button
  onClick={() => setSidebarOpen(!isSidebarOpen)}
  title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
  className="p-2 transition-all"
  style={{ background: 'var(--z-bg-hover)', border: '1px solid var(--z-border)', color: 'var(--z-text-secondary)' }}
  >
  {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
  </button>
  <GlobalSearch />
  </div>

  <div className="flex items-center gap-5">
  {/* Tactical Clock */}
  <div className="hidden lg:flex flex-col items-end mr-4">
  <LiveClock />
  <span className="text-[7px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--z-text-muted)' }}>
  UTC
  </span>
  </div>

  <div className={cn("flex items-center gap-2 px-3 py-1.5 border", envConfig.bg, envConfig.border)}>
  <div className={cn("w-1 h-1 animate-pulse", envConfig.dot, envConfig.shadow)} />
  <span className={cn("text-[8px] font-black uppercase tracking-widest", envConfig.text)}>{envMode}</span>
  </div>

  <Link to="/settings" title="System Settings"
  className="p-2 transition-all" style={{ background: 'var(--z-bg-hover)', border: '1px solid var(--z-border)', color: 'var(--z-text-secondary)' }}>
  <Settings size={16} />
  </Link>

  <button onClick={toggleTheme} title="Light/Dark"
  className="p-2 transition-all" style={{ background: 'var(--z-bg-hover)', border: '1px solid var(--z-border)', color: theme === 'dark' ? '#fbbf24' : 'var(--z-text-secondary)' }}>
  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
  </button>
  </div>
 </header>

 {children || <Outlet />}
 </div>
 </main>
 </div>
 )
}

export default DashboardLayout
