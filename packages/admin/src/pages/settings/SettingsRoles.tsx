import React, { useState } from 'react'
import { Save, PlusCircle, Copy, Trash2, ChevronDown, ChevronRight, Eye, Edit3, Lock } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import CreateRoleModal from './CreateRoleModal'
import DeleteRoleConfirmDialog from './DeleteRoleConfirmDialog'

type FieldPermissionEntry = { read?: boolean; write?: boolean }

interface Role {
  _id: string
  roleName: string
  roleType: 'admin' | 'editor' | 'viewer' | 'custom'
  description: string
  isSystem: boolean
  permissions: Array<{
    resource: string
    actions: string[]
    fieldPermissions?: Record<string, FieldPermissionEntry>
  }>
}

interface SettingsRolesProps {
  roles: Role[]
  setRoles: (r: Role[] | ((prev: Role[]) => Role[])) => void
  editingRole: Role | null
  setEditingRole: (r: Role | null) => void
  roleFilter: 'all' | 'system' | 'custom'
  setRoleFilter: (f: 'all' | 'system' | 'custom') => void
  healthData: any
  users: any[]
  theme: 'light' | 'dark'
}

const SettingsRoles: React.FC<SettingsRolesProps> = ({
  roles, setRoles, editingRole, setEditingRole, roleFilter, setRoleFilter, healthData, users, theme,
}) => {
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const [expandedResource, setExpandedResource] = useState<string | null>(null)

  const filteredRoles = roleFilter === 'all' ? roles : roleFilter === 'system' ? roles.filter(r => r.isSystem) : roles.filter(r => !r.isSystem)

  const availableCollections = [
    { slug: '*', label: 'All Resources' },
    ...(healthData?.collections || []).map((c: any) => ({ slug: c.slug, label: c.label || c.slug })),
  ]

  const getCollectionFields = (collectionSlug: string): string[] => {
    if (collectionSlug === '*') return []
    const col = healthData?.collections?.find((c: any) => c.slug === collectionSlug)
    const fields: string[] = []
    const collect = (arr: any[]) => {
      for (const f of arr) {
        fields.push(f.name)
        if (f.fields?.length) collect(f.fields)
      }
    }
    if (col?.fields?.length) collect(col.fields)
    if (fields.length === 0) {
      return ['title', 'slug', 'status', 'publishedAt', 'createdAt', 'updatedAt', 'content', 'description', 'coverImage', 'author']
    }
    return [...new Set(fields)]
  }

  const updatePermission = (permIdx: number, patch: Partial<Role['permissions'][0]>) => {
    if (!editingRole || editingRole.isSystem) return
    const updated = [...editingRole.permissions]
    updated[permIdx] = { ...updated[permIdx], ...patch }
    setEditingRole({ ...editingRole, permissions: updated })
  }

  const updateFieldPermission = (permIdx: number, fieldName: string, patch: Partial<FieldPermissionEntry>) => {
    if (!editingRole || editingRole.isSystem) return
    const perm = editingRole.permissions[permIdx]
    const existing = perm.fieldPermissions || {}
    const fieldEntry = existing[fieldName] || {}
    const updated = {
      ...perm,
      fieldPermissions: {
        ...existing,
        [fieldName]: { ...fieldEntry, ...patch },
      },
    }
    const perms = [...editingRole.permissions]
    perms[permIdx] = updated
    setEditingRole({ ...editingRole, permissions: perms })
  }

  const clearFieldPermission = (permIdx: number, fieldName: string) => {
    if (!editingRole || editingRole.isSystem) return
    const perm = editingRole.permissions[permIdx]
    const existing = perm.fieldPermissions || {}
    const updated = { ...existing }
    delete updated[fieldName]
    const perms = [...editingRole.permissions]
    perms[permIdx] = { ...perm, fieldPermissions: updated }
    setEditingRole({ ...editingRole, permissions: perms })
  }

  const toggleField = (permIdx: number, fieldName: string, fieldPerm: FieldPermissionEntry | undefined, action: 'read' | 'write') => {
    if (fieldPerm?.[action]) {
      if (action === 'read' && fieldPerm?.write) {
        updateFieldPermission(permIdx, fieldName, { read: false })
      } else if (action === 'write' && fieldPerm?.read) {
        updateFieldPermission(permIdx, fieldName, { write: false })
      } else {
        clearFieldPermission(permIdx, fieldName)
      }
    } else {
      updateFieldPermission(permIdx, fieldName, { [action]: true })
    }
  }

  return (
    <div className="col-span-full space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-black uppercase italic tracking-wider">Roles & Permissions</h3>
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Manage team access levels and granular resource permissions
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-[10px] font-black uppercase italic transition-all text-emerald-400 hover:text-white"
        >
          <PlusCircle size={12} />
          New Custom Role
        </button>
      </div>

      {/* Role type filter tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.08] pb-0">
        {(['all', 'system', 'custom'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setRoleFilter(filter)}
            className={cn(
              'px-4 py-2 text-[9px] font-black uppercase italic tracking-widest border-b-2 transition-all',
              roleFilter === filter ? 'border-emerald-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
            )}
          >
            {filter === 'all' ? `All (${roles.length})` : filter === 'system' ? `System (${roles.filter(r => r.isSystem).length})` : `Custom (${roles.filter(r => !r.isSystem).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Role list */}
        <div className="xl:col-span-1 space-y-3">
          {filteredRoles.map((role) => (
            <div
              key={role._id}
              onClick={() => setEditingRole(role)}
              className={cn(
                'p-4 border rounded-none flex items-center justify-between cursor-pointer transition-all',
                editingRole?._id === role._id
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-white/[0.01] border-white/[0.08] hover:border-white/[0.08]'
              )}
            >
              <div className="flex flex-col leading-none gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-black uppercase tracking-tight italic text-white">{role.roleName}</span>
                  {role.isSystem && (
                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 border border-amber-500/30 text-amber-500 tracking-widest">SYSTEM</span>
                  )}
                  <span className={cn(
                    'text-[7px] font-black uppercase px-1.5 py-0.5 tracking-widest border',
                    role.roleType === 'admin' ? 'border-red-500/30 text-red-400' :
                    role.roleType === 'editor' ? 'border-emerald-500/30 text-emerald-400' :
                    'border-white/[0.08] text-gray-500'
                  )}>
                    {role.roleType}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                  {role.permissions?.length || 0} rule{role.permissions?.length !== 1 ? 's' : ''}
                  {role.description && ` · ${role.description.slice(0, 40)}`}
                </span>
              </div>
              {!role.isSystem && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Clone role"
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        const res = await api.post(`/roles/clone/${role._id}`)
                        setRoles((prev: Role[]) => [...prev, res.data.data])
                        toast.success(`Cloned as "${res.data.data.roleName}"`)
                      } catch { toast.error('Failed to clone role') }
                    }}
                    className="text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete role"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteRole(role)
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredRoles.length === 0 && (
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic py-4">No {roleFilter} roles found.</p>
          )}
        </div>

        {/* Permission editor */}
        <div className="xl:col-span-2">
          {editingRole ? (
            <div className="space-y-6 p-6 border border-white/[0.08] bg-white/[0.01] backdrop-blur-3xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex flex-col">
                  <h4 className="text-xs font-black uppercase italic tracking-widest text-emerald-400">{editingRole.roleName}</h4>
                  {editingRole.description && (
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{editingRole.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!editingRole.isSystem && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.patch(`/roles/${editingRole._id}`, {
                            roleName: editingRole.roleName,
                            description: editingRole.description,
                            permissions: editingRole.permissions,
                          })
                          setRoles((prev: Role[]) => prev.map(r => r._id === editingRole._id ? res.data.data : r))
                          setEditingRole(res.data.data)
                          toast.success('Permissions saved')
                        } catch (err: any) {
                          toast.error(err.response?.data?.error?.message || 'Failed to save')
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase italic tracking-wider transition-all"
                    >
                      <Save size={12} />
                      Save
                    </button>
                  )}
                </div>
              </div>

              {editingRole.isSystem && (
                <div className="p-3 border border-amber-500/20 bg-amber-500/5 text-[9.5px] font-bold italic text-amber-400 uppercase tracking-wider">
                  System roles cannot be modified. Clone the role to customize its permissions.
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Resource Permission Rules</span>
                  {!editingRole.isSystem && (
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: [...(editingRole.permissions || []), { resource: '*', actions: ['read'] }] })}
                      className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest italic flex items-center gap-1"
                    >
                      <PlusCircle size={10} />
                      Add Rule
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(editingRole.permissions || []).map((perm, permIdx) => (
                    <div key={permIdx} className="border border-white/[0.08] bg-black/40">
                      {/* Rule header */}
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            disabled={editingRole.isSystem}
                            value={perm.resource}
                            onChange={(e) => {
                              if (editingRole.isSystem) return
                              const updated = [...editingRole.permissions]
                              updated[permIdx] = { ...perm, resource: e.target.value }
                              setEditingRole({ ...editingRole, permissions: updated })
                            }}
                            className="bg-black border border-white/[0.08] text-white text-[11px] font-black uppercase italic outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1.5 px-3 rounded-none focus:border-emerald-500 disabled:opacity-50"
                          >
                            {availableCollections.map(c => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
                          </select>
                          <div className="flex items-center gap-3 flex-wrap">
                            {['create', 'read', 'update', 'delete'].map((act) => {
                              const checked = perm.actions.includes(act)
                              return (
                                <label key={act} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    disabled={editingRole.isSystem}
                                    checked={checked}
                                    onChange={(e) => {
                                      if (editingRole.isSystem) return
                                      let next = [...perm.actions]
                                      if (e.target.checked) next.push(act)
                                      else next = next.filter(a => a !== act)
                                      const updated = [...editingRole.permissions]
                                      updated[permIdx] = { ...perm, actions: next }
                                      setEditingRole({ ...editingRole, permissions: updated })
                                    }}
                                    className="rounded-none border-white/[0.08] text-emerald-600 focus:ring-0 bg-black cursor-pointer"
                                  />
                                  <span className={cn('text-[8px] font-black uppercase italic tracking-wider', checked ? 'text-emerald-400' : 'text-gray-500')}>{act}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Field permissions */}
                      {perm.resource !== '*' && (
                        <div className="border-t border-white/[0.08]">
                          <button
                            type="button"
                            disabled={editingRole.isSystem}
                            onClick={() => setExpandedResource(expandedResource === `${editingRole._id}-${permIdx}` ? null : `${editingRole._id}-${permIdx}`)}
                            className={cn(
                              'w-full flex items-center gap-2 px-4 py-2.5 text-[8px] font-black uppercase italic tracking-widest transition-all',
                              theme === 'dark' ? 'hover:bg-white/5 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700',
                              editingRole.isSystem && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {expandedResource === `${editingRole._id}-${permIdx}` ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <Lock size={9} />
                            Field-Level Access ({Object.keys(perm.fieldPermissions || {}).length} configured)
                          </button>

                          {expandedResource === `${editingRole._id}-${permIdx}` && (
                            <div className="px-4 pb-4">
                              {(() => {
                                const fields = getCollectionFields(perm.resource)
                                return (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 border-b border-white/[0.08] pb-2">
                                      <div className="col-span-4 text-[7px] font-black uppercase italic text-gray-600 tracking-widest">Field</div>
                                      <div className="col-span-4 text-[7px] font-black uppercase italic text-gray-600 tracking-widest flex items-center gap-1 justify-center"><Eye size={8} /> Read</div>
                                      <div className="col-span-4 text-[7px] font-black uppercase italic text-gray-600 tracking-widest flex items-center gap-1 justify-center"><Edit3 size={8} /> Write</div>
                                    </div>
                                    {fields.map((field) => {
                                      const fp = perm.fieldPermissions?.[field]
                                      const readOn = fp?.read
                                      const writeOn = fp?.write
                                      return (
                                        <div key={field} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-white/[0.02] last:border-0">
                                          <div className="col-span-4">
                                            <span className={cn(
                                              'text-[9px] font-black uppercase italic',
                                              (readOn || writeOn) ? 'text-emerald-400' : 'text-gray-500'
                                            )}>
                                              {field}
                                            </span>
                                          </div>
                                          <div className="col-span-4 flex justify-center">
                                            <button
                                              type="button"
                                              disabled={editingRole.isSystem}
                                              onClick={() => toggleField(permIdx, field, fp, 'read')}
                                              className={cn(
                                                'w-6 h-6 border rounded-none flex items-center justify-center transition-all',
                                                readOn
                                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                  : 'bg-transparent border-white/[0.08] text-gray-600 hover:border-white/[0.08]',
                                                editingRole.isSystem && 'opacity-50 cursor-not-allowed'
                                              )}
                                            >
                                              {readOn && <Eye size={9} />}
                                            </button>
                                          </div>
                                          <div className="col-span-4 flex justify-center">
                                            <button
                                              type="button"
                                              disabled={editingRole.isSystem}
                                              onClick={() => toggleField(permIdx, field, fp, 'write')}
                                              className={cn(
                                                'w-6 h-6 border rounded-none flex items-center justify-center transition-all',
                                                writeOn
                                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                  : 'bg-transparent border-white/[0.08] text-gray-600 hover:border-white/[0.08]',
                                                editingRole.isSystem && 'opacity-50 cursor-not-allowed'
                                              )}
                                            >
                                              {writeOn && <Edit3 size={9} />}
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {editingRole.permissions?.length === 0 && (
                    <p className="text-[9px] text-gray-600 font-bold italic uppercase tracking-widest text-center py-4">No permission rules defined. Add a rule above.</p>
                  )}
                </div>
              </div>

              {/* User assignment */}
              <div className="border-t border-white/[0.08] pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                    Assigned Users ({users.filter(u => u.role === editingRole.roleName || u.role === editingRole.roleType).length})
                  </span>
                </div>
                <div className="space-y-2">
                  {users.filter(u => u.role === editingRole.roleName || u.role === editingRole.roleType).map(u => (
                    <div key={u._id} className="flex items-center justify-between p-3 border border-white/[0.08] bg-black/40">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white">{u.email}</span>
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{u._id}</span>
                      </div>
                      <span className="text-[7px] font-black uppercase text-emerald-400 border border-emerald-500/20 px-2 py-1">{u.role}</span>
                    </div>
                  ))}
                  {users.filter(u => u.role === editingRole.roleName || u.role === editingRole.roleType).length === 0 && (
                    <p className="text-[9px] text-gray-600 font-bold italic uppercase text-center py-2">No users assigned to this role.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[300px] border border-dashed border-white/[0.08] flex items-center justify-center text-center p-8">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-xs">
                Select a role on the left to view and edit its permission rules.
              </p>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateRoleModal
          onClose={() => setCreateOpen(false)}
          onCreated={(newRole) => {
            setRoles((prev: Role[]) => [...prev, newRole])
            setEditingRole(newRole)
          }}
          theme={theme}
        />
      )}

      {deleteRole && (
        <DeleteRoleConfirmDialog
          role={deleteRole}
          onClose={() => setDeleteRole(null)}
          onDeleted={() => {
            setRoles((prev: Role[]) => prev.filter(r => r._id !== deleteRole._id))
            if (editingRole?._id === deleteRole._id) setEditingRole(null)
          }}
          theme={theme}
        />
      )}
    </div>
  )
}

export default SettingsRoles
