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
 const activeSiteName = useTenantStore((state) => state.activeSiteName)
 const activeSiteId = useTenantStore((state) => state.activeSiteId)
 const [isSidebarOpen, setSidebarOpen] = useState(true)
 const [isMobile, setIsMobile] = useState(false)
 const [, setCommandPaletteOpen] = useState(false)

 const envMode = import.meta.env.MODE || 'development'
 let envConfig = {
 bg: 'bg-gray-500/5',
 border: 'border-gray-500/10',
 dot: 'bg-gray-500',
 shadow: 'shadow-[0_0_8px_#6b7280]',
 text: 'text-gray-600 dark:text-gray-500'
 }
 if (envMode === 'development') {
 envConfig = {
 bg: 'bg-emerald-500/5',
 border: 'border-emerald-500/10',
 dot: 'bg-emerald-500',
 shadow: 'shadow-[0_0_8px_#10b981]',
 text: 'text-emerald-600 dark:text-emerald-500'
 }
 } else if (envMode === 'production') {
 envConfig = {
 bg: 'bg-purple-500/5',
 border: 'border-purple-500/10',
 dot: 'bg-purple-500',
 shadow: 'shadow-[0_0_8px_#a855f7]',
 text: 'text-purple-600 dark:text-purple-500'
 }
 } else if (envMode === 'test') {
 envConfig = {
 bg: 'bg-amber-500/5',
 border: 'border-amber-500/10',
 dot: 'bg-amber-500',
 shadow: 'shadow-[0_0_8px_#f59e0b]',
 text: 'text-amber-600 dark:text-amber-500'
 }
 }
 
 // React Query Hook for metadata
 const { data: health, isSuccess } = useSystemMetadata()
 const collections = health?.collections || []
 const globals = health?.globals || []

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

 return (
 <div
 className={cn(
 'flex h-full w-full transition-colors duration-500 font-sans',
 theme === 'dark' ? 'bg-black text-gray-100' : 'bg-[#fafafa] text-gray-900'
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

 {/* 🛡️ Compact Sidebar */}
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
 ? 'bg-black/65 backdrop-blur-xl border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.1)]'
 : 'bg-white/80 backdrop-blur-xl border-gray-200 shadow-sm'
 )}
 >
 {/* Workspace */}
 <div className="h-20 flex items-center justify-between px-6 border-b border-white/[0.03]">
 <div className="flex items-center gap-3 min-w-0">
 <div
 className={cn(
 'w-9 h-9 rounded-none flex items-center justify-center flex-shrink-0 transition-all relative overflow-hidden',
 theme === 'dark' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-600 text-white'
 )}
 >
 <Logo size="sm" />
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
 Zenith
 </span>
 <div className="w-1 h-1 bg-gray-500 rounded-none animate-pulse" />
 </div>
 <span className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-wider leading-none mt-1.5">
 v1.0 Beta
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
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider leading-none">
 Navigation
 </span>
 )}
 <div className="flex items-center gap-1">
 <button
 onClick={() => setIsCustomizing(!isCustomizing)}
 className={cn(
 'p-1 border rounded-none transition-all',
 isCustomizing
 ? 'bg-gray-500/20 border-gray-500/40 text-gray-600 dark:text-gray-400'
 : 'border-transparent text-gray-500 hover:text-gray-300'
 )}
 title={isCustomizing ? 'Done' : 'Customize'}
 >
 <Settings size={10} />
 </button>
 <Command size={10} className="text-gray-500" />
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
 'flex items-center gap-4 px-4 py-3 rounded-none border group cursor-grab active:cursor-grabbing',
 theme === 'dark'
 ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.03]'
 : 'border-gray-200 shadow-sm text-gray-500 hover:bg-gray-50'
 )}
 >
 <GripVertical size={12} className="text-gray-500 shrink-0" />
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
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group relative border',
 isActive
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-500 border-transparent hover:bg-white/[0.03] hover:text-gray-300'
 : 'text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-900'
 )}
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
 className="absolute left-0 w-1 h-4 bg-emerald-500 rounded-none shadow-[0_0_10px_rgba(16,185,129,0.5)]"
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
 <div className="px-3 mb-4 flex items-center justify-between">
 {isSidebarOpen && (
 <span className="text-[12px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-wider leading-none">
 Global Settings
 </span>
 )}
 <ShieldCheck size={10} className="text-gray-600 dark:text-gray-500" />
 </div>

 <div className="space-y-0.5">
 {globals.map((global) => {
 const isActive = location.pathname.startsWith(`/globals/${global.slug}`)
 return (
 <Link
 key={global.slug}
 to={`/globals/${global.slug}`}
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all duration-300 group relative border',
 isActive
 ? theme === 'dark'
 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-500 border-white/[0.08] hover:bg-white/[0.03] hover:text-gray-300'
 : 'text-gray-500 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all shadow-[0_0_10px_currentColor]',
 isActive
 ? theme === 'dark'
 ? 'bg-emerald-400'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
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
 <div className="px-3 mb-4 flex items-center justify-between">
 {isSidebarOpen && (
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider leading-none">
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
 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-400 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 isActive
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
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
 <div className="px-3 mb-4 flex items-center justify-between">
 {isSidebarOpen && (
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider leading-none">
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
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/audit-log'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Audit Logs
 </span>
 )}
 </Link>

 <Link
 to="/schema-builder"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/schema-builder'
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/schema-builder'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Schema Builder
 </span>
 )}
 </Link>

 <Link
 to="/block-builder"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/block-builder'
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/block-builder'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Block Builder
 </span>
 )}
 </Link>

 <Link
 to="/component-builder"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/component-builder'
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/component-builder'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Component Builder
 </span>
 )}
 </Link>

 <Link
 to="/collections/members"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname.startsWith('/collections/members')
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname.startsWith('/collections/members')
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Members
 </span>
 )}
 </Link>

 <Link
 to="/redirects"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/redirects'
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/redirects'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Redirects
 </span>
 )}
 </Link>

 <Link
 to="/trash"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/trash'
 ? theme === 'dark'
 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/trash'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
 Trash
 </span>
 )}
 </Link>

 <Link
 to="/system"
 className={cn(
 'flex items-center gap-4 px-4 py-3 rounded-none transition-all group border relative overflow-hidden',
 location.pathname === '/system'
 ? theme === 'dark'
 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
 : 'bg-emerald-50 border-emerald-500/20 text-emerald-700 shadow-sm'
 : theme === 'dark'
 ? 'text-gray-450 border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-100'
 : 'text-gray-600 border-gray-200 shadow-sm hover:bg-gray-100 hover:text-gray-900'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-none transition-all flex-shrink-0 shadow-[0_0_10px_currentColor]',
 location.pathname === '/system'
 ? theme === 'dark'
 ? 'bg-emerald-400 scale-110'
 : 'bg-emerald-500'
 : 'bg-gray-700/40 group-hover:bg-gray-500'
 )}
 />
 {isSidebarOpen && (
 <span className="text-[12px] font-black uppercase tracking-tight leading-none truncate">
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
 <span className="text-[10px] font-black uppercase tracking-wider ">
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
 theme === 'dark' ? 'bg-[#050505]' : 'bg-[#f4f4f5]'
 )}
 >
 <div className="flex-1 flex flex-col overflow-hidden">
 <header
 className={cn(
 'h-20 flex items-center justify-between px-4 md:px-8 border-b z-40 transition-colors duration-500 backdrop-blur-xl shrink-0',
 theme === 'dark' ? 'bg-black/65 border-white/[0.08]' : 'bg-white/80 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4">
 <button
 onClick={() => setSidebarOpen(!isSidebarOpen)}
 title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
 className={cn(
 'p-2 rounded-none transition-all border',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-gray-50 border-gray-200 shadow-sm text-gray-400'
 )}
 >
 {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
 </button>
 <GlobalSearch />
 </div>

 <div className="flex items-center gap-5">
 {/* Tactical Clock */}
 <div className="hidden lg:flex flex-col items-end mr-4">
 <LiveClock />
 <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
 UTC
 </span>
 </div>

 <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-none border", envConfig.bg, envConfig.border)}>
 <div className={cn("w-1 h-1 rounded-none animate-pulse", envConfig.dot, envConfig.shadow)} />
 <span className={cn("text-[8px] font-black uppercase tracking-widest", envConfig.text)}>
 {envMode}
 </span>
 </div>

 <Link
 to="/settings"
 title="System Settings"
 className={cn(
 'p-2 rounded-none border transition-all',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-gray-50 border-gray-200 shadow-sm text-gray-600'
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
 ? 'bg-white/5 border-white/[0.08] text-amber-400'
 : 'bg-gray-50 border-gray-200 shadow-sm text-gray-600'
 )}
 >
 {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
 </button>

 <div className="flex items-center gap-3 group cursor-pointer" title="User Profile">
 <div className="flex flex-col items-end">
 <span className="text-[9px] font-black uppercase leading-none">
 {user?.name || 'Operator'}
 </span>
 <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
 Admin
 </span>
 </div>
 <div
 className={cn(
 'w-8 h-8 rounded-none flex items-center justify-center text-[10px] font-black shadow-xl transition-all',
 theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-gray-100'
 )}
 >
 {(user?.name || 'A')[0].toUpperCase()}
 </div>
 </div>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto scroll-smooth p-6 md:p-10">
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
 <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">
 Maintenance Mode Active
 </span>
 <span className="text-[8px] font-bold opacity-80 uppercase tracking-widest leading-none">
 External handshakes are currently throttled for database optimization.
 </span>
 </div>
 </div>
 <Link
 to="/settings"
 className="px-4 py-2 bg-black text-gray-100 text-[8px] font-black uppercase tracking-widest hover:bg-black/80 transition-all"
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
