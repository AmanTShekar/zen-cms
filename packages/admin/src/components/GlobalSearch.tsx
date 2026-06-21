import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
 Search,
 X,
 FileText,
 Database,
 Settings,
 Zap,
 Clock,
 Layout,
 Shield,
 Mail,
 Key,
 Sparkles,
 Palette,
 Users,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'

const GlobalSearch: React.FC = () => {
 const navigate = useNavigate()
 const [query, setQuery] = useState('')
 const [isFocused, setIsFocused] = useState(false)
 const [results, setResults] = useState<any[]>([])
 const [isSearching, setIsSearching] = useState(false)
 const containerRef = useRef<HTMLDivElement>(null)

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setIsFocused(false)
 }
 }
 document.addEventListener('mousedown', handleClickOutside)
 return () => document.removeEventListener('mousedown', handleClickOutside)
 }, [])

 useEffect(() => {
 const delayDebounceFn = setTimeout(async () => {
 if (query.length >= 2) {
 setIsSearching(true)
 try {
 const res = await api.get(`/system/search?q=${encodeURIComponent(query)}`)
 setResults(res.data.data)
 } catch {
 console.error('Search failed')
 setResults([])
 } finally {
 setIsSearching(false)
 }
 } else {
 setResults([])
 }
 }, 300)

 return () => clearTimeout(delayDebounceFn)
 }, [query])

 const highlightMatch = (text: string, match: string) => {
 if (!match || !text) return text || ''
 const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
 const parts = text.split(new RegExp(`(${escapedMatch})`, 'gi'))
 return parts.map((part, i) =>
 part.toLowerCase() === match.toLowerCase() ? (
 <span
 key={i}
 className="text-gray-600 dark:text-z-secondary font-semibold underline decoration-2 underline-offset-2"
 >
 {part}
 </span>
 ) : (
 part
 )
 )
 }

 const handleSelect = (path: string) => {
 navigate(path)
 setIsFocused(false)
 setQuery('')
 }

 const commands = useMemo(() => [
 { label: 'Dashboard', path: '/', icon: Layout, sub: 'System Overview' },
 { label: 'General Settings', path: '/settings?tab=general', icon: Settings, sub: 'Site Name, URL, Maintenance' },
 { label: 'Maintenance Mode', path: '/settings?tab=general', icon: Zap, sub: 'Protocol Override' },
 { label: 'Security Protocols', path: '/settings?tab=security', icon: Shield, sub: 'Session Lifespan & Auth' },
 { label: 'SMTP Relay', path: '/settings?tab=notifications', icon: Mail, sub: 'Email Configuration' },
 { label: 'Operator Registry', path: '/settings?tab=users', icon: Users, sub: 'User Management' },
 { label: 'API Credentials', path: '/settings?tab=keys', icon: Key, sub: 'Access Tokens' },
 { label: 'Infrastructure Stats', path: '/settings?tab=database', icon: Database, sub: 'DB Health & Cache' },
 { label: 'AI Intelligence', path: '/settings?tab=ai', icon: Sparkles, sub: 'Neural Bridge Config' },
 { label: 'Custom Styles', path: '/settings?tab=appearance', icon: Palette, sub: 'CSS Overrides' },
 { label: 'Audit Logs', path: '/audit-logs', icon: Clock, sub: 'Security Events' },
 { label: 'Plugin Marketplace', path: '/plugins', icon: Zap, sub: 'Modular Extensions' },
 ], [])

 const filteredCommands = useMemo(
 () => commands.filter(
 (cmd) =>
 cmd.label.toLowerCase().includes(query.toLowerCase()) ||
 cmd.sub.toLowerCase().includes(query.toLowerCase())
 ),
 [commands, query]
 )

 return (
  <div ref={containerRef} className="relative z-[100]">
  <motion.div
  animate={{ width: isFocused ? 360 : 280 }}
  className={cn(
  'flex items-center gap-2 px-4 py-2.5 rounded-none-none transition-all border',
  isFocused
  ? 'bg-white border-gray-500 text-z-primary shadow-md ring-4 ring-gray-500/10 dark:bg-black dark:border-gray-500 dark:text-gray-100 dark:ring-gray-500/20'
  : 'bg-z-panel border-z-border text-gray-600 hover:bg-gray-50 shadow-sm dark:bg-black/50 dark:border-z-border dark:text-z-muted dark:hover:bg-z-hover'
  )}
  >
  <Search
  size={16}
  className={cn('transition-colors', isFocused ? 'text-gray-600 dark:text-z-secondary' : 'text-z-muted dark:text-z-secondary')}
  />
  <input
  type="text"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onFocus={() => setIsFocused(true)}
  placeholder="SEARCH SYSTEM..."
  className="bg-transparent border-none text-sm font-semibold flex-1 placeholder:text-z-muted dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 rounded-none-none px-1"
  />
  {query && (
  <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-none-none transition-colors">
  <X size={14} className="text-z-secondary" />
  </button>
  )}
  {!isFocused && !query && (
  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-none-none border border-z-border dark:border-z-border bg-gray-50 dark:bg-black/40 text-sm font-semibold text-z-secondary dark:text-z-secondary">
  <span>⌘</span>
  <span>K</span>
  </div>
  )}
  </motion.div>

  <AnimatePresence>
  {isFocused && (query.length > 0 || results.length > 0) && (
  <motion.div
  initial={{ opacity: 0, y: 10, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 10, scale: 0.98 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  className="absolute top-full left-0 right-0 mt-3 bg-white border border-z-border dark:bg-[#0a0a0a] dark:border-z-border rounded-none-none shadow-2xl overflow-hidden flex flex-col text-z-primary dark:text-gray-100"
  >
  <div className="max-h-[400px] overflow-y-auto p-2">
  {results.length > 0 && (
  <div className="space-y-0.5 mb-2">
  <div className="px-3 py-2 text-sm font-semibold text-z-muted dark:text-z-secondary">
  Database Nodes
  </div>
  {results.map((res: any) => (
  <button
  key={res.id}
  onClick={() => handleSelect(`/collections/${res.collection}/${res.id}`)}
  className="w-full flex items-center gap-3 p-2.5 rounded-none-none hover:bg-gray-50 dark:hover:bg-z-hover transition-all text-left group"
  >
  <div className="w-8 h-8 rounded-none-none bg-gray-50 dark:bg-gray-500/10 flex items-center justify-center text-gray-600 dark:text-z-secondary flex-shrink-0 border border-z-border dark:border-gray-500/20 group-hover:scale-105 transition-transform">
  <FileText size={14} />
  </div>
  <div className="flex flex-col min-w-0">
  <span className="text-sm font-semibold truncate text-z-primary dark:text-gray-100">
  {highlightMatch(res.title, query)}
  </span>
  <span className="text-sm font-bold text-z-muted dark:text-z-secondary">
  {res.collectionLabel}
  </span>
  </div>
  </button>
  ))}
  </div>
  )}

  {/* System Protocols & Settings Deep Search */}
  <div className="pt-2 border-t border-z-border dark:border-white/[0.05] space-y-0.5">
  <div className="px-3 py-2 text-sm font-semibold text-z-muted dark:text-z-secondary">
  System Protocols
  </div>
  {(() => {
  if (
  results.length === 0 &&
  filteredCommands.length === 0 &&
  query.length >= 2 &&
  !isSearching
  ) {
  return (
  <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
  <Search size={20} className="text-gray-300 dark:text-gray-700" />
  <span className="text-sm font-semibold text-z-muted dark:text-gray-600">
  No matching records found
  </span>
  </div>
  )
  }

  return filteredCommands.map((cmd) => (
  <button
  key={cmd.label}
  onClick={() => handleSelect(cmd.path)}
  className="w-full flex items-center gap-3 p-2.5 rounded-none-none hover:bg-gray-50 dark:hover:bg-z-hover transition-all text-left group"
  >
  <div className="w-8 h-8 rounded-none-none bg-gray-100 dark:bg-z-hover flex items-center justify-center text-z-secondary dark:text-z-muted flex-shrink-0 group-hover:bg-gray-500 group-hover:text-white dark:group-hover:bg-gray-500 dark:group-hover:text-white transition-all group-hover:scale-105 border border-transparent dark:border-white/[0.05]">
  <cmd.icon size={14} />
  </div>
  <div className="flex flex-col min-w-0">
  <span className="text-sm font-semibold truncate text-z-primary dark:text-gray-100">
  {highlightMatch(cmd.label, query)}
  </span>
  <span className="text-sm font-bold text-z-muted dark:text-z-secondary truncate">
  {highlightMatch(cmd.sub, query)}
  </span>
  </div>
  </button>
  ))
  })()}
  </div>
  </div>

  <div className="px-4 py-2.5 bg-gray-50 dark:bg-black border-t border-z-border dark:border-z-border flex items-center justify-between">
  <span className="text-sm font-semibold text-z-secondary dark:text-z-secondary">
  Core_Intelligence_Stream
  </span>
  <div className="flex items-center gap-2">
  <div className="w-1.5 h-1.5 bg-gray-500 rounded-none-none animate-pulse shadow-sm" />
  <span className="text-sm font-semibold text-gray-600 dark:text-z-secondary">
  Sync_Active
  </span>
  </div>
  </div>
  </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default GlobalSearch
