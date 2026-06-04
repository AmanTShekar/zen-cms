import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory';

async function run() {
  const adapter = AdapterFactory.create();
  await adapter.connect();
  const cols = await adapter.find('z_collections', {});
  const posts = cols.find(c => c.slug === 'posts');
  console.log(posts ? posts.publicRead : 'Posts collection not found');
  process.exit(0);
}

run();
