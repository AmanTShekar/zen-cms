import { AdapterFactory } from '../database/adapters/AdapterFactory'

export class RBACEngine {
  constructor() {}
  async enforce(action: string, resource: string, userRole: string, siteId?: string): Promise<boolean> {
    return RBACEngine.checkAccess(userRole, resource, action, siteId);
  }
  
  static async checkAccess(role: string, resource: string, action: string, siteId?: string): Promise<boolean> {
    if (role === 'admin') return true

    const adapter = AdapterFactory.getActiveAdapter()
    const query = siteId ? { roleName: role, siteId } : { roleName: role }
    const roles = await adapter.find<Record<string, any>>('z_roles', query)
    
    if (roles && roles.length > 0) {
      const dbRole = roles[0]
      if (dbRole.hasWildcard) return true
      
      const permsArray = Array.isArray(dbRole.permissions) ? dbRole.permissions : []
      
      // Check wildcard resource first
      const wildcardPerm = permsArray.find((p: Record<string, any>) => p.resource === '*')
      if (wildcardPerm && Array.isArray(wildcardPerm.actions) && wildcardPerm.actions.includes(action)) {
        return true
      }
      
      // Check specific resource
      const resourcePerm = permsArray.find((p: Record<string, any>) => p.resource === resource)
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
      const roles = await adapter.find<Record<string, any>>('z_roles', query)
      if (!roles || roles.length === 0) return {}
      
      const dbRole = roles[0]
      const permsArray = Array.isArray(dbRole.permissions) ? dbRole.permissions : []
      
      const resourcePerm = permsArray.find((p: Record<string, any>) => p.resource === resource)
      if (resourcePerm && resourcePerm.fieldPermissions) {
        return resourcePerm.fieldPermissions
      }
      
      return {}
    } catch (e) {
      return {}
    }
  }

  static async satisfiesRoleRequired(userRole: string, requiredRoles: string[], siteId?: string): Promise<boolean> {
    try {
      const adapter = AdapterFactory.getActiveAdapter()
      const query: Record<string, any> = { roleName: userRole }
      if (siteId) {
        query.siteId = siteId
      } else {
        query.siteId = { $exists: false }
      }
      const rolesResult = await adapter.find<Record<string, any>>('z_roles', query)
      if (!rolesResult || rolesResult.length === 0) return false
      
      const customRole = rolesResult[0]
      const permissions = Array.isArray(customRole.permissions) ? customRole.permissions : []
      
      const hasWildcard = customRole.hasWildcard || permissions.some((p: any) => p.resource === '*' && p.actions.includes('*'))
      if (requiredRoles.includes('admin') && hasWildcard) return true
      
      const hasWrite = permissions.some((p: any) => p.actions.includes('*') || p.actions.includes('create') || p.actions.includes('update'))
      if (requiredRoles.includes('editor') && (hasWildcard || hasWrite)) return true
      
      const hasRead = permissions.some((p: any) => p.actions.includes('*') || p.actions.includes('read'))
      if (requiredRoles.includes('viewer') && (hasWildcard || hasWrite || hasRead)) return true
      
      return false
    } catch {
      return false
    }
  }
}

export const invalidateRoleCache = async (...args: Record<string, any>[]) => {}
