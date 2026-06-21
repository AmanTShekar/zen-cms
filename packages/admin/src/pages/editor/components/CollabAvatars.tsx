import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, Circle } from 'lucide-react'
import type { CollabUser } from '../../../hooks/useCollab'
import { initials } from '../../../hooks/useCollab'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'

interface CollabAvatarsProps {
 users: CollabUser[]
 localUser: CollabUser
 isConnected: boolean
 theme: 'light' | 'dark'
}

const MAX_SHOWN = 5

export const CollabAvatars: React.FC<CollabAvatarsProps> = ({
 users,
 localUser,
 isConnected,
 theme,
}) => {
 const [expanded, setExpanded] = useState(false)

 const visibleUsers = users.slice(0, MAX_SHOWN)
 const overflowCount = Math.max(0, users.length - MAX_SHOWN)

 const userColors: Record<string, string> = {}
 users.forEach((u) => { userColors[u.id] = u.color })

 return (
 <div className="relative flex items-center gap-0">
 {/* Connection badge */}
 <div
 className={cn(
 'flex items-center gap-1 px-2 py-1 rounded-none-none border text-sm font-semibold  ',
 isConnected
 ? theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-z-muted'
 : 'bg-z-input border-z-border text-gray-600'
 : theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-secondary'
 : 'bg-gray-100 border-z-border text-z-muted'
 )}
 title={isConnected ? 'Live collaboration active' : 'Offline — changes saved locally'}
 >
 {isConnected ? <Wifi size={8} /> : <WifiOff size={8} />}
 {isConnected ? 'Live' : 'Local'}
 </div>

 {/* Avatar stack */}
 <div className="flex items-center ml-1.5">
 {/* Local user is always first */}
 <div
 className="relative"
 title={`${localUser.name || localUser.email} (you)`}
 >
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className={cn(
 'w-6 h-6 rounded-none-none flex items-center justify-center text-sm font-semibold border-2 border-z-border shadow-sm',
 )}
 style={{ backgroundColor: localUser.color }}
 >
 {initials(localUser.name, localUser.email)}
 </motion.div>
 <motion.div
 animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute -bottom-0.5 -right-0.5"
 >
 <Circle
 size={6}
 fill={localUser.color}
 stroke="none"
 className="text-gray-600 dark:text-z-muted"
 />
 </motion.div>
 </div>

 {/* Other user avatars */}
 {visibleUsers
 .filter((u) => u.id !== localUser.id)
 .map((u, idx) => (
 <motion.div
 key={u.id}
 initial={{ scale: 0, x: -10 }}
 animate={{ scale: 1, x: 0 }}
 transition={{ delay: idx * 0.05 }}
 className={cn(
 'relative -ml-1.5 w-6 h-6 rounded-none-none flex items-center justify-center text-sm font-semibold border-2 shadow-sm',
 )}
 style={{
 backgroundColor: u.color,
 borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
 zIndex: visibleUsers.length - idx,
 }}
 title={u.name || u.email}
 >
 {initials(u.name, u.email)}
 </motion.div>
 ))}

 {/* Overflow count */}
 {overflowCount > 0 && (
 <motion.button
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 onClick={() => setExpanded((v) => !v)}
 aria-label={`${overflowCount} more users editing`}
 className={cn(
 'relative -ml-1.5 w-6 h-6 rounded-none-none flex items-center justify-center text-sm font-semibold border-2 shadow-sm transition-transform',
 theme === 'dark'
 ? 'bg-gray-800 border-z-border text-z-muted hover:scale-110'
 : 'bg-gray-200 border-white text-gray-600 hover:scale-110'
 )}
 style={{ zIndex: 0 }}
 >
 +{overflowCount}
 </motion.button>
 )}
 </div>

 {/* Expanded tooltip */}
 <AnimatePresence>
 {expanded && (
 <motion.div
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -4 }}
 transition={{ duration: 0.1 }}
 className={cn(
 'absolute top-full right-0 mt-2 z-50 w-48 border rounded-none-none shadow-2xl p-3',
 theme === 'dark'
 ? 'bg-black border-z-border text-white'
 : 'bg-z-panel border-z-border text-z-primary shadow-sm/50'
 )}
 onClick={() => setExpanded(false)}
 >
 <p className="text-xs font-semibold text-z-secondary mb-2">
 {users.length} {users.length === 1 ? 'person' : 'people'} editing
 </p>
 <div className="space-y-1.5">
 {[localUser, ...users.filter((u) => u.id !== localUser.id)].map((u) => (
 <div key={u.id} className="flex items-center gap-2">
 <div
 className="w-5 h-5 rounded-none-none flex items-center justify-center text-xs font-semibold text-white shrink-0"
 style={{ backgroundColor: u.color }}
 >
 {initials(u.name, u.email)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold truncate">{u.name || u.email}</p>
 {u.cursor?.fieldKey && (
 <p className="text-xs text-z-secondary truncate">
 → {u.cursor.fieldKey}
 </p>
 )}
 </div>
 {u.id === localUser.id && (
 <span className="text-xs text-z-secondary">you</span>
 )}
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default CollabAvatars
