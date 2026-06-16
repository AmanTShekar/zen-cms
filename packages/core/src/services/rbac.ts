import { AdapterFactory } from '../database/adapters/AdapterFactory'

export class RBACEngine {
  constructor() {}
  enforce(action: string, resource: string) { return true }
  
  static async checkAccess(role: string, resource: string, action: string): Promise<boolean> {
    if (role === 'admin') return true

    const adapter = AdapterFactory.getActiveAdapter()
    const roles = await adapter.find<any>('z_roles', { roleName: role })
    
    if (roles && roles.length > 0) {
      const dbRole = roles[0]
      if (dbRole.hasWildcard) return true
      const perms = dbRole.permissions || {}
      const resourcePerms = perms[resource] || []
      return resourcePerms.includes(action)
    }

    // Fallbacks
    if (role === 'viewer') {
      return action === 'read'
    }
    if (role === 'editor') {
      if (action === 'delete') return false
      return ['create', 'read', 'update'].includes(action)
    }
    
    return false
  }
  
  static getFieldPermissions(...args: any[]) { return {} }
}

export const invalidateRoleCache = async (...args: any[]) => {}
