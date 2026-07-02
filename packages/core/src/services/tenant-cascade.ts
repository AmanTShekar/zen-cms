import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

export class TenantCascadeService {
  /**
   * Completely wipes a site and all its associated data
   */
  static async deleteSite(adapter: DatabaseAdapter, siteId: string, siteSlug: string) {
    const collections = await adapter.find<Record<string, any>>('z_collections', { siteId: siteSlug })
    
    // 1. Delete content from all dynamic collections belonging to this site
    for (const col of collections) {
      if (col.slug) {
        await adapter.deleteMany(col.slug, { siteId: siteSlug })
        
        // If it's a drafted collection, delete draft records as well
        if (col.drafts) {
          try {
            await adapter.deleteMany(`${col.slug}_drafts`, { siteId: siteSlug })
          } catch (e) {
            // Ignore if drafts collection doesn't exist
          }
        }
      }
    }

    // 2. Delete core system records tied to this site
    await adapter.deleteMany('z_collections', { siteId: siteSlug })
    await adapter.deleteMany('media', { siteId: siteSlug })
    await adapter.deleteMany('z_webhook_configs', { siteId: siteSlug })
    await adapter.deleteMany('z_api_keys', { siteId: siteSlug })

    // 3. Delete the site workspace itself
    await adapter.delete('z_sites', siteId)
  }

  /**
   * Completely wipes a workspace and all its sites
   */
  static async deleteWorkspace(adapter: DatabaseAdapter, workspaceId: string) {
    const sites = await adapter.find<Record<string, any>>('z_sites', { workspaceId })
    
    for (const site of sites) {
      await this.deleteSite(adapter, (site.id || site._id?.toString() || site._id), site.slug)
    }

    await adapter.delete('z_workspaces', workspaceId)
  }

  /**
   * Completely wipes a user and all their owned workspaces and sites
   */
  static async deleteUserOwnedTenants(adapter: DatabaseAdapter, userId: string) {
    const workspaces = await adapter.find<Record<string, any>>('z_workspaces', { ownerId: userId })
    
    for (const ws of workspaces) {
      await this.deleteWorkspace(adapter, (ws.id || ws._id?.toString() || ws._id))
    }
    
    // Also delete any orphaned sites owned by the user but not attached to a workspace
    const orphanedSites = await adapter.find<Record<string, any>>('z_sites', { ownerId: userId })
    for (const site of orphanedSites) {
      // Check if it hasn't been deleted already
      const stillExists = await adapter.findOne('z_sites', { id: site.id || site._id })
      if (stillExists) {
        await this.deleteSite(adapter, site.id || site._id, site.slug)
      }
    }
  }
}
