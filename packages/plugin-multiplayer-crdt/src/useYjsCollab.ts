import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface CollabUser {
 id: string
 email: string
 name?: string
 color: string
 cursor?: { sectionId?: string; fieldKey?: string }
}

const YJS_COLORS = [
 'var(--z-accent)', // indigo
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

interface UseYjsCollabOptions {
 collection: string
 documentId: string
 wsUrl: string
 user: any
 enabled?: boolean
}

export function useYjsCollab({ collection, documentId, wsUrl, user, enabled = true }: UseYjsCollabOptions) {
 const [collabUsers, setCollabUsers] = useState<CollabUser[]>([])
 const [isConnected, setIsConnected] = useState(false)
 const [doc, setDoc] = useState<Y.Doc | null>(null)

 const providerRef = useRef<WebsocketProvider | null>(null)

 const localUser: CollabUser = {
 id: user?.id || 'local',
 email: user?.email || 'local@example.com',
 name: user?.name,
 color: colorForId(user?.id || 'local'),
 }

 useEffect(() => {
 if (!wsUrl || !enabled) return

 const newDoc = new Y.Doc()
 setDoc(newDoc)

 const provider = new WebsocketProvider(wsUrl, `${collection}:${documentId}`, newDoc, {
 connect: true,
 })
 providerRef.current = provider

 provider.on('status', ({ status }: { status: string }) => {
 setIsConnected(status === 'connected')
 })

 const awareness = provider.awareness
 awareness.setLocalStateField('user', {
 id: localUser.id,
 email: localUser.email,
 name: localUser.name,
 color: localUser.color,
 cursor: null,
 })

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
 }
 }, [wsUrl, collection, documentId, enabled])

 const broadcastCursor = useCallback((sectionId?: string, fieldKey?: string) => {
 const provider = providerRef.current
 if (!provider) return
 const awareness = provider.awareness
 const current = awareness.getLocalState() as any
 awareness.setLocalStateField('user', {
 ...(current?.user || {}),
 cursor: { sectionId, fieldKey },
 })
 }, [])

 return {
 collabUsers,
 localUser,
 doc,
 isConnected,
 broadcastCursor
 }
}
