import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, UserCog, Loader2, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useSystemMetadata } from '../../hooks/useQueries'

interface EditUserModalProps {
  user: any
  onClose: () => void
  onUpdated: () => void
  theme: 'light' | 'dark'
}

const PRESET_COLORS = [
  'var(--z-accent)', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  'var(--z-accent)', // Purple
  '#06B6D4', // Cyan
  '#64748B', // Slate
]

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdated, theme }) => {
  const { data: health } = useSystemMetadata()
  const collections = health?.collections || []
  const globals = health?.globals || []

  const [sites, setSites] = useState<any[]>([])
  
  // Combine collections, globals, and sites into scopes
  const availableScopes = [
    ...sites.map(s => ({ id: `site:${s.slug}`, label: `Site: ${s.name}` })),
    ...collections.map((c: any) => ({ id: `col:${c.slug}`, label: `Collection: ${c.name}` })),
    ...globals.map((g: any) => ({ id: `glb:${g.slug}`, label: `Global: ${g.name}` })),
  ]

  const [role, setRole] = useState<string>(user.role || 'viewer')
  const [color, setColor] = useState<string>(user.color || '')
  
  const [specialAccess, setSpecialAccess] = useState<Set<string>>(
    new Set(user.specialAccess && Array.isArray(user.specialAccess) ? user.specialAccess : [])
  )
  
  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'editor', 'viewer'])
  const [loading, setLoading] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    const fetchRolesAndSites = async () => {
      try {
        const [rolesRes, sitesRes] = await Promise.all([
          api.get('/roles').catch(() => ({ data: { data: [] } })),
          api.get('/sites').catch(() => ({ data: { data: [] } }))
        ])
        
        if (rolesRes.data?.data) {
          const roles = rolesRes.data.data.map((r: any) => r.roleName.toLowerCase())
          // Ensure base roles are always present
          const baseRoles = ['admin', 'editor', 'viewer']
          setAvailableRoles(Array.from(new Set([...baseRoles, ...roles])))
        }
        
        if (sitesRes.data?.data) {
          setSites(sitesRes.data.data)
        }
      } catch (e) {
        // use defaults
      }
    }
    fetchRolesAndSites()
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const toggleScope = (scopeId: string) => {
    setSpecialAccess(prev => {
      const newSet = new Set(prev)
      if (newSet.has(scopeId)) newSet.delete(scopeId)
      else newSet.add(scopeId)
      return newSet
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { role }
      if (color) payload.color = color
      
      payload.specialAccess = Array.from(specialAccess)

      await api.patch(`/system/users/${user._id}`, payload)
      toast.success('Operator profile updated')
      onUpdated()
      if (isMountedRef.current) onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update operator')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={cn(
          'w-full max-w-md border rounded-none-none shadow-2xl max-h-[90vh] flex flex-col',
          theme === 'dark' ? 'bg-black border-z-border' : 'bg-z-panel border-z-border shadow-sm shadow-black/10'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-z-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none-none bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
              <UserCog size={18} className="text-gray-600 dark:text-z-secondary" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-inherit">Edit Operator</span>
          </div>
          <button onClick={onClose} className="text-z-secondary hover:text-z-active-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleUpdate} className="px-8 py-6 space-y-8">
            <div className="space-y-1">
              <p className="text-[14px] font-semibold">{user.email}</p>
              <p className="text-sm text-z-secondary">
                ID: {user._id}
              </p>
            </div>

            {/* Role */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-z-secondary">
                Auth Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'py-3 text-sm font-semibold   border rounded-none-none transition-all',
                      role === r
                        ? 'border-z-accent/40 bg-z-active-bg text-z-active-text'
                        : theme === 'dark'
                        ? 'border-z-border text-z-secondary hover:border-z-border'
                        : 'border-z-border text-z-muted hover:border-z-border-strong'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-z-secondary">
                Profile Color
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-none-none border-2 transition-transform hover:scale-110 flex items-center justify-center',
                      color === c ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    title={`Select color ${c}`}
                  >
                    {color === c && <Check size={12} className="text-white mix-blend-difference" />}
                  </button>
                ))}
                <input
                  type="color"
                  value={color || '#000000'}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 cursor-pointer rounded-none-none bg-transparent border-0 p-0"
                  title="Custom Color"
                />
              </div>
              {!color && (
                <p className="text-sm text-z-secondary">
                  Currently auto-assigned deterministically
                </p>
              )}
            </div>

            {/* Special Access Scopes */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-z-secondary">
                Restrict Content Access
              </label>
              <p className="text-sm text-z-secondary mb-2">
                Select exactly which collections this operator can view/edit. If none are selected, they default to standard role constraints.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {availableScopes.length > 0 ? availableScopes.map(scope => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => toggleScope(scope.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 border rounded-none-none transition-all text-left',
                      specialAccess.has(scope.id)
                        ? theme === 'dark'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-amber-500/30 bg-amber-50'
                        : theme === 'dark'
                        ? 'border-z-border hover:border-z-border-strong'
                        : 'border-z-border hover:border-z-border-strong'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-semibold  ',
                      specialAccess.has(scope.id) 
                        ? 'text-amber-500' 
                        : 'text-z-secondary'
                    )}>
                      {scope.label}
                    </span>
                    <div className={cn(
                      'w-4 h-4 border rounded-none-none flex items-center justify-center transition-colors',
                      specialAccess.has(scope.id)
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'border-gray-500/30 text-transparent'
                    )}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                  </button>
                )) : (
                  <p className="text-sm text-z-secondary">No collections available to restrict.</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-4 rounded-none-none text-sm font-semibold   shadow-lg transition-all active:scale-95 disabled:opacity-40',
                  theme === 'dark'
                    ? 'bg-z-accent hover:bg-z-accent text-black'
                    : 'bg-z-accent hover:opacity-90 text-white'
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Updating Profile...
                  </span>
                ) : (
                  'Save Operator Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default EditUserModal
