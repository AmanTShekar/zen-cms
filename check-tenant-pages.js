const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('zenith');
  
  const pages = await db.collection('pages').find({}).toArray();
  const bySite = {};
  pages.forEach(p => {
    const id = p.siteId || 'no-site';
    bySite[id] = (bySite[id] || 0) + 1;
  });
  
  console.log(`Pages count: ${pages.length}`);
  console.log('Pages by siteId:', bySite);
  
  process.exit(0);
}

run();
