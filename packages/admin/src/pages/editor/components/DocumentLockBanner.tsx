import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Lock, Unlock, RefreshCw } from 'lucide-react'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

interface LockState {
  locked: boolean
  lockedBy: string | null
  lockedByEmail: string | null
  lockedAt: string | null
  lockExpiresAt: string | null
  isOwner: boolean
}

interface DocumentLockBannerProps {
  collection: string
  documentId: string
  theme: 'light' | 'dark'
}

const HEARTBEAT_INTERVAL = 60_000 // 1 minute

export const DocumentLockBanner: React.FC<DocumentLockBannerProps> = ({
  collection,
  documentId,
  theme,
}) => {
  const [lockState, setLockState] = useState<LockState | null>(null)
  const [loading, setLoading] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const acquiringRef = useRef(false)
  const lockStateRef = useRef<LockState | null>(null)

  // Keep lockStateRef up to date to prevent stale closures in cleanup
  useEffect(() => {
    lockStateRef.current = lockState
  }, [lockState])

  const fetchLockStatus = useCallback(async () => {
    if (!documentId) return
    try {
      const res = await api.get(`/locks/${collection}/${documentId}`)
      setLockState(res.data.data)
    } catch {
      // silently ignore — lock state is non-critical
    }
  }, [collection, documentId])

  const acquireLock = useCallback(async (force = false) => {
    if (!documentId || acquiringRef.current) return
    acquiringRef.current = true
    setLoading(true)
    try {
      const res = await api.post(`/locks/${collection}/${documentId}/lock`, { force })
      setLockState(res.data.data)
      toast.success(force ? 'Lock force acquired' : 'Document locked for editing')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Could not acquire lock'
      toast.error(msg)
      await fetchLockStatus()
    } finally {
      setLoading(false)
      acquiringRef.current = false
    }
  }, [collection, documentId, fetchLockStatus])

  const releaseLock = useCallback(async () => {
    try {
      await api.post(`/locks/${collection}/${documentId}/unlock`)
      setLockState({
        locked: false,
        lockedBy: null,
        lockedByEmail: null,
        lockedAt: null,
        lockExpiresAt: null,
        isOwner: false,
      })
      toast.success('Lock released')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to release lock'
      toast.error(msg)
    }
  }, [collection, documentId])

  useEffect(() => {
    if (!documentId) return
    acquireLock(false)

    const cleanupCollection = collection
    const cleanupDocumentId = documentId

    // Cleanup: release lock on unmount
    return () => {
      if (lockStateRef.current?.isOwner) {
        api.post(`/locks/${cleanupCollection}/${cleanupDocumentId}/unlock`).catch(() => {})
      }
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [documentId, collection, acquireLock])

  // Heartbeat while owner
  useEffect(() => {
    if (lockState?.isOwner) {
      heartbeatRef.current = setInterval(() => {
        api.post(`/locks/${collection}/${documentId}/heartbeat`).catch(() => {
          // Lock lost — refresh status
          fetchLockStatus()
        })
      }, HEARTBEAT_INTERVAL)
    } else {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [lockState?.isOwner, collection, documentId, fetchLockStatus])

  if (!lockState) {
    return (
      <div className={cn(
        'h-11 flex items-center justify-center text-xs font-black uppercase italic tracking-widest',
        theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
      )}>
        <RefreshCw size={9} className="animate-spin mr-1.5" />
        Checking lock status…
      </div>
    )
  }

  if (!lockState.locked) {
    return (
      <div className={cn(
        'h-11 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest',
        theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
      )}>
        <Unlock size={9} />
        Document available — no active lock
      </div>
    )
  }

  if (lockState.isOwner) {
    if (loading) {
      return (
        <div className={cn(
          'h-11 flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-widest',
          theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
        )}>
          <RefreshCw size={9} className="animate-spin mr-1.5" />
          Acquiring lock…
        </div>
      )
    }
    return (
      <div className={cn(
        'h-11 flex items-center justify-center gap-3 text-xs font-black uppercase italic tracking-widest',
        theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
      )}>
        <Lock size={9} />
        <span>
          Editing — lock held until{' '}
          {lockState.lockExpiresAt
            ? new Date(lockState.lockExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'unknown'}
        </span>
        <button
          type="button"
          onClick={releaseLock}
          className="flex items-center gap-1 px-2 py-0.5 border border-indigo-500/20 hover:border-rose-500/40 hover:text-rose-400 transition-all text-xs font-black uppercase italic"
        >
          <Unlock size={8} />
          Release
        </button>
      </div>
    )
  }

  // Locked by another user
  return (
    <div className={cn(
      'h-11 flex items-center justify-center gap-3 text-xs font-black uppercase italic tracking-widest',
      theme === 'dark' ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
    )}>
      <Lock size={9} />
      <span>
        Locked by {lockState.lockedByEmail || lockState.lockedBy || 'another user'}
      </span>
      <button
        type="button"
        onClick={() => acquireLock(true)}
        className="flex items-center gap-1 px-2 py-0.5 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 transition-all text-xs font-black uppercase italic"
      >
        <RefreshCw size={8} />
        Force Acquire
      </button>
    </div>
  )
}

export default DocumentLockBanner