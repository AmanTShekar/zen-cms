import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

export interface CollabUser {
  id: string
  email: string
  name?: string
  color: string
  cursor?: { sectionId?: string; fieldKey?: string }
}

const YJS_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
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
  /** Y.Doc instance — attached when wsUrl is provided */
  doc: Y.Doc | null
  /** Whether Y.js WebSocket is connected */
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
  const { user } = useAuthStore()
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [doc, setDoc] = useState<Y.Doc | null>(null)

  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const localUser: CollabUser = {
    id: user?.id || 'local',
    email: user?.email || 'local@example.com',
    name: user?.name,
    color: colorForId(user?.id || 'local'),
  }

  // ── Y.js setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wsUrl || !enabled) {
      docRef.current = null
      setDoc(null)
      return
    }

    const newDoc = new Y.Doc()
    docRef.current = newDoc
    setDoc(newDoc)

    const provider = new WebsocketProvider(wsUrl, `${collection}:${documentId}`, newDoc, {
      connect: true,
    })
    providerRef.current = provider

    provider.on('status', ({ status }: { status: string }) => {
      setIsConnected(status === 'connected')
    })

    // Presence / awareness — broadcast local user info
    const awareness = provider.awareness
    awareness.setLocalStateField('user', {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      color: localUser.color,
      cursor: null,
    })

    // Sync collab users from awareness
    const updateUsers = () => {
      const states = awareness.getStates()
      const users: CollabUser[] = []
      states.forEach((state) => {
        if (state.user) {
          users.push({
            id: state.user.id,
            email: state.user.email,
            name: state.user.name,
            color: state.user.color || colorForId(state.user.id),
            cursor: state.user.cursor,
          })
        }
      })
      setCollabUsers(users)
    }

    awareness.on('change', updateUsers)
    updateUsers()

    return () => {
      awareness.off('change', updateUsers)
      provider.destroy()
      providerRef.current = null
      docRef.current = null
    }
  }, [wsUrl, collection, documentId, enabled])

  // ── Polling fallback (no WebSocket required) ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    if (wsUrl && isConnected) return

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
    const provider = providerRef.current
    if (!provider) return
    const awareness = provider.awareness
    const current = awareness.getLocalState() as Record<string, any>
    awareness.setLocalStateField('user', {
      ...(current.user || {}),
      cursor: { sectionId, fieldKey },
    })
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