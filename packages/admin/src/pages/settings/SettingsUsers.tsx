import React, { useState } from 'react'
import {
  Users, Trash2, Loader2, UserCog, Search, Filter, Mail,
  CheckCircle2, XCircle, Clock, Shield, UserPlus, UserX, RefreshCw,
  ChevronDown, Activity
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import InviteUserModal from './InviteUserModal'
import EditUserModal from './EditUserModal'

interface User {
  _id: string
  email: string
  role: string
  status?: 'active' | 'suspended' | 'pending'
  lastLogin?: string
  createdAt?: string
  firstName?: string
  lastName?: string
  [key: string]: any
}

interface SettingsUsersProps {
  users: User[]
  theme: 'light' | 'dark'
  fetchData: () => void
}

const ROLE_OPTIONS = ['admin', 'editor', 'viewer']

const STATUS_BADGE: Record<string, string> = {
  active: 'text-z-active-text border-z-active-border bg-z-active-bg',
  suspended: 'text-red-400 border-red-500/30 bg-red-500/10',
  pending: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'text-red-400 border-red-500/30 bg-red-500/10',
  editor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  viewer: 'text-z-active-text border-z-active-border bg-z-active-bg',
}

const SettingsUsers: React.FC<SettingsUsersProps> = ({ users, theme, fetchData }) => {
  const dark = theme === 'dark'
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [resetEmailId, setResetEmailId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const handleDeleteUser = async (id: string) => {
    setDeletingId(id)
    try {
      await api.delete(`/system/users/${id}`)
      toast.success('Operator removed')
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove operator')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSuspend = async (user: User) => {
    setSuspendingId(user._id)
    try {
      const isSuspended = user.status === 'suspended'
      await api.patch(`/system/users/${user._id}`, { status: isSuspended ? 'active' : 'suspended' })
      toast.success(isSuspended ? 'User reactivated' : 'User suspended')
      fetchData()
    } catch {
      toast.error('Action failed')
    } finally {
      setSuspendingId(null)
    }
  }

  const handleSendPasswordReset = async (user: User) => {
    setResetEmailId(user._id)
    try {
      await api.post('/auth/forgot-password', { email: user.email })
      toast.success(`Password reset sent to ${user.email}`)
    } catch {
      toast.error('Failed to send reset email')
    } finally {
      setResetEmailId(null)
    }
  }

  const handleRoleChange = async (user: User, newRole: string) => {
    setUpdatingRoleId(user._id)
    try {
      await api.patch(`/system/users/${user._id}`, { role: newRole })
      toast.success(`Role updated to ${newRole}`)
      fetchData()
    } catch {
      toast.error('Failed to update role')
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`Delete ${selectedIds.length} user(s)?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/system/users/${id}`)))
      toast.success(`${selectedIds.length} users removed`)
      setSelectedIds([])
      fetchData()
    } catch {
      toast.error('Bulk delete failed')
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.firstName || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchStatus = filterStatus === 'all' || (u.status || 'active') === filterStatus
    return matchSearch && matchRole && matchStatus
  })

  const card = cn(
    'border rounded-none transition-all group',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border hover:border-z-active-border shadow-sm' : 'bg-z-panel border-z-border shadow-sm hover:border-z-active-border'
  )

  const inp = cn(
    'border rounded-none py-2 px-3 text-sm outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-app/80 border-z-border text-z-primary placeholder:text-z-primary' : 'bg-z-panel border-z-border'
  )

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className={cn(inp, 'pl-8 w-full')}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={cn(inp, 'min-w-[110px]')}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn(inp, 'min-w-[110px]')}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                className={cn('flex items-center gap-2 px-3 py-2 text-sm font-semibold  border transition-all', dark ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600')}>
                {bulkDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Delete ({selectedIds.length})
              </button>
            )}
            <span className={cn('text-sm font-semibold  ', 'text-z-secondary')}>
              {filtered.length}/{users.length} users
            </span>
            <button onClick={() => setInviteOpen(true)}
              className={cn('flex items-center gap-2 text-sm font-semibold  border px-5 py-2.5 transition-all', dark ? 'border-z-active-border text-z-active-text hover:bg-z-active-bg' : 'border-z-active-border text-z-accent hover:bg-z-active-bg')}>
              <UserPlus size={13} />
              Invite User
            </button>
          </div>
        </div>

        {/* User Cards */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className={cn('py-12 border border-dashed text-center', 'border-z-border')}>
              <Users size={28} className="text-z-secondary mx-auto mb-3" />
              <p className="text-sm text-z-secondary">No users match your filters</p>
            </div>
          ) : (
            filtered.map(user => {
              const status = user.status || 'active'
              const isSuspended = status === 'suspended'
              return (
                <div key={user._id} className={card}>
                  <div className="flex items-center gap-4 p-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user._id)}
                      onChange={() => toggleSelect(user._id)}
                      className="accent-z-accent w-3.5 h-3.5 flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    {/* Avatar */}
                    <div className={cn('w-10 h-10 flex items-center justify-center text-sm font-semibold  flex-shrink-0 border', isSuspended ? dark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-500 border-red-200' : dark ? 'bg-z-active-bg text-z-active-text border-z-active-border' : 'bg-z-active-bg text-z-accent border-z-active-border')}>
                      {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-semibold  leading-none', 'text-z-primary')}>
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                        </span>
                        <span className={cn('text-sm font-semibold   px-1.5 py-0.5 border', ROLE_BADGE[user.role] || 'text-z-muted border-z-border bg-z-hover')}>
                          {user.role}
                        </span>
                        <span className={cn('text-sm font-semibold   px-1.5 py-0.5 border', STATUS_BADGE[status] || STATUS_BADGE.active)}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {user.firstName && (
                          <span className="text-sm text-z-secondary">{user.email}</span>
                        )}
                        {user.lastLogin && (
                          <span className="text-sm text-z-secondary flex items-center gap-1">
                            <Clock size={8} /> Last login {new Date(user.lastLogin).toLocaleDateString()}
                          </span>
                        )}
                        {user.createdAt && (
                          <span className="text-sm text-z-secondary">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Inline role change */}
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user, e.target.value)}
                          disabled={updatingRoleId === user._id}
                          className={cn('text-sm font-semibold  border py-1.5 px-2 outline-none transition-all cursor-pointer', dark ? 'bg-app/80 border-z-border text-z-muted hover:border-z-active-border' : 'bg-z-panel border-z-border text-z-secondary')}
                          onClick={e => e.stopPropagation()}
                        >
                          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      {/* Password Reset */}
                      <button
                        onClick={() => handleSendPasswordReset(user)}
                        disabled={resetEmailId === user._id}
                        className={cn('p-2 transition-colors', dark ? 'text-z-secondary hover:text-z-active-text' : 'text-z-muted hover:text-z-active-text')}
                        title="Send password reset"
                      >
                        {resetEmailId === user._id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => setEditingUser(user)}
                        className={cn('p-2 transition-colors', dark ? 'text-z-secondary hover:text-z-active-text' : 'text-z-muted hover:text-z-accent')}
                        title="Edit user"
                      >
                        <UserCog size={14} />
                      </button>
                      {/* Suspend/Activate */}
                      <button
                        onClick={() => handleSuspend(user)}
                        disabled={suspendingId === user._id}
                        className={cn('p-2 transition-colors disabled:opacity-30', isSuspended ? dark ? 'text-z-secondary hover:text-z-active-text' : 'text-z-muted hover:text-z-accent' : dark ? 'text-z-secondary hover:text-amber-400' : 'text-z-muted hover:text-amber-600')}
                        title={isSuspended ? 'Reactivate' : 'Suspend'}
                      >
                        {suspendingId === user._id ? <Loader2 size={14} className="animate-spin" /> : isSuspended ? <CheckCircle2 size={14} /> : <UserX size={14} />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={deletingId === user._id}
                        className={cn('p-2 transition-colors disabled:opacity-30', dark ? 'text-z-secondary hover:text-red-400' : 'text-z-muted hover:text-red-600')}
                        title="Delete user"
                      >
                        {deletingId === user._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {inviteOpen && (
        <InviteUserModal onClose={() => setInviteOpen(false)} onInvited={fetchData} theme={theme} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onUpdated={fetchData} theme={theme} />
      )}
    </>
  )
}

export default SettingsUsers
