import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function checkSites() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const z_sites = await db.collection('z_sites').find({}).toArray();
  
  console.log('Z_SITES:', z_sites.map(s => ({ _id: s._id, slug: s.slug, name: s.name, workspaceId: s.workspaceId })));
  
  await client.close();
}

checkSites().catch(console.error);
