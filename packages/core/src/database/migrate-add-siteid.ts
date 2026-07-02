import { AdapterFactory } from './adapters/AdapterFactory';

/**
 * Migration: assign a default siteId to any existing document that lacks it.
 * This is needed because older seed data (demo posts, pages, etc.) were created
 * before tenancy was introduced, so they have no `siteId` field. Without this
 * migration those records appear in every tenant's dashboard.
 */
export async function migrateLegacySiteIds() {
  const adapter = AdapterFactory.getActiveAdapter();
  const defaultSite = await adapter.findOne<Record<string, any>>('z_sites', {});
  if (!defaultSite) {
    console.warn('No site found – aborting legacy siteId migration');
    return;
  }
  const siteId = (defaultSite._id ?? defaultSite.id)?.toString();
  const collections = ['posts', 'pages', 'products', 'authors', 'members'];

  for (const coll of collections) {
    // Find docs without a siteId field
    const count = await (adapter as import('./adapters/BaseAdapter').DatabaseAdapter).count(coll, { siteId: { $exists: false } });
    if (!count) continue;
    console.info(`Migrating ${count} documents in ${coll}`);
    await (adapter as import('./adapters/BaseAdapter').DatabaseAdapter).updateMany(coll, { siteId: { $exists: false } }, { siteId });
  }
  console.info('Legacy siteId migration completed');
}
