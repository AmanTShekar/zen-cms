/**
 * usePermissions
 *
 * A role-based UI access hook. Components import this to conditionally
 * render actions based on the currently authenticated user's role.
 *
 * Roles in order of least → most privilege:
 *   viewer → editor → admin
 *
 * Usage:
 *   const { can } = usePermissions()
 *   if (can('publish')) { ... }
 *   <PermissionGate action="delete"><button>Delete</button></PermissionGate>
 */

import React from 'react'
import { useAuthStore } from '../store/authStore'

type Role = 'admin' | 'editor' | 'viewer'

type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'manage_users'
  | 'manage_settings'
  | 'manage_plugins'
  | 'manage_schema'
  | 'manage_api_keys'
  | 'download_backup'
  | 'view_audit_log'
  | 'manage_redirects'

/** Map each action to the minimum role required */
const PERMISSION_MAP: Record<Action, Role> = {
  view: 'viewer',
  create: 'editor',
  edit: 'editor',
  publish: 'editor',
  unpublish: 'editor',
  delete: 'editor',
  view_audit_log: 'editor',
  manage_redirects: 'editor',
  manage_schema: 'admin',
  manage_settings: 'admin',
  manage_plugins: 'admin',
  manage_users: 'admin',
  manage_api_keys: 'admin',
  download_backup: 'admin',
}

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
}

function hasPermission(userRole: Role | undefined, action: Action): boolean {
  if (!userRole) return false
  const requiredLevel = ROLE_HIERARCHY[PERMISSION_MAP[action]] ?? 999
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1
  return userLevel >= requiredLevel
}

/** Hook that returns a `can(action)` helper based on the logged-in user's role */
export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const role = (user?.role ?? 'viewer') as Role

  return {
    role,
    /** Returns true if the current user can perform the given action */
    can: (action: Action) => hasPermission(role, action),
    /** Returns true if the current user is an admin */
    isAdmin: role === 'admin',
    /** Returns true if the current user is an editor or above */
    isEditor: ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['editor'],
  }
}

/** HOC: renders children only if the current user can perform the given action */
export function PermissionGate({
  action,
  children,
  fallback = null,
}: {
  action: Action
  children: React.ReactNode
  fallback?: React.ReactNode
}): React.ReactElement | null {
  const { can } = usePermissions()
  return can(action) ? (children as React.ReactElement) : (fallback as React.ReactElement | null)
}
