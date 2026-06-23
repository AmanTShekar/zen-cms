import { AdapterFactory } from '../database/adapters/AdapterFactory'

export class RBACEngine {
  constructor() {}
  enforce(action: string, resource: string) { return true }
  
  static async checkAccess(role: string, resource: string, action: string, siteId?: string): Promise<boolean> {
    if (role === 'admin') return true

    const adapter = AdapterFactory.getActiveAdapter()
    const query = siteId ? { roleName: role, siteId } : { roleName: role }
    const roles = await adapter.find<Record<string, unknown>>('z_roles', query)
    
    if (roles && roles.length > 0) {
      const dbRole = roles[0]
      if (dbRole.hasWildcard) return true
      
      const permsArray = Array.isArray(dbRole.permissions) ? dbRole.permissions : []
      
      // Check wildcard resource first
      const wildcardPerm = permsArray.find((p: Record<string, unknown>) => p.resource === '*')
      if (wildcardPerm && Array.isArray(wildcardPerm.actions) && wildcardPerm.actions.includes(action)) {
        return true
      }
      
      // Check specific resource
      const resourcePerm = permsArray.find((p: Record<string, unknown>) => p.resource === resource)
      if (resourcePerm && Array.isArray(resourcePerm.actions) && resourcePerm.actions.includes(action)) {
        return true
      }
      
      return false
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
  
  static async getFieldPermissions(role: string, resource: string, siteId?: string): Promise<Record<string, { read?: boolean; write?: boolean }>> {
    if (role === 'admin') return {}
    
    try {
      const adapter = AdapterFactory.getActiveAdapter()
      const query = siteId ? { roleName: role, siteId } : { roleName: role }
      const roles = await adapter.find<Record<string, unknown>>('z_roles', query)
      if (!roles || roles.length === 0) return {}
      
      const dbRole = roles[0]
      const permsArray = Array.isArray(dbRole.permissions) ? dbRole.permissions : []
      
      const resourcePerm = permsArray.find((p: Record<string, unknown>) => p.resource === resource)
      if (resourcePerm && resourcePerm.fieldPermissions) {
        return resourcePerm.fieldPermissions
      }
      
      return {}
    } catch (e) {
      return {}
    }
  }
}

export const invalidateRoleCache = async (...args: Record<string, unknown>[]) => {}
