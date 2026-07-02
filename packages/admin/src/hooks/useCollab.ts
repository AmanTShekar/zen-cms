import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'

export interface CollabUser {
 id: string
 email: string
 name?: string
 color: string
 cursor?: { sectionId?: string; fieldKey?: string }
}

const YJS_COLORS = [
 'var(--z-accent)', // indigo
 'var(--z-accent)', // violet
 '#ec4899', // pink
 '#f43f5e', // rose
 '#f97316', // orange
 '#84cc16', // lime
 '#14b8a6', // teal
 '#06b6d4', // cyan
 '#3b82f6', // blue
 '#a855f7', // gray
]

function colorForId(id: string): string {
 let hash = 0
 for (let i = 0; i < id.length; i++) {
 hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
 }
 return YJS_COLORS[hash % YJS_COLORS.length]
}

function initials(name?: string, email?: string): string {
 if (name) return name.slice(0, 2).toUpperCase()
 if (email) return email.slice(0, 2).toUpperCase()
 return '??'
}

interface UseCollabOptions {
 collection: string
 documentId: string
 /** Y.js WebSocket server URL. If omitted, falls back to presence-polling only. */
 wsUrl?: string
 /** How often to poll presence (ms). Only used when wsUrl is not set. */
 pollInterval?: number
 enabled?: boolean
}

interface UseCollabReturn {
 /** Connected collab users (from awareness / presence) */
 collabUsers: CollabUser[]
 /** Your own local user */
 localUser: CollabUser
 /** Y.Doc instance (deprecated from core, returns null) */
 doc: any | null
 /** Whether Y.js WebSocket is connected (always false in core) */
 isConnected: boolean
 /** Broadcast a field-level cursor position to other users */
 broadcastCursor: (sectionId?: string, fieldKey?: string) => void
}

/**
 * Zenith Collaborative Editing Hook
 * ─────────────────────────────────
 * Provides Y.js backed document + awareness (live cursors / user presence).
 *
 * Falls back to HTTP polling of /api/v1/presence when wsUrl is not set,
 * so it works out-of-the-box without a dedicated collab server.
 *
 * To enable full real-time sync, point wsUrl at a y-websocket or Hocuspocus
 * server running at /collaboration (see vite.config.ts proxy).
 */
export function useCollab({
 collection,
 documentId,
 wsUrl,
 pollInterval = 15000,
 enabled = true,
}: UseCollabOptions): UseCollabReturn {
 const { user  } = useAuthStore(useShallow(state => ({ user: state.user })))
 const [collabUsers, setCollabUsers] = useState<CollabUser[]>([])
 const [isConnected] = useState(false)
 const [doc] = useState<any | null>(null)

 const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

 const localUser: CollabUser = {
 id: user?.id || 'local',
 email: user?.email || 'local@example.com',
 name: user?.name,
 color: colorForId(user?.id || 'local'),
 }

 // ── Polling fallback (no WebSocket required) ─────────────────────────────────
 useEffect(() => {
 if (!enabled) return

 const fetchPresence = async () => {
 try {
 // Use heartbeat + list API to get active users
 // First send heartbeat so we're counted, then list
 await api.post('/presence/heartbeat', {
 collection,
 documentId,
 userId: user?.id,
 }).catch(() => {})

 const res = await api.get(`/presence/${collection}/${documentId}`, {
 params: { collection, documentId },
 }).catch(() => ({ data: { data: { activeUsers: [] } } }))

 const raw = res.data?.data?.activeUsers || []
 const mapped: CollabUser[] = raw.map((u: { id?: string; userId?: string; email?: string; name?: string }) => ({
 id: u.id || u.userId || '?',
 email: u.email || '?',
 name: u.name,
 color: colorForId(u.id || u.userId || ''),
 }))
 setCollabUsers(mapped)
 } catch { /* ignore */ }
 }

 fetchPresence()
 pollTimerRef.current = setInterval(fetchPresence, pollInterval)

 return () => {
 if (pollTimerRef.current) clearInterval(pollTimerRef.current)
 }
 }, [wsUrl, isConnected, collection, documentId, pollInterval, enabled, user])

 // ── Broadcast cursor ────────────────────────────────────────────────────────
 const broadcastCursor = useCallback((sectionId?: string, fieldKey?: string) => {
  // Cursor broadcasting requires the multiplayer plugin
 }, [])

 return {
 collabUsers,
 localUser,
 doc,
 isConnected,
 broadcastCursor,
 }
}

export { colorForId, initials }
