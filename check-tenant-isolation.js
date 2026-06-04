const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('zenith');
  
  const sites = await db.collection('sites').find({}).toArray();
  const siteMap = {};
  sites.forEach(s => siteMap[s._id.toString()] = s.name);
  
  // Also get the number of schemas and blocks per site
  const schemas = await db.collection('z_schemas').find({}).toArray();
  const collectionsBySite = {};
  const blocksBySite = {};
  
  schemas.forEach(s => {
    const id = s.siteId || 'no-site';
    if (s.type === 'block') {
      blocksBySite[id] = (blocksBySite[id] || 0) + 1;
    } else {
      collectionsBySite[id] = (collectionsBySite[id] || 0) + 1;
    }
  });
  
  console.log('--- Tenant Isolation Check ---');
  for (const site of sites) {
    const id = site._id.toString();
    console.log(`Tenant: ${site.name}`);
    console.log(`  - Collections (Schemas): ${collectionsBySite[id] || 0}`);
    console.log(`  - UI Blocks: ${blocksBySite[id] || 0}`);
  }
  
  // Now let's check a data collection (e.g., 'pages' or 'hero' blocks) to see if data has siteId
  // The user wants to know if there's isolation at the data level too.
  
  process.exit(0);
}

run();
