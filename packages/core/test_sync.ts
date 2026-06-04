import mongoose from 'mongoose';
import { syncTenantFiles } from './src/database/seed';
import { AdapterFactory } from './src/database/adapters/AdapterFactory';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const adapter = AdapterFactory.getActiveAdapter();
  await adapter.connect();
  console.log('Syncing...');
  try {
    await syncTenantFiles(adapter, { _id: '6a0000000000000000000000', id: '6a0000000000000000000000' }, '6a0000000000000000000001');
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
