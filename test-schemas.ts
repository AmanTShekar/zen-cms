import { MongoClient } from 'mongodb';
async function check() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('zenith');
  const schemas = await db.collection('z_schemas').find({ type: { $ne: 'block' } }).toArray();
  console.log('Schemas count:', schemas.length);
  console.log('Slugs:', schemas.map(s => s.slug));
  const zCols = await db.collection('z_collections').find({}).toArray();
  console.log('z_collections count:', zCols.length);
  console.log('z_collections slugs:', zCols.map(s => s.slug));
  process.exit(0);
}
check();
